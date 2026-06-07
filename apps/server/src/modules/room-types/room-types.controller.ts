import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { RoomTypesService } from './room-types.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRoleEnum } from '../users/user.schema';

@Controller('room-types')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
export class RoomTypesController {
  constructor(private roomTypesService: RoomTypesService) {}

  @Get()
  findAll(@ActiveUser() user: any) {
    return this.roomTypesService.findAll(user.activeBranchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roomTypesService.findOne(id);
  }

  @Post()
  @Roles(UserRoleEnum.SUPER_ADMIN)
  create(@Body() dto: CreateRoomTypeDto, @ActiveUser() user: any) {
    return this.roomTypesService.create(dto, user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateRoomTypeDto>) {
    return this.roomTypesService.update(id, dto);
  }
}
