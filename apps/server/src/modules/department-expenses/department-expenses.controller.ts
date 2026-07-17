import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DepartmentExpensesService } from './department-expenses.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { UserRoleEnum } from '../users/user.schema';
import { CreateDepartmentExpenseDto } from './dto/create.dto';
import { UpdateDepartmentExpenseDto } from './dto/update.dto';

@Controller('department-expenses')
@UseGuards(JwtAuthGuard, RolesGuard, WorkspaceAuthGuard)
export class DepartmentExpensesController {
  constructor(private readonly expensesService: DepartmentExpensesService) {}

  @Post()
  @Roles(UserRoleEnum.ACCOUNTANT, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM)
  create(@Body() dto: CreateDepartmentExpenseDto, @ActiveUser() user: any) {
    return this.expensesService.create(dto, user.id);
  }

  @Get()
  @Roles(UserRoleEnum.ACCOUNTANT, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT)
  findAll(
    @Query('departmentId') departmentId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @ActiveUser() user: any,
  ) {
    return this.expensesService.findAll({
      branchId: user.activeBranchId,
      departmentId,
      fromDate,
      toDate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('groups')
  @Roles(UserRoleEnum.ACCOUNTANT, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT)
  getGroups(@ActiveUser() user: any) {
    return this.expensesService.getGroupedTotals(user.activeBranchId);
  }

  @Get(':id')
  @Roles(UserRoleEnum.ACCOUNTANT, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT)
  findOne(@Param('id') id: string) {
    return this.expensesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRoleEnum.ACCOUNTANT, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM)
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentExpenseDto, @ActiveUser() user: any) {
    return this.expensesService.update(id, dto, user.id);
  }
}
