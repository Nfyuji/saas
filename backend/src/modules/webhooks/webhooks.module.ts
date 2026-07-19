import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsappModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
