import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { MenuCategory } from './schemas/menu-category.schema';
import { MenuItem } from './schemas/menu-item.schema';
import { RestaurantBanner } from './schemas/restaurant-banner.schema';
import { AppConfig } from '../../config/app.config';

@Injectable()
export class RestaurantMenuService {
  private readonly logger = new Logger(RestaurantMenuService.name);
  private s3: S3Client;

  constructor(
    @InjectModel(MenuCategory.name) private categoryModel: Model<MenuCategory>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItem>,
    @InjectModel(RestaurantBanner.name) private bannerModel: Model<RestaurantBanner>,
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

  async createCategory(branchId: string, dto: { name: string; description?: string; icon?: string; sortOrder?: number }) {
    if (!Types.ObjectId.isValid(branchId)) throw new BadRequestException('Invalid branch ID');
    const slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await this.categoryModel.findOne({ branchId: new Types.ObjectId(branchId), slug });
    if (existing) throw new BadRequestException(`Category with name "${dto.name}" already exists for this branch`);

    const category = new this.categoryModel({
      ...dto,
      slug,
      branchId: new Types.ObjectId(branchId),
    });
    return category.save();
  }

  async updateCategory(id: string, dto: any) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid category ID');
    if (dto.name) {
      dto.slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    const updated = await this.categoryModel.findByIdAndUpdate(id, dto, { new: true });
    if (!updated) throw new NotFoundException('Category not found');
    return updated;
  }

  async deleteCategory(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid category ID');
    const itemsCount = await this.menuItemModel.countDocuments({ categoryId: new Types.ObjectId(id) });
    if (itemsCount > 0) {
      throw new BadRequestException(`Cannot delete category because it contains ${itemsCount} menu items. Reassign or delete items first.`);
    }
    return this.categoryModel.findByIdAndDelete(id);
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

  async createMenuItem(branchId: string, dto: any) {
    const item = new this.menuItemModel({
      ...dto,
      branchId: new Types.ObjectId(branchId),
      categoryId: new Types.ObjectId(dto.categoryId),
    });
    return item.save();
  }

  async updateMenuItem(id: string, dto: any) {
    if (dto.categoryId) dto.categoryId = new Types.ObjectId(dto.categoryId);
    const updated = await this.menuItemModel.findByIdAndUpdate(id, dto, { new: true }).populate('categoryId', 'name slug icon');
    if (!updated) throw new NotFoundException('Menu item not found');
    return updated;
  }

  async toggleAvailability(id: string) {
    const item = await this.menuItemModel.findById(id);
    if (!item) throw new NotFoundException('Menu item not found');
    item.isAvailable = !item.isAvailable;
    return item.save();
  }

  async deleteMenuItem(id: string) {
    const deleted = await this.menuItemModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Menu item not found');
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

  async createBanner(dto: any) {
    const banner = new this.bannerModel({
      ...dto,
      branchId: dto.branchId ? new Types.ObjectId(dto.branchId) : null,
    });
    return banner.save();
  }

  async updateBanner(id: string, dto: any) {
    if (dto.branchId !== undefined) {
      dto.branchId = dto.branchId ? new Types.ObjectId(dto.branchId) : null;
    }
    const updated = await this.bannerModel.findByIdAndUpdate(id, dto, { new: true });
    if (!updated) throw new NotFoundException('Banner not found');
    return updated;
  }

  async deleteBanner(id: string) {
    const deleted = await this.bannerModel.findByIdAndDelete(id);
    if (!deleted) throw new NotFoundException('Banner not found');
    return { success: true };
  }
}
