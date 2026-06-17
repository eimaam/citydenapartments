import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { UserRoleEnum } from '../users/user.schema';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@ActiveUser() user: any) {
    const branchId = user.role === UserRoleEnum.SUPER_ADMIN ? undefined : user.activeBranchId;
    return this.dashboardService.getSummary(branchId);
  }

  @Get('accounting')
  @UseGuards(RolesGuard)
  @Roles(UserRoleEnum.ACCOUNTANT, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.FACILITY_MANAGER)
  getAccounting(@ActiveUser() user: any) {
    const branchId = user.role === UserRoleEnum.SUPER_ADMIN ? undefined : user.activeBranchId;
    return this.dashboardService.getAccountingSummary(branchId);
  }
}
