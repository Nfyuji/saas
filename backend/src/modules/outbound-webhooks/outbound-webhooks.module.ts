import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OutboundWebhooksController } from './outbound-webhooks.controller';
import { OutboundWebhooksService } from './outbound-webhooks.service';
import { OutboundWebhook, OutboundWebhookSchema } from '../../schemas/outbound-webhook.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: OutboundWebhook.name, schema: OutboundWebhookSchema }]),
  ],
  controllers: [OutboundWebhooksController],
  providers: [OutboundWebhooksService],
  exports: [OutboundWebhooksService],
})
export class OutboundWebhooksModule {}
