import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { UserRoleEnum } from '../users/user.schema';
import { isSuperAdmin } from '../../common/utils/role.utils';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @UseGuards(RolesGuard)
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.FRONT_OFFICE_MANAGER, UserRoleEnum.ACCOUNTANT, UserRoleEnum.RECEPTION)
  getSummary(@ActiveUser() user: any, @Query('branchId') branchId?: string) {
    const resolvedId = isSuperAdmin(user.role)
      ? branchId || undefined
      : user.activeBranchId;
    return this.dashboardService.getSummary(resolvedId, user.role);
  }

  @Get('accounting')
  @UseGuards(RolesGuard)
  @Roles(UserRoleEnum.ACCOUNTANT, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.FACILITY_MANAGER)
  getAccounting(@ActiveUser() user: any, @Query('branchId') branchId?: string) {
    const resolvedId = isSuperAdmin(user.role)
      ? branchId || undefined
      : user.activeBranchId;
    return this.dashboardService.getAccountingSummary(resolvedId);
  }
}
