import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, UnauthorizedException } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRoleEnum } from '../users/user.schema';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { hasElevatedRole, isAdminOrGroupGm } from '../../common/utils/role.utils';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Controller('departments')
@UseGuards(JwtAuthGuard, RolesGuard, WorkspaceAuthGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT)
  create(@Body() dto: CreateDepartmentDto, @ActiveUser() user: any) {
    if (!isAdminOrGroupGm(user.role)) {
      if (!user.allowedBranches.includes(dto.branchId)) {
        throw new UnauthorizedException('You do not have access to this branch.');
      }
    }
    return this.departmentsService.create(dto, user.id);
  }

  @Get()
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.ACCOUNTANT)
  findAll(@Query('branchId') branchId: string, @Query('includeDeleted') includeDeleted: string, @ActiveUser() user: any) {
    const resolvedBranchId = branchId || user.activeBranchId;
    if (!hasElevatedRole(user.role)) {
      if (!user.allowedBranches.includes(resolvedBranchId)) {
        throw new UnauthorizedException('You do not have access to this branch.');
      }
    }
    return this.departmentsService.findAll(resolvedBranchId, includeDeleted === 'true');
  }

  @Get(':id')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.ACCOUNTANT)
  findOne(@Param('id') id: string, @ActiveUser() user: any) {
    return this.departmentsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT)
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto, @ActiveUser() user: any) {
    return this.departmentsService.update(id, dto, user.id);
  }

  // @Delete(':id')
  // @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT)
  // remove(@Param('id') id: string, @ActiveUser() user: any) {
  //   return this.departmentsService.softDelete(id, user.id);
  // }
}
