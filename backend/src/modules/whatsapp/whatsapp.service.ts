import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Company, CompanyDocument } from '../../schemas/company.schema';
import { Customer, CustomerDocument } from '../../schemas/customer.schema';
import { Conversation, ConversationDocument } from '../../schemas/conversation.schema';
import { Message, MessageDocument } from '../../schemas/message.schema';
import { WhatsappApiService } from './whatsapp-api.service';
import { AiService } from '../ai/ai.service';
import { AutomationService } from '../automation/automation.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { DealsService } from '../deals/deals.service';
import { FollowUpsService } from '../followups/followups.service';
import { PlanEntitlementsService } from '../../common/services/plan-entitlements.service';
import { OutboundWebhooksService } from '../outbound-webhooks/outbound-webhooks.service';

interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type: string; caption?: string };
  video?: { id: string; mime_type: string; caption?: string };
  audio?: { id: string; mime_type: string };
  document?: { id: string; mime_type: string; filename?: string; caption?: string };
  sticker?: { id: string; mime_type: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  contacts?: unknown[];
  reaction?: { message_id: string; emoji: string };
  context?: { from: string; id: string };
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private whatsappApi: WhatsappApiService,
    private aiService: AiService,
    private automationService: AutomationService,
    private knowledgeService: KnowledgeService,
    private dealsService: DealsService,
    @Inject(forwardRef(() => FollowUpsService))
    private followUpsService: FollowUpsService,
    private entitlements: PlanEntitlementsService,
    private outboundWebhooks: OutboundWebhooksService,
  ) {}

  private metaErrorMessage(error: unknown): string {
    const err = error as {
      response?: { data?: { error?: { message?: string; error_user_msg?: string } } };
      message?: string;
    };
    return (
      err.response?.data?.error?.error_user_msg ||
      err.response?.data?.error?.message ||
      err.message ||
      'فشل الاتصال بـ Meta Graph API'
    );
  }

  async testConnection(
    companyId: string,
    credentials?: { phoneNumberId?: string; accessToken?: string },
  ) {
    const company = await this.companyModel.findById(companyId);
    if (!company) throw new NotFoundException('الشركة غير موجودة');

    const phoneNumberId = credentials?.phoneNumberId || company.whatsapp?.phoneNumberId;
    const accessToken = credentials?.accessToken || company.whatsapp?.accessToken;

    if (!phoneNumberId || !accessToken) {
      throw new BadRequestException('أدخل Phone Number ID و Access Token للاختبار');
    }

    try {
      const phoneInfo = await this.whatsappApi.getPhoneNumberInfo({ phoneNumberId, accessToken });
      let profile: unknown = null;
      try {
        profile = await this.whatsappApi.getBusinessProfile({ phoneNumberId, accessToken });
      } catch {
        /* profile optional */
      }

      return {
        success: true,
        connected: true,
        displayPhoneNumber: phoneInfo.display_phone_number as string | undefined,
        verifiedName: phoneInfo.verified_name as string | undefined,
        qualityRating: phoneInfo.quality_rating as string | undefined,
        codeVerificationStatus: phoneInfo.code_verification_status as string | undefined,
        profile,
        message: 'تم التحقق من بيانات Meta بنجاح',
      };
    } catch (error) {
      this.logger.warn(`Meta test failed: ${this.metaErrorMessage(error)}`);
      throw new BadRequestException(
        `فشل التحقق من Meta: ${this.metaErrorMessage(error)}. تأكد من Phone Number ID والتوكن وصلاحيات whatsapp_business_messaging.`,
      );
    }
  }

  async configureWhatsApp(
    companyId: string,
    config: {
      phoneNumberId?: string;
      accessToken?: string;
      businessAccountId?: string;
      aiAutoReply?: boolean;
      welcomeMessage?: string;
    },
  ) {
    const company = await this.companyModel.findById(companyId);
    if (!company) throw new NotFoundException('الشركة غير موجودة');

    const phoneNumberId = config.phoneNumberId?.trim() || company.whatsapp?.phoneNumberId;
    const accessToken = config.accessToken?.trim() || company.whatsapp?.accessToken;
    const updatingCredentials = !!(config.phoneNumberId?.trim() && config.accessToken?.trim());

    if (!phoneNumberId || !accessToken) {
      throw new BadRequestException('Phone Number ID و Access Token مطلوبان للربط مع Meta');
    }

    let displayPhoneNumber = company.whatsapp?.displayPhoneNumber;
    let verifiedName = company.whatsapp?.verifiedName;
    let qualityRating = (company.whatsapp as { qualityRating?: string } | undefined)?.qualityRating;
    let codeVerificationStatus = (company.whatsapp as { codeVerificationStatus?: string } | undefined)
      ?.codeVerificationStatus;

    try {
      const phoneInfo = await this.whatsappApi.getPhoneNumberInfo({
        phoneNumberId,
        accessToken,
      });
      displayPhoneNumber = phoneInfo.display_phone_number;
      verifiedName = phoneInfo.verified_name;
      qualityRating = phoneInfo.quality_rating;
      codeVerificationStatus = phoneInfo.code_verification_status;
    } catch (error) {
      this.logger.warn(`Could not fetch phone number info: ${this.metaErrorMessage(error)}`);
      if (updatingCredentials || !company.whatsapp?.phoneNumberId) {
        throw new BadRequestException(
          `تعذّر التحقق من بيانات Meta: ${this.metaErrorMessage(error)}. لن يُحفظ الربط حتى ينجح الاختبار.`,
        );
      }
    }

    company.whatsapp = {
      ...company.whatsapp,
      phoneNumberId,
      accessToken,
      businessAccountId: config.businessAccountId ?? company.whatsapp?.businessAccountId,
      displayPhoneNumber,
      verifiedName,
      qualityRating,
      codeVerificationStatus,
      webhookConfigured: true,
      demo: false,
      aiAutoReply: config.aiAutoReply ?? company.whatsapp?.aiAutoReply ?? true,
      welcomeMessage:
        config.welcomeMessage ?? company.whatsapp?.welcomeMessage ?? 'مرحباً! كيف يمكنني مساعدتك؟',
    };

    await company.save();
    return {
      success: true,
      whatsapp: await this.getWhatsAppStatus(companyId),
      message: 'تم ربط واتساب عبر Meta بنجاح',
    };
  }

  async disconnectWhatsApp(companyId: string) {
    const company = await this.companyModel.findById(companyId);
    if (!company) throw new NotFoundException('الشركة غير موجودة');

    company.whatsapp = {
      aiAutoReply: company.whatsapp?.aiAutoReply ?? true,
      welcomeMessage: company.whatsapp?.welcomeMessage || 'مرحباً! كيف يمكنني مساعدتك؟',
    };
    await company.save();
    return { success: true, message: 'تم فصل ربط Meta', whatsapp: await this.getWhatsAppStatus(companyId) };
  }

  getMetaEmbeddedConfig() {
    const appId = process.env.META_APP_ID || process.env.WHATSAPP_APP_ID || '';
    const configId = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID || '';
    const appSecret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET || '';
    const graphVersion = process.env.WHATSAPP_API_VERSION || 'v21.0';
    return {
      enabled: !!(appId && configId && appSecret),
      appId,
      configId,
      graphVersion,
      loginUrl: '/dashboard/whatsapp/connect',
      docsUrl: 'https://developers.facebook.com/docs/whatsapp/embedded-signup',
    };
  }

  async completeEmbeddedSignup(
    companyId: string,
    payload: { code: string; phoneNumberId: string; wabaId: string },
  ) {
    const company = await this.companyModel.findById(companyId);
    if (!company) throw new NotFoundException('الشركة غير موجودة');

    const code = payload.code?.trim();
    const phoneNumberId = payload.phoneNumberId?.trim();
    const wabaId = payload.wabaId?.trim();

    if (!code || !phoneNumberId || !wabaId) {
      throw new BadRequestException(
        'بيانات ناقصة من فيسبوك: code و phone_number_id و waba_id مطلوبة',
      );
    }

    let accessToken: string;
    try {
      const tokenRes = await this.whatsappApi.exchangeEmbeddedSignupCode(code);
      accessToken = tokenRes.access_token;
    } catch (error) {
      this.logger.error(`Embedded signup token exchange failed: ${this.metaErrorMessage(error)}`);
      throw new BadRequestException(
        `فشل استبدال رمز فيسبوك: ${this.metaErrorMessage(error)}. أعد المحاولة فوراً (الرمز صالح ثوانٍ فقط).`,
      );
    }

    try {
      await this.whatsappApi.subscribeAppToWaba(wabaId, accessToken);
    } catch (error) {
      this.logger.warn(`WABA subscribe failed: ${this.metaErrorMessage(error)}`);
    }

    try {
      await this.whatsappApi.registerPhoneNumber(phoneNumberId, accessToken);
    } catch (error) {
      this.logger.warn(`Phone register skipped/failed: ${this.metaErrorMessage(error)}`);
    }

    const result = await this.configureWhatsApp(companyId, {
      phoneNumberId,
      accessToken,
      businessAccountId: wabaId,
      aiAutoReply: company.whatsapp?.aiAutoReply ?? true,
      welcomeMessage: company.whatsapp?.welcomeMessage,
    });

    return {
      ...result,
      message: 'تم تسجيل الدخول عبر فيسبوك وربط واتساب بنجاح',
      connectedVia: 'facebook_embedded_signup',
    };
  }

  async getWhatsAppStatus(companyId: string) {
    const company = await this.companyModel.findById(companyId);
    if (!company) throw new NotFoundException('الشركة غير موجودة');

    const configured = !!company.whatsapp?.phoneNumberId && !!company.whatsapp?.accessToken;
    const demo = this.isDemo(company);
    const apiBase = (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');
    const wa = company.whatsapp as {
      qualityRating?: string;
      codeVerificationStatus?: string;
      phoneNumberId?: string;
      businessAccountId?: string;
    };
    const meta = this.getMetaEmbeddedConfig();

    return {
      configured,
      demo,
      displayPhoneNumber: company.whatsapp?.displayPhoneNumber,
      verifiedName: company.whatsapp?.verifiedName,
      phoneNumberId: wa.phoneNumberId || undefined,
      businessAccountId: wa.businessAccountId || undefined,
      hasAccessToken: !!company.whatsapp?.accessToken,
      qualityRating: wa.qualityRating,
      codeVerificationStatus: wa.codeVerificationStatus,
      aiAutoReply: company.whatsapp?.aiAutoReply ?? false,
      welcomeMessage: company.whatsapp?.welcomeMessage,
      webhookUrl: `${apiBase}/api/webhooks/whatsapp`,
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'businessos-verify',
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
      metaAppSetupUrl: 'https://developers.facebook.com/apps/',
      metaWhatsAppDocsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
      metaEmbeddedSignup: meta,
    };
  }

  async sendMessage(
    companyId: string,
    userId: string,
    dto: {
      to: string;
      type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template' | 'location';
      text?: string;
      mediaId?: string;
      mediaLink?: string;
      caption?: string;
      filename?: string;
      templateName?: string;
      languageCode?: string;
      templateComponents?: unknown[];
      latitude?: number;
      longitude?: number;
      locationName?: string;
      locationAddress?: string;
      replyToMessageId?: string;
    },
  ) {
    await this.entitlements.assertDailyMessageLimit(companyId);
    const company = await this.getCompanyWithWhatsApp(companyId);
    const credentials = this.getCredentials(company);
    const phone = this.whatsappApi.normalizePhone(dto.to);
    const demo = this.isDemo(company);

    let apiResponse: { messages?: Array<{ id: string }> };

    if (demo) {
      apiResponse = { messages: [{ id: `demo_msg_${Date.now()}` }] };
    } else {
      switch (dto.type) {
        case 'text':
          apiResponse = await this.whatsappApi.sendText(credentials, {
            to: phone,
            text: dto.text!,
            replyToMessageId: dto.replyToMessageId,
          });
          break;
        case 'template':
          apiResponse = await this.whatsappApi.sendTemplate(credentials, {
            to: phone,
            templateName: dto.templateName!,
            languageCode: dto.languageCode || 'ar',
            components: dto.templateComponents,
          });
          break;
        case 'location':
          apiResponse = await this.whatsappApi.sendLocation(
            credentials,
            phone,
            dto.latitude!,
            dto.longitude!,
            dto.locationName,
            dto.locationAddress,
          );
          break;
        default:
          apiResponse = await this.whatsappApi.sendMedia(credentials, {
            to: phone,
            type: dto.type as 'image' | 'video' | 'audio' | 'document',
            mediaId: dto.mediaId,
            link: dto.mediaLink,
            caption: dto.caption,
            filename: dto.filename,
          });
      }
    }

    const { customer } = await this.findOrCreateCustomer(companyId, phone);
    const conversation = await this.findOrCreateConversation(companyId, customer._id, phone);

    const message = await this.messageModel.create({
      companyId: new Types.ObjectId(companyId),
      conversationId: conversation._id,
      customerId: customer._id,
      direction: 'outbound',
      type: dto.type,
      content: dto.text || dto.caption,
      media: dto.mediaId ? { id: dto.mediaId, caption: dto.caption, filename: dto.filename } : undefined,
      template: dto.templateName
        ? { name: dto.templateName, language: dto.languageCode || 'ar', components: dto.templateComponents }
        : undefined,
      channel: 'whatsapp',
      status: 'sent',
      whatsappMessageId: apiResponse.messages?.[0]?.id,
      sentBy: userId !== 'system' && Types.ObjectId.isValid(userId) ? new Types.ObjectId(userId) : undefined,
      isAiGenerated: userId === 'system',
    });

    conversation.lastMessage = dto.text || dto.caption || `[${dto.type}]`;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    this.outboundWebhooks
      .dispatch(companyId, 'message.sent', {
        messageId: String(message._id),
        to: phone,
        type: dto.type,
        content: dto.text || dto.caption,
      })
      .catch(() => undefined);

    return {
      success: true,
      message,
      conversationId: String(conversation._id),
      customerId: String(customer._id),
      whatsappMessageId: apiResponse.messages?.[0]?.id,
    };
  }

  async uploadMedia(companyId: string, file: Buffer, mimeType: string, filename: string) {
    const company = await this.getCompanyWithWhatsApp(companyId);
    const result = await this.whatsappApi.uploadMedia(this.getCredentials(company), file, mimeType, filename);
    return { mediaId: result.id };
  }

  async markAsRead(companyId: string, messageId: string) {
    const company = await this.getCompanyWithWhatsApp(companyId);
    if (!this.isDemo(company)) {
      await this.whatsappApi.markAsRead(this.getCredentials(company), messageId);
    }

    await this.messageModel.updateOne(
      { whatsappMessageId: messageId, companyId: new Types.ObjectId(companyId) },
      { status: 'read' },
    );

    return { success: true };
  }

  async getTemplates(companyId: string) {
    const company = await this.getCompanyWithWhatsApp(companyId);
    if (this.isDemo(company)) {
      return {
        data: [
          { name: 'hello_world', status: 'APPROVED', language: 'ar', category: 'UTILITY' },
          { name: 'order_update', status: 'APPROVED', language: 'ar', category: 'UTILITY' },
        ],
      };
    }
    if (!company.whatsapp?.businessAccountId) {
      return { data: [] };
    }
    return this.whatsappApi.listTemplates(
      this.getCredentials(company),
      company.whatsapp.businessAccountId,
    );
  }

  async enableDemoMode(companyId: string) {
    const company = await this.companyModel.findById(companyId);
    if (!company) throw new NotFoundException('الشركة غير موجودة');

    company.whatsapp = {
      ...company.whatsapp,
      phoneNumberId: `demo_${companyId}`,
      accessToken: 'demo_token',
      displayPhoneNumber: '+966 50 000 0000',
      verifiedName: `${company.name} (تجريبي)`,
      webhookConfigured: true,
      aiAutoReply: true,
      welcomeMessage: company.whatsapp?.welcomeMessage || 'مرحباً! كيف يمكنني مساعدتك؟',
    };
    company.settings = {
      ...company.settings,
      aiEnabled: true,
      salesAgentEnabled: true,
      autoFollowUp: true,
      followUpHours: company.settings?.followUpHours || [2, 24, 72],
    };
    await company.save();

    return {
      success: true,
      demo: true,
      message: 'تم تفعيل وضع التجربة — أرسل رسائل وهمية من صندوق الوارد أو من هنا',
      whatsapp: {
        configured: true,
        displayPhoneNumber: company.whatsapp.displayPhoneNumber,
        verifiedName: company.whatsapp.verifiedName,
        aiAutoReply: true,
      },
    };
  }

  async simulateIncoming(
    companyId: string,
    dto: { from?: string; text: string; name?: string },
  ) {
    const company = await this.companyModel.findById(companyId);
    if (!company) throw new NotFoundException('الشركة غير موجودة');

    if (!company.whatsapp?.phoneNumberId) {
      await this.enableDemoMode(companyId);
    }

    const fresh = await this.companyModel.findById(companyId);
    if (!fresh) throw new NotFoundException('الشركة غير موجودة');

    const phone = this.whatsappApi.normalizePhone(dto.from || `9665${String(Date.now()).slice(-8)}`);
    const { customer, isNew } = await this.findOrCreateCustomer(
      companyId,
      phone,
      dto.name || `عميل تجريبي ${phone.slice(-4)}`,
    );
    const conversation = await this.findOrCreateConversation(companyId, customer._id, phone);

    const inbound = await this.messageModel.create({
      companyId: new Types.ObjectId(companyId),
      conversationId: conversation._id,
      customerId: customer._id,
      direction: 'inbound',
      type: 'text',
      content: dto.text,
      channel: 'whatsapp',
      status: 'delivered',
      whatsappMessageId: `demo_in_${Date.now()}`,
    });

    conversation.lastMessage = dto.text;
    conversation.lastMessageAt = new Date();
    conversation.unreadCount += 1;
    await conversation.save();

    customer.lastContactAt = new Date();
    customer.totalMessages += 1;
    await customer.save();

    const deal = await this.dealsService.ensureDealForCustomer(
      companyId,
      customer._id,
      conversation._id,
      `فرصة · ${customer.name}`,
    );

    await this.followUpsService.handlePossibleCsatReply(companyId, customer, dto.text);
    await this.automationService.processIncomingMessage(companyId, customer, conversation, dto.text);

    const isBuyer =
      ['customer', 'vip'].includes(customer.status) ||
      deal.stage === 'won' ||
      customer.tags?.includes('purchased');

    await this.followUpsService.cancelForCustomer(companyId, customer._id);
    if (!isBuyer && fresh.settings?.autoFollowUp !== false) {
      await this.followUpsService.scheduleForConversation(
        companyId,
        customer._id,
        conversation._id,
        deal._id,
      );
    }

    const demoCredentials = this.getCredentials(fresh);
    await this.sendWelcomeCampaign(fresh, companyId, demoCredentials, customer, conversation, phone, isNew);

    let aiReply: string | null = null;
    if (fresh.whatsapp?.aiAutoReply !== false && fresh.settings?.aiEnabled !== false) {
      const knowledgeContext = await this.knowledgeService.getContextForAi(companyId, dto.text);
      const history = await this.messageModel
        .find({ conversationId: conversation._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      aiReply = await this.aiService.generateReply({
        companyName: fresh.name,
        instructions: fresh.settings?.aiInstructions,
        customerName: customer.name,
        messages: history.reverse().map((m) => ({
          role: m.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
          content: m.content || '',
        })),
        userMessage: dto.text,
        knowledgeContext,
        sector: fresh.sector,
        salesMode: fresh.settings?.salesAgentEnabled !== false,
        customerStatus: customer.status,
        customerTags: customer.tags,
        dealStage: deal.stage,
        dealValue: deal.value,
        dealTitle: deal.title,
        lastCsatSentiment: customer.metadata?.lastCsatSentiment as string | undefined,
        isBuyer,
      });

      await this.messageModel.create({
        companyId: new Types.ObjectId(companyId),
        conversationId: conversation._id,
        customerId: customer._id,
        direction: 'outbound',
        type: 'text',
        content: aiReply,
        channel: 'whatsapp',
        status: 'sent',
        whatsappMessageId: `demo_out_${Date.now()}`,
        isAiGenerated: true,
      });

      conversation.lastMessage = aiReply;
      conversation.lastMessageAt = new Date();
      conversation.aiHandled = true;
      conversation.unreadCount = 0;
      await conversation.save();
    }

    return {
      success: true,
      demo: this.isDemo(fresh),
      customer,
      conversationId: conversation._id,
      inboundMessageId: inbound._id,
      aiReply,
      dealId: deal._id,
    };
  }

  async processIncomingWebhook(phoneNumberId: string, body: Record<string, unknown>) {
    const entry = (body.entry as Array<Record<string, unknown>>)?.[0];
    const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
    const value = changes?.value as Record<string, unknown>;

    if (!value) return;

    const company = await this.companyModel.findOne({ 'whatsapp.phoneNumberId': phoneNumberId });
    if (!company) {
      this.logger.warn(`No company found for phoneNumberId: ${phoneNumberId}`);
      return;
    }

    const companyId = company._id.toString();
    const credentials = this.getCredentials(company);

    const statuses = value.statuses as Array<Record<string, unknown>> | undefined;
    if (statuses?.length) {
      for (const status of statuses) {
        await this.updateMessageStatus(companyId, status.id as string, status.status as string);
      }
      return;
    }

    const messages = value.messages as IncomingMessage[] | undefined;
    if (!messages?.length) return;

    for (const msg of messages) {
      await this.handleIncomingMessage(company, companyId, credentials, msg);
    }
  }

  private async handleIncomingMessage(
    company: CompanyDocument,
    companyId: string,
    credentials: { phoneNumberId: string; accessToken: string },
    msg: IncomingMessage,
  ) {
    const phone = this.whatsappApi.normalizePhone(msg.from);
    const { customer, isNew } = await this.findOrCreateCustomer(
      companyId,
      phone,
      `عميل ${phone.slice(-4)}`,
    );
    const conversation = await this.findOrCreateConversation(companyId, customer._id, phone);

    if (!this.isDemo(company)) {
      try {
        await this.whatsappApi.markAsRead(credentials, msg.id);
      } catch (e) {
        this.logger.warn(`markAsRead failed: ${e}`);
      }
    }

    const parsed = await this.parseIncomingMessage(credentials, msg);

    const message = await this.messageModel.create({
      companyId: new Types.ObjectId(companyId),
      conversationId: conversation._id,
      customerId: customer._id,
      direction: 'inbound',
      type: parsed.type,
      content: parsed.content,
      media: parsed.media,
      channel: 'whatsapp',
      status: 'delivered',
      whatsappMessageId: msg.id,
      metadata: { timestamp: msg.timestamp, context: msg.context },
    });

    conversation.lastMessage = parsed.content || `[${parsed.type}]`;
    conversation.lastMessageAt = new Date();
    conversation.unreadCount += 1;
    await conversation.save();

    customer.lastContactAt = new Date();
    customer.totalMessages += 1;
    await customer.save();

    if (parsed.content) {
      await this.followUpsService.handlePossibleCsatReply(companyId, customer, parsed.content);
    }

    await this.automationService.processIncomingMessage(companyId, customer, conversation, parsed.content || '');

    const deal = await this.dealsService.ensureDealForCustomer(
      companyId,
      customer._id,
      conversation._id,
      `فرصة · ${customer.name}`,
    );

    const isBuyer =
      ['customer', 'vip'].includes(customer.status) ||
      deal.stage === 'won' ||
      customer.tags?.includes('purchased');

    await this.followUpsService.cancelForCustomer(companyId, customer._id);
    if (!isBuyer && company.settings?.autoFollowUp !== false) {
      await this.followUpsService.scheduleForConversation(
        companyId,
        customer._id,
        conversation._id,
        deal._id,
      );
    }

    await this.sendWelcomeCampaign(company, companyId, credentials, customer, conversation, phone, isNew);

    if (company.whatsapp?.aiAutoReply && company.settings?.aiEnabled !== false && parsed.content) {
      await this.handleAiReply(
        company,
        companyId,
        credentials,
        customer,
        conversation,
        phone,
        parsed.content,
        deal,
      );
    }
  }

  private async handleAiReply(
    company: CompanyDocument,
    companyId: string,
    credentials: { phoneNumberId: string; accessToken: string },
    customer: CustomerDocument,
    conversation: ConversationDocument,
    phone: string,
    userMessage: string,
    deal?: { stage?: string; value?: number; title?: string },
  ) {
    try {
      const history = await this.messageModel
        .find({ conversationId: conversation._id })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const knowledgeContext = await this.knowledgeService.getContextForAi(companyId, userMessage);
      const isBuyer =
        ['customer', 'vip'].includes(customer.status) ||
        deal?.stage === 'won' ||
        customer.tags?.includes('purchased');

      const aiResponse = await this.aiService.generateReply({
        companyName: company.name,
        instructions: company.settings?.aiInstructions,
        customerName: customer.name,
        messages: history.reverse().map((m) => ({
          role: m.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
          content: m.content || '',
        })),
        userMessage,
        knowledgeContext,
        sector: company.sector,
        salesMode: company.settings?.salesAgentEnabled !== false,
        customerStatus: customer.status,
        customerTags: customer.tags,
        dealStage: deal?.stage,
        dealValue: deal?.value,
        dealTitle: deal?.title,
        lastCsatSentiment: customer.metadata?.lastCsatSentiment as string | undefined,
        isBuyer,
      });

      const apiResponse = this.isDemo(company)
        ? { messages: [{ id: `demo_ai_${Date.now()}` }] }
        : await this.whatsappApi.sendText(credentials, {
            to: phone,
            text: aiResponse,
          });

      await this.messageModel.create({
        companyId: new Types.ObjectId(companyId),
        conversationId: conversation._id,
        customerId: customer._id,
        direction: 'outbound',
        type: 'text',
        content: aiResponse,
        channel: 'whatsapp',
        status: 'sent',
        whatsappMessageId: apiResponse.messages?.[0]?.id,
        isAiGenerated: true,
      });

      conversation.lastMessage = aiResponse;
      conversation.lastMessageAt = new Date();
      conversation.aiHandled = true;
      await conversation.save();
    } catch (error) {
      this.logger.error(`AI reply failed: ${error}`);
    }
  }

  private async parseIncomingMessage(
    credentials: { phoneNumberId: string; accessToken: string },
    msg: IncomingMessage,
  ) {
    switch (msg.type) {
      case 'text':
        return { type: 'text', content: msg.text?.body, media: undefined };
      case 'image':
        return {
          type: 'image',
          content: msg.image?.caption,
          media: { id: msg.image?.id, mimeType: msg.image?.mime_type, caption: msg.image?.caption },
        };
      case 'video':
        return {
          type: 'video',
          content: msg.video?.caption,
          media: { id: msg.video?.id, mimeType: msg.video?.mime_type, caption: msg.video?.caption },
        };
      case 'audio':
        return { type: 'audio', content: '[رسالة صوتية]', media: { id: msg.audio?.id, mimeType: msg.audio?.mime_type } };
      case 'document':
        return {
          type: 'document',
          content: msg.document?.caption || msg.document?.filename,
          media: { id: msg.document?.id, mimeType: msg.document?.mime_type, filename: msg.document?.filename },
        };
      case 'sticker':
        return { type: 'sticker', content: '[ملصق]', media: { id: msg.sticker?.id, mimeType: msg.sticker?.mime_type } };
      case 'location':
        return {
          type: 'location',
          content: msg.location?.name || `${msg.location?.latitude}, ${msg.location?.longitude}`,
          media: undefined,
        };
      case 'reaction':
        return { type: 'reaction', content: msg.reaction?.emoji, media: undefined };
      default:
        return { type: msg.type, content: `[${msg.type}]`, media: undefined };
    }
  }

  private async updateMessageStatus(companyId: string, whatsappMessageId: string, status: string) {
    const statusMap: Record<string, string> = {
      sent: 'sent',
      delivered: 'delivered',
      read: 'read',
      failed: 'failed',
    };

    await this.messageModel.updateOne(
      { whatsappMessageId, companyId: new Types.ObjectId(companyId) },
      { status: statusMap[status] || status },
    );
  }

  async sendTestToNumber(companyId: string, userId: string, to: string, text?: string) {
    const body =
      text?.trim() ||
      'رسالة اختبار من BusinessOS AI ✅ — إذا وصلتك فالاتصال بـ Meta يعمل.';
    return this.sendMessage(companyId, userId, { to, type: 'text', text: body });
  }

  /** حملة ترحيب لأول رسالة من رقم جديد */
  private async sendWelcomeCampaign(
    company: CompanyDocument,
    companyId: string,
    credentials: { phoneNumberId: string; accessToken: string },
    customer: CustomerDocument,
    conversation: ConversationDocument,
    phone: string,
    isNew: boolean,
  ) {
    if (!isNew) return;
    const text = (company.whatsapp?.welcomeMessage || '').trim();
    if (!text) return;

    try {
      const apiResponse = this.isDemo(company)
        ? { messages: [{ id: `demo_welcome_${Date.now()}` }] }
        : await this.whatsappApi.sendText(credentials, { to: phone, text });

      await this.messageModel.create({
        companyId: new Types.ObjectId(companyId),
        conversationId: conversation._id,
        customerId: customer._id,
        direction: 'outbound',
        type: 'text',
        content: text,
        channel: 'whatsapp',
        status: 'sent',
        whatsappMessageId: apiResponse.messages?.[0]?.id,
        isAiGenerated: false,
        metadata: { campaign: 'welcome' },
      });

      conversation.lastMessage = text;
      conversation.lastMessageAt = new Date();
      await conversation.save();
    } catch (error) {
      this.logger.warn(`Welcome campaign failed: ${error}`);
    }
  }

  private async findOrCreateCustomer(companyId: string, phone: string, name?: string) {
    const normalized = this.whatsappApi.normalizePhone(phone);

    let customer = await this.customerModel.findOne({
      companyId: new Types.ObjectId(companyId),
      $or: [{ phone: normalized }, { whatsappId: normalized }],
    });

    if (!customer) {
      customer = await this.customerModel.create({
        companyId: new Types.ObjectId(companyId),
        name: name || `عميل ${normalized.slice(-4)}`,
        phone: normalized,
        whatsappId: normalized,
        status: 'lead',
        lastContactAt: new Date(),
        totalMessages: 0,
        tags: ['whatsapp'],
        metadata: { source: 'whatsapp' },
      });
      return { customer, isNew: true as const };
    }

    let dirty = false;
    if (customer.phone !== normalized) {
      customer.phone = normalized;
      dirty = true;
    }
    if (customer.whatsappId !== normalized) {
      customer.whatsappId = normalized;
      dirty = true;
    }
    if (name && customer.name.startsWith('عميل ') && name !== customer.name) {
      customer.name = name;
      dirty = true;
    }
    if (dirty) await customer.save();

    return { customer, isNew: false as const };
  }

  private async findOrCreateConversation(companyId: string, customerId: Types.ObjectId, phone: string) {
    let conversation = await this.conversationModel.findOne({
      companyId: new Types.ObjectId(companyId),
      customerId,
      channel: 'whatsapp',
      status: { $in: ['open', 'pending'] },
    });

    if (!conversation) {
      conversation = await this.conversationModel.create({
        companyId: new Types.ObjectId(companyId),
        customerId,
        channel: 'whatsapp',
        status: 'open',
        whatsappConversationId: phone,
        unreadCount: 0,
        aiHandled: false,
      });
    }

    return conversation;
  }

  private async getCompanyWithWhatsApp(companyId: string) {
    const company = await this.companyModel.findById(companyId);
    if (!company) throw new NotFoundException('الشركة غير موجودة');
    if (!company.whatsapp?.phoneNumberId || !company.whatsapp?.accessToken) {
      throw new NotFoundException('واتساب غير مُعد. فعّل وضع التجربة أو اربط واتساب الحقيقي');
    }
    return company;
  }

  private isDemo(company: CompanyDocument) {
    return !!company.whatsapp?.phoneNumberId?.startsWith('demo_') || company.whatsapp?.accessToken === 'demo_token';
  }

  private getCredentials(company: CompanyDocument) {
    return {
      phoneNumberId: company.whatsapp!.phoneNumberId!,
      accessToken: company.whatsapp!.accessToken!,
    };
  }
}
