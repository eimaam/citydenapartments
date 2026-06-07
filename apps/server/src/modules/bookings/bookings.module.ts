import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Booking, BookingSchema } from './booking.schema';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { Room, RoomSchema } from '../rooms/room.schema';
import { RoomType, RoomTypeSchema } from '../room-types/room-type.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Room.name, schema: RoomSchema },
      { name: RoomType.name, schema: RoomTypeSchema },
    ]),
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
