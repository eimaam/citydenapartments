import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRoleEnum } from '../users/user.schema';
import { ActiveUser } from '../../common/decorators/active-user.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard, WorkspaceAuthGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM)
  findAll(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @Query('action') action: string,
    @Query('branchId') branchId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @ActiveUser() user: any,
  ) {
    return this.auditLogService.findAll({
      entityType,
      entityId,
      action,
      branchId: branchId || user.activeBranchId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }
}
