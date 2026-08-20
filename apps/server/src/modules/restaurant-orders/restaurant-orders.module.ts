import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RestaurantOrder, RestaurantOrderSchema } from './schemas/restaurant-order.schema';
import { MenuItem, MenuItemSchema } from '../restaurant-menu/schemas/menu-item.schema';
import { DeliveryLocation, DeliveryLocationSchema } from '../restaurant-delivery/schemas/delivery-location.schema';
import { Branch, BranchSchema } from '../branches/branch.schema';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { RestaurantOrdersService } from './restaurant-orders.service';
import { RestaurantOrdersController } from './restaurant-orders.controller';
import { PublicRestaurantOrdersController } from './public-restaurant-orders.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RestaurantOrder.name, schema: RestaurantOrderSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: DeliveryLocation.name, schema: DeliveryLocationSchema },
      { name: Branch.name, schema: BranchSchema },
    ]),
    forwardRef(() => TelegramBotModule),
    AuditLogModule,
  ],
  controllers: [RestaurantOrdersController, PublicRestaurantOrdersController],
  providers: [RestaurantOrdersService],
  exports: [RestaurantOrdersService],
})
export class RestaurantOrdersModule {}
