import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class WorkspaceAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new UnauthorizedException('No authenticated user found.');

    const headerBranchId = request.headers['x-active-branch-id'];

    let activeBranchId = user.activeBranchId;
    if (headerBranchId) {
      if (user.allowedBranches.includes(headerBranchId)) {
        activeBranchId = headerBranchId;
        user.activeBranchId = headerBranchId;
      } else {
        throw new ForbiddenException('Unauthorized workspace access context.');
      }
    }

    if (user.role !== 'SuperAdmin' && !user.allowedBranches.includes(activeBranchId)) {
      throw new ForbiddenException('Unauthorized workspace access context.');
    }

    return true;
  }
}
