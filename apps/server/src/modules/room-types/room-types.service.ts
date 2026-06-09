import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RoomType } from './room-type.schema';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { escapeRegex } from '../../common/utils/escape-regex';

@Injectable()
export class RoomTypesService {
  private readonly logger = new Logger(RoomTypesService.name);

  constructor(@InjectModel(RoomType.name) private roomTypeModel: Model<RoomType>) {}

  async findAll(params: { branchId: string; page?: number; limit?: number; search?: string }) {
    const { branchId, page = 1, limit = 20, search } = params;
    const filter: any = { branchId, isActive: true };
    if (search) {
      const escaped = escapeRegex(search);
      filter.name = { $regex: escaped, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.roomTypeModel.find(filter).skip(skip).limit(limit).lean(),
      this.roomTypeModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: string) {
    return this.roomTypeModel.findById(id).lean();
  }

  async create(dto: CreateRoomTypeDto, userId: string) {
    const existing = await this.roomTypeModel.findOne({ branchId: dto.branchId, name: dto.name });
    if (existing) {
      throw new BadRequestException('A room type with this name already exists in this branch.');
    }
    return this.roomTypeModel.create({ ...dto, createdBy: userId }).then((roomType) => {
      this.logger.log(`Room type created — ${roomType.name} | branch: ${roomType.branchId}`);
      return roomType;
    });
  }

  async update(id: string, dto: UpdateRoomTypeDto, userId: string) {
    const updated = await this.roomTypeModel.findByIdAndUpdate(id, { ...dto, updatedBy: userId }, { new: true }).lean();
    if (updated) {
      this.logger.log(`Room type updated — ${updated.name}`);
    }
    return updated;
  }
}
