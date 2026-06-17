import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InventoryItem } from './inventory-item.schema';
import { InventoryTransaction } from './inventory-transaction.schema';
import { DailySnapshot } from './daily-snapshot.schema';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { RestockDto } from './dto/restock.dto';
import { IssueDto } from './dto/issue.dto';
import { RedisService } from '../redis/redis.service';
import { escapeRegex } from '../../common/utils/escape-regex';
import { format } from 'date-fns';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectModel(InventoryItem.name) private itemModel: Model<InventoryItem>,
    @InjectModel(InventoryTransaction.name) private txModel: Model<InventoryTransaction>,
    @InjectModel(DailySnapshot.name) private snapshotModel: Model<DailySnapshot>,
    private readonly redis: RedisService,
  ) {}

  async findAllItems(params: {
    branchId: string;
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    lowStock?: boolean;
  }) {
    const { branchId, page = 1, limit = 20, search, category, lowStock } = params;
    const filter: any = { branchId: new Types.ObjectId(branchId), isActive: true };

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
      this.itemModel.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      this.itemModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findOneItem(id: string, branchId: string) {
    const item = await this.itemModel.findOne({ _id: id, branchId, isActive: true }).lean();
    if (!item) throw new NotFoundException('Item not found.');
    return item;
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
      notes: 'Initial stock',
      performedBy: userId,
      branchId,
    });

    await this.redis.del(`inventory:items:${branchId}`);
    this.logger.log(`Inventory item created — ${dto.name} | qty: ${dto.currentStock} | branch: ${branchId} | by ${userId}`);
    return item;
  }

  async updateItem(id: string, dto: UpdateItemDto, userId: string, branchId: string) {
    const item = await this.itemModel.findOne({ _id: id, branchId });
    if (!item) throw new NotFoundException('Item not found.');

    Object.assign(item, dto, { updatedBy: userId });
    await item.save();

    await this.redis.del(`inventory:items:${branchId}`);
    this.logger.log(`Inventory item updated — ${item.name} | by ${userId}`);
    return item;
  }

  async restock(id: string, dto: RestockDto, userId: string, branchId: string) {
    const item = await this.itemModel.findOne({ _id: id, branchId, isActive: true });
    if (!item) throw new NotFoundException('Item not found.');

    const previousStock = item.currentStock;
    item.currentStock += dto.quantity;
    item.updatedBy = userId as any;
    await item.save();

    await this.txModel.create({
      itemId: item._id,
      type: 'restock',
      quantity: dto.quantity,
      previousStock,
      newStock: item.currentStock,
      notes: dto.notes,
      performedBy: userId,
      branchId,
    });

    await this.redis.del(`inventory:items:${branchId}`);
    this.logger.log(`Inventory restock — ${item.name} | +${dto.quantity} | by ${userId}`);
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

    if (item.currentStock < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${item.currentStock} ${item.unit}, requested: ${dto.quantity}.`,
      );
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
      requestedBy: dto.requestedBy,
      department: dto.department,
      notes: dto.notes,
      performedBy: userId,
      branchId,
    });

    await this.redis.del(`inventory:items:${branchId}`);
    this.logger.log(`Inventory issue — ${item.name} | -${dto.quantity} | to ${dto.requestedBy || dto.department || 'unspecified'} | by ${userId}`);
    return item;
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
      this.txModel.find(filter).populate('itemId', 'name category unit').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
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
      for (const tx of txns) {
        if (tx.type === 'restock') totalRestocks += tx.quantity;
        else if (tx.type === 'issue') totalIssues += Math.abs(tx.quantity);
        else if (tx.type === 'adjustment') totalAdjustments += tx.quantity;
      }

      const closingStock = openingStock + totalRestocks - totalIssues + totalAdjustments;

      await this.snapshotModel.create({
        itemId: item._id,
        date: yesterday,
        openingStock,
        closingStock,
        totalRestocks,
        totalIssues,
        totalAdjustments,
        branchId: item.branchId,
        autoClosed: true,
      });

      closed++;
    }

    this.logger.log(`Auto-close completed — ${closed} snapshots created for ${yesterday}`);
    return { closed, date: yesterday };
  }
}
