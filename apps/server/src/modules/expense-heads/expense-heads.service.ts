import { Injectable, Logger, OnModuleInit, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ExpenseHead } from './expense-head.schema';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  ExpenseHeadType,
  DEFAULT_REVENUE_HEADS,
  DEFAULT_EXPENDITURE_HEADS,
  type ExpenseHeadTypeType,
} from '@citydenapartments/shared';
import type { CreateExpenseHeadDto } from './dto/create-expense-head.dto';
import type { UpdateExpenseHeadDto } from './dto/update-expense-head.dto';

@Injectable()
export class ExpenseHeadsService implements OnModuleInit {
  private readonly logger = new Logger(ExpenseHeadsService.name);

  constructor(
    @InjectModel(ExpenseHead.name) private readonly expenseHeadModel: Model<ExpenseHead>,
    private readonly auditLog: AuditLogService,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultHeads();
  }

  async ensureDefaultHeads(): Promise<void> {
    try {
      const existingCount = await this.expenseHeadModel.countDocuments();
      if (existingCount === 0) {
        this.logger.log('Seeding initial 25 default Expense Heads (6 Revenue Heads, 19 Expenditure Heads)...');

        const docs = [
          ...DEFAULT_REVENUE_HEADS.map((name) => ({
            name,
            type: ExpenseHeadType.RevenueHead,
            description: `Revenue Head: ${name}`,
            branchId: null,
            isActive: true,
            isDefault: true,
          })),
          ...DEFAULT_EXPENDITURE_HEADS.map((name) => ({
            name,
            type: ExpenseHeadType.ExpenditureHead,
            description: `Expenditure Head: ${name}`,
            branchId: null,
            isActive: true,
            isDefault: true,
          })),
        ];

        await this.expenseHeadModel.insertMany(docs);
        this.logger.log('Successfully seeded default Expense Heads.');
      }
    } catch (err: any) {
      this.logger.warn(`Could not seed default expense heads: ${err.message}`);
    }
  }

  async findAll(query: {
    type?: string;
    branchId?: string;
    includeInactive?: boolean;
  }) {
    const { type, branchId, includeInactive } = query;
    const filter: Record<string, any> = {};

    if (type) {
      filter.type = type;
    }

    if (!includeInactive) {
      filter.isActive = true;
    }

    if (branchId) {
      filter.$or = [
        { branchId: null },
        { branchId: new Types.ObjectId(branchId) },
        { branchId: { $exists: false } },
      ];
    }

    return this.expenseHeadModel
      .find(filter)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort({ type: 1, name: 1 })
      .lean();
  }

  async findOne(id: string) {
    const head = await this.expenseHeadModel
      .findById(id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();
    if (!head) throw new NotFoundException('Expense Head not found.');
    return head;
  }

  async create(dto: CreateExpenseHeadDto, userId?: string) {
    const existing = await this.expenseHeadModel.findOne({
      name: { $regex: new RegExp(`^${dto.name.trim()}$`, 'i') },
      type: dto.type,
      branchId: dto.branchId ? new Types.ObjectId(dto.branchId) : null,
    });

    if (existing) {
      throw new ConflictException(`Expense Head "${dto.name}" already exists for ${dto.type}.`);
    }

    const created = await this.expenseHeadModel.create({
      name: dto.name.trim(),
      type: dto.type,
      description: dto.description?.trim(),
      branchId: dto.branchId ? new Types.ObjectId(dto.branchId) : null,
      isActive: dto.isActive ?? true,
      isDefault: false,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    this.logger.log(`Created new Expense Head: ${created.name} (${created.type})`);

    if (userId) {
      await this.auditLog.log({
        entityType: 'expense_head',
        entityId: created._id.toString(),
        action: 'create',
        description: `Expense Head created: ${created.name} [${created.type}]`,
        performedBy: userId,
        branchId: dto.branchId || undefined,
        details: { name: created.name, type: created.type, description: created.description, isActive: created.isActive },
        persistForever: true,
      });
    }

    return created;
  }

  async update(id: string, dto: UpdateExpenseHeadDto, userId?: string) {
    const current = await this.expenseHeadModel.findById(id).lean();
    if (!current) throw new NotFoundException('Expense Head not found.');

    if (dto.name || dto.type) {
      const targetName = (dto.name || current.name).trim();
      const targetType = dto.type || current.type;
      const targetBranch = dto.branchId !== undefined ? (dto.branchId ? new Types.ObjectId(dto.branchId) : null) : current.branchId;

      const existing = await this.expenseHeadModel.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${targetName}$`, 'i') },
        type: targetType,
        branchId: targetBranch,
      });

      if (existing) {
        throw new ConflictException(`Expense Head "${targetName}" already exists for ${targetType}.`);
      }
    }

    const updated = await this.expenseHeadModel
      .findByIdAndUpdate(
        id,
        {
          ...(dto.name && { name: dto.name.trim() }),
          ...(dto.type && { type: dto.type }),
          ...(dto.description !== undefined && { description: dto.description.trim() }),
          ...(dto.branchId !== undefined && { branchId: dto.branchId ? new Types.ObjectId(dto.branchId) : null }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(userId && { updatedBy: new Types.ObjectId(userId) }),
        },
        { new: true },
      )
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .lean();

    if (!updated) throw new NotFoundException('Expense Head not found.');

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(dto) as (keyof UpdateExpenseHeadDto)[]) {
      const oldVal = (current as any)[key];
      const newVal = (dto as any)[key];
      if (String(oldVal) !== String(newVal)) {
        changes[key] = { from: oldVal, to: newVal };
      }
    }

    this.logger.log(`Expense Head updated — ${id} (${updated.name})`);

    if (userId) {
      await this.auditLog.log({
        entityType: 'expense_head',
        entityId: id,
        action: 'update',
        description: `Expense Head updated: ${updated.name} [${updated.type}]`,
        performedBy: userId,
        branchId: updated.branchId ? updated.branchId.toString() : undefined,
        details: { changes, before: current, after: updated },
        persistForever: true,
      });
    }

    return updated;
  }

  async toggleActive(id: string, userId?: string) {
    const current = await this.expenseHeadModel.findById(id);
    if (!current) throw new NotFoundException('Expense Head not found.');

    const previousState = current.isActive;
    current.isActive = !current.isActive;
    if (userId) current.updatedBy = new Types.ObjectId(userId) as any;
    await current.save();

    this.logger.log(`Expense Head ${current.name} status toggled to ${current.isActive ? 'active' : 'inactive'}`);

    if (userId) {
      await this.auditLog.log({
        entityType: 'expense_head',
        entityId: id,
        action: current.isActive ? 'activate' : 'deactivate',
        description: `Expense Head ${current.isActive ? 'activated' : 'deactivated'}: ${current.name} [${current.type}]`,
        performedBy: userId,
        branchId: current.branchId ? current.branchId.toString() : undefined,
        details: { previousState, newState: current.isActive, name: current.name, type: current.type },
        persistForever: true,
      });
    }

    return current;
  }

  async getGroupedSummary(branchId?: string) {
    const all = await this.findAll({ branchId, includeInactive: true });
    const revenueHeads = all.filter((h) => h.type === ExpenseHeadType.RevenueHead);
    const expenditureHeads = all.filter((h) => h.type === ExpenseHeadType.ExpenditureHead);
    const totalActive = all.filter((h) => h.isActive).length;
    const totalInactive = all.filter((h) => !h.isActive).length;

    return {
      revenueHeads,
      expenditureHeads,
      totalActive,
      totalInactive,
    };
  }
}
