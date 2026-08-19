import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { RestaurantOrdersService } from './restaurant-orders.service';

@Controller('public/restaurant-orders')
@Public()
export class PublicRestaurantOrdersController {
  constructor(private readonly ordersService: RestaurantOrdersService) {}

  @Post()
  async placeOrder(@Body() body: any) {
    return this.ordersService.placeOrder(body);
  }

  @Get('track/:orderNumber')
  async trackOrder(@Param('orderNumber') orderNumber: string) {
    return this.ordersService.trackOrder(orderNumber);
  }

  @Get('track-phone')
  async trackOrdersByPhone(@Query('phone') phone: string) {
    if (!phone) return [];
    return this.ordersService.trackOrdersByPhone(phone);
  }
}
