import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeliveryLocation, DeliveryLocationSchema } from './schemas/delivery-location.schema';
import { RestaurantDeliveryService } from './restaurant-delivery.service';
import { RestaurantDeliveryController } from './restaurant-delivery.controller';
import { PublicRestaurantDeliveryController } from './public-restaurant-delivery.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeliveryLocation.name, schema: DeliveryLocationSchema },
    ]),
  ],
  controllers: [RestaurantDeliveryController, PublicRestaurantDeliveryController],
  providers: [RestaurantDeliveryService],
  exports: [RestaurantDeliveryService],
})
export class RestaurantDeliveryModule {}
