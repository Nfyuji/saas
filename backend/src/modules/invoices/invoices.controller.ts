import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

class CreateInvoiceDto {
  @IsString() customerId!: string;
  @IsOptional() @IsString() dealId?: string;
  @IsArray() items!: Array<{ name: string; quantity: number; price: number }>;
  @IsOptional() @IsNumber() tax?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() dueDate?: string;
  @IsOptional() @IsString() notes?: string;
}

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.invoicesService.findAll(companyId, status, customerId);
  }

  @Get('stats')
  stats(@CurrentUser('companyId') companyId: string) {
    return this.invoicesService.getStats(companyId);
  }

  @Post()
  create(@CurrentUser('companyId') companyId: string, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(companyId, dto);
  }

  @Put(':id/send')
  markSent(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.invoicesService.markSent(companyId, id);
  }

  @Put(':id/paid')
  markPaid(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.invoicesService.markPaid(companyId, id);
  }

  @Get(':id/whatsapp-message')
  whatsappMessage(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.invoicesService.getWhatsAppMessage(companyId, id);
  }
}
