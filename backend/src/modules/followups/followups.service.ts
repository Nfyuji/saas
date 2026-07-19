import { Injectable, Logger, Inject, forwardRef, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FollowUp, FollowUpDocument } from '../../schemas/followup.schema';
import { Deal, DealDocument } from '../../schemas/deal.schema';
import { Customer, CustomerDocument } from '../../schemas/customer.schema';
import { Company, CompanyDocument } from '../../schemas/company.schema';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { AiService } from '../ai/ai.service';
import { PlanEntitlementsService } from '../../common/services/plan-entitlements.service';

const FOLLOW_UP_MESSAGES = [
  'مرحباً {name}، هل احتجت مساعدة إضافية بخصوص استفسارك؟ نحن جاهزون لخدمتك 😊',
  'أهلاً {name}، فقط للتذكير — هل ما زلت مهتماً؟ يمكنني إرسال عرض سعر مخصص لك.',
  'مرحباً {name}، آخر متابعة منّا 🙏 إذا كان الوقت غير مناسب الآن، يسعدنا خدمتك متى ما أحببت.',
];

const POST_PURCHASE_MESSAGES = [
  'مرحباً {name} 🌟 شكراً لثقتك فينا! حابين نتأكد: هل المنتج/الجهاز عجبك؟ وأي ملاحظة تساعدنا نحسّن خدمتك.',
  'أهلاً {name}، نتمنى يكون كل شيء تمام مع طلبك. لو احتجت مساعدة بالاستخدام أو فيه أي مشكلة — راسلنا هنا مباشرة.',
];

