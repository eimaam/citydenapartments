import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DeliveryLocation } from './schemas/delivery-location.schema';

@Injectable()
export class RestaurantDeliveryService {
  constructor(
    @InjectModel(DeliveryLocation.name) private locationModel: Model<DeliveryLocation>,
  ) {}

  async getLocations(branchId: string, onlyActive = true) {
    const filter: any = { branchId: new Types.ObjectId(branchId) };
    if (onlyActive) filter.isActive = true;
    return this.locationModel.find(filter).sort({ sortOrder: 1, zoneName: 1 }).lean();
  }

  async getLocationById(id: string) {
    const location = await this.locationModel.findById(id).lean();
    if (!location) throw new NotFoundException('Delivery location not found');
    return location;
  }

  async createLocation(branchId: string, dto: { zoneName: string; deliveryFee: number; estimatedDeliveryMinutes?: number; sortOrder?: number }) {
    const existing = await this.locationModel.findOne({
      branchId: new Types.ObjectId(branchId),
      zoneName: { $regex: new RegExp(`^${dto.zoneName.trim()}$`, 'i') },
    });
    if (existing) throw new BadRequestException(`Delivery zone "${dto.zoneName}" already exists for this branch`);

    const location = new this.locationModel({
      ...dto,
      branchId: new Types.ObjectId(branchId),
    });
    return location.save();
  }

  async updateLocation(id: string, dto: any) {
    const updated = await this.locationModel.findByIdAndUpdate(id, dto, { new: true });
    if (!updated) throw new NotFoundException('Delivery location not found');
    return updated;
  }

  async deleteLocation(id: string) {
    const deleted = await this.locationModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Delivery location not found');
    return { success: true };
  }
}
