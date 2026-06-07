import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { ActiveUser } from '../../common/decorators/active-user.decorator';

@Controller('bookings')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Get()
  findAll(@ActiveUser() user: any) {
    return this.bookingsService.findAll(user.activeBranchId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bookingsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBookingDto, @ActiveUser() user: any) {
    return this.bookingsService.createWalkInBooking(dto, user.id, user.activeBranchId);
  }

  @Post(':id/check-in')
  checkIn(@Param('id') id: string, @ActiveUser() user: any) {
    return this.bookingsService.checkIn(id, user.id);
  }

  @Post(':id/check-out')
  checkOut(@Param('id') id: string, @ActiveUser() user: any) {
    return this.bookingsService.checkOut(id, user.id);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @ActiveUser() user: any) {
    return this.bookingsService.cancel(id, user.id);
  }
}
