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
import { BookingStatus } from '@citydenapartments/shared';

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
          bookingStatus: BookingStatus.Checked_In,
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
        $addFields: {
          servingStatus: {
            $cond: {
              if: { $eq: [{ $size: '$servingRecord' }, 0] },
              then: 'pending',
              else: { $ifNull: [{ $arrayElemAt: ['$servingRecord.status', 0] }, 'served'] },
            },
          },
        },
      },
      {
        $project: {
          bookingId: '$_id',
          roomId: '$roomInfo._id',
          roomNumber: '$roomInfo.roomNumber',
          guestName: '$guestDetails.name',
          breakfastStatus: '$servingStatus',
          isServed: { $eq: ['$servingStatus', 'served'] },
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
    if (booking.bookingStatus !== BookingStatus.Checked_In) {
      this.logger.warn(`Breakfast denied — Guest ${booking.guestDetails.name} | booking not checked in`);
      throw new BadRequestException('Booking is not checked in.');
    }

    if (dto.roomId !== booking.roomId.toString()) {
      this.logger.warn(`Room mismatch — Guest ${booking.guestDetails.name} | expected ${booking.roomId}, received ${dto.roomId}`);
    }

    const existingLog = await this.breakfastLogModel.findOne({
      bookingId: dto.bookingId,
      dateServed: { $gte: todayStart, $lte: todayEnd },
    });

    if (existingLog) {
      if (existingLog.status === 'expired') {
        this.logger.warn(`Breakfast expired — Guest ${booking.guestDetails.name} | cannot serve`);
        throw new BadRequestException('Breakfast has expired for this booking. Contact an admin to reset.');
      }
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
      status: 'served',
    });

    await this.redis.invalidateDashboardCache(branchId);
    this.logger.log(`Breakfast served — Guest ${booking.guestDetails.name} | Room ${booking.roomId} | by ${userId}`);
    return log;
  }

  async resetExpired(bookingId: string, branchId: string, userId: string) {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const expiredLog = await this.breakfastLogModel.findOne({
      bookingId,
      dateServed: { $gte: todayStart, $lte: todayEnd },
      status: 'expired',
    });

    if (!expiredLog) {
      const servedLog = await this.breakfastLogModel.findOne({
        bookingId,
        dateServed: { $gte: todayStart, $lte: todayEnd },
        status: 'served',
      });
      if (servedLog) {
        throw new BadRequestException('Cannot reset: breakfast already served for this booking today.');
      }
      throw new NotFoundException('No expired breakfast record found for this booking.');
    }

    await this.breakfastLogModel.deleteOne({ _id: expiredLog._id });
    await this.redis.invalidateDashboardCache(branchId);
    this.logger.log(`Breakfast expired reset — Booking ${bookingId} | by ${userId}`);
  }
}
