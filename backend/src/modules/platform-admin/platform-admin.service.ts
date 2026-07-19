import {
  Injectable,
  NotFoundException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Company, CompanyDocument } from '../../schemas/company.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { Customer, CustomerDocument } from '../../schemas/customer.schema';
import { Message, MessageDocument } from '../../schemas/message.schema';
import { Invoice, InvoiceDocument } from '../../schemas/invoice.schema';
import {
  PlatformSettings,
  PlatformSettingsDocument,
} from '../../schemas/platform-settings.schema';
import { AdminAudit, AdminAuditDocument } from '../../schemas/admin-audit.schema';
import {
  SubscriptionInvoice,
  SubscriptionInvoiceDocument,
} from '../../schemas/subscription-invoice.schema';
import { PlansService } from '../plans/plans.service';
import { Plan } from '../../schemas/plan.schema';
import { PlanEntitlementsService } from '../../common/services/plan-entitlements.service';

@Injectable()
export class PlatformAdminService implements OnModuleInit {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(PlatformSettings.name)
    private settingsModel: Model<PlatformSettingsDocument>,
    @InjectModel(AdminAudit.name) private auditModel: Model<AdminAuditDocument>,
    @InjectModel(SubscriptionInvoice.name)
    private subscriptionInvoiceModel: Model<SubscriptionInvoiceDocument>,
    private plansService: PlansService,
    private entitlements: PlanEntitlementsService,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    const exists = await this.settingsModel.findOne({ key: 'default' });
    if (!exists) {
      await this.settingsModel.create({
        key: 'default',
        platformName: 'BusinessOS AI',
        supportEmail: 'admin@businessos.ai',
        allowRegistration: true,
        trialEnabled: true,
        trialDays: 14,
        defaultPlanCode: 'starter',
        maintenanceMode: false,
      });
    }
  }

  private async audit(
    action: string,
    opts?: {
      actorEmail?: string;
      targetType?: string;
      targetId?: string;
      targetName?: string;
      meta?: Record<string, unknown>;
    },
  ) {
    await this.auditModel.create({
      action,
      actorEmail: opts?.actorEmail || 'admin',
      targetType: opts?.targetType,
      targetId: opts?.targetId,
      targetName: opts?.targetName,
      meta: opts?.meta || {},
    });
  }

  private applyPlanFeatures(plan: Plan) {
    return {
      'settings.salesAgentEnabled': plan.salesAgentEnabled,
      'settings.autoFollowUp': plan.autoFollowUp,
      'settings.invoicesEnabled': plan.invoicesEnabled,
      'settings.knowledgeEnabled': plan.knowledgeEnabled,
      'settings.opportunitiesEnabled': plan.opportunitiesEnabled,
    };
  }

  async overview() {
    const now = new Date();
    const [
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      expiredCompanies,
      totalUsers,
      totalCustomers,
      totalMessages,
      byPlan,
      recentCompanies,
      paidRevenue,
      plans,
      recentAudits,
    ] = await Promise.all([
      this.companyModel.countDocuments({}),
      this.companyModel.countDocuments({ isActive: true }),
      this.companyModel.countDocuments({ isActive: false }),
      this.companyModel.countDocuments({
        isActive: true,
        planExpiresAt: { $lt: now },
      }),
      this.userModel.countDocuments({ role: { $ne: 'super_admin' } }),
      this.customerModel.countDocuments({}),
      this.messageModel.countDocuments({}),
      this.companyModel.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]),
      this.companyModel.find({}).sort({ createdAt: -1 }).limit(8).lean(),
      this.invoiceModel.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      this.plansService.findAll(true),
      this.auditModel.find({}).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const plansMap: Record<string, number> = {};
    for (const p of byPlan) plansMap[p._id || 'unknown'] = p.count;

    const mrr = plans.reduce((sum, p) => {
      const subs = plansMap[p.code] || 0;
      return sum + subs * (p.price || 0);
    }, 0);

    return {
      totalCompanies,
      activeCompanies,
      suspendedCompanies,
      expiredCompanies,
      totalUsers,
      totalCustomers,
      totalMessages,
      paidRevenue: paidRevenue[0]?.total || 0,
      estimatedMrr: mrr,
      plans: plansMap,
      recentCompanies,
      recentAudits,
      availablePlans: plans.map((p) => this.plansService.toLegacyShape(p as never)),
      plansCount: plans.length,
      activePlansCount: plans.filter((p) => p.isActive).length,
    };
  }

  async listPlans(): Promise<Record<string, unknown>[]> {
    const plans = await this.plansService.findAll(true);
    const counts = await this.companyModel.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } },
    ]);
    const countMap: Record<string, number> = {};
    for (const c of counts) countMap[c._id] = c.count;

    return plans.map((p) => ({
      ...p,
      subscribersCount: countMap[p.code] || 0,
    }));
  }

  async createPlan(data: Partial<Plan>) {
    const plan = await this.plansService.create(data);
    await this.audit('plan.create', {
      targetType: 'plan',
      targetId: String(plan._id),
      targetName: plan.name,
      meta: { code: plan.code, price: plan.price },
    });
    return plan;
  }

  async updatePlan(id: string, data: Partial<Plan>) {
    const plan = await this.plansService.update(id, data);
    await this.audit('plan.update', {
      targetType: 'plan',
      targetId: id,
      targetName: plan.name,
      meta: data as Record<string, unknown>,
    });
    return plan;
  }

  async deletePlan(id: string) {
    const plan = await this.plansService.findById(id);
    if (!plan) throw new NotFoundException('الباقة غير موجودة');
    const used = await this.companyModel.countDocuments({ plan: plan.code });
    if (used > 0) {
      throw new ConflictException(`لا يمكن الحذف: ${used} مشترك يستخدم هذه الباقة. عطّلها بدلاً من ذلك.`);
    }
    await this.plansService.remove(id);
    await this.audit('plan.delete', {
      targetType: 'plan',
      targetId: id,
      targetName: plan.name,
      meta: { code: plan.code },
    });
    return { success: true };
  }

  async togglePlan(id: string, field: 'isActive' | 'visibleToCustomers' | 'popular') {
    const plan = await this.plansService.toggle(id, field);
    await this.audit('plan.toggle', {
      targetType: 'plan',
      targetId: id,
      targetName: plan.name,
      meta: { field, value: plan[field] },
    });
    return plan;
  }

  async listSubscribers(query?: {
    search?: string;
    plan?: string;
    status?: string;
  }): Promise<Record<string, unknown>[]> {
    const filter: Record<string, unknown> = { isArchived: { $ne: true } };
    if (query?.plan) filter.plan = query.plan;
    if (query?.status === 'active') filter.isActive = true;
    if (query?.status === 'suspended') filter.isActive = false;
    if (query?.status === 'expired') {
      filter.isActive = true;
      filter.planExpiresAt = { $lt: new Date() };
    }
    if (query?.status === 'archived') {
      delete filter.isArchived;
      filter.isArchived = true;
    }
    if (query?.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { phone: { $regex: query.search, $options: 'i' } },
      ];
    }

    const companies = await this.companyModel.find(filter).sort({ createdAt: -1 }).lean();
    const allPlans = await this.plansService.findAll(true);
    const planByCode = Object.fromEntries(allPlans.map((p) => [p.code, p]));

    const result = await Promise.all(
      companies.map(async (c) => {
        const [owners, usersCount, customersCount] = await Promise.all([
          this.userModel
            .find({ companyId: c._id, role: { $in: ['owner', 'admin'] } })
            .select('name email role lastLoginAt')
            .lean(),
          this.userModel.countDocuments({ companyId: c._id }),
          this.customerModel.countDocuments({ companyId: c._id }),
        ]);

        const planDoc = planByCode[c.plan];
        const expired = !!(c.planExpiresAt && new Date(c.planExpiresAt) < new Date());
        return {
          ...c,
          owners,
          usersCount,
          customersCount,
          isExpired: expired,
          planMeta: planDoc
            ? this.plansService.toLegacyShape(planDoc as never)
            : { id: c.plan, name: c.plan, price: 0, currency: 'USD', features: [] },
        };
      }),
    );

    return result;
  }

  async getSubscriber(id: string) {
    const company = await this.companyModel.findById(id).lean();
    if (!company) throw new NotFoundException('المشترك غير موجود');

    const [users, customersCount, messagesCount, invoices, planDoc, usage] = await Promise.all([
      this.userModel.find({ companyId: company._id }).select('-password').lean(),
      this.customerModel.countDocuments({ companyId: company._id }),
      this.messageModel.countDocuments({ companyId: company._id }),
      this.invoiceModel.find({ companyId: company._id }).sort({ createdAt: -1 }).limit(10).lean(),
      this.plansService.findByCode(company.plan),
      this.entitlements.getUsage(String(company._id)),
    ]);

    return {
      company,
      users,
      customersCount,
      messagesCount,
      invoices,
      usage,
      limits: planDoc?.limits || {},
      planMeta: planDoc
        ? {
            ...this.plansService.toLegacyShape(planDoc as never),
            salesAgentEnabled: planDoc.salesAgentEnabled,
            autoFollowUp: planDoc.autoFollowUp,
            invoicesEnabled: planDoc.invoicesEnabled,
            knowledgeEnabled: planDoc.knowledgeEnabled,
            opportunitiesEnabled: planDoc.opportunitiesEnabled,
          }
        : null,
      availablePlans: await this.plansService.findAll(false),
      isExpired: !!(company.planExpiresAt && new Date(company.planExpiresAt) < new Date()),
    };
  }

  async createSubscriber(data: {
    companyName: string;
    ownerName: string;
    email: string;
    password: string;
    phone?: string;
    plan?: string;
    sector?: string;
    days?: number;
  }) {
    const existing = await this.userModel.findOne({ email: data.email.toLowerCase() });
    if (existing) throw new ConflictException('البريد مستخدم مسبقاً');

    const planCode = data.plan || 'starter';
    const plan = await this.plansService.findByCode(planCode);
    if (!plan) throw new NotFoundException('الباقة غير موجودة');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (data.days || 30));

    const company = await this.companyModel.create({
      name: data.companyName,
      email: data.email.toLowerCase(),
      phone: data.phone,
      plan: plan.code,
      planExpiresAt: expiresAt,
      sector: data.sector || 'general',
      isActive: true,
      settings: {
        language: 'ar',
        aiEnabled: true,
        salesAgentEnabled: plan.salesAgentEnabled,
        autoFollowUp: plan.autoFollowUp,
        invoicesEnabled: plan.invoicesEnabled,
        knowledgeEnabled: plan.knowledgeEnabled,
        opportunitiesEnabled: plan.opportunitiesEnabled,
        followUpHours: [2, 24, 72],
      },
      whatsapp: { aiAutoReply: true, welcomeMessage: 'مرحباً! كيف يمكنني مساعدتك؟' },
    });

    const hashed = await bcrypt.hash(data.password, 12);
    const user = await this.userModel.create({
      name: data.ownerName,
      email: data.email.toLowerCase(),
      password: hashed,
      companyId: company._id,
      role: 'owner',
      isActive: true,
    });

    await this.audit('subscriber.create', {
      targetType: 'company',
      targetId: String(company._id),
      targetName: company.name,
      meta: { plan: plan.code, email: user.email },
    });

    return { company, user: { id: user._id, email: user.email, name: user.name } };
  }

  async setPlan(id: string, planId: string, days = 30) {
    const plan = await this.plansService.findByCode(planId);
    if (!plan) throw new NotFoundException('الباقة غير موجودة');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const company = await this.companyModel.findByIdAndUpdate(
      id,
      {
        plan: plan.code,
        planExpiresAt: expiresAt,
        isActive: true,
        suspendedReason: undefined,
        suspendedAt: undefined,
        ...this.applyPlanFeatures(plan as Plan),
      },
      { new: true },
    );
    if (!company) throw new NotFoundException('المشترك غير موجود');
    await this.audit('subscriber.plan', {
      targetType: 'company',
      targetId: id,
      targetName: company.name,
      meta: { plan: plan.code, days },
    });
    return company;
  }

  async setActive(id: string, isActive: boolean, reason?: string) {
    const update: Record<string, unknown> = { isActive };
    if (!isActive) {
      update.suspendedReason = reason || 'موقوف من الأدمن';
      update.suspendedAt = new Date();
    } else {
      update.suspendedReason = null;
      update.suspendedAt = null;
    }

    const company = await this.companyModel.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!company) throw new NotFoundException('المشترك غير موجود');
    await this.audit(isActive ? 'subscriber.activate' : 'subscriber.suspend', {
      targetType: 'company',
      targetId: id,
      targetName: company.name,
      meta: { reason: reason || null },
    });
    return company;
  }

  async extendSubscription(id: string, days: number) {
    const company = await this.companyModel.findById(id);
    if (!company) throw new NotFoundException('المشترك غير موجود');

    const base =
      company.planExpiresAt && company.planExpiresAt > new Date()
        ? company.planExpiresAt
        : new Date();
    const expiresAt = new Date(base);
    expiresAt.setDate(expiresAt.getDate() + days);
    company.planExpiresAt = expiresAt;
    company.isActive = true;
    company.suspendedReason = undefined;
    company.suspendedAt = undefined;
    await company.save();
    await this.audit('subscriber.extend', {
      targetType: 'company',
      targetId: id,
      targetName: company.name,
      meta: { days, expiresAt },
    });
    return company;
  }

  async updateCompanyNotes(id: string, notes: string) {
    const company = await this.companyModel.findByIdAndUpdate(
      id,
      { $set: { 'settings.adminNotes': notes } },
      { new: true },
    );
    if (!company) throw new NotFoundException('المشترك غير موجود');
    return company;
  }

  async resetOwnerPassword(companyId: string, password: string) {
    const owner = await this.userModel.findOne({
      companyId,
      role: 'owner',
    });
    if (!owner) throw new NotFoundException('لم يتم العثور على مالك الشركة');
    owner.password = await bcrypt.hash(password, 12);
    await owner.save();
    await this.audit('subscriber.reset_password', {
      targetType: 'company',
      targetId: companyId,
      targetName: owner.email,
    });
    return { success: true, email: owner.email };
  }

  async listUsers(query?: { search?: string }) {
    const filter: Record<string, unknown> = { role: { $ne: 'super_admin' } };
    if (query?.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
      ];
    }

    return this.userModel
      .find(filter)
      .select('-password')
      .populate('companyId', 'name email plan isActive')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
  }

  async setUserActive(userId: string, isActive: boolean) {
    const user = await this.userModel.findByIdAndUpdate(userId, { isActive }, { new: true }).select(
      '-password',
    );
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    await this.audit(isActive ? 'user.activate' : 'user.suspend', {
      targetType: 'user',
      targetId: userId,
      targetName: user.email,
    });
    return user;
  }

  async listActivity(): Promise<Record<string, unknown>[]> {
    const [audits, messages] = await Promise.all([
      this.auditModel.find({}).sort({ createdAt: -1 }).limit(40).lean(),
      this.messageModel
        .find({})
        .sort({ createdAt: -1 })
        .limit(30)
        .populate('companyId', 'name')
        .populate('customerId', 'name phone')
        .lean(),
    ]);

    const auditItems = audits.map((a) => ({
      _id: a._id,
      kind: 'audit' as const,
      action: a.action,
      content: a.targetName || a.action,
      targetType: a.targetType,
      meta: a.meta,
      actorEmail: a.actorEmail,
      createdAt: (a as { createdAt?: Date }).createdAt,
    }));

    const messageItems = messages.map((m) => ({
      _id: m._id,
      kind: 'message' as const,
      content: m.content,
      direction: m.direction,
      type: m.type,
      channel: m.channel,
      isAiGenerated: m.isAiGenerated,
      createdAt: (m as { createdAt?: Date }).createdAt,
      company: m.companyId,
      customer: m.customerId,
    }));

    return [...auditItems, ...messageItems]
      .sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 60);
  }

  async getSettings() {
    let settings = await this.settingsModel.findOne({ key: 'default' });
    if (!settings) {
      settings = await this.settingsModel.create({ key: 'default' });
    }
    return settings;
  }

  async updateSettings(data: Partial<PlatformSettings>) {
    const settings = await this.settingsModel.findOneAndUpdate(
      { key: 'default' },
      { $set: data },
      { new: true, upsert: true },
    );
    await this.audit('settings.update', {
      targetType: 'settings',
      targetId: 'default',
      targetName: 'platform',
      meta: data as Record<string, unknown>,
    });
    return settings;
  }

  async reports() {
    const now = new Date();
    const days30 = new Date(now);
    days30.setDate(days30.getDate() - 30);
    const days60 = new Date(now);
    days60.setDate(days60.getDate() - 60);

    const [
      newCompanies30,
      newCompaniesPrev30,
      suspended30,
      messages30,
      paidInvoices,
      active,
      total,
      byDay,
    ] = await Promise.all([
      this.companyModel.countDocuments({ createdAt: { $gte: days30 } }),
      this.companyModel.countDocuments({ createdAt: { $gte: days60, $lt: days30 } }),
      this.companyModel.countDocuments({ isActive: false, suspendedAt: { $gte: days30 } }),
      this.messageModel.countDocuments({ createdAt: { $gte: days30 } }),
      this.subscriptionInvoiceModel.countDocuments({ status: 'paid', paidAt: { $gte: days30 } }),
      this.companyModel.countDocuments({ isActive: true, isArchived: { $ne: true } }),
      this.companyModel.countDocuments({ isArchived: { $ne: true } }),
      this.companyModel.aggregate([
        { $match: { createdAt: { $gte: days30 } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const churnRate = active + suspended30 > 0 ? suspended30 / (active + suspended30) : 0;
    const growthRate =
      newCompaniesPrev30 > 0
        ? (newCompanies30 - newCompaniesPrev30) / newCompaniesPrev30
        : newCompanies30 > 0
          ? 1
          : 0;

    return {
      growth: {
        newLast30Days: newCompanies30,
        newPrev30Days: newCompaniesPrev30,
        growthRate,
        series: byDay,
      },
      conversion: {
        paidSubscriptionsLast30Days: paidInvoices,
        trialOrFreeToPaidNote: 'يُحسب حسب فواتير الاشتراك المدفوعة',
      },
      usage: {
        messagesLast30Days: messages30,
        activeCompanies: active,
        totalCompanies: total,
      },
      churn: {
        suspendedLast30Days: suspended30,
        churnRate,
      },
    };
  }

  async listSubscriptionInvoices() {
    return this.subscriptionInvoiceModel
      .find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('companyId', 'name email plan')
      .lean();
  }

  async archiveCompany(id: string, archive = true) {
    const company = await this.companyModel.findByIdAndUpdate(
      id,
      {
        isArchived: archive,
        archivedAt: archive ? new Date() : null,
        isActive: archive ? false : true,
      },
      { new: true },
    );
    if (!company) throw new NotFoundException('المشترك غير موجود');
    await this.audit(archive ? 'subscriber.archive' : 'subscriber.unarchive', {
      targetType: 'company',
      targetId: id,
      targetName: company.name,
    });
    return company;
  }

  async deleteCompany(id: string) {
    const company = await this.companyModel.findById(id);
    if (!company) throw new NotFoundException('المشترك غير موجود');
    if (!company.isArchived) {
      throw new ConflictException('ارشف الشركة أولاً قبل الحذف النهائي');
    }
    await this.userModel.deleteMany({ companyId: company._id });
    await this.companyModel.deleteOne({ _id: company._id });
    await this.audit('subscriber.delete', {
      targetType: 'company',
      targetId: id,
      targetName: company.name,
    });
    return { success: true };
  }

  async exportSubscribersCsv() {
    const list = await this.listSubscribers({});
    const header = 'name,email,phone,plan,isActive,isExpired,usersCount,customersCount,planExpiresAt';
    const rows = list.map((s) =>
      [
        s.name,
        s.email,
        s.phone,
        s.plan,
        s.isActive,
        s.isExpired,
        s.usersCount,
        s.customersCount,
        s.planExpiresAt ? new Date(s.planExpiresAt as Date).toISOString() : '',
      ]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(','),
    );
    return `${header}\n${rows.join('\n')}`;
  }

  async exportUsersCsv() {
    const users = await this.listUsers({});
    const header = 'name,email,role,isActive,company,lastLoginAt';
    const rows = users.map((u) => {
      const company =
        typeof u.companyId === 'object' && u.companyId
          ? (u.companyId as { name?: string }).name
          : '';
      return [u.name, u.email, u.role, u.isActive, company, u.lastLoginAt]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',');
    });
    return `${header}\n${rows.join('\n')}`;
  }

  async impersonate(companyId: string) {
    const company = await this.companyModel.findById(companyId);
    if (!company || company.isArchived) throw new NotFoundException('الشركة غير موجودة');
    const owner = await this.userModel.findOne({ companyId: company._id, role: 'owner' });
    if (!owner) throw new NotFoundException('لا يوجد مالك');

    const payload = {
      sub: owner._id.toString(),
      email: owner.email,
      companyId: company._id.toString(),
      role: owner.role,
      impersonated: true,
    };

    await this.audit('subscriber.impersonate', {
      targetType: 'company',
      targetId: companyId,
      targetName: company.name,
      meta: { ownerEmail: owner.email },
    });

    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: '2h' }),
      user: {
        id: owner._id,
        name: owner.name,
        email: owner.email,
        role: owner.role,
        companyId: company._id,
      },
      company: {
        id: company._id,
        name: company.name,
        plan: company.plan,
      },
      note: 'جلسة دعم مؤقتة ( ساعتان ). لا تستخدمها إلا للدعم.',
    };
  }

  async listPlatformAdmins() {
    return this.userModel
      .find({
        role: { $in: ['super_admin', 'platform_support', 'platform_finance'] },
      })
      .select('-password')
      .lean();
  }

  async createPlatformAdmin(data: {
    name: string;
    email: string;
    password: string;
    role: 'super_admin' | 'platform_support' | 'platform_finance';
  }) {
    const exists = await this.userModel.findOne({ email: data.email.toLowerCase() });
    if (exists) throw new ConflictException('البريد مستخدم');
    const hashed = await bcrypt.hash(data.password, 12);
    const user = await this.userModel.create({
      name: data.name,
      email: data.email.toLowerCase(),
      password: hashed,
      role: data.role,
      isActive: true,
    });
    await this.audit('platform_admin.create', {
      targetType: 'user',
      targetId: String(user._id),
      targetName: user.email,
      meta: { role: data.role },
    });
    return { id: user._id, email: user.email, role: user.role, name: user.name };
  }
}
