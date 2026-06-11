import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingsDto } from './dto/query-bookings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRoleEnum } from '../users/user.schema';
import { ActiveUser } from '../../common/decorators/active-user.decorator';

@Controller('bookings')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Get()
  findAll(
    @ActiveUser() user: any,
    @Query() query: QueryBookingsDto,
  ) {
    return this.bookingsService.findAll({
      branchId: user.activeBranchId,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
      search: query.search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @ActiveUser() user: any) {
    return this.bookingsService.findOne(id, user.activeBranchId);
  }

  @Post()
  @Roles(UserRoleEnum.RECEPTION, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.BRANCH_MANAGER)
  create(@Body() dto: CreateBookingDto, @ActiveUser() user: any) {
    return this.bookingsService.createWalkInBooking(dto, user.id, user.activeBranchId);
  }

  @Post(':id/check-in')
  @Roles(UserRoleEnum.RECEPTION, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.BRANCH_MANAGER)
  checkIn(@Param('id') id: string, @ActiveUser() user: any) {
    return this.bookingsService.checkIn(id, user.id, user.activeBranchId);
  }

  @Post(':id/check-out')
  @Roles(UserRoleEnum.RECEPTION, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.BRANCH_MANAGER)
  checkOut(@Param('id') id: string, @ActiveUser() user: any) {
    return this.bookingsService.checkOut(id, user.id, user.activeBranchId);
  }

  @Post(':id/cancel')
  @Roles(UserRoleEnum.RECEPTION, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.BRANCH_MANAGER)
  cancel(@Param('id') id: string, @ActiveUser() user: any) {
    return this.bookingsService.cancel(id, user.id, user.activeBranchId);
  }
}
