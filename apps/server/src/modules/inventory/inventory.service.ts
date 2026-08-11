import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InventoryItem } from './inventory-item.schema';
import { InventoryTransaction } from './inventory-transaction.schema';
import { DailySnapshot } from './daily-snapshot.schema';
import { SpoilageReport, SpoilageStatusEnum, type SpoilageStatus } from './spoilage-report.schema';
import { Employee } from '../employees/employee.schema';
import { Department } from '../departments/department.schema';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { RestockDto } from './dto/restock.dto';
import { IssueDto } from './dto/issue.dto';
import { ReportSpoilageDto, QuerySpoilageDto } from './dto/spoilage.dto';
import { TransferItemDto } from './dto/transfer-item.dto';
import { RedisService } from '../redis/redis.service';
import { escapeRegex } from '../../common/utils/escape-regex';
import { format } from 'date-fns';
import { randomUUID } from 'crypto';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectModel(InventoryItem.name) private itemModel: Model<InventoryItem>,
    @InjectModel(InventoryTransaction.name) private txModel: Model<InventoryTransaction>,
    @InjectModel(DailySnapshot.name) private snapshotModel: Model<DailySnapshot>,
    @InjectModel(SpoilageReport.name) private spoilageModel: Model<SpoilageReport>,
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    @InjectModel(Department.name) private departmentModel: Model<Department>,
    private readonly redis: RedisService,
    private readonly auditLog: AuditLogService,
  ) { }

  async findAllItems(params: {
    branchId: string;
    page?: number;
    limit?: number;
    search?: string;
    departmentId?: string;
    category?: string;
    lowStock?: boolean;
  }): Promise<{ items: Record<string, any>[]; total: number; page: number; limit: number }> {
    const { branchId, page = 1, limit = 20, search, departmentId, category, lowStock } = params;
    const filter: any = { branchId: new Types.ObjectId(branchId), isActive: true };

    if (departmentId) filter.departmentId = new Types.ObjectId(departmentId);
    if (category) filter.category = category;
    if (lowStock) {
      filter.$expr = { $lte: ['$currentStock', '$reorderLevel'] };
    }
    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { category: { $regex: escaped, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.itemModel.find(filter).populate('departmentId', 'name').sort({ name: 1 }).skip(skip).limit(limit).lean(),
      this.itemModel.countDocuments(filter),
    ]);

    const itemIds = items.map((i) => i._id);
    const pendingAgg = await this.spoilageModel.aggregate([
      {
        $match: {
          itemId: { $in: itemIds },
          status: SpoilageStatusEnum.Pending,
        },
      },
      {
        $group: {
          _id: '$itemId',
          totalPending: { $sum: '$quantity' },
        },
      },
    ]);

    const pendingMap = new Map<string, number>();
    for (const p of pendingAgg) {
      pendingMap.set(p._id.toString(), p.totalPending);
    }

    const itemsWithPending = items.map((item) => {
      const pendingSpoilageQuantity = pendingMap.get(item._id.toString()) || 0;
      const availableStock = Math.max(0, item.currentStock - pendingSpoilageQuantity);
      return {
        ...item,
        pendingSpoilageQuantity,
        availableStock,
      };
    });

    return { items: itemsWithPending, total, page, limit };
  }

  async getDepartmentSummaries(branchId: string) {
    const raw = await this.itemModel.aggregate([
      {
        $match: {
          branchId: new Types.ObjectId(branchId),
          isActive: true,
        },
      },
      {
        $group: {
          _id: '$departmentId',
          count: { $sum: 1 },
          totalValue: {
            $sum: {
              $multiply: ['$currentStock', '$unitPrice'],
            },
          },
          lowStockCount: {
            $sum: {
              $cond: [{ $lte: ['$currentStock', '$reorderLevel'] }, 1, 0],
            },
          },
        },
      },
    ]);

    return raw.map((r) => ({
      departmentId: r._id ? r._id.toString() : null,
      count: r.count,
      totalValue: r.totalValue,
      lowStockCount: r.lowStockCount,
    }));
  }

  private async getPendingSpoilageQty(itemId: string | Types.ObjectId): Promise<number> {
    const raw = await this.spoilageModel.aggregate([
      {
        $match: {
          itemId: new Types.ObjectId(itemId.toString()),
          status: SpoilageStatusEnum.Pending,
        },
      },
      {
        $group: {
          _id: null,
          totalPending: { $sum: '$quantity' },
        },
      },
    ]);
    return raw[0]?.totalPending || 0;
  }

  async findOneItem(id: string, branchId: string): Promise<Record<string, any>> {
    const item = await this.itemModel.findOne({ _id: id, branchId, isActive: true }).populate('departmentId', 'name').lean();
    if (!item) throw new NotFoundException('Item not found.');
    const pendingSpoilageQuantity = await this.getPendingSpoilageQty(item._id);
    const availableStock = Math.max(0, item.currentStock - pendingSpoilageQuantity);
    return {
      ...item,
      pendingSpoilageQuantity,
      availableStock,
    };
  }

  async createItem(dto: CreateItemDto, userId: string, branchId: string) {
    const item = await this.itemModel.create({
      ...dto,
      branchId,
      createdBy: userId,
      updatedBy: userId,
    });

    await this.txModel.create({
      itemId: item._id,
      type: 'restock',
      quantity: dto.currentStock,
      previousStock: 0,
      newStock: dto.currentStock,
      unitPrice: dto.unitPrice,
      totalCost: dto.currentStock * dto.unitPrice,
      previousUnitPrice: 0,
      newUnitPrice: dto.unitPrice,
      notes: 'Initial stock',
      performedBy: userId,
      branchId,
    });

    await this.redis.del(`inventory:items:${branchId}`);
    this.logger.log(`Inventory item created — ${dto.name} | qty: ${dto.currentStock} | branch: ${branchId} | by ${userId}`);
    await this.auditLog.log({
      entityType: 'inventory_item',
      entityId: item._id.toString(),
      action: 'create',
      description: `Inventory item created: ${dto.name}`,
      performedBy: userId,
      branchId,
      details: { name: dto.name, departmentId: dto.departmentId, category: dto.category, currentStock: dto.currentStock, unit: dto.unit, unitPrice: dto.unitPrice },
    });
    return item;
  }

  async updateItem(id: string, dto: UpdateItemDto, userId: string, branchId: string) {
    const item = await this.itemModel.findOne({ _id: id, branchId });
    if (!item) throw new NotFoundException('Item not found.');

    Object.assign(item, dto, { updatedBy: userId });
    await item.save();

    await this.redis.del(`inventory:items:${branchId}`);
    this.logger.log(`Inventory item updated — ${item.name} | by ${userId}`);
    await this.auditLog.log({
      entityType: 'inventory_item',
      entityId: id,
      action: 'update',
      description: `Inventory item updated: ${item.name}`,
      performedBy: userId,
      branchId,
      details: { ...dto },
    });
    return item;
  }

  async restock(id: string, dto: RestockDto, userId: string, branchId: string) {
    const item = await this.itemModel.findOne({ _id: id, branchId, isActive: true });
    if (!item) throw new NotFoundException('Item not found.');

    const previousStock = item.currentStock;
    const currentUnitPrice = item.unitPrice ?? item.costPrice ?? 0;
    const batchUnitPrice = dto.unitPrice != null ? dto.unitPrice : currentUnitPrice;
    const batchQuantity = dto.quantity;
    const batchTotalCost = batchQuantity * batchUnitPrice;

    const newStock = previousStock + batchQuantity;
    let newUnitPrice = batchUnitPrice;

    if (newStock > 0) {
      const existingValue = previousStock * currentUnitPrice;
      newUnitPrice = Math.round((existingValue + batchTotalCost) / newStock);
    }

    item.currentStock = newStock;
    item.unitPrice = newUnitPrice;
    item.costPrice = newUnitPrice;
    item.updatedBy = userId as any;
    await item.save();

    await this.txModel.create({
      itemId: item._id,
      type: 'restock',
      quantity: batchQuantity,
      previousStock,
      newStock,
      unitPrice: batchUnitPrice,
      totalCost: batchTotalCost,
      previousUnitPrice: currentUnitPrice,
      newUnitPrice,
      notes: dto.notes,
      performedBy: userId,
      branchId,
    });

    await this.redis.del(`inventory:items:${branchId}`);
    this.logger.log(`Inventory restock — ${item.name} | +${batchQuantity} @ ₦${batchUnitPrice} (New Avg: ₦${newUnitPrice}) | by ${userId}`);
    await this.auditLog.log({
      entityType: 'inventory_item',
      entityId: id,
      action: 'restock',
      description: `Inventory restock: ${item.name} (+${batchQuantity} ${item.unit} @ ₦${batchUnitPrice}). New average unit price: ₦${newUnitPrice}`,
      performedBy: userId,
      branchId,
      details: { itemName: item.name, quantity: batchQuantity, batchUnitPrice, previousUnitPrice: currentUnitPrice, newUnitPrice, unit: item.unit, notes: dto.notes },
    });
    return item;
  }

  async issue(id: string, dto: IssueDto, userId: string, branchId: string) {
    const item = await this.itemModel.findOne({ _id: id, branchId, isActive: true });
    if (!item) throw new NotFoundException('Item not found.');

    if (item.expiryDate && new Date(item.expiryDate) <= new Date()) {
      throw new BadRequestException(
        `Cannot issue expired item "${item.name}" — expired on ${format(new Date(item.expiryDate), 'MMM d, yyyy')}.`,
      );
    }

    const pendingSpoilage = await this.getPendingSpoilageQty(item._id);
    const availableToIssue = item.currentStock - pendingSpoilage;

    if (availableToIssue < dto.quantity) {
      if (pendingSpoilage > 0) {
        throw new BadRequestException(
          `Cannot issue ${dto.quantity} ${item.unit}. Total stock is ${item.currentStock} ${item.unit}, but ${pendingSpoilage} ${item.unit} is currently pending write-off approval. Available to issue: ${Math.max(0, availableToIssue)} ${item.unit}.`,
        );
      }
      throw new BadRequestException(
        `Insufficient stock. Available: ${item.currentStock} ${item.unit}, requested: ${dto.quantity} ${item.unit}.`,
      );
    }

    let requestedByName = dto.requestedBy;
    let departmentId = dto.departmentId;
    if (dto.requestedEmployeeId) {
      const employee = await this.employeeModel.findById(dto.requestedEmployeeId).populate('departmentId', 'name').lean();
      if (employee) {
        requestedByName = employee.name;
        if (!dto.department && employee.department) {
          dto.department = employee.department;
        }
        if (!departmentId && (employee as any).departmentId) {
          departmentId = (employee as any).departmentId._id;
        }
      }
    }

    const previousStock = item.currentStock;
    item.currentStock -= dto.quantity;
    item.updatedBy = userId as any;
    await item.save();

    await this.txModel.create({
      itemId: item._id,
      type: 'issue',
      quantity: -dto.quantity,
      previousStock,
      newStock: item.currentStock,
      requestedBy: requestedByName,
      department: dto.department,
      departmentId,
      notes: dto.notes,
      performedBy: userId,
      branchId,
    });

    await this.redis.del(`inventory:items:${branchId}`);
    this.logger.log(`Issued ${dto.quantity} ${item.unit} of ${item.name} | by ${userId}`);
    await this.auditLog.log({
      entityType: 'inventory_item',
      entityId: id,
      action: 'issue',
      description: `Issued ${dto.quantity} ${item.unit} of ${item.name}`,
      performedBy: userId,
      branchId,
      details: { itemName: item.name, quantity: dto.quantity, requestedBy: requestedByName, department: dto.department, unit: item.unit, notes: dto.notes },
    });
    return item;
  }

  async transferItem(id: string, dto: TransferItemDto, userId: string, branchId: string): Promise<Record<string, any>> {
    const sourceItem = await this.itemModel.findOne({ _id: id, branchId, isActive: true }).populate('departmentId', 'name');
    if (!sourceItem) throw new NotFoundException('Source item not found.');

    const sourceDeptId = sourceItem.departmentId ? ((sourceItem.departmentId as any)._id || sourceItem.departmentId).toString() : null;
    if (sourceDeptId && sourceDeptId === dto.targetDepartmentId) {
      throw new BadRequestException('Target department must be different from source department.');
    }

    const targetDept = await this.departmentModel.findOne({ _id: dto.targetDepartmentId, branchId, isActive: true });
    if (!targetDept) throw new NotFoundException('Target department not found.');

    const pendingSpoilage = await this.getPendingSpoilageQty(sourceItem._id);
    const availableToTransfer = sourceItem.currentStock - pendingSpoilage;

    if (availableToTransfer < dto.quantity) {
      if (pendingSpoilage > 0) {
        throw new BadRequestException(
          `Cannot transfer ${dto.quantity} ${sourceItem.unit}. Total stock is ${sourceItem.currentStock} ${sourceItem.unit}, but ${pendingSpoilage} ${sourceItem.unit} is pending write-off approval. Available to transfer: ${Math.max(0, availableToTransfer)} ${sourceItem.unit}.`,
        );
      }
      throw new BadRequestException(
        `Insufficient stock for transfer. Available: ${sourceItem.currentStock} ${sourceItem.unit}, requested: ${dto.quantity} ${sourceItem.unit}.`,
      );
    }

    const escapedName = escapeRegex(sourceItem.name);
    let destItem = await this.itemModel.findOne({
      branchId: new Types.ObjectId(branchId),
      departmentId: new Types.ObjectId(dto.targetDepartmentId),
      isActive: true,
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
    });

    const sourceUnitPrice = sourceItem.unitPrice ?? sourceItem.costPrice ?? 0;

    let destPreviousStock = 0;
    let destNewStock = dto.quantity;
    let destNewUnitPrice = sourceUnitPrice;

    if (destItem) {
      destPreviousStock = destItem.currentStock;
      destNewStock = destPreviousStock + dto.quantity;
      const destCurrentUnitPrice = destItem.unitPrice ?? destItem.costPrice ?? 0;
      if (destNewStock > 0) {
        const destExistingValue = destPreviousStock * destCurrentUnitPrice;
        const transferValue = dto.quantity * sourceUnitPrice;
        destNewUnitPrice = Math.round((destExistingValue + transferValue) / destNewStock);
      }
      destItem.currentStock = destNewStock;
      destItem.unitPrice = destNewUnitPrice;
      destItem.costPrice = destNewUnitPrice;
      destItem.updatedBy = userId as any;
      await destItem.save();
    } else {
      destItem = await this.itemModel.create({
        name: sourceItem.name,
        branchId: new Types.ObjectId(branchId),
        departmentId: new Types.ObjectId(dto.targetDepartmentId),
        category: sourceItem.category,
        unit: sourceItem.unit,
        currentStock: dto.quantity,
        reorderLevel: sourceItem.reorderLevel ?? 0,
        costPrice: sourceUnitPrice,
        unitPrice: sourceUnitPrice,
        description: sourceItem.description,
        expiryDate: sourceItem.expiryDate,
        createdBy: new Types.ObjectId(userId),
        updatedBy: new Types.ObjectId(userId),
        isActive: true,
      });
    }

    const sourcePreviousStock = sourceItem.currentStock;
    const sourceNewStock = sourcePreviousStock - dto.quantity;
    sourceItem.currentStock = sourceNewStock;
    sourceItem.updatedBy = userId as any;
    await sourceItem.save();

    const transferRefId = randomUUID();
    const sourceDeptName = (sourceItem.departmentId as any)?.name || 'Source';
    const targetDeptName = targetDept.name;

    // Outbound Log (Source)
    await this.txModel.create({
      itemId: sourceItem._id,
      type: 'transfer',
      quantity: -dto.quantity,
      previousStock: sourcePreviousStock,
      newStock: sourceNewStock,
      departmentId: sourceDeptId ? new Types.ObjectId(sourceDeptId) : undefined,
      fromDepartmentId: sourceDeptId ? new Types.ObjectId(sourceDeptId) : undefined,
      toDepartmentId: targetDept._id,
      transferRefId,
      unitPrice: sourceUnitPrice,
      totalCost: dto.quantity * sourceUnitPrice,
      notes: dto.notes || `Transferred ${dto.quantity} ${sourceItem.unit} to ${targetDeptName}`,
      performedBy: userId,
      branchId,
    });

    // Inbound Log (Destination)
    await this.txModel.create({
      itemId: destItem._id,
      type: 'transfer',
      quantity: dto.quantity,
      previousStock: destPreviousStock,
      newStock: destNewStock,
      departmentId: targetDept._id,
      fromDepartmentId: sourceDeptId ? new Types.ObjectId(sourceDeptId) : undefined,
      toDepartmentId: targetDept._id,
      transferRefId,
      previousUnitPrice: destItem ? destItem.unitPrice : sourceUnitPrice,
      newUnitPrice: destNewUnitPrice,
      unitPrice: sourceUnitPrice,
      totalCost: dto.quantity * sourceUnitPrice,
      notes: dto.notes || `Received ${dto.quantity} ${sourceItem.unit} from ${sourceDeptName}`,
      performedBy: userId,
      branchId,
    });

    await this.redis.del(`inventory:items:${branchId}`);
    this.logger.log(`Transferred ${dto.quantity} ${sourceItem.unit} of ${sourceItem.name} from ${sourceDeptName} to ${targetDeptName} | by ${userId}`);
    await this.auditLog.log({
      entityType: 'inventory_item',
      entityId: id,
      action: 'transfer',
      description: `Transferred ${dto.quantity} ${sourceItem.unit} of ${sourceItem.name} from ${sourceDeptName} to ${targetDeptName}`,
      performedBy: userId,
      branchId,
      details: {
        sourceItemId: id,
        destinationItemId: destItem._id.toString(),
        quantity: dto.quantity,
        fromDepartment: sourceDeptName,
        toDepartment: targetDeptName,
        transferRefId,
        notes: dto.notes,
      },
    });

    return { sourceItem, destItem };
  }

  async reportSpoilage(itemId: string, dto: ReportSpoilageDto, userId: string, branchId: string) {
    const item = await this.itemModel.findOne({ _id: itemId, branchId, isActive: true });
    if (!item) throw new NotFoundException('Item not found.');

    const pendingSpoilage = await this.getPendingSpoilageQty(item._id);
    const availableForSpoilage = item.currentStock - pendingSpoilage;

    if (dto.quantity > availableForSpoilage) {
      if (pendingSpoilage > 0) {
        throw new BadRequestException(
          `Cannot submit write-off request of ${dto.quantity} ${item.unit}. Total stock is ${item.currentStock} ${item.unit}, but ${pendingSpoilage} ${item.unit} is already in another pending write-off request. Available for write-off: ${Math.max(0, availableForSpoilage)} ${item.unit}.`,
        );
      }
      throw new BadRequestException(
        `Insufficient stock. Total stock: ${item.currentStock} ${item.unit}, requested write-off: ${dto.quantity} ${item.unit}.`,
      );
    }

    const report = await this.spoilageModel.create({
      itemId,
      branchId,
      quantity: dto.quantity,
      spoilageType: dto.spoilageType,
      reason: dto.reason,
      notes: dto.notes,
      status: SpoilageStatusEnum.Pending,
      reportedBy: userId,
      reportedAt: new Date(),
      statusHistory: [{
        fromStatus: '',
        toStatus: SpoilageStatusEnum.Pending,
        changedBy: userId,
        changedAt: new Date(),
      }],
    });

    this.logger.log(`Spoilage reported — ${item.name} | qty: ${dto.quantity} | type: ${dto.spoilageType} | by ${userId}`);
    await this.auditLog.log({
      entityType: 'spoilage_report',
      entityId: report._id.toString(),
      action: 'report_spoilage',
      description: `Spoilage reported: ${item.name} (-${dto.quantity} ${item.unit})`,
      performedBy: userId,
      branchId,
      details: { itemName: item.name, quantity: dto.quantity, unit: item.unit, spoilageType: dto.spoilageType, reason: dto.reason },
    });
    return report;
  }

  async findSpoilageReports(params: {
    branchId: string;
    page?: number;
    limit?: number;
    status?: string;
    from?: string;
    to?: string;
    itemId?: string;
  }) {
    const { branchId, page = 1, limit = 20, status, from, to, itemId } = params;
    const filter: any = { branchId: new Types.ObjectId(branchId) };

    if (status) filter.status = status;
    if (itemId) filter.itemId = new Types.ObjectId(itemId);
    if (from || to) {
      filter.reportedAt = {};
      if (from) filter.reportedAt.$gte = new Date(from);
      if (to) filter.reportedAt.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.spoilageModel.find(filter)
        .populate('itemId', 'name category unit currentStock')
        .populate('reportedBy', 'name email')
        .populate('respondedBy', 'name email')
        .sort({ reportedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.spoilageModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findOneSpoilage(id: string, branchId: string) {
    const report = await this.spoilageModel.findOne({ _id: id, branchId })
      .populate('itemId', 'name category unit currentStock')
      .populate('reportedBy', 'name email')
      .populate('respondedBy', 'name email')
      .populate('statusHistory.changedBy', 'name email')
      .lean();
    if (!report) throw new NotFoundException('Spoilage report not found.');
    return report;
  }

  async approveSpoilage(id: string, userId: string, branchId: string) {
    return this.respondSpoilage(id, userId, branchId, SpoilageStatusEnum.Approved);
  }

  async rejectSpoilage(id: string, userId: string, branchId: string) {
    return this.respondSpoilage(id, userId, branchId, SpoilageStatusEnum.Rejected);
  }

  private async respondSpoilage(id: string, userId: string, branchId: string, newStatus: SpoilageStatus) {
    const report = await this.spoilageModel.findOne({ _id: id, branchId })
      .populate<{ itemId: InventoryItem & { _id: Types.ObjectId } }>('itemId');
    if (!report) throw new NotFoundException('Spoilage report not found.');

    const oldStatus = report.status as SpoilageStatus;

    if (newStatus === SpoilageStatusEnum.Approved) {
      const item = report.itemId as any;
      if (report.quantity > item.currentStock) {
        throw new BadRequestException(
          `Cannot approve write-off — insufficient total stock. Total stock: ${item.currentStock} ${item.unit}, requested write-off: ${report.quantity} ${item.unit}. Restock first or reject this request.`,
        );
      }
    }

    report.status = newStatus;
    report.respondedBy = userId as any;
    report.respondedAt = new Date() as any;
    report.statusHistory.push({
      fromStatus: oldStatus,
      toStatus: newStatus,
      changedBy: userId as any,
      changedAt: new Date() as any,
    } as any);

    if (newStatus === SpoilageStatusEnum.Approved && oldStatus !== SpoilageStatusEnum.Approved) {
      const item = await this.itemModel.findById(report.itemId);
      if (!item) throw new NotFoundException('Item not found.');

      const previousStock = item.currentStock;
      item.currentStock -= report.quantity;
      item.updatedBy = userId as any;
      await item.save();

      await this.txModel.create({
        itemId: item._id,
        type: 'spoilage',
        quantity: -report.quantity,
        previousStock,
        newStock: item.currentStock,
        notes: `${report.spoilageType}: ${report.reason}${report.notes ? ` — ${report.notes}` : ''}`,
        performedBy: userId,
        branchId,
      });

      await this.redis.del(`inventory:items:${branchId}`);
      this.logger.log(`Spoilage approved — ${item.name} | -${report.quantity} | type: ${report.spoilageType} | by ${userId}`);
    }

    if (oldStatus === SpoilageStatusEnum.Approved && newStatus !== SpoilageStatusEnum.Approved) {
      const item = await this.itemModel.findById(report.itemId);
      if (!item) throw new NotFoundException('Item not found.');

      const previousStock = item.currentStock;
      item.currentStock += report.quantity;
      item.updatedBy = userId as any;
      await item.save();

      await this.txModel.create({
        itemId: item._id,
        type: 'adjustment',
        quantity: report.quantity,
        previousStock,
        newStock: item.currentStock,
        notes: `Reversal of spoilage #${id}: ${report.spoilageType} — ${report.reason}`,
        performedBy: userId,
        branchId,
      });

      await this.redis.del(`inventory:items:${branchId}`);
      this.logger.log(`Spoilage reversed — ${item.name} | +${report.quantity} | status: ${newStatus} | by ${userId}`);
    }

    await report.save();
    return report;
  }

  async findTransactions(params: {
    branchId: string;
    page?: number;
    limit?: number;
    itemId?: string;
    type?: string;
    from?: string;
    to?: string;
  }) {
    const { branchId, page = 1, limit = 20, itemId, type, from, to } = params;
    const filter: any = { branchId: new Types.ObjectId(branchId) };

    if (itemId) filter.itemId = new Types.ObjectId(itemId);
    if (type) filter.type = type;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.txModel.find(filter)
        .populate('itemId', 'name category unit')
        .populate('departmentId', 'name')
        .populate('fromDepartmentId', 'name')
        .populate('toDepartmentId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.txModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findSnapshots(params: {
    branchId: string;
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
  }) {
    const { branchId, page = 1, limit = 20, from, to } = params;
    const filter: any = { branchId: new Types.ObjectId(branchId) };

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.snapshotModel.find(filter).populate('itemId', 'name category unit').sort({ date: -1, itemId: 1 }).skip(skip).limit(limit).lean(),
      this.snapshotModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async autoCloseDay() {
    const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
    const today = format(new Date(), 'yyyy-MM-dd');

    const items = await this.itemModel.find({ isActive: true }).lean();
    let closed = 0;

    for (const item of items) {
      const branchId = item.branchId.toString();

      const existing = await this.snapshotModel.findOne({
        itemId: item._id, date: yesterday,
      });
      if (existing) continue;

      const openingSnapshot = await this.snapshotModel.findOne({
        itemId: item._id, date: today,
      }).sort({ date: -1 });

      const openingStock = openingSnapshot ? openingSnapshot.closingStock : item.currentStock;

      const txns = await this.txModel.find({
        itemId: item._id,
        createdAt: {
          $gte: new Date(yesterday + 'T00:00:00.000Z'),
          $lt: new Date(today + 'T00:00:00.000Z'),
        },
      }).lean();

      let totalRestocks = 0;
      let totalIssues = 0;
      let totalAdjustments = 0;
      let totalSpoilage = 0;
      for (const tx of txns) {
        if (tx.type === 'restock') totalRestocks += tx.quantity;
        else if (tx.type === 'issue') totalIssues += Math.abs(tx.quantity);
        else if (tx.type === 'adjustment') totalAdjustments += tx.quantity;
        else if (tx.type === 'spoilage' || tx.type === 'disposal') totalSpoilage += Math.abs(tx.quantity);
      }

      const closingStock = openingStock + totalRestocks - totalIssues + totalAdjustments - totalSpoilage;

      await this.snapshotModel.create({
        itemId: item._id,
        date: yesterday,
        openingStock,
        closingStock,
        totalRestocks,
        totalIssues,
        totalAdjustments,
        totalSpoilage,
        branchId: item.branchId,
        autoClosed: true,
      });

      closed++;
    }

    this.logger.log(`Auto-close completed — ${closed} snapshots created for ${yesterday}`);
    return { closed, date: yesterday };
  }
}
