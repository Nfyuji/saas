import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsEmail, IsOptional, IsString } from 'class-validator';

class CreateCustomerDto {
  @IsString() name!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() notes?: string;
}

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.customersService.findAll(companyId, { search, status, page: Number(page), limit: Number(limit) });
  }

  @Get('stats')
  stats(@CurrentUser('companyId') companyId: string) {
    return this.customersService.getStats(companyId);
  }

  @Get(':id')
  findOne(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.customersService.findOne(companyId, id);
  }

  @Post()
  create(@CurrentUser('companyId') companyId: string, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(companyId, dto);
  }

  @Put(':id')
  update(@CurrentUser('companyId') companyId: string, @Param('id') id: string, @Body() dto: CreateCustomerDto) {
    return this.customersService.update(companyId, id, dto);
  }

  @Delete(':id')
  delete(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.customersService.delete(companyId, id);
  }
}
