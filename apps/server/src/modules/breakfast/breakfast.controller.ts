import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { BreakfastService } from './breakfast.service';
import { ServeBreakfastDto } from './dto/serve-breakfast.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedQueryDto } from '../../common/dto/paginated-query.dto';
import { format } from 'date-fns';
import { UserRoleEnum } from '../users/user.schema';

@Controller('breakfast')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard)
export class BreakfastController {
  constructor(private breakfastService: BreakfastService) {}

  @Get('manifest')
  getManifest(@ActiveUser() user: any, @Query() query: PaginatedQueryDto, @Query('date') date: string) {
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');
    return this.breakfastService.getDailyManifest({
      branchId: user.activeBranchId,
      targetDate,
      page: query.page,
      limit: query.limit,
      search: query.search,
    });
  }

  @Post('serve')
  @UseGuards(RolesGuard)
  @Roles(UserRoleEnum.KITCHEN_STAFF, UserRoleEnum.SUPER_ADMIN, UserRoleEnum.BRANCH_MANAGER)
  serve(@Body() dto: ServeBreakfastDto, @ActiveUser() user: any) {
    return this.breakfastService.serve(dto, user.activeBranchId, user.id);
  }
}
