import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { RestaurantDeliveryService } from './restaurant-delivery.service';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@citydenapartments/shared';

@Controller('restaurant-delivery')
export class RestaurantDeliveryController {
  constructor(private readonly deliveryService: RestaurantDeliveryService) {}

  @Get('locations')
  async getLocations(@Query('branchId') branchId: string, @ActiveUser() user: any): Promise<any[]> {
    const activeBranchId = branchId || user.activeBranchId || user.allowedBranches?.[0];
    return this.deliveryService.getLocations(activeBranchId, false);
  }

  @Post('locations')
  @Roles(UserRole.SuperAdmin, UserRole.GroupGM, UserRole.FacilityManager, UserRole.IT)
  async createLocation(@Body() body: any, @ActiveUser() user: any) {
    const branchId = body.branchId || user.activeBranchId;
    return this.deliveryService.createLocation(branchId, body);
  }

  @Patch('locations/:id')
  @Roles(UserRole.SuperAdmin, UserRole.GroupGM, UserRole.FacilityManager, UserRole.IT)
  async updateLocation(@Param('id') id: string, @Body() body: any) {
    return this.deliveryService.updateLocation(id, body);
  }

  @Delete('locations/:id')
  @Roles(UserRole.SuperAdmin, UserRole.GroupGM, UserRole.FacilityManager, UserRole.IT)
  async deleteLocation(@Param('id') id: string) {
    return this.deliveryService.deleteLocation(id);
  }
}
