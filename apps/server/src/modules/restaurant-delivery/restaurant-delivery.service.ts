import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DeliveryLocation } from './schemas/delivery-location.schema';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class RestaurantDeliveryService {
  private readonly logger = new Logger(RestaurantDeliveryService.name);

  constructor(
    @InjectModel(DeliveryLocation.name) private locationModel: Model<DeliveryLocation>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getLocations(branchId: string, onlyActive = true) {
    if (!branchId || !Types.ObjectId.isValid(branchId)) return [];
    const filter: any = { branchId: new Types.ObjectId(branchId) };
    if (onlyActive) filter.isActive = true;
    return this.locationModel.find(filter).sort({ sortOrder: 1, zoneName: 1 }).lean();
  }

  async getLocationById(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid delivery location ID');
    const location = await this.locationModel.findById(id).lean();
    if (!location) throw new NotFoundException('Delivery location not found');
    return location;
  }

  async createLocation(
    branchId: string,
    dto: { zoneName: string; deliveryFee: number; estimatedDeliveryMinutes?: number; sortOrder?: number },
    user?: any,
  ) {
    if (!Types.ObjectId.isValid(branchId)) throw new BadRequestException('Invalid branch ID');
    const existing = await this.locationModel.findOne({
      branchId: new Types.ObjectId(branchId),
      zoneName: { $regex: new RegExp(`^${dto.zoneName.trim()}$`, 'i') },
    });
    if (existing) throw new BadRequestException(`Delivery zone "${dto.zoneName}" already exists for this branch`);

    const location = new this.locationModel({
      ...dto,
      branchId: new Types.ObjectId(branchId),
    });
    const saved = await location.save();

    const actor = user?.name || user?.email || 'Admin';
    this.logger.log(`[AUDIT] 🚚 Delivery Zone "${saved.zoneName}" (Fee: ₦${saved.deliveryFee?.toLocaleString()}) created by ${actor}`);

    if (user?._id || user?.sub) {
      await this.auditLogService.log({
        entityType: 'DeliveryLocation',
        entityId: saved._id.toString(),
        action: 'DELIVERY_LOCATION_CREATED',
        description: `Delivery zone "${saved.zoneName}" (Fee: ₦${saved.deliveryFee?.toLocaleString()}) created by ${actor}`,
        performedBy: user._id || user.sub,
        branchId,
        details: { zoneName: saved.zoneName, deliveryFee: saved.deliveryFee, estimatedDeliveryMinutes: saved.estimatedDeliveryMinutes },
      });
    }

    return saved;
  }

  async updateLocation(id: string, dto: any, user?: any) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid delivery location ID');
    const existing = await this.locationModel.findById(id).lean();
    if (!existing) throw new NotFoundException('Delivery location not found');

    const updated = await this.locationModel.findByIdAndUpdate(id, dto, { new: true });
    if (!updated) throw new NotFoundException('Delivery location not found');

    const actor = user?.name || user?.email || 'Admin';
    const isFeeChanged = dto.deliveryFee !== undefined && Number(dto.deliveryFee) !== existing.deliveryFee;

    if (isFeeChanged) {
      this.logger.log(
        `[AUDIT] 💰 Delivery Fee changed for "${updated.zoneName}": ₦${existing.deliveryFee.toLocaleString()} ➔ ₦${updated.deliveryFee.toLocaleString()} by ${actor}`
      );
    } else {
      this.logger.log(`[AUDIT] Delivery zone "${updated.zoneName}" updated by ${actor}`);
    }

    if (user?._id || user?.sub) {
      await this.auditLogService.log({
        entityType: 'DeliveryLocation',
        entityId: id,
        action: isFeeChanged ? 'DELIVERY_FEE_CHANGED' : 'DELIVERY_LOCATION_UPDATED',
        description: isFeeChanged
          ? `Delivery fee for "${updated.zoneName}" changed from ₦${existing.deliveryFee.toLocaleString()} to ₦${updated.deliveryFee.toLocaleString()} by ${actor}`
          : `Delivery zone "${updated.zoneName}" updated by ${actor}`,
        performedBy: user._id || user.sub,
        branchId: existing.branchId?.toString(),
        details: {
          before: { deliveryFee: existing.deliveryFee, zoneName: existing.zoneName, isActive: existing.isActive },
          after: { deliveryFee: updated.deliveryFee, zoneName: updated.zoneName, isActive: updated.isActive },
        },
      });
    }

    return updated;
  }

  async deleteLocation(id: string, user?: any) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid delivery location ID');
    const existing = await this.locationModel.findById(id).lean();
    if (!existing) throw new NotFoundException('Delivery location not found');

    const deleted = await this.locationModel.findByIdAndDelete(id);

    const actor = user?.name || user?.email || 'Admin';
    this.logger.log(`[AUDIT] 🗑️ Delivery Zone "${existing.zoneName}" deleted by ${actor}`);

    if (user?._id || user?.sub) {
      await this.auditLogService.log({
        entityType: 'DeliveryLocation',
        entityId: id,
        action: 'DELIVERY_LOCATION_DELETED',
        description: `Delivery zone "${existing.zoneName}" (Fee: ₦${existing.deliveryFee?.toLocaleString()}) deleted by ${actor}`,
        performedBy: user._id || user.sub,
        branchId: existing.branchId?.toString(),
        details: { zoneName: existing.zoneName, deliveryFee: existing.deliveryFee },
      });
    }

    return { success: true };
  }
}
