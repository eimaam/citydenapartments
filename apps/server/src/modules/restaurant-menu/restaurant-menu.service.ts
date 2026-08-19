import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { MenuCategory } from './schemas/menu-category.schema';
import { MenuItem } from './schemas/menu-item.schema';
import { RestaurantBanner } from './schemas/restaurant-banner.schema';
import { AuditLogService } from '../audit-log/audit-log.service';
import { AppConfig } from '../../config/app.config';

@Injectable()
export class RestaurantMenuService {
  private readonly logger = new Logger(RestaurantMenuService.name);
  private s3: S3Client;

  constructor(
    @InjectModel(MenuCategory.name) private categoryModel: Model<MenuCategory>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItem>,
    @InjectModel(RestaurantBanner.name) private bannerModel: Model<RestaurantBanner>,
    private readonly auditLogService: AuditLogService,
  ) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: AppConfig.R2_ENDPOINT,
      credentials: {
        accessKeyId: AppConfig.R2_ACCESS_KEY_ID,
        secretAccessKey: AppConfig.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  // ── Image Upload via Cloudflare R2 ──────────────────────────────
  async uploadImage(file: Express.Multer.File, folder = 'restaurant'): Promise<{ url: string; key: string }> {
    if (!file) throw new BadRequestException('No file provided');

    const extension = file.originalname.split('.').pop() || 'jpg';
    const uniqueKey = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: AppConfig.R2_BUCKET_NAME,
          Key: uniqueKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      const publicUrl = `${AppConfig.R2_PUBLIC_URL}/${uniqueKey}`;
      return { url: publicUrl, key: uniqueKey };
    } catch (err: any) {
      this.logger.error(`Failed to upload image to R2: ${err.message}`);
      throw new BadRequestException('Failed to upload image');
    }
  }

