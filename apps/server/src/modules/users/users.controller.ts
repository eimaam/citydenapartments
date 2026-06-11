import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRoleEnum } from './user.schema';
import { PaginatedQueryDto } from '../../common/dto/paginated-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard, WorkspaceAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.BRANCH_MANAGER)
  findAll(@Query() query: PaginatedQueryDto, @ActiveUser() user: any) {
    return this.usersService.findAll(
      { page: query.page, limit: query.limit, search: query.search },
      { role: user.role, activeBranchId: user.activeBranchId },
    );
  }

  @Get(':id')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.BRANCH_MANAGER)
  findOne(@Param('id') id: string, @ActiveUser() user: any) {
    return this.usersService.findOne(id, { role: user.role, activeBranchId: user.activeBranchId });
  }

  @Post()
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.BRANCH_MANAGER)
  create(@Body() dto: CreateUserDto, @ActiveUser() user: any) {
    return this.usersService.create(dto, { role: user.role, activeBranchId: user.activeBranchId });
  }

  @Patch(':id')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.BRANCH_MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @ActiveUser() user: any) {
    return this.usersService.update(id, dto, { role: user.role, activeBranchId: user.activeBranchId });
  }

  @Post(':id/reset-password')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.BRANCH_MANAGER)
  resetPassword(@Param('id') id: string, @ActiveUser() user: any) {
    return this.usersService.resetPassword(id, { role: user.role, activeBranchId: user.activeBranchId });
  }
}
