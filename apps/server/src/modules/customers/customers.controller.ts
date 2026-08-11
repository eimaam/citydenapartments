import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { SearchCustomerDto } from './dto/search-customer.dto';
import { UpdateBranchDiscountDto } from './dto/update-branch-discount.dto';
import { PaginatedQueryDto } from '../../common/dto/paginated-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRoleEnum } from '../users/user.schema';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { isSuperAdmin } from '../../common/utils/role.utils';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard, WorkspaceAuthGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT, UserRoleEnum.FRONT_OFFICE_MANAGER, UserRoleEnum.RECEPTION, UserRoleEnum.FACILITY_MANAGER)
  findAll(@Query() query: PaginatedQueryDto) {
    return this.customersService.findAll({ page: query.page ?? 1, limit: query.limit ?? 20, search: query.search });
  }

  @Get('search')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT, UserRoleEnum.RECEPTION, UserRoleEnum.FRONT_OFFICE_MANAGER, UserRoleEnum.FACILITY_MANAGER)
  search(@Query() query: SearchCustomerDto) {
    return this.customersService.searchByPhone(query.phone);
  }

  @Get(':id')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT, UserRoleEnum.FRONT_OFFICE_MANAGER, UserRoleEnum.RECEPTION, UserRoleEnum.FACILITY_MANAGER)
  findOne(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Get(':id/timeline')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT, UserRoleEnum.FRONT_OFFICE_MANAGER, UserRoleEnum.RECEPTION, UserRoleEnum.FACILITY_MANAGER)
  getTimeline(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('eventType') eventType?: string,
  ) {
    return this.customersService.getTimeline(id, { startDate, endDate, eventType });
  }



  @Post()
  @Roles(UserRoleEnum.RECEPTION, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.FRONT_OFFICE_MANAGER)
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Patch(':id/branch-discounts')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM)
  updateBranchDiscount(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDiscountDto,
    @ActiveUser() user: any,
  ) {
    if (!isSuperAdmin(user.role) && !user.allowedBranches.includes(dto.branchId)) {
      throw new ForbiddenException('You can only set discounts for branches you have access to.');
    }
    return this.customersService.updateBranchDiscount({
      customerId: id,
      branchId: dto.branchId,
      percentage: dto.percentage,
      reason: dto.reason,
      performedBy: user.id,
    });
  }
}
