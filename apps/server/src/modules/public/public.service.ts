import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { RoomType } from '../room-types/room-type.schema';
import { Room } from '../rooms/room.schema';
import { Branch } from '../branches/branch.schema';
import { AppConfig } from '../../config/app.config';

@Injectable()
export class PublicService {
  private readonly logger = new Logger(PublicService.name);
  private s3: S3Client;

  constructor(
    @InjectModel(RoomType.name) private roomTypeModel: Model<RoomType>,
    @InjectModel(Room.name) private roomModel: Model<Room>,
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
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

  async getRoomTypes(branchCode?: string) {
    const filter: any = { isActive: true };
    if (branchCode) {
      const branch = await this.branchModel.findOne({ code: branchCode.toUpperCase(), isActive: true }).lean();
      if (!branch) return { items: [] };
      filter.branchId = branch._id;
    }

    const roomTypes = await this.roomTypeModel
      .find(filter)
      .populate('branchId', 'name code address policies')
      .lean();

    const items = roomTypes.map((rt) => ({
      id: (rt as any)._id.toString(),
      name: rt.name,
      description: (rt as any).description || '',
      basePrice: rt.basePrice,
      amenities: (rt as any).amenities || [],
      images: (rt as any).images || [],
      branch: {
        id: ((rt.branchId as any)?._id || rt.branchId).toString(),
        name: (rt.branchId as any)?.name || '',
        code: (rt.branchId as any)?.code || '',
        address: (rt.branchId as any)?.address || '',
        contactPhone: (rt.branchId as any)?.policies?.contactPhone || '',
        contactEmail: (rt.branchId as any)?.policies?.contactEmail || '',
      },
    }));

    return { items };
  }

  async getRoomTypeRooms(roomTypeId: string) {
    const roomType = await this.roomTypeModel.findById(roomTypeId).lean();
    if (!roomType) throw new NotFoundException('Room type not found.');

    const rooms = await this.roomModel
      .find({ roomTypeId, isActive: true })
      .lean();

    const items = rooms.map((r) => ({
      id: (r as any)._id.toString(),
      roomNumber: r.roomNumber,
      maxGuests: r.maxGuests,
      images: (r as any).images || [],
    }));

    return { items };
  }

  async getGallery(page: number = 1, limit: number = 20) {
    try {
      const prefix = 'gallery/';
      const command = new ListObjectsV2Command({
        Bucket: AppConfig.R2_BUCKET_NAME,
        Prefix: prefix,
        MaxKeys: 1000,
      });

      const response = await this.s3.send(command);
      const allObjects = (response.Contents || [])
        .filter((obj) => obj.Key && obj.Key !== prefix && !obj.Key.endsWith('/'))
        .sort((a, b) => ((b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)));

      const total = allObjects.length;
      const start = (page - 1) * limit;
      const pageItems = allObjects.slice(start, start + limit);

      const items = pageItems.map((obj) => ({
        url: `${AppConfig.R2_PUBLIC_URL}/${obj.Key}`,
        key: obj.Key,
      }));

      return {
        items,
        total,
        page,
        limit,
        hasMore: start + limit < total,
      };
    } catch (err) {
      this.logger.error(`Failed to list gallery objects: ${(err as Error).message}`);
      return { items: [], total: 0, page, limit, hasMore: false };
    }
  }
}
