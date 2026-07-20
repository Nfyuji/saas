import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SocialAccount, SocialAccountDocument } from '../../schemas/social-account.schema';
import { ContentAsset, ContentAssetDocument } from '../../schemas/content-asset.schema';
import { Competitor, CompetitorDocument } from '../../schemas/competitor.schema';
import { Company, CompanyDocument } from '../../schemas/company.schema';
import { Customer, CustomerDocument } from '../../schemas/customer.schema';
import { Conversation, ConversationDocument } from '../../schemas/conversation.schema';
import { Message, MessageDocument } from '../../schemas/message.schema';
import { Deal, DealDocument } from '../../schemas/deal.schema';
import { Invoice, InvoiceDocument } from '../../schemas/invoice.schema';
import { KnowledgeDocument, KnowledgeDocumentDoc } from '../../schemas/knowledge.schema';
import { AiService } from '../ai/ai.service';
import { CampaignsService } from '../campaigns/campaigns.service';

@Injectable()
export class IntelligenceService {
  constructor(
    @InjectModel(SocialAccount.name) private socialModel: Model<SocialAccountDocument>,
    @InjectModel(ContentAsset.name) private contentModel: Model<ContentAssetDocument>,
    @InjectModel(Competitor.name) private competitorModel: Model<CompetitorDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Deal.name) private dealModel: Model<DealDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(KnowledgeDocument.name) private knowledgeModel: Model<KnowledgeDocumentDoc>,
    private ai: AiService,
    @Inject(forwardRef(() => CampaignsService)) private campaigns: CampaignsService,
  ) {}

  private oid(companyId: string) {
    return new Types.ObjectId(companyId);
  }

  // ─── Social accounts ───────────────────────────────────────────
  async listSocial(companyId: string) {
    return this.socialModel.find({ companyId: this.oid(companyId) }).sort({ createdAt: -1 }).lean();
  }

  async upsertSocial(
    companyId: string,
    data: {
      channel: string;
      displayName: string;
      handle?: string;
      status?: string;
      inboxEnabled?: boolean;
      postingEnabled?: boolean;
    },
  ) {
    return this.socialModel.create({
      companyId: this.oid(companyId),
      channel: data.channel,
      displayName: data.displayName,
      handle: data.handle,
      status: data.status || 'pending',
      inboxEnabled: data.inboxEnabled !== false,
      postingEnabled: data.postingEnabled !== false,
      meta: { note: 'الربط الكامل عبر OAuth جاهز للتفعيل عند توفير مفاتيح القناة' },
    });
  }

  async removeSocial(companyId: string, id: string) {
    const r = await this.socialModel.deleteOne({ _id: id, companyId: this.oid(companyId) });
    if (!r.deletedCount) throw new NotFoundException('الحساب غير موجود');
    return { success: true };
  }

  // ─── Content studio ────────────────────────────────────────────
  async listContent(companyId: string) {
    return this.contentModel.find({ companyId: this.oid(companyId) }).sort({ createdAt: -1 }).limit(50).lean();
  }

  async generateContent(
    companyId: string,
    data: { type?: string; topic: string; channel?: string; tone?: string },
  ) {
    const company = await this.companyModel.findById(companyId).lean();
    const knowledge = await this.knowledgeModel
      .find({ companyId: this.oid(companyId), isActive: { $ne: false } })
      .limit(5)
      .select('title content type')
      .lean();
    const kb = knowledge.map((k) => `${k.title}: ${(k.content || '').slice(0, 200)}`).join('\n');

    const type = data.type || 'post';
    const channel = data.channel || 'instagram';
    const fallback = {
      title: `محتوى: ${data.topic}`,
      body: `✨ ${data.topic}\n\nفي ${company?.name || 'شركتنا'} نقدّم قيمة حقيقية لعملائنا.\n\nتواصل معنا اليوم عبر واتساب واكتشف العرض الأنسب لك.`,
      hashtags: ['#تسويق', '#مبيعات', '#BusinessOS'],
      cta: 'راسلنا الآن',
    };

    const generated = await this.ai.completeJson<typeof fallback>(
      `أنت مدير محتوى وإعلانات محترف بالعربية لشركة ${company?.name || ''}. القطاع: ${company?.sector || 'عام'}.`,
      `أنشئ ${type} لقناة ${channel}. الموضوع: ${data.topic}. النبرة: ${data.tone || 'احترافية ودّية'}.
معرفة الشركة:
${kb || 'لا توجد معرفة مرفوعة'}
أرجع JSON: { "title": "", "body": "", "hashtags": [], "cta": "" }`,
      fallback,
    );

    const doc = await this.contentModel.create({
      companyId: this.oid(companyId),
      type,
      title: generated.title,
      body: generated.body + (generated.cta ? `\n\n👉 ${generated.cta}` : ''),
      channels: [channel],
      hashtags: generated.hashtags || [],
      status: 'ready',
      aiGenerated: true,
      metadata: { topic: data.topic, tone: data.tone },
    });

    return doc;
  }

  async deleteContent(companyId: string, id: string) {
    const r = await this.contentModel.deleteOne({ _id: id, companyId: this.oid(companyId) });
    if (!r.deletedCount) throw new NotFoundException('المحتوى غير موجود');
    return { success: true };
  }

  async markContentPublished(companyId: string, id: string) {
    const doc = await this.contentModel.findOneAndUpdate(
      { _id: id, companyId: this.oid(companyId) },
      { status: 'published', $set: { 'metadata.publishedAt': new Date() } },
      { new: true },
    );
    if (!doc) throw new NotFoundException('المحتوى غير موجود');
    return doc;
  }

  async sendContentAsWhatsAppCampaign(
    companyId: string,
    userId: string,
    id: string,
    filter?: { status?: string; tag?: string; purchasedOnly?: boolean; dryRun?: boolean },
  ) {
    const doc = await this.contentModel.findOne({ _id: id, companyId: this.oid(companyId) });
    if (!doc) throw new NotFoundException('المحتوى غير موجود');

    const hashtags = (doc.hashtags || []).join(' ');
    const message = `${doc.body}${hashtags ? `\n\n${hashtags}` : ''}`.trim();
    const result = await this.campaigns.broadcast(companyId, userId, {
      message,
      status: filter?.status,
      tag: filter?.tag,
      purchasedOnly: filter?.purchasedOnly,
      dryRun: filter?.dryRun,
    });

    if (!filter?.dryRun) {
      doc.status = 'published';
      doc.metadata = {
        ...(doc.metadata || {}),
        publishedAt: new Date(),
        campaignResult: result,
      };
      await doc.save();
    }

    return { content: doc, campaign: result };
  }

  // ─── Competitors ───────────────────────────────────────────────
  async listCompetitors(companyId: string) {
    return this.competitorModel.find({ companyId: this.oid(companyId) }).sort({ updatedAt: -1 }).lean();
  }

  async addCompetitor(
    companyId: string,
    data: { name: string; website?: string; channels?: string[]; notes?: string },
  ) {
    return this.competitorModel.create({
      companyId: this.oid(companyId),
      ...data,
    });
  }

  async analyzeCompetitor(companyId: string, id: string) {
    const competitor = await this.competitorModel.findOne({
      _id: id,
      companyId: this.oid(companyId),
    });
    if (!competitor) throw new NotFoundException('المنافس غير موجود');

    const company = await this.companyModel.findById(companyId).lean();
    const fallback = {
      summary: `${competitor.name} منافس في نفس المجال. راقب عروضه وقنواته باستمرار.`,
      strengths: ['حضور رقمي', 'تسعير تنافسي'],
      weaknesses: ['خدمة عملاء أبطأ محتملة', 'محتوى عام'],
      opportunities: ['تميّز بخدمة واتساب أسرع', 'محتوى تعليمي أقوى'],
      contentIdeas: [`قارن عرضك مع ${competitor.name}`, 'انشر قصة عميل ناجحة'],
    };

    const analysis = await this.ai.completeJson<typeof fallback>(
      `أنت محلل منافسة واستراتيجية تسويق بالعربية لشركة ${company?.name}.`,
      `حلّل المنافس:
الاسم: ${competitor.name}
الموقع: ${competitor.website || '—'}
القنوات: ${(competitor.channels || []).join(', ') || '—'}
ملاحظات: ${competitor.notes || '—'}
قطاعنا: ${company?.sector || 'عام'}
أرجع JSON: { "summary": "", "strengths": [], "weaknesses": [], "opportunities": [], "contentIdeas": [] }`,
      fallback,
    );

    competitor.lastAnalysis = {
      at: new Date(),
      ...analysis,
    };
    await competitor.save();
    return competitor;
  }

  async removeCompetitor(companyId: string, id: string) {
    const r = await this.competitorModel.deleteOne({ _id: id, companyId: this.oid(companyId) });
    if (!r.deletedCount) throw new NotFoundException('المنافس غير موجود');
    return { success: true };
  }

  // ─── Sales forecast ────────────────────────────────────────────
  async salesForecast(companyId: string) {
    const oid = this.oid(companyId);
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [pipeline, paid30, paidPrev, openDeals, customers, messages30] = await Promise.all([
      this.dealModel.aggregate([
        {
          $match: {
            companyId: oid,
            stage: { $in: ['lead', 'qualified', 'proposal', 'negotiation'] },
          },
        },
        { $group: { _id: null, value: { $sum: '$value' }, count: { $sum: 1 } } },
      ]),
      this.invoiceModel.aggregate([
        { $match: { companyId: oid, status: 'paid', paidAt: { $gte: monthAgo } } },
        { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),
      this.invoiceModel.aggregate([
        {
          $match: {
            companyId: oid,
            status: 'paid',
            paidAt: { $gte: twoMonthsAgo, $lt: monthAgo },
          },
        },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      this.dealModel
        .find({
          companyId: oid,
          stage: { $in: ['proposal', 'negotiation'] },
        })
        .select('title value stage')
        .limit(10)
        .lean(),
      this.customerModel.countDocuments({ companyId: oid }),
      this.messageModel.countDocuments({ companyId: oid, createdAt: { $gte: monthAgo } }),
    ]);

    const revenue30 = paid30[0]?.total || 0;
    const revenuePrev = paidPrev[0]?.total || 0;
    const pipelineValue = pipeline[0]?.value || 0;
    const growth =
      revenuePrev > 0 ? Math.round(((revenue30 - revenuePrev) / revenuePrev) * 100) : revenue30 > 0 ? 100 : 0;
    const predictedNext30 = Math.round(revenue30 * (1 + Math.min(Math.max(growth, -30), 40) / 100) + pipelineValue * 0.25);

    const company = await this.companyModel.findById(companyId).lean();
    const narrative = await this.ai.completeText(
      'أنت محلل مبيعات تنفيذي. اكتب فقرة عربية قصيرة واضحة.',
      `شركة: ${company?.name}
إيراد 30 يوم: ${revenue30}
الشهر السابق: ${revenuePrev}
خط الأنابيب: ${pipelineValue} (${pipeline[0]?.count || 0} صفقات)
عملاء: ${customers}
رسائل 30 يوم: ${messages30}
توقّع تقريبي للـ 30 يوماً القادمة: ${predictedNext30}
اكتب تحليلاً وتنبؤاً مع 3 توصيات عملية.`,
      `الإيراد الحالي ${revenue30.toLocaleString('ar')} خلال 30 يوماً. خط الأنابيب ${pipelineValue.toLocaleString('ar')}. التوقّع التالي حوالي ${predictedNext30.toLocaleString('ar')}. ركّز على إغلاق صفقات التفاوض ومتابعة الفرص الباردة.`,
    );

    return {
      metrics: {
        revenueLast30: revenue30,
        revenuePrev30: revenuePrev,
        growthPercent: growth,
        pipelineValue,
        openPipelineDeals: pipeline[0]?.count || 0,
        customers,
        messagesLast30: messages30,
        predictedNext30,
      },
      hotDeals: openDeals,
      narrative,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── AI workflow suggestions ───────────────────────────────────
  async suggestWorkflows(companyId: string) {
    const company = await this.companyModel.findById(companyId).lean();
    const tags = await this.customerModel.aggregate([
      { $match: { companyId: this.oid(companyId) } },
      { $unwind: { path: '$tags', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    const fallback = {
      workflows: [
        {
          name: 'اهتمام بالسعر → وسم + رد',
          trigger: 'keyword',
          triggerConfig: { keywords: ['سعر', 'كم', 'عرض'] },
          actions: [
            { type: 'add_tag', config: { tag: 'مهتم_سعر' } },
            { type: 'send_message', config: { message: 'مرحباً {name}، نجهّز لك عرض سعر مناسب خلال دقائق ✨' } },
          ],
          reason: 'أكثر الاستفسارات شيوعاً تتعلق بالسعر',
        },
        {
          name: 'عميل جديد → ترحيب',
          trigger: 'new_customer',
          triggerConfig: {},
          actions: [
            { type: 'add_tag', config: { tag: 'new' } },
            {
              type: 'send_message',
              config: { message: 'أهلاً {name}! سعداء بتواصلك. كيف نقدر نساعدك اليوم؟' },
            },
          ],
          reason: 'تحسين أول انطباع وزيادة التحويل',
        },
      ],
    };

    return this.ai.completeJson<typeof fallback>(
      `اقترح أتمتات واتساب لشركة ${company?.name}. أرجع JSON فقط.`,
      `القطاع: ${company?.sector || 'عام'}
أشهر الوسوم: ${tags.map((t) => t._id).join(', ') || 'لا يوجد'}
أرجع: { "workflows": [ { "name": "", "trigger": "keyword|new_customer", "triggerConfig": {}, "actions": [ { "type": "add_tag|send_message", "config": {} } ], "reason": "" } ] }
حد أقصى 4 workflows.`,
      fallback,
    );
  }

  // ─── Executive daily briefing ──────────────────────────────────
  async executiveBriefing(companyId: string) {
    const oid = this.oid(companyId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      customers,
      openConversations,
      unread,
      todayMessages,
      openDeals,
      pipeline,
      paidToday,
      social,
      knowledgeCount,
      waitingDeals,
    ] = await Promise.all([
      this.customerModel.countDocuments({ companyId: oid }),
      this.conversationModel.countDocuments({ companyId: oid, status: 'open' }),
      this.conversationModel.aggregate([
        { $match: { companyId: oid } },
        { $group: { _id: null, n: { $sum: '$unreadCount' } } },
      ]),
      this.messageModel.countDocuments({ companyId: oid, createdAt: { $gte: today } }),
      this.dealModel.countDocuments({
        companyId: oid,
        stage: { $in: ['lead', 'qualified', 'proposal', 'negotiation'] },
      }),
      this.dealModel.aggregate([
        {
          $match: {
            companyId: oid,
            stage: { $in: ['lead', 'qualified', 'proposal', 'negotiation'] },
          },
        },
        { $group: { _id: null, value: { $sum: '$value' } } },
      ]),
      this.invoiceModel.aggregate([
        { $match: { companyId: oid, status: 'paid', paidAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      this.socialModel.find({ companyId: oid }).lean(),
      this.knowledgeModel.countDocuments({ companyId: oid }),
      this.dealModel
        .find({
          companyId: oid,
          stage: { $in: ['lead', 'qualified', 'proposal'] },
          updatedAt: { $lte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        })
        .populate('customerId', 'name phone')
        .limit(5)
        .lean(),
    ]);

    const kpis = {
      customers,
      openConversations,
      unreadMessages: unread[0]?.n || 0,
      todayMessages,
      openDeals,
      pipelineValue: pipeline[0]?.value || 0,
      paidToday: paidToday[0]?.total || 0,
      socialConnected: social.filter((s) => s.status === 'connected').length,
      socialTotal: social.length,
      knowledgeDocs: knowledgeCount,
    };

    const company = await this.companyModel.findById(companyId).lean();
    const channels = [
      { id: 'whatsapp', label: 'واتساب', ready: true },
      { id: 'instagram', label: 'إنستغرام', ready: social.some((s) => s.channel === 'instagram') },
      { id: 'facebook', label: 'فيسبوك', ready: social.some((s) => s.channel === 'facebook') },
      { id: 'tiktok', label: 'تيك توك', ready: social.some((s) => s.channel === 'tiktok') },
      { id: 'x', label: 'X', ready: social.some((s) => s.channel === 'x') },
    ];

    const fallbackSuggestions = [
      {
        priority: 'high',
        title: 'رد على الرسائل غير المقروءة',
        detail: `لديك ${kpis.unreadMessages} رسالة بانتظار رد.`,
        href: '/dashboard/inbox',
      },
      {
        priority: 'medium',
        title: 'فعّل معرفة الشركة (RAG)',
        detail: knowledgeCount ? 'حدّث الكتالوج لرد أدق من AI' : 'ارفع أسعار ومنتجات حتى يرد AI بدقة',
        href: '/dashboard/knowledge',
      },
      {
        priority: 'medium',
        title: 'أنشئ محتوى اليوم',
        detail: 'ولّد منشوراً أو إعلاناً من استوديو المحتوى',
        href: '/dashboard/content',
      },
    ];

    const aiBlock = await this.ai.completeJson<{
      headline: string;
      summary: string;
      suggestions: Array<{ priority: string; title: string; detail: string; href?: string }>;
    }>(
      'أنت مستشار تنفيذي للعمليات والتسويق. أجب بالعربية JSON فقط.',
      `بيانات اليوم لشركة ${company?.name}:
${JSON.stringify(kpis)}
فرص باردة: ${waitingDeals.length}
اقترح headline و summary و 4 suggestions بـ priority high|medium|low و href من:
/dashboard/inbox /dashboard/opportunities /dashboard/campaigns /dashboard/content /dashboard/competitors /dashboard/forecast /dashboard/automations /dashboard/knowledge /dashboard/social
JSON: { "headline": "", "summary": "", "suggestions": [] }`,
      {
        headline: 'ملخص يوم التشغيل',
        summary: `اليوم ${kpis.todayMessages} رسالة، ${kpis.openDeals} صفقة مفتوحة بقيمة ${kpis.pipelineValue}.`,
        suggestions: fallbackSuggestions,
      },
    );

    return {
      date: today.toISOString(),
      kpis,
      channels,
      social,
      waitingDeals,
      briefing: aiBlock,
      platformMap: [
        { key: 'crm', label: 'CRM متكامل', href: '/dashboard/customers', ready: true },
        { key: 'social', label: 'حسابات التواصل', href: '/dashboard/social', ready: true },
        { key: 'campaigns', label: 'الحملات الإعلانية', href: '/dashboard/campaigns', ready: true },
        { key: 'inbox', label: 'صندوق موحّد', href: '/dashboard/inbox', ready: true },
        { key: 'rag', label: 'RAG معرفة الشركة', href: '/dashboard/knowledge', ready: true },
        { key: 'agent', label: 'AI Agent للعملاء', href: '/dashboard/whatsapp', ready: true },
        { key: 'competitors', label: 'تحليل المنافسين', href: '/dashboard/competitors', ready: true },
        { key: 'content', label: 'محتوى وإعلانات AI', href: '/dashboard/content', ready: true },
        { key: 'forecast', label: 'تنبؤ المبيعات', href: '/dashboard/forecast', ready: true },
        { key: 'workflows', label: 'أتمتة بالـ AI', href: '/dashboard/automations', ready: true },
        { key: 'executive', label: 'لوحة تنفيذية يومية', href: '/dashboard/executive', ready: true },
      ],
      generatedAt: new Date().toISOString(),
    };
  }
}
