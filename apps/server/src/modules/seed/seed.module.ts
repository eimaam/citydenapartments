import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeedController } from './seed.controller';
import { SeedService } from './seed.service';
import { ProdSeedService } from './prod-seed.service';
import { User, UserSchema } from '../users/user.schema';
import { Branch, BranchSchema } from '../branches/branch.schema';
import { RoomType, RoomTypeSchema } from '../room-types/room-type.schema';
import { Room, RoomSchema } from '../rooms/room.schema';
import { Booking, BookingSchema } from '../bookings/booking.schema';
import { InventoryItem, InventoryItemSchema } from '../inventory/inventory-item.schema';
import { InventoryTransaction, InventoryTransactionSchema } from '../inventory/inventory-transaction.schema';
import { Employee, EmployeeSchema } from '../employees/employee.schema';
import { Customer, CustomerSchema } from '../customers/customer.schema';
import { Department, DepartmentSchema } from '../departments/department.schema';
import { MenuCategory, MenuCategorySchema } from '../restaurant-menu/schemas/menu-category.schema';
import { MenuItem, MenuItemSchema } from '../restaurant-menu/schemas/menu-item.schema';
import { RestaurantBanner, RestaurantBannerSchema } from '../restaurant-menu/schemas/restaurant-banner.schema';
import { DeliveryLocation, DeliveryLocationSchema } from '../restaurant-delivery/schemas/delivery-location.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: RoomType.name, schema: RoomTypeSchema },
      { name: Room.name, schema: RoomSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: InventoryItem.name, schema: InventoryItemSchema },
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: MenuCategory.name, schema: MenuCategorySchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: RestaurantBanner.name, schema: RestaurantBannerSchema },
      { name: DeliveryLocation.name, schema: DeliveryLocationSchema },
    ]),
  ],
  controllers: [SeedController],
  providers: [SeedService, ProdSeedService],
})
export class SeedModule {}
