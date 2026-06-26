import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Branch } from './branch.schema';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { UserRoleEnum } from '../users/user.schema';
import { BranchService } from './branches.service';
import { CreateBranchDto } from './dto/create.dto';
import { BranchUpdateDto } from './dto/update.dto';
import { PaginatedQueryDto } from '../../common/dto/paginated-query.dto';
import { isSuperAdmin } from '../../common/utils/role.utils';

@Controller('branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchesController {
  constructor(
    @InjectModel(Branch.name) 
    private branchModel: Model<Branch>,
    private branchService: BranchService
  ) {}

  @Get()
  @Public()
  async getAll(@Query() query: PaginatedQueryDto) {
    return this.branchService.getAll({ page: query.page, limit: query.limit, search: query.search });
  }

  @Get(':id')
  @Roles(UserRoleEnum.SUPER_ADMIN, UserRoleEnum.GROUP_GM, UserRoleEnum.FACILITY_MANAGER, UserRoleEnum.FRONT_OFFICE_MANAGER, UserRoleEnum.ACCOUNTANT, UserRoleEnum.IT, UserRoleEnum.STORE_MANAGER, UserRoleEnum.STORE_KEEPER, UserRoleEnum.RECEPTION, UserRoleEnum.KITCHEN_STAFF, UserRoleEnum.HOUSE_KEEPER)
  async findOne(@Param('id') id: string, @ActiveUser() user: any) {
    if (!isSuperAdmin(user.role) && !user.allowedBranches.includes(id)) {
      throw new UnauthorizedException('You do not have access to this branch.');
    }
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
