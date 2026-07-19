import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { OutboundWebhooksService } from './outbound-webhooks.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

class WebhookDto {
  @IsString() url!: string;
  @IsOptional() @IsArray() events?: string[];
  @IsOptional() @IsString() secret?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Controller('webhooks/outbound')
@UseGuards(JwtAuthGuard)
export class OutboundWebhooksController {
  constructor(private webhooksService: OutboundWebhooksService) {}

  @Get()
  list(@CurrentUser('companyId') companyId: string) {
    return this.webhooksService.list(companyId);
  }

  @Post()
  create(@CurrentUser('companyId') companyId: string, @Body() dto: WebhookDto) {
    return this.webhooksService.create(companyId, dto);
  }

  @Put(':id')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: Partial<WebhookDto>,
  ) {
    return this.webhooksService.update(companyId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.webhooksService.remove(companyId, id);
  }
}
