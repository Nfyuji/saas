import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios, { AxiosInstance } from 'axios';
import { Company, CompanyDocument } from '../../schemas/company.schema';

export interface GreenApiCredentials {
  apiUrl: string;
  mediaUrl?: string;
  idInstance: string;
  apiTokenInstance: string;
}

export interface GreenIncomingParsed {
  idInstance: string;
  idMessage: string;
  from: string;
  senderName?: string;
  type: string;
  text?: string;
  timestamp?: number;
  status?: string;
  rawTypeWebhook?: string;
}

@Injectable()
export class GreenApiService implements OnModuleDestroy {
  private readonly logger = new Logger(GreenApiService.name);
  private pollTimer?: NodeJS.Timeout;
  private polling = false;
  private lastPollWarnAt = 0;
  private onNotification?: (companyId: string, payload: Record<string, unknown>) => Promise<void>;

  constructor(@InjectModel(Company.name) private companyModel: Model<CompanyDocument>) {}

  /** يستدعى من WhatsappService لتسجيل معالج الإشعارات */
  setNotificationHandler(
    handler: (companyId: string, payload: Record<string, unknown>) => Promise<void>,
  ) {
    this.onNotification = handler;
    if (!this.pollTimer) {
      this.pollTimer = setInterval(() => {
        this.pollAll().catch((e) => this.logger.error(e));
      }, 5000);
      setTimeout(() => this.pollAll().catch((e) => this.logger.error(e)), 3000);
    }
  }

  onModuleDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  getCredentialsFromCompany(company: CompanyDocument): GreenApiCredentials | null {
    const g = company.whatsapp?.greenApi;
    const idInstance = g?.idInstance || (company.whatsapp?.provider === 'greenapi'
      ? String(company.whatsapp?.phoneNumberId || '').replace(/^green_/, '')
      : '');
    const apiTokenInstance = g?.apiTokenInstance || company.whatsapp?.accessToken || '';
    const apiUrl = (g?.apiUrl || process.env.GREEN_API_URL || '').replace(/\/$/, '');
    if (!idInstance || !apiTokenInstance || !apiUrl) return null;
    return {
      apiUrl,
      mediaUrl: (g?.mediaUrl || process.env.GREEN_API_MEDIA_URL || apiUrl).replace(/\/$/, ''),
      idInstance: String(idInstance),
      apiTokenInstance,
    };
  }

  toChatId(phone: string): string {
    const digits = phone.replace(/[^0-9]/g, '');
    return `${digits}@c.us`;
  }

  fromChatId(chatId: string): string {
    return String(chatId || '').split('@')[0].replace(/[^0-9]/g, '');
  }

  private client(creds: GreenApiCredentials): AxiosInstance {
    return axios.create({
      baseURL: `${creds.apiUrl}/waInstance${creds.idInstance}`,
      timeout: 30000,
    });
  }

  private path(method: string, creds: GreenApiCredentials, extra = '') {
    return `/${method}/${creds.apiTokenInstance}${extra}`;
  }

  async getStateInstance(creds: GreenApiCredentials) {
    const { data } = await this.client(creds).get(this.path('getStateInstance', creds));
    return data as { stateInstance?: string };
  }

  async getSettings(creds: GreenApiCredentials) {
    const { data } = await this.client(creds).get(this.path('getSettings', creds));
    return data as Record<string, unknown>;
  }

  async setSettings(
    creds: GreenApiCredentials,
    settings: {
      webhookUrl?: string;
      webhookUrlToken?: string;
      incomingWebhook?: 'yes' | 'no';
      outgoingWebhook?: 'yes' | 'no';
      outgoingMessageWebhook?: 'yes' | 'no';
      stateWebhook?: 'yes' | 'no';
      delaySendMessagesMilliseconds?: number;
    },
  ) {
    const { data } = await this.client(creds).post(this.path('setSettings', creds), settings);
    return data;
  }

  async sendText(creds: GreenApiCredentials, to: string, message: string) {
    const chatId = this.toChatId(to);
    const { data } = await this.client(creds).post(this.path('sendMessage', creds), {
      chatId,
      message,
    });
    return {
      idMessage: (data as { idMessage?: string }).idMessage,
      messages: [{ id: (data as { idMessage?: string }).idMessage || `green_${Date.now()}` }],
    };
  }

  async sendFileByUrl(
    creds: GreenApiCredentials,
    to: string,
    urlFile: string,
    fileName: string,
    caption?: string,
  ) {
    const chatId = this.toChatId(to);
    const { data } = await this.client(creds).post(this.path('sendFileByUrl', creds), {
      chatId,
      urlFile,
      fileName,
      caption,
    });
    return {
      idMessage: (data as { idMessage?: string }).idMessage,
      messages: [{ id: (data as { idMessage?: string }).idMessage || `green_file_${Date.now()}` }],
    };
  }

