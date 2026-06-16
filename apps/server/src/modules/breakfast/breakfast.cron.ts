import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { startOfDay, endOfDay } from 'date-fns';
import { BreakfastLog } from './breakfast-log.schema';
import { Booking } from '../bookings/booking.schema';
import { BookingStatus } from '@citydenapartments/shared';
import { BREAKFAST_CUTOFF_HOUR, BREAKFAST_CUTOFF_MINUTE } from './breakfast.constants';

const SYSTEM_USER_ID = new mongoose.Types.ObjectId('000000000000000000000000');

@Injectable()
export class BreakfastCron {
  private readonly logger = new Logger(BreakfastCron.name);

  constructor(
    @InjectModel(BreakfastLog.name) private breakfastLogModel: Model<BreakfastLog>,
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
  ) {}

  @Cron(`${BREAKFAST_CUTOFF_MINUTE} ${BREAKFAST_CUTOFF_HOUR} * * *`)
  async autoExpireBreakfast() {
    this.logger.log('Breakfast auto-expire triggered');

    try {
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      const unservedByBranch = await this.bookingModel.aggregate<{
        _id: mongoose.Types.ObjectId;
        bookings: Array<{
          _id: mongoose.Types.ObjectId;
          roomId: mongoose.Types.ObjectId;
          guestName: string;
        }>;
      }>([
        { $match: { bookingStatus: BookingStatus.Checked_In } },
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
                      { $gte: ['$dateServed', todayStart] },
                      { $lte: ['$dateServed', todayEnd] },
                    ],
                  },
                },
              },
            ],
            as: 'servingRecord',
          },
        },
        { $match: { servingRecord: { $size: 0 } } },
        {
          $group: {
            _id: '$branchId',
            bookings: {
              $push: {
                _id: '$_id',
                roomId: '$roomId',
                guestName: { $ifNull: ['$guestDetails.name', 'Unknown'] },
              },
            },
          },
        },
      ]);

      if (!unservedByBranch.length) {
        this.logger.log('No unserved bookings to expire');
        return;
      }

      let totalExpired = 0;
      let totalFailed = 0;
      const batchSize = 500;
      const maxRetries = 3;

      for (const group of unservedByBranch) {
        const logs = group.bookings.map((b) => ({
          branchId: group._id,
          bookingId: b._id,
          roomId: b.roomId,
          guestName: b.guestName,
          dateServed: new Date(),
          servingsClaimed: 0,
          servedBy: SYSTEM_USER_ID,
          status: 'expired',
        }));

        for (let i = 0; i < logs.length; i += batchSize) {
          const batch = logs.slice(i, i + batchSize);

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              await this.breakfastLogModel.insertMany(batch, { ordered: false });
              break;
            } catch (err) {
              if (attempt === maxRetries) {
                this.logger.warn(
                  `Batch write failed after ${maxRetries} attempts for batch ${i / batchSize + 1} of branch ${group._id}: ${(err as Error).message}`,
                );
                totalFailed += batch.length;
              } else {
                this.logger.warn(
                  `Batch write attempt ${attempt}/${maxRetries} failed for batch ${i / batchSize + 1} of branch ${group._id}, retrying...`,
                );
                await new Promise((r) => setTimeout(r, attempt * 1000));
              }
            }
          }
        }

        totalExpired += logs.length;
      }

      this.logger.log(
        `Breakfast auto-expire completed — expired ${totalExpired} breakfast(s) across ${unservedByBranch.length} branch(es)${totalFailed > 0 ? ` (${totalFailed} failed after retries)` : ''}`,
      );
    } catch (error) {
      this.logger.error(`Breakfast auto-expire failed: ${(error as Error).message}`);
    }
  }
}
