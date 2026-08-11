import { Controller, Get, Post, Patch, Body, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { format } from 'date-fns';
import { InventoryService } from './inventory.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { RestockDto } from './dto/restock.dto';
import { IssueDto } from './dto/issue.dto';
import { ReportSpoilageDto, QuerySpoilageDto } from './dto/spoilage.dto';
import { TransferItemDto } from './dto/transfer-item.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WorkspaceAuthGuard } from '../../common/guards/workspace-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { QueryInventoryItemsDto } from '../../common/dto/query-inventory-items.dto';
import { QueryTransactionsDto } from '../../common/dto/query-transactions.dto';
import { QuerySnapshotsDto } from '../../common/dto/query-snapshots.dto';
import { UserRoleEnum } from '../users/user.schema';

@Controller('inventory')
@UseGuards(JwtAuthGuard, WorkspaceAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('items')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.STORE_MANAGER, UserRoleEnum.STORE_KEEPER, UserRoleEnum.ACCOUNTANT, UserRoleEnum.FACILITY_MANAGER)
  findAllItems(
    @ActiveUser() user: any,
    @Query() query: QueryInventoryItemsDto,
  ): Promise<{ items: Record<string, any>[]; total: number; page: number; limit: number }> {
    return this.inventoryService.findAllItems({
      branchId: user.activeBranchId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      departmentId: query.departmentId,
      category: query.category,
      lowStock: query.lowStock === 'true',
    });
  }

  @Get('department-summaries')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.STORE_MANAGER, UserRoleEnum.STORE_KEEPER, UserRoleEnum.ACCOUNTANT, UserRoleEnum.FACILITY_MANAGER)
  getDepartmentSummaries(@ActiveUser() user: any) {
    return this.inventoryService.getDepartmentSummaries(user.activeBranchId);
  }

  @Get('export/spot-check')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.STORE_MANAGER, UserRoleEnum.STORE_KEEPER, UserRoleEnum.ACCOUNTANT, UserRoleEnum.FACILITY_MANAGER)
  exportSpotCheck(@ActiveUser() user: any, @Query('departmentId') departmentId?: string) {
    return this.inventoryService.exportSpotCheck(user.activeBranchId, departmentId);
  }

  @Get('export/csv')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.STORE_MANAGER, UserRoleEnum.STORE_KEEPER, UserRoleEnum.ACCOUNTANT, UserRoleEnum.FACILITY_MANAGER)
  async exportCsv(@ActiveUser() user: any, @Res() res: Response, @Query('departmentId') departmentId?: string) {
    const data = await this.inventoryService.exportSpotCheck(user.activeBranchId, departmentId);
    let csv = 'S/N,Item Name,Department,Category,Unit,Current Stock,Reorder Level,Unit Price (NGN),Stock Value (NGN),Expiry Date\n';
    data.items.forEach((item, idx) => {
      csv += `${idx + 1},"${item.name.replace(/"/g, '""')}","${item.departmentName}","${item.category}","${item.unit}",${item.currentStock},${item.reorderLevel},${item.unitPrice},${item.stockValue},"${item.expiryDate}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="spot-check-${data.departmentName.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.csv"`);
    res.status(200).send(csv);
  }

  @Get('items/:id')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.STORE_MANAGER, UserRoleEnum.STORE_KEEPER, UserRoleEnum.ACCOUNTANT, UserRoleEnum.FACILITY_MANAGER)
  findOneItem(@Param('id') id: string, @ActiveUser() user: any): Promise<Record<string, any>> {
    return this.inventoryService.findOneItem(id, user.activeBranchId);
  }

  @Post('items')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.STORE_MANAGER, UserRoleEnum.STORE_KEEPER)
  createItem(@Body() dto: CreateItemDto, @ActiveUser() user: any) {
    return this.inventoryService.createItem(dto, user.id, user.activeBranchId);
  }

  @Patch('items/:id')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.STORE_MANAGER, UserRoleEnum.STORE_KEEPER, UserRoleEnum.ACCOUNTANT)
  updateItem(@Param('id') id: string, @Body() dto: UpdateItemDto, @ActiveUser() user: any) {
    return this.inventoryService.updateItem(id, dto, user.id, user.activeBranchId);
  }

  @Post('items/:id/restock')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.STORE_MANAGER, UserRoleEnum.ACCOUNTANT)
  restock(@Param('id') id: string, @Body() dto: RestockDto, @ActiveUser() user: any) {
    return this.inventoryService.restock(id, dto, user.id, user.activeBranchId);
  }

  @Post('items/:id/issue')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.STORE_MANAGER, UserRoleEnum.STORE_KEEPER)
  issue(@Param('id') id: string, @Body() dto: IssueDto, @ActiveUser() user: any) {
    return this.inventoryService.issue(id, dto, user.id, user.activeBranchId);
  }

  @Post('items/:id/transfer')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.STORE_MANAGER, UserRoleEnum.STORE_KEEPER)
  transferItem(@Param('id') id: string, @Body() dto: TransferItemDto, @ActiveUser() user: any) {
    return this.inventoryService.transferItem(id, dto, user.id, user.activeBranchId);
  }

  @Get('transactions')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.STORE_MANAGER, UserRoleEnum.STORE_KEEPER, UserRoleEnum.ACCOUNTANT, UserRoleEnum.FACILITY_MANAGER)
  findTransactions(
    @ActiveUser() user: any,
    @Query() query: QueryTransactionsDto,
  ) {
    return this.inventoryService.findTransactions({
      branchId: user.activeBranchId,
      page: query.page,
      limit: query.limit,
      itemId: query.itemId,
      type: query.type,
      from: query.from,
      to: query.to,
    });
  }

  @Post('items/:id/spoilage')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.STORE_MANAGER, UserRoleEnum.ACCOUNTANT)
  reportSpoilage(@Param('id') id: string, @Body() dto: ReportSpoilageDto, @ActiveUser() user: any) {
    return this.inventoryService.reportSpoilage(id, dto, user.id, user.activeBranchId);
  }

  @Get('spoilage')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.STORE_MANAGER, UserRoleEnum.ACCOUNTANT, UserRoleEnum.FACILITY_MANAGER)
  findSpoilageReports(@ActiveUser() user: any, @Query() query: QuerySpoilageDto) {
    return this.inventoryService.findSpoilageReports({
      branchId: user.activeBranchId,
      page: query.page,
      limit: query.limit,
      status: query.status,
      from: query.from,
      to: query.to,
      itemId: query.itemId,
    });
  }

  @Get('spoilage/:id')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.STORE_MANAGER, UserRoleEnum.ACCOUNTANT, UserRoleEnum.FACILITY_MANAGER)
  findOneSpoilage(@Param('id') id: string, @ActiveUser() user: any) {
    return this.inventoryService.findOneSpoilage(id, user.activeBranchId);
  }

  @Patch('spoilage/:id/approve')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM)
  approveSpoilage(@Param('id') id: string, @ActiveUser() user: any) {
    return this.inventoryService.approveSpoilage(id, user.id, user.activeBranchId);
  }

  @Patch('spoilage/:id/reject')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM)
  rejectSpoilage(@Param('id') id: string, @ActiveUser() user: any) {
    return this.inventoryService.rejectSpoilage(id, user.id, user.activeBranchId);
  }

  @Get('snapshots')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.STORE_MANAGER, UserRoleEnum.ACCOUNTANT, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.IT)
  findSnapshots(
    @ActiveUser() user: any,
    @Query() query: QuerySnapshotsDto,
  ) {
    return this.inventoryService.findSnapshots({
      branchId: user.activeBranchId,
      page: query.page,
      limit: query.limit,
      from: query.from,
      to: query.to,
    });
  }

  @Post('snapshots/close')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.STORE_MANAGER, UserRoleEnum.ACCOUNTANT)
  manualClose() {
    return this.inventoryService.autoCloseDay();
  }
}
