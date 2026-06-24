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
import { Customer } from '../customers/customer.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RedisService } from '../redis/redis.service';
import { escapeRegex } from '../../common/utils/escape-regex';
import { BookingStatus, BookingSource, Gender } from '@citydenapartments/shared';
import { BreakfastLog } from '../breakfast/breakfast-log.schema';
import { isPastBreakfastCutoff } from '../breakfast/breakfast.constants';
import { DiscountCodesService } from '../discount-codes/discount-codes.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(RoomType.name) private roomTypeModel: Model<RoomType>,
    @InjectModel(BreakfastLog.name) private breakfastLogModel: Model<BreakfastLog>,
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    @InjectConnection() private readonly connection: Connection,
    private readonly redis: RedisService,
    private readonly discountCodesService: DiscountCodesService,
  ) {}

  private readonly logger = new Logger(BookingsService.name);

  private async expireBreakfastIfNeeded(booking: Booking, actorId: string) {
    const hasDiscount = (booking.discountPercentage || 0) >= 5;
    const pastCutoff = isPastBreakfastCutoff();
    if (!hasDiscount && !pastCutoff) return;

    this.logger.log(
      `Breakfast expired — Booking #${booking.bookingReference} | reason: ${hasDiscount ? 'discount>=5%' : ''}${hasDiscount && pastCutoff ? ' + ' : ''}${pastCutoff ? 'past cutoff' : ''}`,
    );

    await this.breakfastLogModel.create({
      branchId: booking.branchId,
      bookingId: booking._id,
      roomId: booking.roomId,
      guestName: booking.guestDetails.name,
      dateServed: new Date(),
      servingsClaimed: 0,
      servedBy: actorId,
      status: 'expired',
    });
  }

  async getCalendar(branchId: string, year: number, month: number) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const [rooms, bookings] = await Promise.all([
      this.roomModel
        .find({ branchId, isActive: true })
        .populate('roomTypeId', 'name amenities')
        .sort({ roomNumber: 1 })
        .lean(),
      this.bookingModel
        .find({
          branchId,
          bookingStatus: {
            $in: [BookingStatus.Reserved, BookingStatus.Confirmed, BookingStatus.Checked_In, BookingStatus.Checked_Out],
          },
          checkInDate: { $lt: endOfMonth },
          checkOutDate: { $gt: startOfMonth },
        })
        .populate('roomId')
        .lean(),
    ]);

    return { rooms, bookings };
  }

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
    return this.bookingModel
      .findOne({ _id: id, branchId })
      .populate('roomId')
      .populate('bookedBy', 'firstName lastName')
      .populate('checkedInBy', 'firstName lastName')
      .populate('checkedOutBy', 'firstName lastName')
      .populate('cancelledBy', 'firstName lastName')
      .populate('statusHistory.changedBy', 'firstName lastName')
      .lean();
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
      let discountCodeDoc: { _id: any; code: string } | null = null;
      if (dto.discountCode) {
        discountCodeDoc = await this.discountCodesService.validate(dto.discountCode);
      }

      const room = await this.roomModel.findById(dto.roomId).session(session);
      if (!room || !room.isActive) {
        this.logger.warn(`Room not found or inactive — roomId: ${dto.roomId}`);
        throw new BadRequestException('Room not found or inactive.');
      }
      const targetStatus = dto.bookingStatus || BookingStatus.Checked_In;
      const isImmediateCheckIn = targetStatus === BookingStatus.Checked_In;

      if (isImmediateCheckIn) {
        if ((room.status as string) !== RoomStatusEnum.AVAILABLE) {
          this.logger.warn(`Room status mismatch — room ${room.roomNumber} is "${room.status}", cannot book`);
          throw new BadRequestException(`Room is currently "${room.status}" — cannot book.`);
        }
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
      const pct = dto.discountPercentage || 0;
      if (pct < 0 || pct > 100) {
        throw new BadRequestException('Discount percentage must be between 0 and 100.');
      }
      const computedDiscount = Math.round((subtotal * pct) / 100);
      const computedTotal = subtotal - computedDiscount;

      if (Math.abs(dto.totalAmountPaid - computedTotal) > 1) {
        throw new BadRequestException(
          `Price mismatch. Expected ₦${computedTotal} (₦${dto.actualPricePerNight} × ${nights} nights${pct > 0 ? ` − ${pct}% discount` : ''}), got ₦${dto.totalAmountPaid}`,
        );
      }

      const dateConflict = await this.bookingModel
        .findOne({
          roomId: dto.roomId,
          bookingStatus: { $in: [BookingStatus.Reserved, BookingStatus.Confirmed, BookingStatus.Checked_In] },
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

      let customerId: string | undefined = dto.customerId;
      let guestDetails: {
        name: string; phone: string; email?: string; address: string;
        nationality: string; dob?: Date; phone2?: string;
        comingFrom: string; stateOfOrigin: string; occupation: string;
        nextDestination: string; gender: string; religion?: string;
      };

      if (customerId) {
        const customer = await this.customerModel.findById(customerId).session(session);
        if (!customer) throw new BadRequestException('Customer not found.');
        guestDetails = {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          nationality: customer.nationality,
          dob: customer.dob,
          phone2: customer.phone2,
          comingFrom: customer.comingFrom,
          stateOfOrigin: customer.stateOfOrigin,
          occupation: customer.occupation,
          nextDestination: customer.nextDestination,
          gender: customer.gender,
          religion: customer.religion,
        };
      } else {
        const phone = dto.customerPhone || dto.guestPhone;
        const existing = await this.customerModel.findOne({ phone }).session(session);
        if (existing) {
          customerId = existing._id.toString();
          guestDetails = {
            name: existing.name,
            phone: existing.phone,
            email: existing.email,
            address: existing.address,
            nationality: existing.nationality,
            dob: existing.dob,
            phone2: existing.phone2,
            comingFrom: existing.comingFrom,
            stateOfOrigin: existing.stateOfOrigin,
            occupation: existing.occupation,
            nextDestination: existing.nextDestination,
            gender: existing.gender,
            religion: existing.religion,
          };
        } else {
          const [created] = await this.customerModel.create([{
            name: dto.guestName,
            phone,
            email: dto.guestEmail,
            address: dto.guestAddress,
            nationality: dto.guestNationality,
            dob: dto.guestDob ? new Date(dto.guestDob) : undefined,
            phone2: dto.guestPhone2,
            comingFrom: dto.guestComingFrom,
            stateOfOrigin: dto.guestStateOfOrigin,
            occupation: dto.guestOccupation,
            nextDestination: dto.guestNextDestination,
            gender: dto.guestGender,
            religion: dto.guestReligion,
            firstBranchId: branchId,
          }], { session });
          this.logger.log(`Customer created from booking — ${created.name} (${phone})`);
          customerId = created._id.toString();
          guestDetails = {
            name: created.name,
            phone: created.phone,
            email: created.email,
            address: created.address,
            nationality: created.nationality,
            dob: created.dob,
            phone2: created.phone2,
            comingFrom: created.comingFrom,
            stateOfOrigin: created.stateOfOrigin,
            occupation: created.occupation,
            nextDestination: created.nextDestination,
            gender: created.gender,
            religion: created.religion,
          };
        }
      }

      const [newBooking] = await this.bookingModel.create(
        [
          {
            bookingReference: ref,
            branchId,
            roomId: dto.roomId,
            customerId,
            guestDetails,
            numberOfGuests: dto.numberOfGuests || 1,
            checkInDate: new Date(dto.checkInDate),
            checkOutDate: new Date(dto.checkOutDate),
            actualPricePerNight: dto.actualPricePerNight,
            discount: computedDiscount,
            discountPercentage: pct,
            discountReason: dto.discountReason,
            totalAmountPaid: dto.totalAmountPaid,
            paymentMethod: dto.paymentMethod,
            paymentReference: dto.paymentReference,
            bookingStatus: targetStatus,
            bookingSource: dto.bookingSource || BookingSource.WalkIn,
            bookedBy: actorId,
            checkedInBy: isImmediateCheckIn ? actorId : undefined,
            checkedInAt: isImmediateCheckIn ? new Date() : undefined,
            statusHistory: [{
              fromStatus: '',
              toStatus: targetStatus,
              changedBy: actorId,
              changedAt: new Date(),
            }],
            discountCodeId: discountCodeDoc?._id,
            discountCode: discountCodeDoc?.code,
          },
        ],
        { session },
      );

      if (isImmediateCheckIn) {
        room.status = RoomStatusEnum.OCCUPIED as any;
        room.updatedBy = actorId as any;
        await room.save({ session });
      }

      await this.customerModel.updateOne(
        { _id: customerId },
        {
          $inc: { totalVisits: 1, totalSpent: dto.totalAmountPaid },
          $set: { lastVisitDate: new Date() },
        },
      ).session(session);

      await session.commitTransaction();
      await this.redis.invalidateDashboardCache(branchId);

      if (isImmediateCheckIn) {
        await this.expireBreakfastIfNeeded(newBooking, actorId);
      }

      if (discountCodeDoc) {
        await this.discountCodesService.consume(discountCodeDoc._id);
      }

      this.logger.log(`Booking created — #${newBooking.bookingReference} | Room ${room.roomNumber} | Guest ${guestDetails.name} | by ${actorId}`);
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
    if (booking.bookingStatus !== BookingStatus.Reserved && booking.bookingStatus !== BookingStatus.Confirmed) {
      this.logger.warn(`Check-in failed — booking #${booking.bookingReference} has status "${booking.bookingStatus}", cannot check in`);
      throw new BadRequestException(`Cannot check in a ${booking.bookingStatus} booking.`);
    }

    const today = new Date();
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    // normalize to start of day for fair comparison
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const checkInStart = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
    const checkOutStart = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());

    if (todayStart < checkInStart || todayStart >= checkOutStart) {
      this.logger.warn(`Check-in failed — booking #${booking.bookingReference} date range [${booking.checkInDate} — ${booking.checkOutDate}] does not include today`);
      throw new BadRequestException('Booking check-in date does not match today. Cannot check in outside the booking date range.');
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
      booking.statusHistory.push({
        fromStatus: booking.bookingStatus,
        toStatus: BookingStatus.Checked_In,
        changedBy: actorId as any,
        changedAt: new Date(),
      });
      booking.bookingStatus = BookingStatus.Checked_In;
      booking.checkedInBy = actorId as any;
      booking.checkedInAt = new Date();
      await booking.save({ session });

      room.status = RoomStatusEnum.OCCUPIED as any;
      room.updatedBy = actorId as any;
      await room.save({ session });

      await session.commitTransaction();
      await this.redis.invalidateDashboardCache(branchId);

      await this.expireBreakfastIfNeeded(booking, actorId);

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
    if (booking.bookingStatus !== BookingStatus.Checked_In) {
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
      booking.statusHistory.push({
        fromStatus: booking.bookingStatus,
        toStatus: BookingStatus.Checked_Out,
        changedBy: actorId as any,
        changedAt: new Date(),
      });
      booking.bookingStatus = BookingStatus.Checked_Out;
      booking.checkedOutBy = actorId as any;
      booking.checkedOutAt = new Date();
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
    if (booking.bookingStatus === BookingStatus.Checked_Out || booking.bookingStatus === BookingStatus.Cancelled) {
      this.logger.warn(`Cancel failed — booking #${booking.bookingReference} has status "${booking.bookingStatus}", cannot cancel`);
      throw new BadRequestException(`Cannot cancel a ${booking.bookingStatus} booking.`);
    }

    const wasCheckedIn = booking.bookingStatus === BookingStatus.Checked_In;
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
      booking.statusHistory.push({
        fromStatus: booking.bookingStatus,
        toStatus: BookingStatus.Cancelled,
        changedBy: actorId as any,
        changedAt: new Date(),
      });
      booking.bookingStatus = BookingStatus.Cancelled;
      booking.cancelledBy = actorId as any;
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
