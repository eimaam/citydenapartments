import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Booking, BookingSchema } from '../bookings/booking.schema';
import { Room, RoomSchema } from '../rooms/room.schema';
import { Branch, BranchSchema } from '../branches/branch.schema';
import { BreakfastLog, BreakfastLogSchema } from '../breakfast/breakfast-log.schema';
import { User, UserSchema } from '../users/user.schema';
import { InventoryItem, InventoryItemSchema } from '../inventory/inventory-item.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: Room.name, schema: RoomSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: BreakfastLog.name, schema: BreakfastLogSchema },
      { name: User.name, schema: UserSchema },
      { name: InventoryItem.name, schema: InventoryItemSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
