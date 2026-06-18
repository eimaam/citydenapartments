import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { SearchCustomerDto } from './dto/search-customer.dto';
import { PaginatedQueryDto } from '../../common/dto/paginated-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRoleEnum } from '../users/user.schema';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.FRONT_OFFICE_MANAGER, UserRoleEnum.ACCOUNTANT, UserRoleEnum.IT)
  findAll(@Query() query: PaginatedQueryDto) {
    return this.customersService.findAll({ page: query.page ?? 1, limit: query.limit ?? 20, search: query.search });
  }

  @Get('search')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.FRONT_OFFICE_MANAGER, UserRoleEnum.ACCOUNTANT, UserRoleEnum.IT, UserRoleEnum.RECEPTION, UserRoleEnum.STORE_MANAGER, UserRoleEnum.STORE_KEEPER)
  search(@Query() query: SearchCustomerDto) {
    return this.customersService.searchByPhone(query.phone);
  }

  @Get(':id')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.FRONT_OFFICE_MANAGER, UserRoleEnum.ACCOUNTANT, UserRoleEnum.IT)
  findOne(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Post()
  @Roles(UserRoleEnum.RECEPTION, UserRoleEnum.FRONT_OFFICE_MANAGER, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.SUPER_ADMIN)
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }
}
