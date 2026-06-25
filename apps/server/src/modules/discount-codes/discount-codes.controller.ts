import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DiscountCodesService } from './discount-codes.service';
import { CreateDiscountCodeDto } from './dto/create-discount-code.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRoleEnum } from '../users/user.schema';
import { ActiveUser } from '../../common/decorators/active-user.decorator';

@Controller('discount-codes')
@UseGuards(JwtAuthGuard, RolesGuard, WorkspaceAuthGuard)
export class DiscountCodesController {
  constructor(private discountCodesService: DiscountCodesService) {}

  @Post()
  @Roles(UserRoleEnum.FRONT_OFFICE_MANAGER, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.GROUP_GM, UserRoleEnum.SUPER_ADMIN)
  generate(@Body() dto: CreateDiscountCodeDto, @ActiveUser() user: any) {
    return this.discountCodesService.generate(user.role, user.id, dto);
  }

  @Get()
  @Roles(UserRoleEnum.FRONT_OFFICE_MANAGER, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.GROUP_GM, UserRoleEnum.SUPER_ADMIN)
  findAll(@Query() query: { page?: number; limit?: number; isActive?: string; search?: string }) {
    return this.discountCodesService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRoleEnum.FRONT_OFFICE_MANAGER, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.GROUP_GM, UserRoleEnum.SUPER_ADMIN)
  findOne(@Param('id') id: string) {
    return this.discountCodesService.findOne(id);
  }

  @Post('validate')
  @Roles(UserRoleEnum.RECEPTION, UserRoleEnum.FRONT_OFFICE_MANAGER, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.GROUP_GM, UserRoleEnum.SUPER_ADMIN)
  validate(@Body('code') code: string) {
    return this.discountCodesService.validate(code);
  }

  @Patch(':id/toggle')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM)
  toggleActive(@Param('id') id: string) {
    return this.discountCodesService.toggleActive(id);
  }
}
