import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';
import { User, UserSchema } from '../users/user.schema';
import { Branch, BranchSchema } from '../branches/branch.schema';
import { RoomType, RoomTypeSchema } from '../room-types/room-type.schema';
import { Room, RoomSchema } from '../rooms/room.schema';
import { Booking, BookingSchema } from '../bookings/booking.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: RoomType.name, schema: RoomTypeSchema },
      { name: Room.name, schema: RoomSchema },
      { name: Booking.name, schema: BookingSchema },
    ]),
  ],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
