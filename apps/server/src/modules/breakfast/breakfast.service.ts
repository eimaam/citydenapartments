import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { BreakfastLog } from './breakfast-log.schema';
import { Booking } from '../bookings/booking.schema';
import { ServeBreakfastDto } from './dto/serve-breakfast.dto';

@Injectable()
export class BreakfastService {
  constructor(
    @InjectModel(BreakfastLog.name) private breakfastLogModel: Model<BreakfastLog>,
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
  ) {}

  async getDailyManifest(params: { branchId: string; targetDate: string; page?: number; limit?: number; search?: string }) {
    const { branchId, targetDate, page = 1, limit = 20, search } = params;
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const skip = (page - 1) * limit;

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
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$bookingId', '$$bId'] },
                    { $gte: ['$dateServed', startOfDay] },
                    { $lte: ['$dateServed', endOfDay] },
                  ],
                },
              },
            },
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
      pipeline.push({
        $match: {
          guestName: { $regex: search, $options: 'i' },
        },
      });
    }

    const result = await this.bookingModel.aggregate([
      ...pipeline,
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'count' }],
        },
      },
    ]);

    const items = result[0].items;
    const total = result[0].total[0]?.count || 0;

    return { items, total, page, limit };
  }

  async serve(dto: ServeBreakfastDto, branchId: string, userId: string) {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const alreadyServed = await this.breakfastLogModel.findOne({
      bookingId: dto.bookingId,
      dateServed: { $gte: startOfToday, $lte: endOfToday },
    });

    if (alreadyServed) {
      throw new ConflictException('Breakfast already served for this booking today.');
    }

    return this.breakfastLogModel.create({
      branchId,
      bookingId: dto.bookingId,
      roomId: dto.roomId,
      guestName: dto.guestName,
      dateServed: now,
      servingsClaimed: dto.servingsClaimed || 1,
      servedBy: userId,
    });
  }
}
