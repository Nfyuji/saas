import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import FormData = require('form-data');

export interface WhatsAppCredentials {
  phoneNumberId: string;
  accessToken: string;
}

export interface SendTextOptions {
  to: string;
  text: string;
  previewUrl?: boolean;
  replyToMessageId?: string;
}

export interface SendMediaOptions {
  to: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'sticker';
  mediaId?: string;
  link?: string;
  caption?: string;
  filename?: string;
}

export interface SendTemplateOptions {
  to: string;
  templateName: string;
  languageCode: string;
  components?: unknown[];
}

@Injectable()
export class WhatsappApiService {
  private readonly logger = new Logger(WhatsappApiService.name);
  private readonly apiVersion: string;

  constructor(private config: ConfigService) {
    this.apiVersion = config.get('WHATSAPP_API_VERSION', 'v21.0');
  }

  private client(credentials: WhatsAppCredentials): AxiosInstance {
    return axios.create({
      baseURL: `https://graph.facebook.com/${this.apiVersion}/${credentials.phoneNumberId}`,
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async sendText(credentials: WhatsAppCredentials, options: SendTextOptions) {
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhone(options.to),
      type: 'text',
      text: { preview_url: options.previewUrl ?? false, body: options.text },
    };

    if (options.replyToMessageId) {
      payload.context = { message_id: options.replyToMessageId };
    }

    return this.send(credentials, payload);
  }

  async sendMedia(credentials: WhatsAppCredentials, options: SendMediaOptions) {
    const mediaPayload: Record<string, unknown> = {};
    if (options.mediaId) mediaPayload.id = options.mediaId;
    else if (options.link) mediaPayload.link = options.link;
    if (options.caption) mediaPayload.caption = options.caption;
    if (options.filename) mediaPayload.filename = options.filename;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.normalizePhone(options.to),
      type: options.type,
      [options.type]: mediaPayload,
    };

    return this.send(credentials, payload);
  }

  async sendTemplate(credentials: WhatsAppCredentials, options: SendTemplateOptions) {
    const payload = {
      messaging_product: 'whatsapp',
      to: this.normalizePhone(options.to),
      type: 'template',
      template: {
        name: options.templateName,
        language: { code: options.languageCode },
        components: options.components || [],
      },
    };

    return this.send(credentials, payload);
  }

  async sendLocation(
    credentials: WhatsAppCredentials,
    to: string,
    latitude: number,
    longitude: number,
    name?: string,
    address?: string,
  ) {
    return this.send(credentials, {
      messaging_product: 'whatsapp',
      to: this.normalizePhone(to),
      type: 'location',
      location: { latitude, longitude, name, address },
    });
  }

  async sendReaction(credentials: WhatsAppCredentials, to: string, messageId: string, emoji: string) {
    return this.send(credentials, {
      messaging_product: 'whatsapp',
      to: this.normalizePhone(to),
      type: 'reaction',
      reaction: { message_id: messageId, emoji },
    });
  }

  async markAsRead(credentials: WhatsAppCredentials, messageId: string) {
    const client = this.client(credentials);
    const response = await client.post('/messages', {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    });
    return response.data;
  }

  async uploadMedia(credentials: WhatsAppCredentials, file: Buffer, mimeType: string, filename: string) {
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('file', file, { filename, contentType: mimeType });
    form.append('type', mimeType);

    const response = await axios.post(
      `https://graph.facebook.com/${this.apiVersion}/${credentials.phoneNumberId}/media`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${credentials.accessToken}`,
        },
      },
    );

    return response.data as { id: string };
  }

  async getMediaUrl(credentials: WhatsAppCredentials, mediaId: string) {
    const response = await axios.get(
      `https://graph.facebook.com/${this.apiVersion}/${mediaId}`,
      { headers: { Authorization: `Bearer ${credentials.accessToken}` } },
    );
    return response.data as { url: string; mime_type: string; sha256: string; file_size: number };
  }

  async downloadMedia(credentials: WhatsAppCredentials, mediaId: string): Promise<Buffer> {
    const mediaInfo = await this.getMediaUrl(credentials, mediaId);
    const response = await axios.get(mediaInfo.url, {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
      responseType: 'arraybuffer',
    });
    return Buffer.from(response.data);
  }

  async getBusinessProfile(credentials: WhatsAppCredentials) {
    const response = await axios.get(
      `https://graph.facebook.com/${this.apiVersion}/${credentials.phoneNumberId}/whatsapp_business_profile`,
      {
        params: { fields: 'about,address,description,email,profile_picture_url,websites,vertical' },
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      },
    );
    return response.data;
  }

  async getPhoneNumberInfo(credentials: WhatsAppCredentials) {
    const response = await axios.get(
      `https://graph.facebook.com/${this.apiVersion}/${credentials.phoneNumberId}`,
      {
        params: { fields: 'display_phone_number,verified_name,quality_rating,code_verification_status' },
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      },
    );
    return response.data;
  }

  /** Exchange Embedded Signup short-lived code for a business token */
  async exchangeEmbeddedSignupCode(code: string) {
    const appId = this.config.get<string>('META_APP_ID') || this.config.get<string>('WHATSAPP_APP_ID');
    const appSecret =
      this.config.get<string>('META_APP_SECRET') || this.config.get<string>('WHATSAPP_APP_SECRET');
    if (!appId || !appSecret) {
      throw new Error('META_APP_ID و META_APP_SECRET غير مضبوطين في السيرفر');
    }

    const response = await axios.get(
      `https://graph.facebook.com/${this.apiVersion}/oauth/access_token`,
      {
        params: {
          client_id: appId,
          client_secret: appSecret,
          code,
        },
      },
    );
    return response.data as { access_token: string; token_type?: string; expires_in?: number };
  }

  async subscribeAppToWaba(wabaId: string, accessToken: string) {
    const response = await axios.post(
      `https://graph.facebook.com/${this.apiVersion}/${wabaId}/subscribed_apps`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return response.data;
  }

  async registerPhoneNumber(phoneNumberId: string, accessToken: string, pin = '000000') {
    const response = await axios.post(
      `https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}/register`,
      { messaging_product: 'whatsapp', pin },
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    return response.data;
  }

  async listTemplates(credentials: WhatsAppCredentials, businessAccountId: string) {
    const response = await axios.get(
      `https://graph.facebook.com/${this.apiVersion}/${businessAccountId}/message_templates`,
      {
        params: { fields: 'name,status,language,category,components' },
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      },
    );
    return response.data;
  }

  private async send(credentials: WhatsAppCredentials, payload: Record<string, unknown>) {
    try {
      const client = this.client(credentials);
      const response = await client.post('/messages', payload);
      this.logger.log(`Message sent to ${payload.to}: ${response.data.messages?.[0]?.id}`);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown }; message?: string };
      this.logger.error(`WhatsApp send failed: ${JSON.stringify(err.response?.data || err.message)}`);
      throw error;
    }
  }

  normalizePhone(phone: string): string {
    let digits = phone.replace(/[^0-9]/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    // أرقام سعودية محلية 05xxxxxxxx → 9665xxxxxxxx
    if (digits.startsWith('0') && digits.length === 10) {
      digits = `966${digits.slice(1)}`;
    }
    return digits;
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string, appSecret: string): boolean {
    if (!appSecret || !signature) return true;
    const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }
}
