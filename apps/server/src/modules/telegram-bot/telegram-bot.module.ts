import { Module, forwardRef } from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service';
import { RestaurantOrdersModule } from '../restaurant-orders/restaurant-orders.module';

@Module({
  imports: [forwardRef(() => RestaurantOrdersModule)],
  providers: [TelegramBotService],
  exports: [TelegramBotService],
})
export class TelegramBotModule {}

