import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomStatus } from './room.schema';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { UserRoleEnum } from '../users/user.schema';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PaginatedQueryDto } from '../../common/dto/paginated-query.dto';

@Controller('rooms')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
export class RoomsController {
  constructor(
    private roomsService: RoomsService
  ) { }

  @Get()
  findAll(@ActiveUser() user: any, @Query() query: PaginatedQueryDto, @Query('status') status?: RoomStatus) {
    return this.roomsService.findAll({ branchId: user.activeBranchId, page: query.page, limit: query.limit, search: query.search, status });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomsService.findOne(id);
  }

  @Post()
  @Roles(UserRoleEnum.SUPER_ADMIN)
  create(@Body() dto: CreateRoomDto, @ActiveUser() user: any) {
    return this.roomsService.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(UserRoleEnum.SUPER_ADMIN)
  updateRoom(@Param('id') id: string, @Body() dto: UpdateRoomDto, @ActiveUser() user: any) {
    return this.roomsService.update(id, dto, user.id);
  }

  @Patch(':id/status')
  @Roles(UserRoleEnum.SUPER_ADMIN)
  updateStatus(@Param('id') id: string, @Body('status') status: RoomStatus, @ActiveUser() user: any) {
    return this.roomsService.updateStatus(id, status, user.id);
  }
}
