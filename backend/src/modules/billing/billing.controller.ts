import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString } from 'class-validator';

class UpgradeDto {
  @IsString() planId!: string;
}

class SectorDto {
  @IsString() sector!: string;
}

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Get('plans')
  plans() {
    return this.billingService.getPlans();
  }

  @Get('sectors')
  sectors() {
    return this.billingService.getSectors();
  }

  @Get('current')
  current(@CurrentUser('companyId') companyId: string) {
    return this.billingService.getCurrentPlan(companyId);
  }

  @Get('usage')
  usage(@CurrentUser('companyId') companyId: string) {
    return this.billingService.getUsageDashboard(companyId);
  }

  @Post('upgrade')
  upgrade(@CurrentUser('companyId') companyId: string, @Body() dto: UpgradeDto) {
    return this.billingService.upgradePlan(companyId, dto.planId);
  }

  @Post('apply-sector')
  applySector(@CurrentUser('companyId') companyId: string, @Body() dto: SectorDto) {
    return this.billingService.applySectorTemplate(companyId, dto.sector);
  }
}
