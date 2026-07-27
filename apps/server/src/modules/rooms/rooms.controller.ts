import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomStatus } from './room.schema';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { UserRoleEnum } from '../users/user.schema';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { QueryRoomsDto } from './dto/room-query.dto';
import { AvailableRoomsDto } from './dto/available-rooms.dto';
import { isSuperAdmin } from '../../common/utils/role.utils';

@Controller('rooms')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, RolesGuard)
export class RoomsController {
  constructor(
    private roomsService: RoomsService
  ) { }

  @Get()
  @Roles(UserRoleEnum.RECEPTION, UserRoleEnum.FRONT_OFFICE_MANAGER, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.HOUSE_KEEPER, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT)
  findAll(@ActiveUser() user: any, @Query() query: QueryRoomsDto) {
    return this.roomsService.findAll({ branchId: user.activeBranchId, page: query.page, limit: query.limit, search: query.search, status: query.status as any });
  }

  @Get('available')
  @Roles(UserRoleEnum.RECEPTION, UserRoleEnum.FRONT_OFFICE_MANAGER, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT)
  findAvailable(@ActiveUser() user: any, @Query() query: AvailableRoomsDto) {
    return this.roomsService.findAvailable(
      new Date(query.checkIn),
      new Date(query.checkOut),
      user.activeBranchId,
    );
  }

  @Get(':id')
  @Roles(UserRoleEnum.RECEPTION, UserRoleEnum.FRONT_OFFICE_MANAGER, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.HOUSE_KEEPER, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT)
  findOne(@Param('id') id: string, @ActiveUser() user: any) {
    return this.roomsService.findOne(id, user);
  }

  @Post()
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.IT)
  create(@Body() dto: CreateRoomDto, @ActiveUser() user: any) {
    if (!dto.branchId || !isSuperAdmin(user.role)) {
      dto.branchId = user.activeBranchId;
    }
    if (!dto.branchId) {
      throw new BadRequestException('No active branch selected. Set a branch or provide branchId.');
    }
    return this.roomsService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.IT)
  updateRoom(@Param('id') id: string, @Body() dto: UpdateRoomDto, @ActiveUser() user: any) {
    return this.roomsService.update(id, dto, user.id, user);
  }

  @Patch(':id/status')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.FRONT_OFFICE_MANAGER, UserRoleEnum.HOUSE_KEEPER, UserRoleEnum.RECEPTION, UserRoleEnum.IT)
  updateStatus(@Param('id') id: string, @Body() body: UpdateRoomStatusDto, @ActiveUser() user: any) {
    return this.roomsService.updateStatus(id, body.status as unknown as RoomStatus, user.id, user);
  }
}
