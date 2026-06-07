import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BreakfastLog, BreakfastLogSchema } from './breakfast-log.schema';
import { BreakfastController } from './breakfast.controller';
import { BreakfastService } from './breakfast.service';
import { Booking, BookingSchema } from '../bookings/booking.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BreakfastLog.name, schema: BreakfastLogSchema },
      { name: Booking.name, schema: BookingSchema },
    ]),
  ],
  controllers: [BreakfastController],
  providers: [BreakfastService],
})
export class BreakfastModule {}
