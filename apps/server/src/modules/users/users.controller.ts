import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRoleEnum } from './user.schema';

@Controller('users')
@Roles(UserRoleEnum.SUPER_ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() dto: { email: string; password: string; name: string; role: string; allowedBranches?: string[] }) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: { name?: string; role?: string; allowedBranches?: string[]; activeBranchId?: string; isActive?: boolean }) {
    return this.usersService.update(id, dto);
  }
}
