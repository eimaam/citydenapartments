import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room, RoomStatus, RoomStatusEnum } from './room.schema';
import { Booking } from '../bookings/booking.schema';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { escapeRegex } from '../../common/utils/escape-regex';
import { RedisService } from '../redis/redis.service';
import { BookingStatus } from '@citydenapartments/shared';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    private readonly redis: RedisService,
  ) {}

  async findAvailable(checkIn: Date, checkOut: Date, branchId: string) {
    const conflictRoomIds = await this.bookingModel
      .find({
        branchId,
        bookingStatus: {
          $in: [BookingStatus.Reserved, BookingStatus.Confirmed, BookingStatus.Checked_In],
        },
        $or: [
          { checkInDate: { $lt: checkOut }, checkOutDate: { $gt: checkIn } },
        ],
      })
      .distinct('roomId');

    return this.roomModel
      .find({
        branchId,
        isActive: true,
        status: { $in: [RoomStatusEnum.AVAILABLE, RoomStatusEnum.DIRTY] },
        _id: { $nin: conflictRoomIds },
      })
      .populate('roomTypeId')
      .lean();
  }

  async findAll(params: { branchId: string; page?: number; limit?: number; search?: string; status?: RoomStatus }) {
    const { branchId, page = 1, limit = 20, search, status } = params;
    const filter: any = { branchId, isActive: true };
    if (status) filter.status = status;
    if (search) {
      const escaped = escapeRegex(search);
      filter.roomNumber = { $regex: escaped, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.roomModel.find(filter).populate('roomTypeId').skip(skip).limit(limit).lean(),
      this.roomModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    return this.roomModel.findById(id).populate('roomTypeId').lean();
  }

  async create(dto: CreateRoomDto, userId: string) {
    const existing = await this.roomModel.findOne({ branchId: dto.branchId, roomNumber: dto.roomNumber, roomTypeId: dto.roomTypeId });
    if (existing) {
      throw new BadRequestException('Room number already exists in this branch.');
    }
    return this.roomModel.create({ ...dto, createdBy: userId });
  }

  async update(roomId: string, dto: UpdateRoomDto, userId: string) {
    const updatedRoom = await this.roomModel.findByIdAndUpdate(roomId, { ...dto, updatedBy: userId }, { new: true })
    if (!updatedRoom) throw new NotFoundException('Room not found.');
    return updatedRoom;
  }

  async updateStatus(id: string, status: RoomStatus, userId: string) {
    const room = await this.roomModel.findById(id);
    if (!room) throw new BadRequestException('Room not found.');

    const from = room.status;
    const to = status;

    const allowed: Record<string, string[]> = {
      [RoomStatusEnum.AVAILABLE]:   [RoomStatusEnum.OCCUPIED, RoomStatusEnum.DIRTY, RoomStatusEnum.MAINTENANCE],
      [RoomStatusEnum.DIRTY]:       [RoomStatusEnum.AVAILABLE],
      [RoomStatusEnum.OCCUPIED]:    [RoomStatusEnum.DIRTY],
      [RoomStatusEnum.MAINTENANCE]: [RoomStatusEnum.AVAILABLE],
    };

    const allowedNext = allowed[from] ?? [];
    if (!allowedNext.includes(to)) {
      throw new BadRequestException(
        `Cannot transition room from "${from}" to "${to}". Allowed: ${allowedNext.join(', ') || 'none'}.`
      );
    }

    room.status = to as any;
    room.updatedBy = userId as any;
    await room.save();
    await this.redis.invalidateDashboardCache(room.branchId.toString());
    this.logger.log(`Room ${room.roomNumber} status changed: ${from} → ${to} by ${userId}`);
    return room.populate('roomTypeId');
  }
}
