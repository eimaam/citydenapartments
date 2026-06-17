import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from './booking.schema';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Room, RoomSchema } from '../rooms/room.schema';
import { RoomType, RoomTypeSchema } from '../room-types/room-type.schema';
import { BreakfastLog, BreakfastLogSchema } from '../breakfast/breakfast-log.schema';
import { Customer, CustomerSchema } from '../customers/customer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Room.name, schema: RoomSchema },
      { name: RoomType.name, schema: RoomTypeSchema },
      { name: BreakfastLog.name, schema: BreakfastLogSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
