import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Company, CompanyDocument } from '../../schemas/company.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { Message, MessageDocument } from '../../schemas/message.schema';
import { Conversation, ConversationDocument } from '../../schemas/conversation.schema';
import { Customer, CustomerDocument } from '../../schemas/customer.schema';
import { KnowledgeDocument, KnowledgeDocumentDoc } from '../../schemas/knowledge.schema';
import { PlansService } from '../../modules/plans/plans.service';

export type PlanLimitKey =
  | 'conversations'
  | 'knowledgeDocs'
  | 'teamUsers'
  | 'agents'
  | 'whatsappNumbers'
  | 'messagesPerDay';

export interface UsageSnapshot {
  conversations: number;
  openConversations: number;
  knowledgeDocs: number;
  teamUsers: number;
  agents: number;
  whatsappNumbers: number;
  messagesPerDay: number;
  messagesTotal: number;
  inboundToday: number;
  outboundToday: number;
  customers: number;
  dayResetsAt: string;
}

@Injectable()
export class PlanEntitlementsService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(KnowledgeDocument.name) private knowledgeModel: Model<KnowledgeDocumentDoc>,
    private plansService: PlansService,
  ) {}

  async getCompanyPlan(companyId: string) {
    const company = await this.companyModel.findById(companyId).lean();
    if (!company) throw new ForbiddenException('الشركة غير موجودة');
    const plan = await this.plansService.findByCode(company.plan || 'starter');
    return { company, plan };
  }

  async getUsage(companyId: string): Promise<UsageSnapshot> {
    const oid = new Types.ObjectId(companyId);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const dayResetsAt = new Date(startOfDay);
    dayResetsAt.setDate(dayResetsAt.getDate() + 1);

    const [
      conversations,
      openConversations,
      knowledgeDocs,
      teamUsers,
      company,
      messagesPerDay,
      messagesTotal,
      inboundToday,
      outboundToday,
      customers,
    ] = await Promise.all([
      this.conversationModel.countDocuments({ companyId: oid }),
      this.conversationModel.countDocuments({ companyId: oid, status: 'open' }),
      this.knowledgeModel.countDocuments({ companyId: oid }),
      this.userModel.countDocuments({ companyId: oid }),
      this.companyModel.findById(companyId).select('whatsapp').lean(),
      this.messageModel.countDocuments({
        companyId: oid,
        direction: 'outbound',
        createdAt: { $gte: startOfDay },
      }),
      this.messageModel.countDocuments({ companyId: oid }),
      this.messageModel.countDocuments({
        companyId: oid,
        direction: 'inbound',
        createdAt: { $gte: startOfDay },
      }),
      this.messageModel.countDocuments({
        companyId: oid,
        direction: 'outbound',
        createdAt: { $gte: startOfDay },
      }),
      this.customerModel.countDocuments({ companyId: oid }),
    ]);

    return {
      conversations,
      openConversations,
      knowledgeDocs,
      teamUsers,
      agents: teamUsers,
      whatsappNumbers: company?.whatsapp?.phoneNumberId ? 1 : 0,
      messagesPerDay,
      messagesTotal,
      inboundToday,
      outboundToday,
      customers,
      dayResetsAt: dayResetsAt.toISOString(),
    };
  }

  async assertDailyMessageLimit(companyId: string) {
    await this.assertLimit(companyId, 'messagesPerDay');
  }

  async assertActiveSubscription(companyId: string) {
    const company = await this.companyModel.findById(companyId).lean();
    if (!company) throw new ForbiddenException('الشركة غير موجودة');
    if (!company.isActive) {
      throw new ForbiddenException(
        company.suspendedReason
          ? `الاشتراك موقوف: ${company.suspendedReason}`
          : 'الاشتراك موقوف',
      );
    }
    if (company.planExpiresAt && new Date(company.planExpiresAt) < new Date()) {
      throw new ForbiddenException('انتهت مدة الاشتراك. جدّد الباقة للمتابعة.');
    }
    return company;
  }

  async assertFeature(
    companyId: string,
    feature: 'invoicesEnabled' | 'knowledgeEnabled' | 'opportunitiesEnabled' | 'salesAgentEnabled',
  ) {
    const company = await this.assertActiveSubscription(companyId);
    const plan = await this.plansService.findByCode(company.plan || 'starter');
    const fromSettings = (company.settings as Record<string, unknown> | undefined)?.[feature];
    const fromPlan = plan ? (plan as Record<string, unknown>)[feature] : undefined;
    const enabled = fromSettings !== undefined ? !!fromSettings : fromPlan !== false;
    if (!enabled) {
      throw new ForbiddenException('هذه الميزة غير متاحة في باقتك الحالية');
    }
  }

  async assertLimit(companyId: string, key: PlanLimitKey) {
    await this.assertActiveSubscription(companyId);
    const { plan } = await this.getCompanyPlan(companyId);
    const limits = (plan?.limits || {}) as Record<string, number | undefined>;
    const limit = key === 'agents' ? limits.agents ?? limits.teamUsers : limits[key];
    if (limit == null || limit < 0) return;

    const usage = await this.getUsage(companyId);
    const used = key === 'agents' ? usage.agents : usage[key];
    if (used >= limit) {
      throw new ForbiddenException(`وصلت لحد الباقة (${key}: ${limit}). رقِّ الباقة للمتابعة.`);
    }
  }
}
