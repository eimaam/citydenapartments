import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { startOfDay, endOfDay } from 'date-fns';
import { BreakfastLog } from './breakfast-log.schema';
import { Booking } from '../bookings/booking.schema';
import { Branch } from '../branches/branch.schema';

@Injectable()
export class BreakfastCron {
  private readonly logger = new Logger(BreakfastCron.name);

  constructor(
    @InjectModel(BreakfastLog.name) private breakfastLogModel: Model<BreakfastLog>,
    @InjectModel(Booking.name) private bookingModel: Model<Booking>,
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
  ) {}

  @Cron('30 10 * * *')
  async autoExpireBreakfast() {
    this.logger.log('Breakfast auto-expire triggered at 10:30');

    try {
      const branches = await this.branchModel.find({}, '_id name code').lean();
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());

      for (const branch of branches) {
        const checkedInBookings = await this.bookingModel.find(
          {
            branchId: branch._id,
            bookingStatus: 'checked_in',
          },
          '_id',
        ).lean();

        if (!checkedInBookings.length) continue;

        const bookingIds = checkedInBookings.map((b) => b._id);

        const servedToday = await this.breakfastLogModel.find(
          {
            bookingId: { $in: bookingIds },
            dateServed: { $gte: todayStart, $lte: todayEnd },
          },
          'bookingId',
        ).lean();

        const servedIds = new Set(servedToday.map((s) => s.bookingId.toString()));

        const toExpire = checkedInBookings.filter(
          (b) => !servedIds.has(b._id.toString()),
        );

        if (!toExpire.length) continue;

        const bookingDetails = await this.bookingModel.find(
          { _id: { $in: toExpire.map((b) => b._id) } },
          'roomId guestDetails',
        ).lean();

        const detailsMap = new Map(
          bookingDetails.map((bd) => [bd._id.toString(), bd]),
        );

        const enrichedLogs = toExpire.map((b) => {
          const details = detailsMap.get(b._id.toString());
          return {
            branchId: branch._id,
            bookingId: b._id,
            roomId: details?.roomId || new mongoose.Types.ObjectId(),
            guestName: (details?.guestDetails as { name?: string })?.name || 'Unknown',
            dateServed: new Date(),
            servingsClaimed: 0,
            servedBy: new mongoose.Types.ObjectId('000000000000000000000000'),
            status: 'expired',
          };
        });

        await this.breakfastLogModel.insertMany(enrichedLogs);

        this.logger.log(
          `Branch ${branch.code} — Expired ${enrichedLogs.length} breakfast(s)`,
        );
      }

      this.logger.log('Breakfast auto-expire completed');
    } catch (error) {
      this.logger.error(`Breakfast auto-expire failed: ${(error as Error).message}`);
    }
  }
}
