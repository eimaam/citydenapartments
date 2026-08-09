import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LaundryService } from './laundry.service';
import { CreateLaundryBillDto } from './dto/create-laundry-bill.dto';
import { UpdateLaundryStatusDto } from './dto/update-laundry-status.dto';
import { CreateLaundryItemDto, UpdateLaundryItemDto } from './dto/laundry-item.dto';
import { PaginatedQueryDto } from '../../common/dto/paginated-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRoleEnum } from '../users/user.schema';
import { ActiveUser } from '../../common/decorators/active-user.decorator';

const BILL_ROLES = [
  UserRoleEnum.SUPER_ADMIN,
  UserRoleEnum.GROUP_GM,
  UserRoleEnum.RECEPTION,
  UserRoleEnum.FRONT_OFFICE_MANAGER,
];
const BILL_READ_ROLES = [...BILL_ROLES, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.IT];
const ITEM_ROLES = [UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.IT];

@Controller('laundry')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, RolesGuard)
export class LaundryController {
  constructor(private laundryService: LaundryService) {}

  // ── catalog (price list) ─────────────────────────────────────
  @Get('catalog/items')
  @Roles(...BILL_READ_ROLES)
  getItems(@Query() query: { search?: string; category?: string; page?: number; limit?: number }) {
    return this.laundryService.getItems({
      search: query.search,
      category: query.category,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
  }

  @Get('catalog')
  @Roles(...BILL_READ_ROLES)
  getCatalog(@Query() query: { summary?: string }) {
    return this.laundryService.getCatalog(query.summary === 'true');
  }

  @Post('catalog')
  @Roles(...ITEM_ROLES)
  createItem(@Body() dto: CreateLaundryItemDto) {
    return this.laundryService.createItem(dto);
  }

  @Patch('catalog/:id')
  @Roles(...ITEM_ROLES)
  updateItem(@Param('id') id: string, @Body() dto: UpdateLaundryItemDto) {
    return this.laundryService.updateItem(id, dto);
  }

  @Delete('catalog/:id')
  @Roles(...ITEM_ROLES)
  deleteItem(@Param('id') id: string) {
    return this.laundryService.deleteItem(id);
  }

  @Patch('categories/:id')
  @Roles(...ITEM_ROLES)
  renameCategory(@Param('id') id: string, @Body() dto: { name: string }) {
    return this.laundryService.renameCategory(id, dto.name);
  }

  @Delete('categories/:id')
  @Roles(...ITEM_ROLES)
  deleteCategory(@Param('id') id: string) {
    return this.laundryService.deleteCategory(id);
  }

  // ── bills ────────────────────────────────────────────────────
  @Get('bills')
  @Roles(...BILL_READ_ROLES)
  findAll(@ActiveUser() user: any, @Query() query: PaginatedQueryDto & { status?: string; from?: string; to?: string }) {
    return this.laundryService.findAll({
      branchId: user.activeBranchId,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
      search: query.search,
      from: query.from,
      to: query.to,
    });
  }

  @Get('bills/:id')
  @Roles(...BILL_READ_ROLES)
  findOne(@Param('id') id: string, @ActiveUser() user: any) {
    return this.laundryService.findOne(id, user.activeBranchId);
  }

  @Post('bills')
  @Roles(...BILL_ROLES)
  create(@Body() dto: CreateLaundryBillDto, @ActiveUser() user: any) {
    return this.laundryService.createBill(dto, user.id, user.activeBranchId);
  }

  @Patch('bills/:id/status')
  @Roles(...BILL_ROLES)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateLaundryStatusDto, @ActiveUser() user: any) {
    return this.laundryService.updateStatus(id, dto.status, user.activeBranchId, user.id);
  }
}
