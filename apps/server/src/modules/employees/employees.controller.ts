import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { PaginatedQueryDto } from '../../common/dto/paginated-query.dto';
import { SearchEmployeeDto } from './dto/search-employee.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRoleEnum } from '../users/user.schema';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { isAdminOrGroupGm } from '../../common/utils/role.utils';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard, WorkspaceAuthGuard)
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Get()
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT, UserRoleEnum.STORE_MANAGER, UserRoleEnum.STORE_KEEPER)
  findAll(@ActiveUser() user: any, @Query() query: PaginatedQueryDto & { includeInactive?: string }) {
    return this.employeesService.findAll({
      branchId: user.activeBranchId,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      includeInactive: query.includeInactive === 'true',
    });
  }

  @Get('search')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT, UserRoleEnum.STORE_MANAGER, UserRoleEnum.STORE_KEEPER)
  search(@ActiveUser() user: any, @Query() query: SearchEmployeeDto) {
    return this.employeesService.searchByName(user.activeBranchId, query.q);
  }

  @Post()
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT)
  create(@Body() dto: CreateEmployeeDto, @ActiveUser() user: any) {
    if (!isAdminOrGroupGm(user.role)) {
      dto.branchId = user.activeBranchId;
    }
    return this.employeesService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT)
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Get(':id')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT, UserRoleEnum.STORE_MANAGER, UserRoleEnum.STORE_KEEPER)
  findOne(@Param('id') id: string, @ActiveUser() user: any) {
    return this.employeesService.findById(id, user);
  }
}