  // ── Categories ──────────────────────────────────────────────────
  async getCategories(branchId: string, onlyActive = true): Promise<any[]> {
    if (!branchId || !Types.ObjectId.isValid(branchId)) return [];
    const filter: any = { branchId: new Types.ObjectId(branchId) };
    if (onlyActive) filter.isActive = true;

    const categories = await this.categoryModel.find(filter).sort({ sortOrder: 1, name: 1 }).lean();

    // Get item counts per category
    const categoryCounts = await this.menuItemModel.aggregate([
      { $match: { branchId: new Types.ObjectId(branchId), isAvailable: onlyActive ? true : { $in: [true, false] } } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map(categoryCounts.map((c) => [c._id.toString(), c.count]));

    return categories.map((cat) => ({
      ...cat,
      itemCount: countMap.get(cat._id.toString()) || 0,
    }));
  }

  async createCategory(branchId: string, dto: { name: string; description?: string; icon?: string; sortOrder?: number }, user?: any) {
    if (!Types.ObjectId.isValid(branchId)) throw new BadRequestException('Invalid branch ID');
    const slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await this.categoryModel.findOne({ branchId: new Types.ObjectId(branchId), slug });
    if (existing) throw new BadRequestException(`Category with name "${dto.name}" already exists for this branch`);

    const category = new this.categoryModel({
      ...dto,
      slug,
      branchId: new Types.ObjectId(branchId),
    });
    const saved = await category.save();

    const actor = user?.name || user?.email || 'Admin';
    this.logger.log(`[AUDIT] Menu Category "${saved.name}" created by ${actor}`);

    if (user?._id || user?.sub) {
      await this.auditLogService.log({
        entityType: 'MenuCategory',
        entityId: saved._id.toString(),
        action: 'MENU_CATEGORY_CREATED',
        description: `Menu Category "${saved.name}" was created by ${actor}`,
        performedBy: user._id || user.sub,
        branchId,
        details: { name: saved.name, slug: saved.slug, icon: saved.icon },
      });
    }

    return saved;
  }

  async updateCategory(id: string, dto: any, user?: any) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid category ID');
    if (dto.name) {
      dto.slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    const existing = await this.categoryModel.findById(id).lean();
    if (!existing) throw new NotFoundException('Category not found');

    const updated = await this.categoryModel.findByIdAndUpdate(id, dto, { new: true });

    const actor = user?.name || user?.email || 'Admin';
    this.logger.log(`[AUDIT] Menu Category "${updated?.name}" updated by ${actor}`);

    if (user?._id || user?.sub) {
      await this.auditLogService.log({
        entityType: 'MenuCategory',
        entityId: id,
        action: 'MENU_CATEGORY_UPDATED',
        description: `Menu Category "${updated?.name}" was updated by ${actor}`,
        performedBy: user._id || user.sub,
        branchId: existing.branchId?.toString(),
        details: { before: existing, after: updated },
      });
    }

    return updated;
  }

  async deleteCategory(id: string, user?: any) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid category ID');
    const existing = await this.categoryModel.findById(id).lean();
    if (!existing) throw new NotFoundException('Category not found');

    const itemsCount = await this.menuItemModel.countDocuments({ categoryId: new Types.ObjectId(id) });
    if (itemsCount > 0) {
      throw new BadRequestException(`Cannot delete category because it contains ${itemsCount} menu items. Reassign or delete items first.`);
    }

    const deleted = await this.categoryModel.findByIdAndDelete(id);

    const actor = user?.name || user?.email || 'Admin';
    this.logger.log(`[AUDIT] Menu Category "${existing.name}" deleted by ${actor}`);

    if (user?._id || user?.sub) {
      await this.auditLogService.log({
        entityType: 'MenuCategory',
        entityId: id,
        action: 'MENU_CATEGORY_DELETED',
        description: `Menu Category "${existing.name}" was deleted by ${actor}`,
        performedBy: user._id || user.sub,
        branchId: existing.branchId?.toString(),
        details: { name: existing.name },
      });
    }

    return deleted;
  }

  // ── Menu Items ──────────────────────────────────────────────────
  async getMenuItems(query: {
    branchId: string;
    categoryId?: string;
    search?: string;
    isChefSpecial?: boolean;
    isAvailable?: boolean;
    onlyAvailable?: boolean;
    tags?: string;
    page?: number;
    limit?: number;
  }) {
    if (!query.branchId || !Types.ObjectId.isValid(query.branchId)) {
      return { items: [], total: 0, page: 1, limit: query.limit || 50, totalPages: 0 };
    }
    const filter: any = { branchId: new Types.ObjectId(query.branchId) };

    if (query.categoryId && query.categoryId !== 'all' && Types.ObjectId.isValid(query.categoryId)) {
      filter.categoryId = new Types.ObjectId(query.categoryId);
    }

    if (query.onlyAvailable === true || query.onlyAvailable === ('true' as any)) {
      filter.isAvailable = true;
    } else if (typeof query.isAvailable === 'boolean') {
      filter.isAvailable = query.isAvailable;
    }

    if (query.isChefSpecial !== undefined) {
      filter.isChefSpecial = query.isChefSpecial === true || query.isChefSpecial === ('true' as any);
    }

    if (query.tags) {
      const tagList = query.tags.split(',').map((t) => t.trim().toLowerCase());
      filter.tags = { $in: tagList };
    }

    if (query.search && query.search.trim()) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [{ name: searchRegex }, { description: searchRegex }, { tags: searchRegex }];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.menuItemModel
        .find(filter)
        .populate('categoryId', 'name slug icon')
        .sort({ sortOrder: 1, isAvailable: -1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.menuItemModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getMenuItemById(id: string) {
    const item = await this.menuItemModel.findById(id).populate('categoryId', 'name slug icon').lean();
    if (!item) throw new NotFoundException('Menu item not found');
    return item;
  }

  async createMenuItem(branchId: string, dto: any, user?: any) {
    const item = new this.menuItemModel({
      ...dto,
      branchId: new Types.ObjectId(branchId),
      categoryId: new Types.ObjectId(dto.categoryId),
    });
    const saved = await item.save();

    const actor = user?.name || user?.email || 'Admin';
    this.logger.log(`[AUDIT] Menu Item "${saved.name}" (₦${saved.basePrice?.toLocaleString()}) created by ${actor}`);

    if (user?._id || user?.sub) {
      await this.auditLogService.log({
        entityType: 'MenuItem',
        entityId: saved._id.toString(),
        action: 'MENU_ITEM_CREATED',
        description: `Dish "${saved.name}" (₦${saved.basePrice?.toLocaleString()}) was created by ${actor}`,
        performedBy: user._id || user.sub,
        branchId,
        details: {
          name: saved.name,
          basePrice: saved.basePrice,
          hasSizes: saved.hasSizes,
          sizes: saved.sizes,
          isChefSpecial: saved.isChefSpecial,
        },
      });
    }

    return saved;
  }

  async updateMenuItem(id: string, dto: any, user?: any) {
    if (dto.categoryId) dto.categoryId = new Types.ObjectId(dto.categoryId);
    const existing = await this.menuItemModel.findById(id).lean();
    if (!existing) throw new NotFoundException('Menu item not found');

    const updated = await this.menuItemModel
      .findByIdAndUpdate(id, dto, { new: true })
      .populate('categoryId', 'name slug icon');
    if (!updated) throw new NotFoundException('Menu item not found');

    const actor = user?.name || user?.email || 'Staff';
    const isPriceChanged = dto.basePrice !== undefined && Number(dto.basePrice) !== existing.basePrice;

    if (isPriceChanged) {
      this.logger.log(
        `[AUDIT] 💰 Price change for "${updated.name}": ₦${existing.basePrice.toLocaleString()} ➔ ₦${updated.basePrice.toLocaleString()} by ${actor}`
      );
    } else {
      this.logger.log(`[AUDIT] Menu item "${updated.name}" updated by ${actor}`);
    }

    if (user?._id || user?.sub) {
      await this.auditLogService.log({
        entityType: 'MenuItem',
        entityId: id,
        action: isPriceChanged ? 'MENU_ITEM_PRICE_CHANGED' : 'MENU_ITEM_UPDATED',
        description: isPriceChanged
          ? `Price for "${updated.name}" changed from ₦${existing.basePrice.toLocaleString()} to ₦${updated.basePrice.toLocaleString()} by ${actor}`
          : `Menu item "${updated.name}" was updated by ${actor}`,
        performedBy: user._id || user.sub,
        branchId: existing.branchId?.toString(),
        details: {
          before: {
            basePrice: existing.basePrice,
            hasSizes: existing.hasSizes,
            sizes: existing.sizes,
            optionGroups: existing.optionGroups,
            isAvailable: existing.isAvailable,
          },
          after: {
            basePrice: updated.basePrice,
            hasSizes: updated.hasSizes,
            sizes: updated.sizes,
            optionGroups: updated.optionGroups,
            isAvailable: updated.isAvailable,
          },
        },
      });
    }

    return updated;
  }

  async toggleAvailability(id: string, user?: any) {
    const item = await this.menuItemModel.findById(id);
    if (!item) throw new NotFoundException('Menu item not found');
    item.isAvailable = !item.isAvailable;
    const saved = await item.save();

    const actor = user?.name || user?.email || 'Staff';
    const statusText = saved.isAvailable ? 'IN STOCK' : 'OUT OF STOCK';
    this.logger.log(`[AUDIT] 📦 Dish "${saved.name}" stock status changed to ${statusText} by ${actor}`);

    if (user?._id || user?.sub) {
      await this.auditLogService.log({
        entityType: 'MenuItem',
        entityId: id,
        action: 'MENU_ITEM_AVAILABILITY_TOGGLED',
        description: `Dish "${saved.name}" marked as ${statusText} by ${actor}`,
        performedBy: user._id || user.sub,
        branchId: item.branchId?.toString(),
        details: { isAvailable: saved.isAvailable, name: saved.name },
      });
    }

    return saved;
  }

  async deleteMenuItem(id: string, user?: any) {
    const existing = await this.menuItemModel.findById(id).lean();
    if (!existing) throw new NotFoundException('Menu item not found');

    const deleted = await this.menuItemModel.findByIdAndDelete(id);

    const actor = user?.name || user?.email || 'Admin';
    this.logger.log(`[AUDIT] 🗑️ Menu item "${existing.name}" deleted by ${actor}`);

    if (user?._id || user?.sub) {
      await this.auditLogService.log({
        entityType: 'MenuItem',
        entityId: id,
        action: 'MENU_ITEM_DELETED',
        description: `Menu item "${existing.name}" (₦${existing.basePrice?.toLocaleString()}) was deleted by ${actor}`,
        performedBy: user._id || user.sub,
        branchId: existing.branchId?.toString(),
        details: { name: existing.name, basePrice: existing.basePrice },
      });
    }

    return { success: true, message: 'Menu item deleted successfully' };
  }

  // ── Banners ─────────────────────────────────────────────────────
  async getBanners(branchId?: string, onlyActive = true) {
    const filter: any = {};
    if (branchId) {
      filter.$or = [{ branchId: new Types.ObjectId(branchId) }, { branchId: null }];
    }
    if (onlyActive) filter.isActive = true;

    return this.bannerModel.find(filter).sort({ sortOrder: 1, createdAt: -1 }).lean();
  }

  async createBanner(dto: any, user?: any) {
    const banner = new this.bannerModel({
      ...dto,
      branchId: dto.branchId ? new Types.ObjectId(dto.branchId) : null,
    });
    const saved = await banner.save();

    const actor = user?.name || user?.email || 'Admin';
    this.logger.log(`[AUDIT] 🖼️ Promotional Banner "${saved.title}" created by ${actor}`);

    if (user?._id || user?.sub) {
      await this.auditLogService.log({
        entityType: 'RestaurantBanner',
        entityId: saved._id.toString(),
        action: 'RESTAURANT_BANNER_CREATED',
        description: `Banner "${saved.title}" created by ${actor}`,
        performedBy: user._id || user.sub,
        branchId: dto.branchId,
        details: { title: saved.title, bannerType: saved.bannerType },
      });
    }

    return saved;
  }

  async updateBanner(id: string, dto: any, user?: any) {
    if (dto.branchId !== undefined) {
      dto.branchId = dto.branchId ? new Types.ObjectId(dto.branchId) : null;
    }
    const updated = await this.bannerModel.findByIdAndUpdate(id, dto, { new: true });
    if (!updated) throw new NotFoundException('Banner not found');

    const actor = user?.name || user?.email || 'Admin';
    this.logger.log(`[AUDIT] 🖼️ Promotional Banner "${updated.title}" updated by ${actor}`);

    if (user?._id || user?.sub) {
      await this.auditLogService.log({
        entityType: 'RestaurantBanner',
        entityId: id,
        action: 'RESTAURANT_BANNER_UPDATED',
        description: `Banner "${updated.title}" updated by ${actor}`,
        performedBy: user._id || user.sub,
        branchId: updated.branchId?.toString(),
        details: { title: updated.title, isActive: updated.isActive },
      });
    }

    return updated;
  }

  async deleteBanner(id: string, user?: any) {
    const existing = await this.bannerModel.findById(id).lean();
    if (!existing) throw new NotFoundException('Banner not found');

    const deleted = await this.bannerModel.findByIdAndDelete(id);

    const actor = user?.name || user?.email || 'Admin';
    this.logger.log(`[AUDIT] 🗑️ Promotional Banner "${existing.title}" deleted by ${actor}`);

    if (user?._id || user?.sub) {
      await this.auditLogService.log({
        entityType: 'RestaurantBanner',
        entityId: id,
        action: 'RESTAURANT_BANNER_DELETED',
        description: `Banner "${existing.title}" deleted by ${actor}`,
        performedBy: user._id || user.sub,
        branchId: existing.branchId?.toString(),
        details: { title: existing.title },
      });
    }

    return { success: true };
  }
}
