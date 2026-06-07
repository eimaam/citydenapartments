import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { BreakfastService } from './breakfast.service';
import { ServeBreakfastDto } from './dto/serve-breakfast.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('breakfast')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
export class BreakfastController {
  constructor(private breakfastService: BreakfastService) {}

  @Get('manifest')
  getManifest(@ActiveUser() user: any, @Query('date') date: string) {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    return this.breakfastService.getDailyManifest(user.activeBranchId, targetDate);
  }

  @Post('serve')
  @UseGuards(RolesGuard)
  @Roles('KitchenStaff', 'SuperAdmin')
  serve(@Body() dto: ServeBreakfastDto, @ActiveUser() user: any) {
    return this.breakfastService.serve(dto, user.activeBranchId, user.id);
  }
}
