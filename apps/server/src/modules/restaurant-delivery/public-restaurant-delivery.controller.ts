import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { RestaurantDeliveryService } from './restaurant-delivery.service';

@Controller('public/restaurant-delivery')
@Public()
export class PublicRestaurantDeliveryController {
  constructor(private readonly deliveryService: RestaurantDeliveryService) {}

  @Get('locations')
  async getLocations(@Query('branchId') branchId: string) {
    if (!branchId) return [];
    return this.deliveryService.getLocations(branchId, true);
  }
}
