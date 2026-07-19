import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from '../../schemas/company.schema';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { AutomationService } from '../automation/automation.service';
import { PlansService, DEFAULT_PLANS } from '../plans/plans.service';
import { PlanEntitlementsService } from '../../common/services/plan-entitlements.service';

/** توافق خلفي مع الكود القديم */
export const PLANS = Object.fromEntries(
  DEFAULT_PLANS.map((p) => [
    p.code,
    {
      id: p.code,
      name: p.name,
      price: p.price ?? 0,
      currency: p.currency || 'USD',
      features: p.features || [],
      limits: p.limits || {},
      popular: p.popular || false,
    },
  ]),
);

export const SECTOR_TEMPLATES: Record<
  string,
  {
    name: string;
    aiInstructions: string;
    automations: Array<{ name: string; trigger: string; keywords?: string[]; tag?: string }>;
    knowledge: Array<{ title: string; content: string; type: string }>;
  }
> = {
  clinic: {
    name: 'العيادات',
    aiInstructions:
      'أنت مساعد حجز مواعيد لعيادة. اسأل عن الاسم، الخدمة المطلوبة، والوقت المناسب. لا تعطِ تشخيصاً طبياً.',
    automations: [
      { name: 'حجز موعد', trigger: 'keyword', keywords: ['موعد', 'حجز', 'كشف'], tag: 'حجز' },
    ],
    knowledge: [
      {
        title: 'خدمات العيادة',
        type: 'catalog',
        content: 'كشف عام، متابعة، تطعيمات. ساعات العمل: 9ص-9م. الحجز عبر واتساب.',
      },
    ],
  },
  realestate: {
    name: 'العقارات',
    aiInstructions:
      'أنت مستشار عقاري. اسأل عن الميزانية، المنطقة، ونوع العقار. أرسل ملخصاً واقترح معاينة.',
    automations: [
      { name: 'طلب معاينة', trigger: 'keyword', keywords: ['معاينة', 'شقة', 'فيلا', 'أرض'], tag: 'مهتم-عقار' },
    ],
    knowledge: [
      {
        title: 'عقارات متاحة',
        type: 'catalog',
        content: 'شقق وفلل وأراضي. حدد الميزانية والمنطقة لنرسل لك أفضل الخيارات مع الصور.',
      },
    ],
  },
  ecommerce: {
    name: 'المتاجر الإلكترونية',
    aiInstructions:
      'أنت بائع متجر إلكتروني. ساعد في اختيار المنتج، السعر، الشحن، وتتبع الطلبات. كن مختصراً.',
    automations: [
      { name: 'استفسار سعر', trigger: 'keyword', keywords: ['سعر', 'طلب', 'شحن'], tag: 'مبيعات' },
    ],
    knowledge: [
      {
        title: 'سياسة الشحن',
        type: 'policy',
        content: 'الشحن خلال 2-5 أيام. الدفع عند الاستلام أو إلكتروني. الإرجاع خلال 7 أيام.',
      },
    ],
  },
  cars: {
    name: 'السيارات',
    aiInstructions:
      'أنت مستشار سيارات. اسأل عن الميزانية، النوع (جديد/مستعمل)، والتمويل. اعرض المواصفات باختصار.',
    automations: [
      { name: 'اهتمام سيارة', trigger: 'keyword', keywords: ['سيارة', 'كاش', 'تمويل'], tag: 'سيارات' },
    ],
    knowledge: [
      {
        title: 'خيارات التمويل',
        type: 'faq',
        content: 'نوفر كاش وتقسيط بنكي. مطلوب هوية وراتب. معاينة في المعرض يومياً.',
      },
    ],
  },
  services: {
    name: 'الخدمات المهنية',
    aiInstructions:
      'أنت منسق خدمات. اسأل عن نوع الخدمة، الموعد، والموقع. أرسل ملخص الطلب وخطوة تالية واضحة.',
    automations: [
      { name: 'طلب خدمة', trigger: 'keyword', keywords: ['خدمة', 'عرض', 'سعر'], tag: 'طلب-خدمة' },
    ],
    knowledge: [
      {
        title: 'خدماتنا',
        type: 'catalog',
        content: 'نقدم خدمات احترافية حسب الطلب. أخبرنا احتياجك لنرسل عرض سعر خلال دقائق.',
      },
    ],
  },
  general: {
    name: 'عام',
    aiInstructions: 'أنت مساعد مبيعات ودعم للشركة. كن مهذباً، مختصرًا، وحوّل الهدف إلى خطوة تالية واضحة.',
    automations: [{ name: 'عميل جديد', trigger: 'new_customer', tag: 'جديد' }],
    knowledge: [
      {
        title: 'نبذة عن الشركة',
        type: 'other',
        content: 'نساعد العملاء عبر واتساب بسرعة واحتراف. اسألنا عن المنتجات أو العروض.',
      },
    ],
  },
};

