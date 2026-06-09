import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Booking } from './booking.schema';
import { Room } from '../rooms/room.schema';
import { RoomType } from '../room-types/room-type.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RedisService } from '../redis/redis.service';
import { CACHE_KEYS } from '../../config/cache.constants';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(RoomType.name) private roomTypeModel: Model<RoomType>,
    @InjectConnection() private readonly connection: Connection,
    private readonly redis: RedisService,
  ) {}

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
      const regex = { $regex: search, $options: 'i' };
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

  async findOne(id: string) {
    return this.bookingModel.findById(id).populate('roomId').lean();
  }

  async createWalkInBooking(dto: CreateBookingDto, actorId: string, branchId: string) {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const room = await this.roomModel.findById(dto.roomId).session(session);
      if (!room || room.status === 'Maintenance' || !room.isActive) {
        throw new BadRequestException('Room is unavailable.');
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
            },
            numberOfGuests: dto.numberOfGuests || 1,
            checkInDate: new Date(dto.checkInDate),
            checkOutDate: new Date(dto.checkOutDate),
            actualPricePerNight: dto.actualPricePerNight,
            discount: dto.discount || 0,
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
        room.status = 'Occupied';
        room.updatedBy = actorId as any;
        await room.save({ session });
      }

      await session.commitTransaction();
      await this.redis.del(CACHE_KEYS.DASHBOARD_SUMMARY);
      return newBooking;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async checkIn(id: string, actorId: string) {
    const booking = await this.bookingModel.findById(id);
    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.bookingStatus !== 'Confirmed') {
      throw new BadRequestException(`Cannot check in a ${booking.bookingStatus} booking.`);
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      booking.bookingStatus = 'Checked_In';
      booking.checkedInBy = actorId as any;
      await booking.save({ session });

      await this.roomModel.findByIdAndUpdate(
        booking.roomId,
        { status: 'Occupied', updatedBy: actorId },
        { session },
      );

      await session.commitTransaction();
      await this.redis.del(CACHE_KEYS.DASHBOARD_SUMMARY);
      return booking;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async checkOut(id: string, actorId: string) {
    const booking = await this.bookingModel.findById(id);
    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.bookingStatus !== 'Checked_In') {
      throw new BadRequestException(`Cannot check out a ${booking.bookingStatus} booking.`);
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      booking.bookingStatus = 'Checked_Out';
      booking.checkedOutBy = actorId as any;
      await booking.save({ session });

      await this.roomModel.findByIdAndUpdate(
        booking.roomId,
        { status: 'Dirty', updatedBy: actorId },
        { session },
      );

      await session.commitTransaction();
      await this.redis.del(CACHE_KEYS.DASHBOARD_SUMMARY);
      return booking;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async cancel(id: string, actorId: string) {
    const booking = await this.bookingModel.findById(id);
    if (!booking) throw new NotFoundException('Booking not found.');
    if (['Checked_Out', 'Cancelled'].includes(booking.bookingStatus)) {
      throw new BadRequestException(`Cannot cancel a ${booking.bookingStatus} booking.`);
    }

    const wasCheckedIn = booking.bookingStatus === 'Checked_In';

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      booking.bookingStatus = 'Cancelled';
      booking.checkedOutBy = actorId as any;
      await booking.save({ session });

      if (wasCheckedIn) {
        await this.roomModel.findByIdAndUpdate(
          booking.roomId,
          { status: 'Available', updatedBy: actorId },
          { session },
        );
      }

      await session.commitTransaction();
      await this.redis.del(CACHE_KEYS.DASHBOARD_SUMMARY);
      return booking;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
