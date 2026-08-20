import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TelegramBotService } from './telegram-bot.service';
import { RestaurantOrder, RestaurantOrderSchema } from '../restaurant-orders/schemas/restaurant-order.schema';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RestaurantOrder.name, schema: RestaurantOrderSchema },
    ]),
    AuditLogModule,
  ],
  providers: [TelegramBotService],
  exports: [TelegramBotService],
})
export class TelegramBotModule {}