@Injectable()
export class BillingService {
  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    private knowledgeService: KnowledgeService,
    private automationService: AutomationService,
    private plansService: PlansService,
    private entitlements: PlanEntitlementsService,
  ) {}

  async getPlans() {
    const plans = await this.plansService.findPublic();
    return plans.map((p) => this.plansService.toLegacyShape(p as never));
  }

  getSectors() {
    return Object.entries(SECTOR_TEMPLATES).map(([id, t]) => ({ id, name: t.name }));
  }

  async getCurrentPlan(companyId: string) {
    const company = await this.companyModel.findById(companyId);
    const code = company?.plan || 'starter';
    const dbPlan = await this.plansService.findByCode(code);
    const plan = dbPlan
      ? this.plansService.toLegacyShape(dbPlan as never)
      : PLANS[code] || PLANS.starter;

    return {
      plan,
      expiresAt: company?.planExpiresAt,
      sector: company?.sector || 'general',
    };
  }

  async getUsageDashboard(companyId: string) {
    const company = await this.companyModel.findById(companyId).lean();
    if (!company) throw new NotFoundException('الشركة غير موجودة');

    const dbPlan = await this.plansService.findByCode(company.plan || 'starter');
    const usage = await this.entitlements.getUsage(companyId);
    const limits = (dbPlan?.limits || {}) as Record<string, number | undefined>;
    const expiresAt = company.planExpiresAt ? new Date(company.planExpiresAt) : null;
    const daysLeft =
      expiresAt != null
        ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    const meter = (
      key: string,
      label: string,
      used: number,
      limit: number | undefined,
      unit: string,
      href?: string,
      note?: string,
    ) => {
      const unlimited = limit == null || limit < 0;
      const pct = unlimited ? null : Math.min(100, Math.round((used / Math.max(limit!, 1)) * 100));
      let status: 'ok' | 'warn' | 'danger' | 'unlimited' = 'unlimited';
      if (!unlimited) {
        if (used >= limit!) status = 'danger';
        else if (pct! >= 80) status = 'warn';
        else status = 'ok';
      }
      return {
        key,
        label,
        used,
        limit: unlimited ? null : limit!,
        unlimited,
        percent: pct,
        remaining: unlimited ? null : Math.max(0, limit! - used),
        status,
        unit,
        href,
        note,
      };
    };

    const meters = [
      meter(
        'messagesPerDay',
        'رسائل صادرة اليوم',
        usage.messagesPerDay,
        limits.messagesPerDay,
        'رسالة',
        '/dashboard/inbox',
        `يُصفَّر العداد عند منتصف الليل · إعادة التعيين: ${new Date(usage.dayResetsAt).toLocaleString('ar')}`,
      ),
      meter(
        'conversations',
        'المحادثات',
        usage.conversations,
        limits.conversations,
        'محادثة',
        '/dashboard/inbox',
        `${usage.openConversations} مفتوحة الآن`,
      ),
      meter(
        'teamUsers',
        'أعضاء الفريق',
        usage.teamUsers,
        limits.teamUsers ?? limits.agents,
        'مستخدم',
        '/dashboard/team',
      ),
      meter(
        'knowledgeDocs',
        'مستندات المعرفة',
        usage.knowledgeDocs,
        limits.knowledgeDocs,
        'مستند',
        '/dashboard/knowledge',
      ),
      meter(
        'whatsappNumbers',
        'أرقام واتساب',
        usage.whatsappNumbers,
        limits.whatsappNumbers,
        'رقم',
        '/dashboard/whatsapp',
      ),
    ];

    const alerts: Array<{ type: 'warn' | 'danger' | 'info'; code: string; text: string; href?: string }> = [];

    if (!company.isActive) {
      alerts.push({
        type: 'danger',
        code: 'suspended',
        text: company.suspendedReason
          ? `الاشتراك موقوف: ${company.suspendedReason}`
          : 'الاشتراك موقوف',
        href: '/dashboard/billing',
      });
    } else if (daysLeft != null && daysLeft <= 0) {
      alerts.push({
        type: 'danger',
        code: 'expired',
        text: 'انتهت مدة الاشتراك — جدّد الباقة للمتابعة',
        href: '/dashboard/billing',
      });
    } else if (daysLeft != null && daysLeft <= 7) {
      alerts.push({
        type: 'warn',
        code: 'expiring',
        text: `الاشتراك ينتهي خلال ${daysLeft} يوم`,
        href: '/dashboard/billing',
      });
    }

    for (const m of meters) {
      if (m.status === 'danger') {
        alerts.push({
          type: 'danger',
          code: `${m.key}_limit`,
          text: `وصلت حد ${m.label} (${m.used}/${m.limit})`,
          href: '/dashboard/billing',
        });
      } else if (m.status === 'warn') {
        alerts.push({
          type: 'warn',
          code: `${m.key}_near`,
          text: `اقتربت من حد ${m.label} (${m.used}/${m.limit})`,
          href: '/dashboard/usage',
        });
      }
    }

    const waConfigured = !!company.whatsapp?.phoneNumberId && !!company.whatsapp?.accessToken;
    const waDemo =
      !!company.whatsapp?.phoneNumberId?.startsWith('demo_') ||
      company.whatsapp?.accessToken === 'demo_token';
    if (!waConfigured) {
      alerts.push({
        type: 'info',
        code: 'whatsapp_missing',
        text: 'واتساب غير مربوط — اربط عبر فيسبوك أو الوضع التجريبي',
        href: '/dashboard/whatsapp/connect',
      });
    } else if (waDemo) {
      alerts.push({
        type: 'info',
        code: 'whatsapp_demo',
        text: 'واتساب يعمل بوضع تجريبي — اربط Meta للإطلاق الحقيقي',
        href: '/dashboard/whatsapp/connect',
      });
    }

    const features = {
      salesAgentEnabled:
        company.settings?.salesAgentEnabled ?? dbPlan?.salesAgentEnabled ?? true,
      autoFollowUp: company.settings?.autoFollowUp ?? dbPlan?.autoFollowUp ?? true,
      invoicesEnabled: company.settings?.invoicesEnabled ?? dbPlan?.invoicesEnabled ?? false,
      knowledgeEnabled: company.settings?.knowledgeEnabled ?? dbPlan?.knowledgeEnabled ?? true,
      opportunitiesEnabled:
        company.settings?.opportunitiesEnabled ?? dbPlan?.opportunitiesEnabled ?? false,
    };

    return {
      plan: {
        code: dbPlan?.code || company.plan || 'starter',
        name: dbPlan?.name || company.plan || 'starter',
        description: dbPlan?.description || '',
        price: dbPlan?.price ?? 0,
        currency: dbPlan?.currency || 'USD',
        features: dbPlan?.features || [],
      },
      usage,
      limits,
      meters,
      features,
      stats: {
        customers: usage.customers,
        openConversations: usage.openConversations,
        messagesTotal: usage.messagesTotal,
        inboundToday: usage.inboundToday,
        outboundToday: usage.outboundToday,
      },
      expiresAt: company.planExpiresAt,
      daysLeft,
      isActive: company.isActive !== false,
      suspendedReason: company.suspendedReason || null,
      whatsapp: {
        configured: waConfigured,
        demo: waDemo,
        displayPhoneNumber: company.whatsapp?.displayPhoneNumber,
        verifiedName: company.whatsapp?.verifiedName,
      },
      alerts,
      generatedAt: new Date().toISOString(),
    };
  }

  async upgradePlan(companyId: string, planId: string) {
    const dbPlan = await this.plansService.findByCode(planId);
    if (!dbPlan || !dbPlan.isActive) {
      throw new NotFoundException('الباقة غير متاحة');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const company = await this.companyModel.findByIdAndUpdate(
      companyId,
      {
        plan: dbPlan.code,
        planExpiresAt: expiresAt,
        isActive: true,
        'settings.salesAgentEnabled': dbPlan.salesAgentEnabled,
        'settings.autoFollowUp': dbPlan.autoFollowUp,
        'settings.invoicesEnabled': dbPlan.invoicesEnabled,
        'settings.knowledgeEnabled': dbPlan.knowledgeEnabled,
        'settings.opportunitiesEnabled': dbPlan.opportunitiesEnabled,
      },
      { new: true },
    );

    return {
      success: true,
      plan: this.plansService.toLegacyShape(dbPlan as never),
      expiresAt: company?.planExpiresAt,
      note: 'تم تفعيل الباقة. في الإنتاج يُربط الدفع مع Moyasar/Stripe.',
    };
  }

  async applySectorTemplate(companyId: string, sector: string) {
    const template = SECTOR_TEMPLATES[sector] || SECTOR_TEMPLATES.general;

    await this.companyModel.findByIdAndUpdate(companyId, {
      sector,
      'settings.aiInstructions': template.aiInstructions,
      'settings.salesAgentEnabled': true,
      'settings.autoFollowUp': true,
      'settings.followUpHours': [2, 24, 72],
      'settings.aiEnabled': true,
    });

    for (const k of template.knowledge) {
      await this.knowledgeService.create(companyId, k);
    }

    for (const a of template.automations) {
      await this.automationService.create(companyId, {
        name: a.name,
        trigger: a.trigger as 'keyword' | 'new_customer',
        triggerConfig: a.keywords ? { keywords: a.keywords } : {},
        actions: a.tag ? [{ type: 'add_tag', config: { tag: a.tag } }] : [],
        isActive: true,
      });
    }

    return {
      success: true,
      sector,
      sectorName: template.name,
      applied: {
        knowledge: template.knowledge.length,
        automations: template.automations.length,
      },
    };
  }
}
