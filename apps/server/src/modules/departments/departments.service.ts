import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Department } from './department.schema';
import type { CreateDepartmentDto } from './dto/create-department.dto';
import type { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);

  constructor(
    @InjectModel(Department.name) private departmentModel: Model<Department>,
  ) {}

  async create(dto: CreateDepartmentDto, userId: string) {
    const existing = await this.departmentModel.findOne({
      branchId: dto.branchId,
      name: { $regex: `^${dto.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      isDeleted: false,
    });
    if (existing) throw new ConflictException('A department with this name already exists in this branch.');
    const dept = await this.departmentModel.create({ ...dto, createdBy: userId, updatedBy: userId });
    this.logger.log(`Department created — ${dept.name} (${dept.branchId})`);
    return dept;
  }

  async findAll(branchId: string, includeDeleted = false) {
    const filter: any = { branchId };
    if (!includeDeleted) filter.isDeleted = false;
    return this.departmentModel.find(filter).sort({ name: 1 }).lean();
  }

  async findOne(id: string) {
    const dept = await this.departmentModel.findOne({ _id: id, isDeleted: false }).lean();
    if (!dept) throw new NotFoundException('Department not found.');
    return dept;
  }

  async update(id: string, dto: UpdateDepartmentDto, userId: string) {
    if (dto.name) {
      const current = await this.departmentModel.findById(id).lean();
      if (!current) throw new NotFoundException('Department not found.');
      const dup = await this.departmentModel.findOne({
        _id: { $ne: id },
        branchId: current.branchId,
        name: { $regex: `^${dto.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        isDeleted: false,
      });
      if (dup) throw new ConflictException('A department with this name already exists in this branch.');
    }
    const updated = await this.departmentModel.findByIdAndUpdate(
      id,
      { ...dto, updatedBy: userId },
      { new: true },
    ).lean();
    if (!updated) throw new NotFoundException('Department not found.');
    this.logger.log(`Department updated — ${updated.name}`);
    return updated;
  }

  async softDelete(id: string, userId: string) {
    const dept = await this.departmentModel.findByIdAndUpdate(
      id,
      { isDeleted: true, updatedBy: userId },
      { new: true },
    ).lean();
    if (!dept) throw new NotFoundException('Department not found.');
    this.logger.log(`Department soft-deleted — ${dept.name}`);
    return dept;
  }
}
