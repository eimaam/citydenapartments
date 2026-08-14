import { Injectable, BadRequestException, NotFoundException, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LaundryCategory } from './laundry-category.schema';
import { LaundryItem } from './laundry-item.schema';
import { LaundryBill } from './laundry-bill.schema';
import { LAUNDRY_CATALOG } from './laundry-catalog';
import { CreateLaundryBillDto } from './dto/create-laundry-bill.dto';
import { CreateLaundryItemDto, UpdateLaundryItemDto } from './dto/laundry-item.dto';
import { Customer } from '../customers/customer.schema';
import { escapeRegex } from '../../common/utils/escape-regex';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class LaundryService  {
  private readonly logger = new Logger(LaundryService.name);

  constructor(
    @InjectModel(LaundryCategory.name) private categoryModel: Model<LaundryCategory>,
    @InjectModel(LaundryItem.name) private itemModel: Model<LaundryItem>,
    @InjectModel(LaundryBill.name) private billModel: Model<LaundryBill>,
    @InjectModel(Customer.name) private customerModel: Model<Customer>,
    private readonly auditLogService: AuditLogService,
  ) {}

  // async onModuleInit() {
  //   try {
  //     await this.ensureCatalog();
  //   } catch (error) {
  //     this.logger.error(`Laundry catalog seeding failed: ${(error as Error).message}`);
  //   }
  // }

  private isDuplicateKey(error: unknown): boolean {
    return typeof error === 'object' && error !== null && (error as any).code === 11000;
  }

  // ── catalog ──────────────────────────────────────────────────
  async ensureCatalog() {
    const categoryIds: Record<string, Types.ObjectId> = {};
    for (const entry of LAUNDRY_CATALOG) {
      const name = entry.category.toUpperCase().trim();
      if (!categoryIds[name]) {
        await this.categoryModel.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });
        const category = await this.categoryModel.findOne({ name }).lean<{ _id: Types.ObjectId }>();
        if (!category) throw new Error(`Failed to ensure category "${name}"`);
        categoryIds[name] = category._id;
      }
    }

    let created = 0;
    const BATCH = 10;
    for (let i = 0; i < LAUNDRY_CATALOG.length; i += BATCH) {
      const batch = LAUNDRY_CATALOG.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async (entry) => {
          const res = await this.itemModel.updateOne(
            { categoryId: categoryIds[entry.category.toUpperCase().trim()], item: entry.item.trim() },
            { $setOnInsert: { item: entry.item.trim(), laundryPrice: entry.laundryPrice, pressingPrice: entry.pressingPrice } },
            { upsert: true },
          );
          return res.matchedCount === 0 ? 1 : 0;
        }),
      );
      created += results.reduce((sum, n) => sum + n, 0);
    }
    this.logger.log(`Laundry catalog ensured — ${LAUNDRY_CATALOG.length} items (${created} new)`);
  }

  async getCatalog(summaryOnly = false) {
    const categories = await this.categoryModel.find().sort({ name: 1 }).lean();
    if (summaryOnly) {
      const counts = await this.itemModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      ]);
      const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
      return categories.map((c) => ({
        _id: c._id.toString(),
        name: c.name,
        isActive: c.isActive,
        itemCount: countMap.get(c._id.toString()) ?? 0,
      }));
    }
    const items = await this.itemModel.find().populate('categoryId', 'name').sort({ item: 1 }).lean();
    return categories.map((c) => ({
      _id: c._id.toString(),
      name: c.name,
      isActive: c.isActive,
      items: items
        .filter((i) => (i.categoryId as any)?.name === c.name)
        .map((i) => ({
          _id: i._id.toString(),
          category: (i.categoryId as any)?.name,
          item: i.item,
          laundryPrice: i.laundryPrice,
          pressingPrice: i.pressingPrice,
          isActive: i.isActive,
        })),
    }));
  }

  async getItems(params: { search?: string; category?: string; page: number; limit: number }) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;
    const filter: Record<string, any> = { isActive: true };

    if (params.category) {
      const category = await this.categoryModel
        .findOne({ name: params.category.toUpperCase().trim() })
        .lean<{ _id: Types.ObjectId }>();
      if (!category) return { items: [], total: 0, page, limit, hasMore: false };
      filter.categoryId = category._id;
    }

    if (params.search) {
      const escaped = escapeRegex(params.search);
      const or: Record<string, any>[] = [{ item: { $regex: escaped, $options: 'i' } }];
      const matchingCategories = await this.categoryModel
        .find({ name: { $regex: escaped, $options: 'i' } })
        .select('_id')
        .lean();
      if (matchingCategories.length > 0) {
        or.push({ categoryId: { $in: matchingCategories.map((c) => c._id) } });
      }
      filter.$or = or;
    }

    const [items, total] = await Promise.all([
      this.itemModel
        .find(filter)
        .populate('categoryId', 'name')
        .sort({ categoryId: 1, item: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.itemModel.countDocuments(filter),
    ]);

    return {
      items: items.map((i) => ({
        _id: i._id.toString(),
        categoryId: (i.categoryId as any)?._id?.toString() ?? (i.categoryId as any)?.toString(),
        category: (i.categoryId as any)?.name ?? '',
        item: i.item,
        laundryPrice: i.laundryPrice,
        pressingPrice: i.pressingPrice,
        isActive: i.isActive,
      })),
      total,
      page,
      limit,
      hasMore: skip + items.length < total,
    };
  }

  async createItem(dto: CreateLaundryItemDto) {
    const categoryName = dto.category.toUpperCase().trim();
    let category = await this.categoryModel.findOne({ name: categoryName }).lean<{ _id: Types.ObjectId }>();
    if (!category) {
      const created = await this.categoryModel.create({ name: categoryName });
      category = { _id: created._id };
    }
    try {
      const item = await this.itemModel.create({
        categoryId: category._id,
        item: dto.item.trim(),
        laundryPrice: dto.laundryPrice,
        pressingPrice: dto.pressingPrice ?? null,
      });
      this.logger.log(`Laundry item created — ${item.item} (${categoryName})`);
      return item;
    } catch (error) {
      if (this.isDuplicateKey(error)) {
        throw new BadRequestException(`"${dto.item}" already exists in ${categoryName}.`);
      }
      throw error;
    }
  }

  async updateItem(id: string, dto: UpdateLaundryItemDto) {
    const item = await this.itemModel.findById(id);
    if (!item) throw new NotFoundException('Laundry item not found.');

    if (dto.category !== undefined) {
      const categoryName = dto.category.toUpperCase().trim();
      let category = await this.categoryModel.findOne({ name: categoryName }).lean<{ _id: Types.ObjectId }>();
      if (!category) {
        const created = await this.categoryModel.create({ name: categoryName });
        category = { _id: created._id };
      }
      item.categoryId = category._id as any;
    }
    if (dto.item !== undefined) item.item = dto.item.trim();
    if (dto.laundryPrice !== undefined) item.laundryPrice = dto.laundryPrice;
    if (dto.pressingPrice !== undefined) item.pressingPrice = dto.pressingPrice ?? null;

    try {
      await item.save();
      return item;
    } catch (error) {
      if (this.isDuplicateKey(error)) {
        throw new BadRequestException(`"${item.item}" already exists in this category.`);
      }
      throw error;
    }
  }

  async deleteItem(id: string) {
    const item = await this.itemModel.findByIdAndDelete(id);
    if (!item) throw new NotFoundException('Laundry item not found.');
    this.logger.log(`Laundry item deleted — ${item.item}`);
    return { message: 'Laundry item deleted.' };
  }

  async renameCategory(id: string, name: string) {
    const category = await this.categoryModel.findById(id);
    if (!category) throw new NotFoundException('Category not found.');
    const normalized = name.toUpperCase().trim();
    try {
      category.name = normalized;
      await category.save();
      return category;
    } catch (error) {
      if (this.isDuplicateKey(error)) throw new BadRequestException(`Category "${normalized}" already exists.`);
      throw error;
    }
  }

  async deleteCategory(id: string) {
    const count = await this.itemModel.countDocuments({ categoryId: id });
    if (count > 0) {
      throw new BadRequestException('Cannot delete a category that still has items. Move or delete its items first.');
    }
    const category = await this.categoryModel.findByIdAndDelete(id);
    if (!category) throw new NotFoundException('Category not found.');
    return { message: 'Category deleted.' };
  }

  // ── bills ────────────────────────────────────────────────────
  async createBill(dto: CreateLaundryBillDto, actorId: string, branchId: string) {
    const hasCustomer = !!dto.customerId;
    const hasWalkIn = !!dto.walkIn?.name?.trim();
    if (hasCustomer && hasWalkIn) {
      throw new BadRequestException('Pick either an existing customer or walk-in details, not both.');
    }
    if (!hasCustomer && !hasWalkIn) {
      throw new BadRequestException('Select an existing customer or enter walk-in details.');
    }

    let customerId: Types.ObjectId | undefined;
    if (hasCustomer) {
      const customer = await this.customerModel.findById(dto.customerId).select('_id').lean();
      if (!customer) throw new BadRequestException('Selected customer does not exist.');
      customerId = customer._id as Types.ObjectId;
    }

    const itemIds = [...new Set(dto.lines.map((l) => l.itemId))];
    const items = await this.itemModel.find({ _id: { $in: itemIds } }).populate('categoryId', 'name').lean();
    const itemMap = new Map(items.map((i) => [i._id.toString(), i]));

    const lines = dto.lines.map((line) => {
      const item = itemMap.get(line.itemId);
      if (!item || !item.isActive) {
        throw new BadRequestException(`Item is no longer available.`);
      }
      const unitPrice = line.service === 'pressing' ? item.pressingPrice : item.laundryPrice;
      if (unitPrice === null || unitPrice === undefined) {
        throw new BadRequestException(`Pressing is not available for ${item.item}.`);
      }
      return {
        itemId: item._id as Types.ObjectId,
        itemName: item.item,
        category: (item.categoryId as any)?.name ?? '',
        service: line.service,
        qty: line.qty,
        unitPrice,
        lineTotal: unitPrice * line.qty,
      };
    });

    const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

    const bill = await this.billModel.create({
      billNumber: `LDY-${branchId.slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      branchId,
      customerId,
      walkIn: hasWalkIn ? { name: dto.walkIn!.name.trim(), phone: dto.walkIn!.phone?.trim() } : undefined,
      roomNumber: dto.roomNumber?.trim() || undefined,
      lines,
      subtotal,
      total: subtotal,
      status: dto.status ?? 'pending',
      notes: dto.notes?.trim() || undefined,
      createdBy: actorId,
    });

    const guestName = hasWalkIn ? dto.walkIn!.name.trim() : (await this.customerModel.findById(customerId).select('name').lean())?.name ?? 'Customer';
    this.logger.log(`Laundry bill created — ${bill.billNumber} | ${guestName} | ₦${subtotal.toLocaleString()} | by ${actorId}`);

    await this.auditLogService.log({
      entityType: 'LaundryBill',
      entityId: bill._id.toString(),
      action: 'LAUNDRY_BILL_CREATED',
      description: `Laundry bill ${bill.billNumber} created for ${guestName} — ₦${subtotal.toLocaleString()} (${lines.length} line(s))`,
      performedBy: actorId,
      branchId,
      details: {
        billNumber: bill.billNumber,
        guestName,
        roomNumber: bill.roomNumber,
        total: bill.total,
        status: bill.status,
        lines: lines.map((l) => `${l.qty}× ${l.itemName} (${l.service}) @ ₦${l.unitPrice.toLocaleString()}`),
      },
      persistForever: true,
    });

    return this.billModel.findById(bill._id).populate('customerId', 'name phone').populate('createdBy', 'name');
  }

  async findAll(params: {
    branchId: string;
    page: number;
    limit: number;
    status?: string;
    search?: string;
    from?: string;
    to?: string;
  }) {
    const { branchId, page, limit } = params;
    const skip = (page - 1) * limit;
    const filter: Record<string, any> = { branchId };

    if (params.status) filter.status = params.status;

    if (params.from || params.to) {
      filter.createdAt = {};
      if (params.from) filter.createdAt.$gte = new Date(params.from);
      if (params.to) {
        const end = new Date(params.to);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (params.search) {
      const escaped = escapeRegex(params.search);
      filter.$or = [
        { billNumber: { $regex: escaped, $options: 'i' } },
        { roomNumber: { $regex: escaped, $options: 'i' } },
        { 'walkIn.name': { $regex: escaped, $options: 'i' } },
        { 'walkIn.phone': { $regex: escaped, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.billModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('customerId', 'name phone')
        .populate('createdBy', 'name')
        .lean(),
      this.billModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string, branchId: string) {
    const bill = await this.billModel
      .findOne({ _id: id, branchId })
      .populate('customerId', 'name phone')
      .populate('createdBy', 'name')
      .lean();
    if (!bill) throw new NotFoundException('Laundry bill not found.');
    return bill;
  }

  async updateStatus(id: string, status: string, branchId: string, actorId: string) {
    const bill = await this.billModel.findOne({ _id: id, branchId });
    if (!bill) throw new NotFoundException('Laundry bill not found.');
    if (bill.status === status) return this.billModel.findById(bill._id).populate('customerId', 'name phone').populate('createdBy', 'name');

    const oldStatus = bill.status;
    bill.status = status;
    await bill.save();

    const guestName = bill.walkIn?.name ?? (await this.customerModel.findById(bill.customerId).select('name').lean())?.name ?? 'Customer';
    this.logger.log(`Laundry bill ${bill.billNumber} status ${oldStatus} → ${status} | by ${actorId}`);

    await this.auditLogService.log({
      entityType: 'LaundryBill',
      entityId: bill._id.toString(),
      action: status === 'paid' ? 'LAUNDRY_BILL_MARKED_PAID' : 'LAUNDRY_BILL_MARKED_PENDING',
      description: `Laundry bill ${bill.billNumber} (${guestName}) marked ${status} — ₦${bill.total.toLocaleString()}`,
      performedBy: actorId,
      branchId,
      details: { billNumber: bill.billNumber, guestName, oldStatus, newStatus: status, total: bill.total },
      persistForever: true,
    });

    return this.billModel.findById(bill._id).populate('customerId', 'name phone').populate('createdBy', 'name');
  }
}
