import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { SearchCustomerDto } from './dto/search-customer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get('search')
  search(@Query() query: SearchCustomerDto) {
    return this.customersService.searchByPhone(query.phone);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }
}
