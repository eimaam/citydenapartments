import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isSuperAdmin } from '../utils/role.utils';

@Injectable()
export class WorkspaceAuthGuard implements CanActivate {
  private readonly logger = new Logger(WorkspaceAuthGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn(`No authenticated user — ${request.method} ${request.url}`);
      throw new UnauthorizedException('No authenticated user found.');
    }

    const headerBranchId = request.headers['x-active-branch-id'];

    let activeBranchId = user.activeBranchId;
    if (headerBranchId) {
      if (user.allowedBranches.includes(headerBranchId)) {
        activeBranchId = headerBranchId;
        user.activeBranchId = headerBranchId;
      } else {
        this.logger.warn(`Branch denied — ${user.email} tried branch ${headerBranchId}`);
        throw new ForbiddenException('Unauthorized workspace access context.');
      }
    }

    if (!isSuperAdmin(user.role) && !user.allowedBranches.includes(activeBranchId)) {
      this.logger.warn(`Workspace denied — ${user.email} no access to ${activeBranchId}`);
      throw new ForbiddenException('Unauthorized workspace access context.');
    }

    return true;
  }
}
