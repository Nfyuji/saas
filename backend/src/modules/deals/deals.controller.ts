import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { DealsService } from './deals.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

class CreateDealDto {
  @IsString() customerId!: string;
  @IsString() title!: string;
  @IsOptional() @IsNumber() value?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() stage?: string;
  @IsOptional() @IsArray() items?: Array<{ name: string; quantity: number; price: number }>;
  @IsOptional() @IsString() conversationId?: string;
  @IsOptional() @IsString() notes?: string;
}

class UpdateStageDto {
  @IsString() stage!: string;
  @IsOptional() @IsString() lostReason?: string;
}

@Controller('deals')
@UseGuards(JwtAuthGuard)
export class DealsController {
  constructor(private dealsService: DealsService) {}

  @Get()
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query('stage') stage?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.dealsService.findAll(companyId, stage, customerId);
  }

  @Get('pipeline')
  pipeline(@CurrentUser('companyId') companyId: string) {
    return this.dealsService.getPipelineStats(companyId);
  }

  @Get(':id')
  findOne(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.dealsService.findOne(companyId, id);
  }

  @Post()
  create(@CurrentUser('companyId') companyId: string, @Body() dto: CreateDealDto) {
    return this.dealsService.create(companyId, dto);
  }

  @Put(':id/stage')
  updateStage(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.dealsService.updateStage(companyId, id, dto.stage, dto.lostReason);
  }

  @Post(':id/quote')
  sendQuote(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.dealsService.sendQuotePayload(companyId, id);
  }
}
