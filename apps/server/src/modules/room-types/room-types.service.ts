import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RoomType } from './room-type.schema';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';

@Injectable()
export class RoomTypesService {
  constructor(@InjectModel(RoomType.name) private roomTypeModel: Model<RoomType>) {}

  async findAll(branchId: string) {
    return this.roomTypeModel.find({ branchId, isActive: true }).lean();
  }

  async findOne(id: string) {
    return this.roomTypeModel.findById(id).lean();
  }

  async create(dto: CreateRoomTypeDto, userId: string) {
    const existing = await this.roomTypeModel.findOne({ branchId: dto.branchId, name: dto.name });
    if (existing) {
      throw new BadRequestException('A room type with this name already exists in this branch.');
    }
    return this.roomTypeModel.create({ ...dto, createdBy: userId });
  }

  async update(id: string, dto: Partial<CreateRoomTypeDto>) {
    return this.roomTypeModel.findByIdAndUpdate(id, dto, { new: true }).lean();
  }
}
