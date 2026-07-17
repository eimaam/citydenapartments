import { Injectable, Logger, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee } from './employee.schema';
import { RedisService } from '../redis/redis.service';
import { CACHE_TTL } from '../../config/cache.constants';
import { escapeRegex } from '../../common/utils/escape-regex';
import { hasElevatedRole } from '../../common/utils/role.utils';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { CreateEmployeeDto } from './dto/create-employee.dto';
import type { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    private readonly redis: RedisService,
    private readonly auditLog: AuditLogService,
  ) {}

  async findAll(params: { branchId: string; page: number; limit: number; search?: string; includeInactive?: boolean }) {
    const { branchId, page, limit, search, includeInactive } = params;
    const cacheKey = `employees:list:${branchId}:${page}:${limit}:${search || ''}:${includeInactive ? 'all' : 'active'}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit — ${cacheKey}`);
      return JSON.parse(cached);
    }

    const filter: Record<string, any> = { branchId };
    if (!includeInactive) filter.isActive = true;
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
      this.employeeModel.find(filter).populate('departmentId', 'name').sort({ name: 1 }).skip(skip).limit(limit).lean(),
      this.employeeModel.countDocuments(filter),
    ]);

    const result = { items, total, page, limit };
    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL.ONE_HOUR);
    this.logger.log(`Employees listed — branch: ${branchId} | search: "${search || '—'}" | total: ${total}`);
    return result;
  }

  async create(dto: CreateEmployeeDto, userId?: string) {
    const existing = await this.employeeModel.findOne({ email: dto.email.toLowerCase() });
    if (existing) throw new ConflictException('An employee with this email already exists.');
    const employee = await this.employeeModel.create(dto);
    await this.redis.clearPattern('employees:list:*');
    this.logger.log(`Employee created — ${employee.name} (${employee.email})`);
    await this.auditLog.log({
      entityType: 'employee',
      entityId: employee._id.toString(),
      action: 'create',
      description: `Employee created: ${employee.name} (${employee.email})`,
      performedBy: userId || 'system',
      branchId: dto.branchId,
      details: { name: employee.name, email: employee.email, position: employee.position, departmentId: dto.departmentId },
    });
    return this.employeeModel.findById(employee._id).populate('departmentId', 'name').lean();
  }

  async update(id: string, dto: UpdateEmployeeDto, userId?: string) {
    if (dto.email) {
      const dup = await this.employeeModel.findOne({ email: dto.email.toLowerCase(), _id: { $ne: id } });
      if (dup) throw new ConflictException('An employee with this email already exists.');
    }
    const updated = await this.employeeModel.findByIdAndUpdate(id, dto, { new: true }).populate('departmentId', 'name').lean();
    if (!updated) throw new NotFoundException('Employee not found.');
    await this.redis.clearPattern('employees:list:*');
    await this.redis.del(`employees:${id}`);
    this.logger.log(`Employee updated — ${updated.name} (${updated.email})`);
    await this.auditLog.log({
      entityType: 'employee',
      entityId: id,
      action: dto.isActive !== undefined ? (dto.isActive ? 'activate' : 'deactivate') : 'update',
      description: dto.isActive !== undefined
        ? `Employee ${dto.isActive ? 'activated' : 'deactivated'}: ${updated.name}`
        : `Employee updated: ${updated.name}`,
      performedBy: userId || 'system',
      branchId: updated.branchId.toString(),
      details: { ...dto },
    });
    return updated;
  }

  async searchByName(branchId: string, query: string) {
    if (!query.trim()) return [];

    const cacheKey = `employees:search:${branchId}:${query.toLowerCase()}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit — ${cacheKey}`);
      return JSON.parse(cached);
    }

    const escaped = escapeRegex(query);
    const results = await this.employeeModel
      .find({ branchId, isActive: true, name: { $regex: escaped, $options: 'i' } })
      .populate('departmentId', 'name')
      .sort({ name: 1 })
      .limit(10)
      .lean();

    await this.redis.set(cacheKey, JSON.stringify(results), CACHE_TTL.ONE_MINUTE);
    this.logger.log(`Employees searched — branch: ${branchId} | query: "${query}" | hits: ${results.length}`);
    return results;
  }

  async findById(id: string, user?: any) {
    const cacheKey = `employees:${id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit — ${cacheKey}`);
      return JSON.parse(cached);
    }

    const employee = await this.employeeModel.findById(id).populate('departmentId', 'name').lean();
    if (!employee) throw new NotFoundException('Employee not found.');

    if (user && !hasElevatedRole(user.role)) {
      if (employee.branchId.toString() !== user.activeBranchId) {
        throw new NotFoundException('Employee not found.');
      }
    }

    await this.redis.set(cacheKey, JSON.stringify(employee), CACHE_TTL.ONE_HOUR);
    return employee;
  }
}
