import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { PaginatedQueryDto } from '../../common/dto/paginated-query.dto';
import { SearchEmployeeDto } from './dto/search-employee.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRoleEnum } from '../users/user.schema';
import { ActiveUser } from '../../common/decorators/active-user.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Get()
  @Roles(UserRoleEnum.STORE_KEEPER, UserRoleEnum.STORE_MANAGER, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.ACCOUNTANT, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.GROUP_GM)
  findAll(@ActiveUser() user: any, @Query() query: PaginatedQueryDto) {
    return this.employeesService.findAll({
      branchId: user.activeBranchId,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
    });
  }

  @Get('search')
  @Roles(UserRoleEnum.STORE_KEEPER, UserRoleEnum.STORE_MANAGER, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.ACCOUNTANT, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.GROUP_GM)
  search(@ActiveUser() user: any, @Query() query: SearchEmployeeDto) {
    return this.employeesService.searchByName(user.activeBranchId, query.q);
  }

  @Get(':id')
  @Roles(UserRoleEnum.STORE_KEEPER, UserRoleEnum.STORE_MANAGER, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.ACCOUNTANT, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.GROUP_GM)
  findOne(@Param('id') id: string) {
    return this.employeesService.findById(id);
  }
}
