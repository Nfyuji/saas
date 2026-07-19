import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString } from 'class-validator';

class CheckoutDto {
  @IsString() planId!: string;
}

class ConfirmDto {
  @IsString() invoiceId!: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('provider')
  provider() {
    return {
      provider: this.paymentsService.provider(),
      demoAllowed: this.paymentsService.demoPaymentsAllowed(),
    };
  }

  @Get('invoices')
  @UseGuards(JwtAuthGuard)
  invoices(@CurrentUser('companyId') companyId: string) {
    return this.paymentsService.listCompanyInvoices(companyId);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  checkout(@CurrentUser('companyId') companyId: string, @Body() dto: CheckoutDto) {
    return this.paymentsService.createCheckout(companyId, dto.planId);
  }

  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  confirm(@CurrentUser('companyId') companyId: string, @Body() dto: ConfirmDto) {
    return this.paymentsService.confirmDemoPayment(companyId, dto.invoiceId);
  }

  @Post('webhooks/:provider')
  webhook(@Param('provider') provider: string, @Body() body: Record<string, unknown>) {
    return this.paymentsService.handleProviderWebhook(provider, body);
  }
}
