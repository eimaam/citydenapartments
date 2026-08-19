import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeliveryLocation, DeliveryLocationSchema } from './schemas/delivery-location.schema';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { RestaurantDeliveryService } from './restaurant-delivery.service';
import { RestaurantDeliveryController } from './restaurant-delivery.controller';
import { PublicRestaurantDeliveryController } from './public-restaurant-delivery.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeliveryLocation.name, schema: DeliveryLocationSchema },
    ]),
    AuditLogModule,
  ],
  controllers: [RestaurantDeliveryController, PublicRestaurantDeliveryController],
  providers: [RestaurantDeliveryService],
  exports: [RestaurantDeliveryService],
})
export class RestaurantDeliveryModule {}
