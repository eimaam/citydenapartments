import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Branch } from './branch.schema';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { UserRoleEnum } from '../users/user.schema';
import { BranchService } from './branches.service';
import { CreateBranchDto } from './dto/create.dto';
import { BranchUpdateDto } from './dto/update.dto';
import { PaginatedQueryDto } from '../../common/dto/paginated-query.dto';

@Controller('branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchesController {
  constructor(
    @InjectModel(Branch.name) 
    private branchModel: Model<Branch>,
    private branchService: BranchService
  ) {}

  @Get()
  async getAll(@ActiveUser() user: any, @Query() query: PaginatedQueryDto) {
    // const filter = user.role === 'SuperAdmin' ? {} : { _id: { $in: user.allowedBranches } };
    return this.branchService.getAll({ page: query.page, limit: query.limit, search: query.search });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.branchService.findOneById(id)
  }

  @Post()
  @Roles(UserRoleEnum.SUPER_ADMIN)
  async create(@Body() body: CreateBranchDto) {
    return this.branchService.create(body)
  }

  @Patch(':id')
  @Roles(UserRoleEnum.SUPER_ADMIN)
  async update(@Param('id') id: string, @Body() body: BranchUpdateDto) {
    return this.branchService.update(id, body)
  }
}