@Injectable()
export class FollowUpsService implements OnModuleDestroy {
  private readonly logger = new Logger(FollowUpsService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectModel(FollowUp.name) private followUpModel: Model<FollowUpDocument>,
    @InjectModel(Deal.name) private dealModel: Model<DealDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @Inject(forwardRef(() => WhatsappService)) private whatsappService: WhatsappService,
    private aiService: AiService,
    private entitlements: PlanEntitlementsService,
  ) {
    this.timer = setInterval(() => this.processDueFollowUps().catch((e) => this.logger.error(e)), 60_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async scheduleForConversation(
    companyId: string,
    customerId: Types.ObjectId,
    conversationId: Types.ObjectId,
    dealId?: Types.ObjectId,
  ) {
    const company = await this.companyModel.findById(companyId);
    if (company?.settings?.autoFollowUp === false) return;

    const hours = company?.settings?.followUpHours || [2, 24, 72];
    await this.followUpModel.deleteMany({
      companyId: new Types.ObjectId(companyId),
      customerId,
      status: 'pending',
      type: 'sales',
    });

    const docs = hours.map((h, i) => ({
      companyId: new Types.ObjectId(companyId),
      customerId,
      conversationId,
      dealId,
      scheduledAt: new Date(Date.now() + h * 60 * 60 * 1000),
      status: 'pending',
      step: i + 1,
      source: 'ai' as const,
      type: 'sales',
      message: FOLLOW_UP_MESSAGES[Math.min(i, FOLLOW_UP_MESSAGES.length - 1)],
    }));

    await this.followUpModel.insertMany(docs);
  }

  /** بعد الدفع/الفوز: ألغِ متابعات البيع وجدول سؤال الرضا */
  async onPurchaseCompleted(options: {
    companyId: string;
    customerId: string | Types.ObjectId;
    dealId?: string | Types.ObjectId;
    conversationId?: string | Types.ObjectId;
    productHint?: string;
  }) {
    const companyId = options.companyId.toString();
    const customerOid = new Types.ObjectId(options.customerId.toString());
    const company = await this.companyModel.findById(companyId);
    if (!company) return;

    await this.cancelSalesForCustomer(companyId, customerOid);

    const customer = await this.customerModel.findOne({ _id: customerOid, companyId: new Types.ObjectId(companyId) });
    if (customer) {
      if (customer.status === 'lead' || customer.status === 'prospect') {
        customer.status = 'customer';
      }
      if (!customer.tags.includes('purchased')) customer.tags.push('purchased');
      await customer.save();
    }

    if (company.settings?.postPurchaseFollowUp === false) return;

    const hours = company.settings?.postPurchaseHours?.length
      ? company.settings.postPurchaseHours
      : [24, 72];

    await this.followUpModel.deleteMany({
      companyId: new Types.ObjectId(companyId),
      customerId: customerOid,
      status: 'pending',
      type: { $in: ['post_purchase', 'nps'] },
    });

    const product = options.productHint || 'المنتج/الجهاز';
    const docs = hours.map((h, i) => ({
      companyId: new Types.ObjectId(companyId),
      customerId: customerOid,
      conversationId: options.conversationId
        ? new Types.ObjectId(options.conversationId.toString())
        : undefined,
      dealId: options.dealId ? new Types.ObjectId(options.dealId.toString()) : undefined,
      scheduledAt: new Date(Date.now() + h * 60 * 60 * 1000),
      status: 'pending',
      step: i + 1,
      source: 'system' as const,
      type: i === 0 ? 'post_purchase' : 'nps',
      message: POST_PURCHASE_MESSAGES[Math.min(i, POST_PURCHASE_MESSAGES.length - 1)].replace(
        'المنتج/الجهاز',
        product,
      ),
      metadata: { productHint: product },
    }));

    await this.followUpModel.insertMany(docs);
  }

  async cancelSalesForCustomer(companyId: string, customerId: string | Types.ObjectId) {
    await this.followUpModel.updateMany(
      {
        companyId: new Types.ObjectId(companyId),
        customerId: new Types.ObjectId(customerId.toString()),
        status: 'pending',
        type: 'sales',
      },
      { status: 'cancelled' },
    );
  }

  async cancelForCustomer(companyId: string, customerId: string | Types.ObjectId) {
    // عند رد العميل: ألغِ متابعات البيع فقط — لا تلغِ رضا ما بعد الشراء
    await this.cancelSalesForCustomer(companyId, customerId);
  }

  async handlePossibleCsatReply(companyId: string, customer: CustomerDocument, text: string) {
    if (!text?.trim()) return null;

    const recent = await this.followUpModel
      .findOne({
        companyId: new Types.ObjectId(companyId),
        customerId: customer._id,
        type: { $in: ['post_purchase', 'nps'] },
        status: 'sent',
      })
      .sort({ updatedAt: -1 })
      .lean();

    if (!recent) return null;
    const sentAt = (recent as { updatedAt?: Date; scheduledAt?: Date }).updatedAt
      || recent.scheduledAt;
    if (!sentAt || Date.now() - new Date(sentAt).getTime() > 7 * 24 * 60 * 60 * 1000) {
      return null;
    }

    const sentiment = await this.aiService.analyzeCustomerSentiment(text);
    const meta = { ...(customer.metadata || {}) };
    meta.lastCsatAt = new Date().toISOString();
    meta.lastCsatSentiment = sentiment;
    meta.lastCsatText = text.slice(0, 500);

    if (sentiment === 'positive') {
      if (!customer.tags.includes('satisfied')) customer.tags.push('satisfied');
      if (customer.status === 'customer') customer.status = 'vip';
    } else if (sentiment === 'negative') {
      if (!customer.tags.includes('needs_care')) customer.tags.push('needs_care');
    }

    customer.metadata = meta;
    await customer.save();
    return { sentiment };
  }

  async findAll(companyId: string, status?: string) {
    const filter: Record<string, unknown> = { companyId: new Types.ObjectId(companyId) };
    if (status) filter.status = status;
    return this.followUpModel
      .find(filter)
      .populate('customerId', 'name phone')
      .sort({ scheduledAt: 1 })
      .limit(100)
      .lean();
  }

  async processDueFollowUps() {
    const due = await this.followUpModel
      .find({ status: 'pending', scheduledAt: { $lte: new Date() } })
      .limit(20);

    for (const fu of due) {
      try {
        const customer = await this.customerModel.findById(fu.customerId);
        if (!customer?.phone) {
          fu.status = 'cancelled';
          await fu.save();
          continue;
        }

        const company = await this.companyModel.findById(fu.companyId);
        if (!company?.whatsapp?.phoneNumberId) {
          continue;
        }

        const name = customer.name || 'عميلنا العزيز';
        const templates = fu.type === 'sales' ? FOLLOW_UP_MESSAGES : POST_PURCHASE_MESSAGES;
        let text = (fu.message || templates[0]).replace(/\{name\}/g, name);

        if (fu.type === 'sales' && company.settings?.aiEnabled !== false) {
          text = await this.aiService.generateFollowUp({
            companyName: company.name,
            customerName: name,
            step: fu.step,
            sector: company.sector,
            kind: 'sales',
          });
        } else if (fu.type !== 'sales' && company.settings?.aiEnabled !== false) {
          text = await this.aiService.generateFollowUp({
            companyName: company.name,
            customerName: name,
            step: fu.step,
            sector: company.sector,
            kind: 'post_purchase',
            productHint: (fu.metadata?.productHint as string) || undefined,
          });
        }

        await this.whatsappService.sendMessage(fu.companyId.toString(), 'system', {
          to: customer.phone,
          type: 'text',
          text,
        });

        fu.status = 'sent';
        await fu.save();

        if (fu.dealId) {
          await this.dealModel.updateOne(
            { _id: fu.dealId },
            {
              $set: { lastFollowUpAt: new Date() },
              $inc: { followUpCount: 1 },
            },
          );
        }
      } catch (error) {
        this.logger.error(`Follow-up ${fu._id} failed: ${error}`);
        fu.status = 'failed';
        await fu.save();
      }
    }
  }

  async getOpportunities(companyId: string) {
    await this.entitlements.assertFeature(companyId, 'opportunitiesEnabled');

    const companyObjId = new Types.ObjectId(companyId);
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const [waitingNoReply, coldDeals, overdueFollowUps, lostThisWeek, pipelineValue] =
      await Promise.all([
        this.dealModel
          .find({
            companyId: companyObjId,
            stage: { $in: ['lead', 'qualified', 'proposal'] },
            updatedAt: { $lte: dayAgo },
          })
          .populate('customerId', 'name phone')
          .limit(20)
          .lean(),
        this.dealModel
          .find({
            companyId: companyObjId,
            stage: { $in: ['lead', 'qualified', 'proposal', 'cold'] },
            updatedAt: { $lte: threeDaysAgo },
          })
          .populate('customerId', 'name phone')
          .limit(20)
          .lean(),
        this.followUpModel.countDocuments({
          companyId: companyObjId,
          status: 'pending',
          scheduledAt: { $lte: now },
        }),
        this.dealModel.aggregate([
          {
            $match: {
              companyId: companyObjId,
              stage: 'lost',
              updatedAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
            },
          },
          { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$value' } } },
        ]),
        this.dealModel.aggregate([
          {
            $match: {
              companyId: companyObjId,
              stage: { $in: ['lead', 'qualified', 'proposal', 'negotiation'] },
            },
          },
          { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$value' } } },
        ]),
      ]);

    const lost = lostThisWeek[0] || { count: 0, value: 0 };
    const pipeline = pipelineValue[0] || { count: 0, value: 0 };
    const estimatedLoss =
      waitingNoReply.reduce((s, d) => s + (d.value || 0), 0) +
      coldDeals.reduce((s, d) => s + (d.value || 0), 0);

    return {
      summary: {
        waitingNoReply: waitingNoReply.length,
        coldDeals: coldDeals.length,
        overdueFollowUps,
        lostThisWeek: lost.count,
        lostValue: lost.value,
        openPipeline: pipeline.count,
        pipelineValue: pipeline.value,
        estimatedOpportunityLoss: estimatedLoss,
      },
      waitingNoReply,
      coldDeals,
    };
  }
}
