import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee } from './employee.schema';
import { RedisService } from '../redis/redis.service';
import { CACHE_TTL } from '../../config/cache.constants';
import { escapeRegex } from '../../common/utils/escape-regex';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    private readonly redis: RedisService,
  ) {}

  async findAll(params: { branchId: string; page: number; limit: number; search?: string }) {
    const { branchId, page, limit, search } = params;
    const cacheKey = `employees:list:${branchId}:${page}:${limit}:${search || ''}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit — ${cacheKey}`);
      return JSON.parse(cached);
    }

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

    const result = { items, total, page, limit };
    await this.redis.set(cacheKey, JSON.stringify(result), CACHE_TTL.ONE_HOUR);
    this.logger.log(`Employees listed — branch: ${branchId} | search: "${search || '—'}" | total: ${total}`);
    return result;
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
      .sort({ name: 1 })
      .limit(10)
      .lean();

    await this.redis.set(cacheKey, JSON.stringify(results), CACHE_TTL.ONE_MINUTE);
    this.logger.log(`Employees searched — branch: ${branchId} | query: "${query}" | hits: ${results.length}`);
    return results;
  }

  async findById(id: string) {
    const cacheKey = `employees:${id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit — ${cacheKey}`);
      return JSON.parse(cached);
    }

    const employee = await this.employeeModel.findById(id).lean();
    if (!employee) throw new NotFoundException('Employee not found.');

    await this.redis.set(cacheKey, JSON.stringify(employee), CACHE_TTL.ONE_HOUR);
    return employee;
  }
}
