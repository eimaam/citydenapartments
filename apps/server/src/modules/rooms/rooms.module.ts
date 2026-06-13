import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Room, RoomSchema } from './room.schema';
import { Booking, BookingSchema } from '../bookings/booking.schema';
import { RoomsController } from './rooms.controller';
import { RoomsService } from './rooms.service';
import { RedisService } from '../redis/redis.service';

@Module({
  imports: [MongooseModule.forFeature([
    { name: Room.name, schema: RoomSchema },
    { name: Booking.name, schema: BookingSchema },
  ])],
  controllers: [RoomsController],
  providers: [RoomsService, RedisService],
})
export class RoomsModule {}
