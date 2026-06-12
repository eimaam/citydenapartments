import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BreakfastLog, BreakfastLogSchema } from './breakfast-log.schema';
import { BreakfastController } from './breakfast.controller';
import { BreakfastService } from './breakfast.service';
import { BreakfastCron } from './breakfast.cron';
import { Booking, BookingSchema } from '../bookings/booking.schema';
import { Branch, BranchSchema } from '../branches/branch.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BreakfastLog.name, schema: BreakfastLogSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: Branch.name, schema: BranchSchema },
    ]),
  ],
  controllers: [BreakfastController],
  providers: [BreakfastService, BreakfastCron],
})
export class BreakfastModule {}
