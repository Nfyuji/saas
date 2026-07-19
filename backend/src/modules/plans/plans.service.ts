import { Injectable, OnModuleInit, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan, PlanDocument } from '../../schemas/plan.schema';

export const DEFAULT_PLANS: Array<Partial<Plan> & { code: string; name: string }> = [
  {
    code: 'free',
    name: 'تجريبي',
    description: 'للتجربة السريعة',
    price: 0,
    currency: 'USD',
    features: ['100 محادثة', 'وكيل AI أساسي', 'CRM بسيط'],
    limits: { conversations: 100, agents: 1, knowledgeDocs: 3, teamUsers: 1, whatsappNumbers: 1, messagesPerDay: 50 },
    popular: false,
    isActive: true,
    visibleToCustomers: true,
    sortOrder: 1,
    salesAgentEnabled: false,
    autoFollowUp: false,
    invoicesEnabled: false,
    knowledgeEnabled: false,
    opportunitiesEnabled: false,
  },
  {
    code: 'starter',
    name: 'المبتدئ',
    description: 'للشركات الصغيرة',
    price: 29,
    currency: 'USD',
    features: ['1,000 محادثة', 'رد AI', 'CRM', 'أتمتة بسيطة'],
    limits: { conversations: 1000, agents: 5, knowledgeDocs: 20, teamUsers: 3, whatsappNumbers: 1, messagesPerDay: 200 },
    popular: false,
    isActive: true,
    visibleToCustomers: true,
    sortOrder: 2,
    salesAgentEnabled: true,
    autoFollowUp: false,
    invoicesEnabled: false,
    knowledgeEnabled: true,
    opportunitiesEnabled: false,
  },
  {
    code: 'growth',
    name: 'النمو',
    description: 'الأكثر طلباً للشركات النامية',
    price: 79,
    currency: 'USD',
    features: [
      '5,000 محادثة',
      'مندوب مبيعات AI + متابعة تلقائية',
      'عروض أسعار وفواتير',
      'قاعدة معرفة',
      'لوحة الفرص الضائعة',
    ],
    limits: { conversations: 5000, agents: 15, knowledgeDocs: 100, teamUsers: 10, whatsappNumbers: 2, messagesPerDay: 1000 },
    popular: true,
    isActive: true,
    visibleToCustomers: true,
    sortOrder: 3,
    salesAgentEnabled: true,
    autoFollowUp: true,
    invoicesEnabled: true,
    knowledgeEnabled: true,
    opportunitiesEnabled: true,
  },
  {
    code: 'revenue',
    name: 'الإيرادات',
    description: 'للشركات الكبيرة والوكالات',
    price: 199,
    currency: 'USD',
    features: [
      'محادثات غير محدودة',
      'عدة أرقام واتساب',
      'دفع وتحصيل',
      'تقارير متقدمة',
      'دعم أولوية 24/7',
    ],
    limits: { conversations: -1, agents: -1, knowledgeDocs: -1, teamUsers: -1, whatsappNumbers: 5, messagesPerDay: -1 },
    popular: false,
    isActive: true,
    visibleToCustomers: true,
    sortOrder: 4,
    salesAgentEnabled: true,
    autoFollowUp: true,
    invoicesEnabled: true,
    knowledgeEnabled: true,
    opportunitiesEnabled: true,
  },
];

@Injectable()
export class PlansService implements OnModuleInit {
  constructor(@InjectModel(Plan.name) private planModel: Model<PlanDocument>) {}

  async onModuleInit() {
    const count = await this.planModel.countDocuments();
    if (count === 0) {
      await this.planModel.insertMany(DEFAULT_PLANS);
    }
  }

  async findAll(includeInactive = false) {
    const filter = includeInactive ? {} : { isActive: true };
    return this.planModel.find(filter).sort({ sortOrder: 1, price: 1 }).lean();
  }

  async findPublic() {
    return this.planModel
      .find({ isActive: true, visibleToCustomers: true })
      .sort({ sortOrder: 1, price: 1 })
      .lean();
  }

  async findById(id: string) {
    return this.planModel.findById(id).lean();
  }

  async findByCode(code: string) {
    return this.planModel.findOne({ code: code.toLowerCase() }).lean();
  }

  async create(data: Partial<Plan>) {
    const code = (data.code || '').toLowerCase().trim();
    if (!code) throw new ConflictException('رمز الباقة مطلوب');
    const exists = await this.planModel.findOne({ code });
    if (exists) throw new ConflictException('رمز الباقة مستخدم مسبقاً');

    return this.planModel.create({
      ...data,
      code,
      name: data.name || code,
      features: data.features || [],
      limits: data.limits || {},
      currency: data.currency || 'USD',
      price: data.price ?? 0,
      isActive: data.isActive ?? true,
      visibleToCustomers: data.visibleToCustomers ?? true,
      sortOrder: data.sortOrder ?? 99,
    });
  }

  async update(id: string, data: Partial<Plan>) {
    if (data.code) data.code = data.code.toLowerCase().trim();
    const plan = await this.planModel.findByIdAndUpdate(id, { $set: data }, { new: true });
    if (!plan) throw new NotFoundException('الباقة غير موجودة');
    return plan;
  }

  async remove(id: string) {
    const plan = await this.planModel.findByIdAndDelete(id);
    if (!plan) throw new NotFoundException('الباقة غير موجودة');
    return { success: true };
  }

  async toggle(id: string, field: 'isActive' | 'visibleToCustomers' | 'popular') {
    const plan = await this.planModel.findById(id);
    if (!plan) throw new NotFoundException('الباقة غير موجودة');
    plan[field] = !plan[field];
    await plan.save();
    return plan;
  }

  /** توافق مع الشكل القديم للواجهات */
  toLegacyShape(plan: Plan) {
    return {
      id: plan.code,
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      features: plan.features,
      limits: plan.limits,
      popular: plan.popular,
      description: plan.description,
    };
  }
}
