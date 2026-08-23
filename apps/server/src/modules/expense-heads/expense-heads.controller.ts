import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ExpenseHeadsService } from './expense-heads.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { UserRoleEnum } from '../users/user.schema';
import { CreateExpenseHeadDto } from './dto/create-expense-head.dto';
import { UpdateExpenseHeadDto } from './dto/update-expense-head.dto';

@Controller('expense-heads')
@UseGuards(JwtAuthGuard, RolesGuard, WorkspaceAuthGuard)
export class ExpenseHeadsController {
  constructor(private readonly expenseHeadsService: ExpenseHeadsService) {}

  @Post()
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT, UserRoleEnum.ACCOUNTANT)
  create(@Body() dto: CreateExpenseHeadDto, @ActiveUser() user: any) {
    return this.expenseHeadsService.create(dto, user.id);
  }

  @Get()
  @Roles(
    UserRoleEnum.SUPER_ADMIN,
    UserRoleEnum.GROUP_GM,
    UserRoleEnum.IT,
    UserRoleEnum.ACCOUNTANT,
    UserRoleEnum.FACILITY_MANAGER,
  )
  findAll(
    @Query('type') type?: string,
    @Query('branchId') branchId?: string,
    @Query('includeInactive') includeInactive?: string,
    @ActiveUser() user?: any,
  ) {
    const resolvedBranchId = branchId || user?.activeBranchId;
    return this.expenseHeadsService.findAll({
      type,
      branchId: resolvedBranchId,
      includeInactive: includeInactive === 'true',
    });
  }

  @Get('summary')
  @Roles(
    UserRoleEnum.SUPER_ADMIN,
    UserRoleEnum.GROUP_GM,
    UserRoleEnum.IT,
    UserRoleEnum.ACCOUNTANT,
    UserRoleEnum.FACILITY_MANAGER,
  )
  getSummary(@Query('branchId') branchId?: string, @ActiveUser() user?: any) {
    const resolvedBranchId = branchId || user?.activeBranchId;
    return this.expenseHeadsService.getGroupedSummary(resolvedBranchId);
  }

  @Get(':id')
  @Roles(
    UserRoleEnum.SUPER_ADMIN,
    UserRoleEnum.GROUP_GM,
    UserRoleEnum.IT,
    UserRoleEnum.ACCOUNTANT,
    UserRoleEnum.FACILITY_MANAGER,
  )
  findOne(@Param('id') id: string) {
    return this.expenseHeadsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT, UserRoleEnum.ACCOUNTANT)
  update(@Param('id') id: string, @Body() dto: UpdateExpenseHeadDto, @ActiveUser() user: any) {
    return this.expenseHeadsService.update(id, dto, user.id);
  }

  @Patch(':id/toggle')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT, UserRoleEnum.ACCOUNTANT)
  toggleActive(@Param('id') id: string, @ActiveUser() user: any) {
    return this.expenseHeadsService.toggleActive(id, user.id);
  }
}
