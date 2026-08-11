import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RevenueLog } from './revenue-log.schema';
import { Department } from '../departments/department.schema';
import { CreateRevenueLogDto } from './dto/create-revenue-log.dto';
import { AuditLogService } from '../audit-log/audit-log.service';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class RevenueLogsService {
  private readonly logger = new Logger(RevenueLogsService.name);

  constructor(
    @InjectModel(RevenueLog.name) private readonly revenueLogModel: Model<RevenueLog>,
    @InjectModel(Department.name) private readonly departmentModel: Model<Department>,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(dto: CreateRevenueLogDto, branchId: string, actorId: string) {
    const dept = await this.departmentModel.findById(dto.departmentId).lean();
    if (!dept) {
      throw new NotFoundException('Department not found.');
    }

    const cash = dto.cashAmount || 0;
    const pos = dto.posAmount || 0;
    const transfer = dto.transferAmount || 0;
    const other = dto.otherAmount || 0;
    const totalAmount = cash + pos + transfer + other;

    if (totalAmount <= 0) {
      throw new BadRequestException('Revenue entry must have a total amount greater than zero.');
    }

    const revenueLog = new this.revenueLogModel({
      branchId: new Types.ObjectId(branchId),
      departmentId: new Types.ObjectId(dto.departmentId),
      revenueDate: startOfDay(new Date(dto.revenueDate)),
      cashAmount: cash,
      posAmount: pos,
      transferAmount: transfer,
      otherAmount: other,
      totalAmount,
      notes: dto.notes,
      loggedBy: new Types.ObjectId(actorId),
      loggedAt: new Date(),
    });

    await revenueLog.save();

    await this.auditLogService.log({
      entityType: 'revenue_log',
      entityId: revenueLog._id.toString(),
      action: 'revenue_log_created',
      description: `Logged revenue of ₦${totalAmount.toLocaleString()} for ${dept.name} (${dto.revenueDate})`,
      performedBy: actorId,
      branchId,
      details: {
        departmentName: dept.name,
        revenueDate: dto.revenueDate,
        cash,
        pos,
        transfer,
        other,
        totalAmount,
      },
    });

    return revenueLog;
  }

  async findAll(params: {
    branchId: string;
    departmentId?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { branchId, departmentId, fromDate, toDate, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;

    const filter: any = { branchId: new Types.ObjectId(branchId) };

    if (departmentId) {
      filter.departmentId = new Types.ObjectId(departmentId);
    }

    if (fromDate || toDate) {
      filter.revenueDate = {};
      if (fromDate) filter.revenueDate.$gte = startOfDay(new Date(fromDate));
      if (toDate) filter.revenueDate.$lte = endOfDay(new Date(toDate));
    }

    const [items, total] = await Promise.all([
      this.revenueLogModel
        .find(filter)
        .populate('departmentId', 'name code')
        .populate('loggedBy', 'name email role')
        .sort({ revenueDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.revenueLogModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDepartmentSummaryCards(branchId: string, fromDate?: string, toDate?: string, departmentId?: string) {
    const match: any = { branchId: new Types.ObjectId(branchId) };
    if (departmentId) {
      match.departmentId = new Types.ObjectId(departmentId);
    }
    if (fromDate || toDate) {
      match.revenueDate = {};
      if (fromDate) match.revenueDate.$gte = startOfDay(new Date(fromDate));
      if (toDate) match.revenueDate.$lte = endOfDay(new Date(toDate));
    }

    const deptFilter: any = { branchId: new Types.ObjectId(branchId), isActive: true, isDeleted: { $ne: true } };
    if (departmentId) {
      deptFilter._id = new Types.ObjectId(departmentId);
    }

    const departments = await this.departmentModel
      .find(deptFilter)
      .lean();

    const summaryPipeline = [
      { $match: match },
      {
        $group: {
          _id: '$departmentId',
          totalRevenue: { $sum: '$totalAmount' },
          totalCash: { $sum: '$cashAmount' },
          totalPos: { $sum: '$posAmount' },
          totalTransfer: { $sum: '$transferAmount' },
          totalOther: { $sum: '$otherAmount' },
          logCount: { $sum: 1 },
        },
      },
    ];

    const aggregated = await this.revenueLogModel.aggregate(summaryPipeline);
    const aggMap = new Map<string, any>();
    aggregated.forEach((item) => {
      aggMap.set(item._id.toString(), item);
    });

    let overallTotalRevenue = 0;
    let overallCash = 0;
    let overallPos = 0;
    let overallTransfer = 0;
    let overallOther = 0;
    let overallCount = 0;

    const departmentCards = departments.map((dept) => {
      const stats = aggMap.get(dept._id.toString()) || {
        totalRevenue: 0,
        totalCash: 0,
        totalPos: 0,
        totalTransfer: 0,
        totalOther: 0,
        logCount: 0,
      };

      overallTotalRevenue += stats.totalRevenue;
      overallCash += stats.totalCash;
      overallPos += stats.totalPos;
      overallTransfer += stats.totalTransfer;
      overallOther += stats.totalOther;
      overallCount += stats.logCount;

      return {
        departmentId: dept._id.toString(),
        departmentName: dept.name,
        departmentCode: (dept as any).code || '',
        totalRevenue: stats.totalRevenue,
        cashAmount: stats.totalCash,
        posAmount: stats.totalPos,
        transferAmount: stats.totalTransfer,
        otherAmount: stats.totalOther,
        logCount: stats.logCount,
      };
    });

    return {
      overall: {
        totalRevenue: overallTotalRevenue,
        totalCash: overallCash,
        totalPos: overallPos,
        totalTransfer: overallTransfer,
        totalOther: overallOther,
        totalEntries: overallCount,
      },
      departmentCards,
    };
  }

  async findOne(id: string) {
    const log = await this.revenueLogModel
      .findById(id)
      .populate('departmentId', 'name code')
      .populate('loggedBy', 'name email role')
      .lean();
    if (!log) throw new NotFoundException('Revenue log not found.');
    return log;
  }

  async remove(id: string, actorId: string, branchId: string) {
    const log = await this.revenueLogModel.findOne({ _id: id, branchId });
    if (!log) throw new NotFoundException('Revenue log not found.');

    await this.revenueLogModel.deleteOne({ _id: id });
    await this.auditLogService.log({
      entityType: 'revenue_log',
      entityId: id,
      action: 'revenue_log_deleted',
      description: `Voided/Deleted revenue log of ₦${log.totalAmount.toLocaleString()}`,
      performedBy: actorId,
      branchId,
      details: { amount: log.totalAmount, date: log.revenueDate },
    });

    return { success: true };
  }
}
