import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DepartmentExpense } from './department-expense.schema';
import { AuditLogService } from '../audit-log/audit-log.service';
import type { CreateDepartmentExpenseDto } from './dto/create.dto';
import type { UpdateDepartmentExpenseDto } from './dto/update.dto';

@Injectable()
export class DepartmentExpensesService {
  private readonly logger = new Logger(DepartmentExpensesService.name);

  constructor(
    @InjectModel(DepartmentExpense.name) private readonly expenseModel: Model<DepartmentExpense>,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateDepartmentExpenseDto, branchId: string, userId: string) {
    const expense = await this.expenseModel.create({
      branchId,
      departmentId: dto.departmentId,
      amount: dto.amount,
      description: dto.description,
      fromDate: new Date(dto.fromDate),
      toDate: new Date(dto.toDate),
      loggedBy: userId,
    });

    this.logger.log(`Department expense logged — ${expense._id} (${dto.description})`);
    await this.auditLog.log({
      entityType: 'department_expense',
      entityId: expense._id.toString(),
      action: 'create',
      description: `Expense logged: ${dto.description} (₦${dto.amount}) for department ${dto.departmentId}`,
      performedBy: userId,
      branchId,
      details: { ...dto, _id: expense._id },
      persistForever: true,
    });

    return expense.populate(['departmentId', 'loggedBy']);
  }

  async findAll(query: {
    branchId: string;
    departmentId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { branchId, departmentId, fromDate, toDate, page = 1, limit = 50 } = query;
    const filter: Record<string, any> = { branchId };

    if (departmentId) filter.departmentId = new Types.ObjectId(departmentId);
    if (fromDate || toDate) {
      filter.fromDate = {};
      if (fromDate) filter.fromDate.$gte = new Date(fromDate);
      if (toDate) filter.fromDate.$lte = new Date(toDate);
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.expenseModel
        .find(filter)
        .populate('departmentId', 'name')
        .populate('loggedBy', 'name email')
        .populate('updatedBy', 'name email')
        .sort({ fromDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.expenseModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const expense = await this.expenseModel
      .findById(id)
      .populate('departmentId', 'name')
      .populate('loggedBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();
    if (!expense) throw new NotFoundException('Department expense not found.');
    return expense;
  }

  async update(id: string, dto: UpdateDepartmentExpenseDto, userId: string) {
    const current = await this.expenseModel.findById(id).lean();
    if (!current) throw new NotFoundException('Department expense not found.');

    const updated = await this.expenseModel
      .findByIdAndUpdate(
        id,
        { ...dto, updatedBy: userId },
        { new: true },
      )
      .populate('departmentId', 'name')
      .populate('loggedBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    if (!updated) throw new NotFoundException('Department expense not found.');

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(dto) as (keyof UpdateDepartmentExpenseDto)[]) {
      const oldVal = (current as any)[key];
      const newVal = (dto as any)[key];
      if (String(oldVal) !== String(newVal)) {
        changes[key] = { from: key === 'amount' ? oldVal : oldVal instanceof Date ? oldVal.toISOString() : oldVal, to: newVal };
      }
    }

    this.logger.log(`Department expense updated — ${id}`);
    await this.auditLog.log({
      entityType: 'department_expense',
      entityId: id,
      action: 'update',
      description: `Expense updated: ${updated.description} (₦${updated.amount})`,
      performedBy: userId,
      branchId: updated.branchId.toString(),
      details: { changes, before: current, after: updated },
      persistForever: true,
    });

    return updated;
  }

  async getGroupedTotals(branchId: string) {
    return this.expenseModel.aggregate([
      { $match: { branchId: new Types.ObjectId(branchId) } },
      {
        $group: {
          _id: '$departmentId',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'department',
        },
      },
      { $unwind: '$department' },
      {
        $project: {
          _id: 0,
          departmentId: '$_id',
          departmentName: '$department.name',
          totalAmount: 1,
          count: 1,
        },
      },
      { $sort: { departmentName: 1 } },
    ]);
  }
}
