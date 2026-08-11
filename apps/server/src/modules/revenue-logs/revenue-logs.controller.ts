import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RevenueLogsService } from './revenue-logs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { UserRoleEnum } from '../users/user.schema';
import { CreateRevenueLogDto } from './dto/create-revenue-log.dto';

@Controller('revenue-logs')
@UseGuards(JwtAuthGuard, RolesGuard, WorkspaceAuthGuard)
export class RevenueLogsController {
  constructor(private readonly revenueLogsService: RevenueLogsService) {}

  @Post()
  @Roles(UserRoleEnum.ACCOUNTANT, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM)
  create(@Body() dto: CreateRevenueLogDto, @ActiveUser() user: any) {
    return this.revenueLogsService.create(dto, user.activeBranchId, user.id);
  }

  @Get()
  @Roles(UserRoleEnum.ACCOUNTANT, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT, UserRoleEnum.FACILITY_MANAGER)
  findAll(
    @Query('departmentId') departmentId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @ActiveUser() user: any,
  ) {
    return this.revenueLogsService.findAll({
      branchId: user.activeBranchId,
      departmentId,
      fromDate,
      toDate,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  @Get('summary')
  @Roles(UserRoleEnum.ACCOUNTANT, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT, UserRoleEnum.FACILITY_MANAGER)
  getSummary(
    @Query('departmentId') departmentId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @ActiveUser() user: any,
  ) {
    return this.revenueLogsService.getDepartmentSummaryCards(user.activeBranchId, fromDate, toDate, departmentId);
  }

  @Get(':id')
  @Roles(UserRoleEnum.ACCOUNTANT, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT, UserRoleEnum.FACILITY_MANAGER)
  findOne(@Param('id') id: string) {
    return this.revenueLogsService.findOne(id);
  }

  @Delete(':id')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM)
  remove(@Param('id') id: string, @ActiveUser() user: any) {
    return this.revenueLogsService.remove(id, user.id, user.activeBranchId);
  }
}
