import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { RestaurantOrdersService } from './restaurant-orders.service';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@citydenapartments/shared';
import type {
  RestaurantOrderStatusType,
  RestaurantPaymentStatusType,
  RestaurantPaymentMethodType,
} from '@citydenapartments/shared';

@Controller('restaurant-orders')
export class RestaurantOrdersController {
  constructor(private readonly ordersService: RestaurantOrdersService) {}

  @Get()
  @Roles(
    UserRole.SuperAdmin,
    UserRole.GroupGM,
    UserRole.FacilityManager,
    UserRole.FrontOfficeManager,
    UserRole.Reception,
    UserRole.KitchenStaff,
    UserRole.Accountant,
    UserRole.IT,
  )
  async getOrders(
    @Query('branchId') branchId: string,
    @Query('orderStatus') orderStatus: string,
    @Query('deliveryType') deliveryType: string,
    @Query('paymentStatus') paymentStatus: string,
    @Query('search') search: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @ActiveUser() user: any,
  ) {
    const activeBranchId = branchId || user.activeBranchId || user.allowedBranches?.[0];
    return this.ordersService.getOrders({
      branchId: activeBranchId,
      orderStatus,
      deliveryType,
      paymentStatus,
      search,
      startDate,
      endDate,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 25,
    });
  }

  @Get('analytics')
  @Roles(
    UserRole.SuperAdmin,
    UserRole.GroupGM,
    UserRole.FacilityManager,
    UserRole.FrontOfficeManager,
    UserRole.Accountant,
    UserRole.IT,
  )
  async getAnalytics(
    @Query('branchId') branchId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @ActiveUser() user: any,
  ) {
    const activeBranchId = branchId || user.activeBranchId || user.allowedBranches?.[0];
    return this.ordersService.getAnalytics(activeBranchId, startDate, endDate);
  }

  @Get(':id')
  @Roles(
    UserRole.SuperAdmin,
    UserRole.GroupGM,
    UserRole.FacilityManager,
    UserRole.FrontOfficeManager,
    UserRole.Reception,
    UserRole.KitchenStaff,
    UserRole.Accountant,
    UserRole.IT,
  )
  async getOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Patch(':id/status')
  @Roles(
    UserRole.SuperAdmin,
    UserRole.GroupGM,
    UserRole.FacilityManager,
    UserRole.FrontOfficeManager,
    UserRole.Reception,
    UserRole.KitchenStaff,
    UserRole.IT,
  )
  async updateOrderStatus(
    @Param('id') id: string,
    @Body('status') status: RestaurantOrderStatusType,
    @Body('notes') notes: string,
    @ActiveUser() user: any,
  ) {
    const actorName = `${user.name || user.email || 'Staff'} (${user.role})`;
    return this.ordersService.updateOrderStatus(id, status, actorName, notes, user);
  }

  @Patch(':id/payment-status')
  @Roles(
    UserRole.SuperAdmin,
    UserRole.GroupGM,
    UserRole.FacilityManager,
    UserRole.FrontOfficeManager,
    UserRole.Reception,
    UserRole.Accountant,
    UserRole.IT,
  )
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body('paymentStatus') paymentStatus: RestaurantPaymentStatusType,
    @Body('paymentMethod') paymentMethod: RestaurantPaymentMethodType,
    @ActiveUser() user: any,
  ) {
    const actorName = `${user.name || user.email || 'Staff'} (${user.role})`;
    return this.ordersService.updatePaymentStatus(id, paymentStatus, paymentMethod, actorName, user);
  }
}
