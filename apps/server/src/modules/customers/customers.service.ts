import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer } from './customer.schema';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { escapeRegex } from '../../common/utils/escape-regex';

import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll(params: { page: number; limit: number; search?: string }) {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;
    const filter: Record<string, any> = {};
    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.customerModel.find(filter).sort({ lastVisitDate: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.customerModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async searchByPhone(phone: string) {
    const escaped = escapeRegex(phone);
    const customers = await this.customerModel
      .find({ phone: { $regex: escaped, $options: 'i' } })
      .sort({ lastVisitDate: -1 })
      .limit(10)
      .lean();
    return customers;
  }

  async findById(id: string) {
    const customer = await this.customerModel.findById(id).lean();
    if (!customer) throw new NotFoundException('Customer not found.');
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    const existing = await this.customerModel.findOne({ phone: dto.phone });
    if (existing) {
      this.logger.log(`Customer already exists — ${dto.name} (${dto.phone}), updating...`);
      Object.assign(existing, {
        name: dto.name,
        email: dto.email,
        address: dto.address,
        nationality: dto.nationality,
        dob: dto.dob ? new Date(dto.dob) : undefined,
        phone2: dto.phone2,
        comingFrom: dto.comingFrom,
        stateOfOrigin: dto.stateOfOrigin,
        occupation: dto.occupation,
        nextDestination: dto.nextDestination,
        gender: dto.gender,
        religion: dto.religion,
      });
      return existing.save();
    }

    const customer = await this.customerModel.create({
      name: dto.name,
      phone: dto.phone,
      email: dto.email,
      address: dto.address,
      nationality: dto.nationality,
      dob: dto.dob ? new Date(dto.dob) : undefined,
      phone2: dto.phone2,
      comingFrom: dto.comingFrom,
      stateOfOrigin: dto.stateOfOrigin,
      occupation: dto.occupation,
      nextDestination: dto.nextDestination,
      gender: dto.gender,
      religion: dto.religion,
      firstBranchId: dto.firstBranchId,
    });

    this.logger.log(`Customer created — ${customer.name} (${customer.phone})`);
    return customer;
  }

  async updateBranchDiscount(params: {
    customerId: string;
    branchId: string;
    percentage: number;
    reason?: string;
    performedBy: string;
  }) {
    const { customerId, branchId, percentage, reason, performedBy } = params;
    const customer = await this.customerModel.findById(customerId);
    if (!customer) throw new NotFoundException('Customer not found.');

    if (!customer.branchLifetimeDiscounts) {
      customer.branchLifetimeDiscounts = [];
    }

    const existingIdx = customer.branchLifetimeDiscounts.findIndex(
      (b) => b.branchId.toString() === branchId,
    );
    const oldPercentage = existingIdx >= 0 ? customer.branchLifetimeDiscounts[existingIdx].percentage : 0;

    if (percentage > 0) {
      if (existingIdx >= 0) {
        customer.branchLifetimeDiscounts[existingIdx].percentage = percentage;
        customer.branchLifetimeDiscounts[existingIdx].updatedBy = performedBy as any;
        customer.branchLifetimeDiscounts[existingIdx].updatedAt = new Date();
        customer.branchLifetimeDiscounts[existingIdx].reason = reason;
      } else {
        customer.branchLifetimeDiscounts.push({
          branchId: branchId as any,
          percentage,
          updatedBy: performedBy as any,
          updatedAt: new Date(),
          reason,
        });
      }
    } else {
      if (existingIdx >= 0) {
        customer.branchLifetimeDiscounts.splice(existingIdx, 1);
      }
    }

    await customer.save();

    const action = percentage > 0 ? 'SET_VIP_LIFETIME_DISCOUNT' : 'REMOVE_VIP_LIFETIME_DISCOUNT';
    const description = percentage > 0
      ? `Set VIP lifetime discount of ${percentage}% for customer ${customer.name} (${customer.phone})`
      : `Removed VIP lifetime discount for customer ${customer.name} (${customer.phone})`;

    await this.auditLogService.log({
      entityType: 'Customer',
      entityId: customer._id.toString(),
      action,
      description,
      performedBy,
      branchId,
      details: {
        customerName: customer.name,
        customerPhone: customer.phone,
        oldPercentage,
        newPercentage: percentage,
        reason,
      },
      persistForever: true,
    });

    return customer;
  }
}
