import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room, RoomStatus } from './room.schema';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(@InjectModel(Room.name) private roomModel: Model<Room>) { }

  async findAll(params: { branchId: string; page?: number; limit?: number; search?: string; status?: RoomStatus }) {
    const { branchId, page = 1, limit = 20, search, status } = params;
    const filter: any = { branchId, isActive: true };
    if (status) filter.status = status;
    if (search) {
      filter.roomNumber = { $regex: search, $options: 'i' };
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
    return updatedRoom;
  }

  async updateStatus(id: string, status: RoomStatus, userId: string) {
    return this.roomModel
      .findByIdAndUpdate(id, { status, updatedBy: userId }, { runValidators: true, new: true })
      .lean();
  }
}
