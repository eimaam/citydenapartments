import { Injectable, ConflictException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { startOfDay, endOfDay } from 'date-fns';
import { BreakfastLog } from './breakfast-log.schema';
import { Booking } from '../bookings/booking.schema';
import { ServeBreakfastDto } from './dto/serve-breakfast.dto';
import { escapeRegex } from '../../common/utils/escape-regex';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class BreakfastService {
  private readonly logger = new Logger(BreakfastService.name);

  constructor(
    @InjectModel(BreakfastLog.name) private breakfastLogModel: Model<BreakfastLog>,
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    private readonly redis: RedisService,
  ) {}

  async getDailyManifest(params: {
    branchId: string;
    targetDate: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const { branchId, targetDate, page = 1, limit = 20, search } = params;
    const skip = (page - 1) * limit;
    const start = startOfDay(new Date(targetDate));
    const end = endOfDay(new Date(targetDate));

    const pipeline: any[] = [
      {
        $match: {
          branchId: new mongoose.Types.ObjectId(branchId),
          bookingStatus: 'Checked_In',
        },
      },
      {
        $lookup: {
          from: 'rooms',
          localField: 'roomId',
          foreignField: '_id',
          as: 'roomInfo',
        },
      },
      { $unwind: '$roomInfo' },
      {
        $lookup: {
          from: 'breakfastlogs',
          let: { bId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$bookingId', '$$bId'] }, { $gte: ['$dateServed', start] }, { $lte: ['$dateServed', end] }] } } },
          ],
          as: 'servingRecord',
        },
      },
      {
        $project: {
          bookingId: '$_id',
          roomId: '$roomInfo._id',
          roomNumber: '$roomInfo.roomNumber',
          guestName: '$guestDetails.name',
          isServed: { $gt: [{ $size: '$servingRecord' }, 0] },
          servedAt: { $arrayElemAt: ['$servingRecord.dateServed', 0] },
        },
      },
    ];

    if (search) {
      const escaped = escapeRegex(search);
      pipeline.push({ $match: { guestName: { $regex: escaped, $options: 'i' } } });
    }

    const [result] = await this.bookingModel.aggregate([
      ...pipeline,
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ]);

    const items = result.items;
    const total = result.totalCount[0]?.count ?? 0;

    return { items, total, page, limit };
  }

  async serve(dto: ServeBreakfastDto, branchId: string, userId: string) {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const booking = await this.bookingModel.findById(dto.bookingId);
    if (!booking) {
      this.logger.warn(`Booking not found — id: ${dto.bookingId}`);
      throw new NotFoundException('Booking not found.');
    }
    if (booking.bookingStatus !== 'Checked_In') {
      this.logger.warn(`Breakfast denied — Guest ${booking.guestDetails.name} | booking not checked in`);
      throw new BadRequestException('Booking is not checked in.');
    }

    if (dto.roomId !== booking.roomId.toString()) {
      this.logger.warn(`Room mismatch — Guest ${booking.guestDetails.name} | expected ${booking.roomId}, received ${dto.roomId}`);
    }

    const alreadyServed = await this.breakfastLogModel.findOne({
      bookingId: dto.bookingId,
      dateServed: { $gte: todayStart, $lte: todayEnd },
    });

    if (alreadyServed) {
      this.logger.warn(`Breakfast duplicate — Guest ${booking.guestDetails.name} | already served today`);
      throw new ConflictException('Breakfast already served for this booking today.');
    }

    const log = await this.breakfastLogModel.create({
      branchId,
      bookingId: dto.bookingId,
      roomId: booking.roomId,
      guestName: booking.guestDetails.name,
      dateServed: now,
      servingsClaimed: dto.servingsClaimed || 1,
      servedBy: userId,
    });

    await this.redis.invalidateDashboardCache(branchId);
    this.logger.log(`Breakfast served — Guest ${booking.guestDetails.name} | Room ${booking.roomId} | by ${userId}`);
    return log;
  }
}
