import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RoomTypesService } from './room-types.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRoleEnum } from '../users/user.schema';
import { PaginatedQueryDto } from '../../common/dto/paginated-query.dto';

@Controller('room-types')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, RolesGuard)
export class RoomTypesController {
  constructor(private roomTypesService: RoomTypesService) {}

  @Get()
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.ACCOUNTANT, UserRoleEnum.IT, UserRoleEnum.RECEPTION, UserRoleEnum.FRONT_OFFICE_MANAGER)
  findAll(@ActiveUser() user: any, @Query() query: PaginatedQueryDto) {
    return this.roomTypesService.findAll({ branchId: user.activeBranchId, page: query.page, limit: query.limit, search: query.search });
  }

  @Get(':id')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.ACCOUNTANT, UserRoleEnum.IT, UserRoleEnum.RECEPTION, UserRoleEnum.FRONT_OFFICE_MANAGER)
  findOne(@Param('id') id: string) {
    return this.roomTypesService.findOne(id);
  }

  @Post()
  @Roles(UserRoleEnum.SUPER_ADMIN)
  create(@Body() dto: CreateRoomTypeDto, @ActiveUser() user: any) {
    return this.roomTypesService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(UserRoleEnum.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateRoomTypeDto, @ActiveUser() user: any) {
    return this.roomTypesService.update(id, dto, user.id);
  }
}