  async readChat(creds: GreenApiCredentials, chatIdOrPhone: string) {
    const chatId = chatIdOrPhone.includes('@') ? chatIdOrPhone : this.toChatId(chatIdOrPhone);
    try {
      await this.client(creds).post(this.path('readChat', creds), { chatId });
    } catch (e) {
      this.logger.warn(`Green readChat failed: ${e}`);
    }
  }

  async receiveNotification(creds: GreenApiCredentials) {
    const { data } = await this.client(creds).get(this.path('receiveNotification', creds), {
      params: { receiveTimeout: 5 },
      timeout: 20000,
    });
    return data as null | { receiptId: number; body: Record<string, unknown> };
  }

  async deleteNotification(creds: GreenApiCredentials, receiptId: number) {
    await this.client(creds).delete(this.path('deleteNotification', creds, `/${receiptId}`));
  }

  parseNotification(body: Record<string, unknown>): GreenIncomingParsed | null {
    const typeWebhook = String(body.typeWebhook || '');
    const instanceData = (body.instanceData || {}) as { idInstance?: number | string };
    const idInstance = String(instanceData.idInstance || '');
    const idMessage = String(body.idMessage || '');

    if (typeWebhook === 'outgoingMessageStatus') {
      const status = String((body as { status?: string }).status || '');
      return {
        idInstance,
        idMessage,
        from: '',
        type: 'status',
        status,
        rawTypeWebhook: typeWebhook,
      };
    }

    if (
      typeWebhook !== 'incomingMessageReceived' &&
      typeWebhook !== 'outgoingMessageReceived' &&
      typeWebhook !== 'outgoingAPIMessageReceived'
    ) {
      return null;
    }

    // تجاهل رسائل صادرة عبر API حتى لا تتكرر في الصندوق
    if (typeWebhook === 'outgoingAPIMessageReceived') {
      return null;
    }

    const senderData = (body.senderData || {}) as {
      sender?: string;
      chatId?: string;
      senderName?: string;
      chatName?: string;
    };
    const messageData = (body.messageData || {}) as Record<string, unknown>;
    const typeMessage = String(messageData.typeMessage || 'textMessage');

    let text = '';
    if (typeMessage === 'textMessage') {
      text = String((messageData.textMessageData as { textMessage?: string })?.textMessage || '');
    } else if (typeMessage === 'extendedTextMessage') {
      text = String(
        (messageData.extendedTextMessageData as { text?: string })?.text || '',
      );
    } else if (typeMessage === 'quotedMessage') {
      text = String((messageData.extendedTextMessageData as { text?: string })?.text || '[اقتباس]');
    } else {
      text = `[${typeMessage}]`;
    }

    const from =
      this.fromChatId(senderData.sender || '') ||
      this.fromChatId(senderData.chatId || '');

    if (!from) return null;

    return {
      idInstance,
      idMessage: idMessage || `green_in_${Date.now()}`,
      from,
      senderName: senderData.senderName || senderData.chatName,
      type: typeMessage === 'textMessage' || typeMessage === 'extendedTextMessage' ? 'text' : typeMessage,
      text,
      timestamp: Number(body.timestamp) || undefined,
      rawTypeWebhook: typeWebhook,
    };
  }

  private async pollAll() {
    if (this.polling || !this.onNotification) return;
    this.polling = true;
    try {
      const companies = await this.companyModel.find({
        'whatsapp.provider': 'greenapi',
        'whatsapp.greenApi.idInstance': { $exists: true, $ne: '' },
      });

      for (const company of companies) {
        const creds = this.getCredentialsFromCompany(company);
        if (!creds) continue;
        try {
          // اسحب حتى 5 إشعارات لكل دورة
          for (let i = 0; i < 5; i++) {
            const note = await this.receiveNotification(creds);
            if (!note?.receiptId) break;
            try {
              await this.onNotification(company._id.toString(), note.body || {});
            } finally {
              await this.deleteNotification(creds, note.receiptId);
            }
          }
        } catch (e) {
          const msg = String((e as Error).message || e);
          const now = Date.now();
          // لا تملأ اللوج كل 5 ثوانٍ — مرة كل دقيقة كافية
          if (now - this.lastPollWarnAt > 60_000) {
            this.lastPollWarnAt = now;
            this.logger.warn(`Green poll failed for ${company.name}: ${msg}`);
            if (/status code 400/i.test(msg)) {
              this.logger.warn(
                'إذا ظهر 400: امسح webhookUrl من لوحة Green API (أو أعد حفظ الربط محلياً) حتى يعمل وضع الـ poll',
              );
            }
          }
        }
      }
    } finally {
      this.polling = false;
    }
  }
}
