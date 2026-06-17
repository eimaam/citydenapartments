import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer } from './customer.schema';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { escapeRegex } from '../../common/utils/escape-regex';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
  ) {}

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
}
