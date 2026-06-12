import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Booking } from './booking.schema';
import { Room, RoomStatusEnum } from '../rooms/room.schema';
import { RoomType } from '../room-types/room-type.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RedisService } from '../redis/redis.service';
import { escapeRegex } from '../../common/utils/escape-regex';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(RoomType.name) private roomTypeModel: Model<RoomType>,
    @InjectConnection() private readonly connection: Connection,
    private readonly redis: RedisService,
  ) {}

  private readonly logger = new Logger(BookingsService.name);

  async findAll(params: {
    branchId: string;
    page: number;
    limit: number;
    status?: string;
    search?: string;
  }) {
    const { branchId, page, limit, status, search } = params;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { branchId };
    if (status) filter.bookingStatus = status;

    if (search) {
      const escaped = escapeRegex(search);
      const regex = { $regex: escaped, $options: 'i' };
      filter.$or = [
        { bookingReference: regex },
        { 'guestDetails.name': regex },
        { 'guestDetails.phone': regex },
      ];
    }

    const [items, total] = await Promise.all([
      this.bookingModel
        .find(filter)
        .populate('roomId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.bookingModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string, branchId: string) {
    return this.bookingModel.findOne({ _id: id, branchId }).populate('roomId').lean();
  }

  async createWalkInBooking(dto: CreateBookingDto, actorId: string, branchId: string) {
    const checkIn = new Date(dto.checkInDate);
    const checkOut = new Date(dto.checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkOut <= checkIn) {
      throw new BadRequestException('Check-out date must be after check-in date.');
    }
    if (checkIn < today) {
      throw new BadRequestException('Check-in date cannot be in the past.');
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const room = await this.roomModel.findById(dto.roomId).session(session);
      if (!room || !room.isActive) {
        this.logger.warn(`Room not found or inactive — roomId: ${dto.roomId}`);
        throw new BadRequestException('Room not found or inactive.');
      }
      if ((room.status as string) !== RoomStatusEnum.AVAILABLE) {
        this.logger.warn(`Room status mismatch — room ${room.roomNumber} is "${room.status}", cannot book`);
        throw new BadRequestException(`Room is currently "${room.status}" — cannot book.`);
      }

      const typeConfig = await this.roomTypeModel.findById(room.roomTypeId).session(session);
      if (!typeConfig) {
        throw new BadRequestException('Room type configuration not found.');
      }

      if (dto.actualPricePerNight < typeConfig.minPriceAllowed) {
        throw new BadRequestException(
          `Price violation. Minimum floor limit: ₦${typeConfig.minPriceAllowed}`,
        );
      }
      if (dto.actualPricePerNight > typeConfig.basePrice) {
        throw new BadRequestException(
          `Price violation. Maximum allowed: ₦${typeConfig.basePrice}`,
        );
      }

      const nights = Math.ceil(
        (new Date(dto.checkOutDate).getTime() - new Date(dto.checkInDate).getTime()) / (1000 * 60 * 60 * 24),
      );
      if (nights < 1) {
        throw new BadRequestException('Stay must be at least 1 night.');
      }

      const subtotal = dto.actualPricePerNight * nights;
      let computedDiscount = dto.discount || 0;
      if (dto.discountType === 'percentage') {
        const pct = dto.discountPercentage || 0;
        if (pct < 0 || pct > 100) {
          throw new BadRequestException('Discount percentage must be between 0 and 100.');
        }
        computedDiscount = Math.round((subtotal * pct) / 100);
      }
      const computedTotal = subtotal - computedDiscount;

      if (Math.abs(dto.totalAmountPaid - computedTotal) > 1) {
        throw new BadRequestException(
          `Price mismatch. Expected ₦${computedTotal} (₦${dto.actualPricePerNight} × ${nights} nights${dto.discount ? ` − ₦${computedDiscount} discount` : ''}), got ₦${dto.totalAmountPaid}`,
        );
      }

      const dateConflict = await this.bookingModel
        .findOne({
          roomId: dto.roomId,
          bookingStatus: { $in: ['Confirmed', 'Checked_In'] },
          $or: [
            { checkInDate: { $lt: new Date(dto.checkOutDate) }, checkOutDate: { $gt: new Date(dto.checkInDate) } },
          ],
        })
        .session(session);

      if (dateConflict) {
        this.logger.warn(`Booking conflict — Room ${room.roomNumber} already booked for these dates`);
        throw new ConflictException('Room conflict detected. This room is already reserved.');
      }

      const ref = `CDA-${branchId.slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

      const [newBooking] = await this.bookingModel.create(
        [
          {
            bookingReference: ref,
            branchId,
            roomId: dto.roomId,
            guestDetails: {
              name: dto.guestName,
              phone: dto.guestPhone,
              email: dto.guestEmail,
              address: dto.guestAddress,
              nationality: dto.guestNationality,
              dob: dto.guestDob ? new Date(dto.guestDob) : undefined,
              phone2: dto.guestPhone2,
              comingFrom: dto.guestComingFrom,
              stateOfOrigin: dto.guestStateOfOrigin,
              occupation: dto.guestOccupation,
              nextDestination: dto.guestNextDestination,
              religion: dto.guestReligion,
            },
            numberOfGuests: dto.numberOfGuests || 1,
            checkInDate: new Date(dto.checkInDate),
            checkOutDate: new Date(dto.checkOutDate),
            actualPricePerNight: dto.actualPricePerNight,
            discount: dto.discount || 0,
            discountType: dto.discountType || 'fixed',
            discountPercentage: dto.discountPercentage || 0,
            discountReason: dto.discountReason,
            totalAmountPaid: dto.totalAmountPaid,
            paymentMethod: dto.paymentMethod,
            paymentReference: dto.paymentReference,
            bookingStatus: dto.bookingStatus || 'Confirmed',
            bookingSource: dto.bookingSource || 'WalkIn',
            bookedBy: actorId,
            checkedInBy: dto.bookingStatus === 'Checked_In' ? actorId : null,
          },
        ],
        { session },
      );

      if (dto.bookingStatus === 'Checked_In') {
        room.status = RoomStatusEnum.OCCUPIED as any;
        room.updatedBy = actorId as any;
        await room.save({ session });
      }

      await session.commitTransaction();
      await this.redis.invalidateDashboardCache(branchId);
      this.logger.log(`Booking created — #${newBooking.bookingReference} | Room ${room.roomNumber} | Guest ${dto.guestName} | by ${actorId}`);
      return newBooking;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async checkIn(id: string, actorId: string, branchId: string) {
    const booking = await this.bookingModel.findOne({ _id: id, branchId });
    if (!booking) {
      this.logger.warn(`Check-in failed — booking ${id} not found in branch ${branchId}`);
      throw new NotFoundException('Booking not found.');
    }
    if (booking.bookingStatus !== 'Confirmed') {
      this.logger.warn(`Check-in failed — booking #${booking.bookingReference} has status "${booking.bookingStatus}", cannot check in`);
      throw new BadRequestException(`Cannot check in a ${booking.bookingStatus} booking.`);
    }

    const room = await this.roomModel.findById(booking.roomId);
    if (!room) {
      this.logger.warn(`Room not found — roomId: ${booking.roomId}`);
      throw new BadRequestException('Room not found.');
    }
    if (room.status as string !== RoomStatusEnum.AVAILABLE) {
      this.logger.warn(`Room status mismatch — room ${room.roomNumber} is "${room.status}", cannot check in`);
      throw new BadRequestException(`Room is currently "${room.status}" — cannot check in.`);
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      booking.bookingStatus = 'Checked_In';
      booking.checkedInBy = actorId as any;
      await booking.save({ session });

      room.status = RoomStatusEnum.OCCUPIED as any;
      room.updatedBy = actorId as any;
      await room.save({ session });

      await session.commitTransaction();
      await this.redis.invalidateDashboardCache(branchId);
      this.logger.log(`Check-in — #${booking.bookingReference} | Room ${room.roomNumber} | Guest ${booking.guestDetails.name} | by ${actorId}`);
      return booking;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async checkOut(id: string, actorId: string, branchId: string) {
    const booking = await this.bookingModel.findOne({ _id: id, branchId });
    if (!booking) {
      this.logger.warn(`Check-out failed — booking ${id} not found in branch ${branchId}`);
      throw new NotFoundException('Booking not found.');
    }
    if (booking.bookingStatus !== 'Checked_In') {
      this.logger.warn(`Check-out failed — booking #${booking.bookingReference} has status "${booking.bookingStatus}", cannot check out`);
      throw new BadRequestException(`Cannot check out a ${booking.bookingStatus} booking.`);
    }

    const room = await this.roomModel.findById(booking.roomId);
    if (!room) {
      this.logger.warn(`Room not found — roomId: ${booking.roomId}`);
      throw new BadRequestException('Room not found.');
    }
    if (room.status as string !== RoomStatusEnum.OCCUPIED) {
      this.logger.warn(`Room status mismatch — room ${room.roomNumber} is "${room.status}", cannot check out`);
      throw new BadRequestException(`Room is currently "${room.status}" — cannot check out.`);
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      booking.bookingStatus = 'Checked_Out';
      booking.checkedOutBy = actorId as any;
      await booking.save({ session });

      room.status = RoomStatusEnum.DIRTY as any;
      room.updatedBy = actorId as any;
      await room.save({ session });

      await session.commitTransaction();
      await this.redis.invalidateDashboardCache(branchId);
      this.logger.log(`Check-out — #${booking.bookingReference} | Room ${room.roomNumber} | Guest ${booking.guestDetails.name} | by ${actorId}`);
      return booking;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async cancel(id: string, actorId: string, branchId: string) {
    const booking = await this.bookingModel.findOne({ _id: id, branchId });
    if (!booking) {
      this.logger.warn(`Cancel failed — booking ${id} not found in branch ${branchId}`);
      throw new NotFoundException('Booking not found.');
    }
    if (['Checked_Out', 'Cancelled'].includes(booking.bookingStatus)) {
      this.logger.warn(`Cancel failed — booking #${booking.bookingReference} has status "${booking.bookingStatus}", cannot cancel`);
      throw new BadRequestException(`Cannot cancel a ${booking.bookingStatus} booking.`);
    }

    const wasCheckedIn = booking.bookingStatus === 'Checked_In';
    let room: Room | null = null;
    if (wasCheckedIn) {
      room = await this.roomModel.findById(booking.roomId);
      if (!room) {
        this.logger.warn(`Room not found — roomId: ${booking.roomId}`);
        throw new BadRequestException('Room not found.');
      }
      if (room.status as string !== RoomStatusEnum.OCCUPIED) {
        this.logger.warn(`Room status mismatch — room ${room.roomNumber} is "${room.status}", cannot release`);
        throw new BadRequestException(`Room is currently "${room.status}" — cannot release.`);
      }
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      booking.bookingStatus = 'Cancelled';
      booking.checkedOutBy = actorId as any;
      await booking.save({ session });

      if (wasCheckedIn && room) {
        room.status = RoomStatusEnum.AVAILABLE as any;
        room.updatedBy = actorId as any;
        await room.save({ session });
      }

      await session.commitTransaction();
      await this.redis.invalidateDashboardCache(branchId);
      this.logger.log(`Booking cancelled — #${booking.bookingReference} | Room ${room?.roomNumber ?? 'N/A'} | Guest ${booking.guestDetails.name} | by ${actorId}`);
      return booking;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
