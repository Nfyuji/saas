import { Controller, Get, Post, Query, Req, Res, Headers, Body, RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { WhatsappApiService } from '../whatsapp/whatsapp-api.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private config: ConfigService,
    private whatsappService: WhatsappService,
    private whatsappApi: WhatsappApiService,
  ) {}

  @Get('whatsapp')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.config.get('WHATSAPP_VERIFY_TOKEN', 'businessos-verify');
    if (mode === 'subscribe' && token === verifyToken) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  @Post('whatsapp')
  async receiveWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string,
    @Body() body: Record<string, unknown>,
  ) {
    const appSecret = this.config.get('WHATSAPP_APP_SECRET', '');
    if (appSecret && req.rawBody) {
      const valid = this.whatsappApi.verifyWebhookSignature(req.rawBody, signature, appSecret);
      if (!valid) return { error: 'Invalid signature' };
    }

    if (body.object !== 'whatsapp_business_account') {
      return { status: 'ignored' };
    }

    const entry = (body.entry as Array<Record<string, unknown>>)?.[0];
    const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
    const value = changes?.value as Record<string, unknown>;
    const phoneNumberId = value?.metadata
      ? (value.metadata as Record<string, string>).phone_number_id
      : undefined;

    if (phoneNumberId) {
      await this.whatsappService.processIncomingWebhook(phoneNumberId, body);
    }

    return { status: 'ok' };
  }

  @Post('greenapi')
  async receiveGreenWebhook(@Body() body: Record<string, unknown>) {
    await this.whatsappService.processGreenNotification('', body);
    return { status: 'ok' };
  }
}
