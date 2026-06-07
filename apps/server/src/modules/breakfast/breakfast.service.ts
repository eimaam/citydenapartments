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

  async getDailyManifest(branchId: string, targetDate: string) {
    const result = await this.bookingModel.aggregate([
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
          let: { bId: '$_id', today: targetDate },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$bookingId', '$$bId'] }, { $eq: ['$dateServed', '$$today'] }] } } },
          ],
          as: 'servingRecord',
        },
      },
      {
        $project: {
          bookingId: '$_id',
          roomNumber: '$roomInfo.roomNumber',
          guestName: '$guestDetails.name',
          isServed: { $gt: [{ $size: '$servingRecord' }, 0] },
          servedAt: { $arrayElemAt: ['$servingRecord.servedAt', 0] },
        },
      },
    ]);

    return result;
  }

  async serve(dto: ServeBreakfastDto, branchId: string, userId: string) {
    try {
      return await this.breakfastLogModel.create({
        branchId,
        bookingId: dto.bookingId,
        roomId: dto.roomId,
        guestName: dto.guestName,
        dateServed: dto.dateServed,
        servingsClaimed: dto.servingsClaimed || 1,
        servedBy: userId,
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException('Breakfast already served for this booking on this date.');
      }
      throw error;
    }
  }
}
