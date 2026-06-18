import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee } from './employee.schema';
import { escapeRegex } from '../../common/utils/escape-regex';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
  ) {}

  async findAll(params: { branchId: string; page: number; limit: number; search?: string }) {
    const { branchId, page, limit, search } = params;
    const filter: Record<string, any> = { branchId, isActive: true };
    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.employeeModel.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      this.employeeModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async searchByName(branchId: string, query: string) {
    const escaped = escapeRegex(query);
    return this.employeeModel
      .find({ branchId, isActive: true, name: { $regex: escaped, $options: 'i' } })
      .sort({ name: 1 })
      .limit(10)
      .lean();
  }

  async findById(id: string) {
    const employee = await this.employeeModel.findById(id).lean();
    if (!employee) throw new NotFoundException('Employee not found.');
    return employee;
  }
}
