import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { PaginatedQueryDto } from '../../common/dto/paginated-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ActiveUser } from '../../common/decorators/active-user.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  @Get()
  findAll(@ActiveUser() user: any, @Query() query: PaginatedQueryDto) {
    return this.employeesService.findAll({
      branchId: user.activeBranchId,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
    });
  }

  @Get('search')
  search(@ActiveUser() user: any, @Query('q') q: string) {
    return this.employeesService.searchByName(user.activeBranchId, q || '');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findById(id);
  }
}
