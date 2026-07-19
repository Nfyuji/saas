import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import axios from 'axios';
import {
  SubscriptionInvoice,
  SubscriptionInvoiceDocument,
} from '../../schemas/subscription-invoice.schema';
import { Company, CompanyDocument } from '../../schemas/company.schema';
import { PlansService } from '../plans/plans.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(SubscriptionInvoice.name)
    private invoiceModel: Model<SubscriptionInvoiceDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    private plansService: PlansService,
    private config: ConfigService,
  ) {}

  provider() {
    return (this.config.get<string>('PAYMENT_PROVIDER') || 'demo').toLowerCase();
  }

  /** Demo payments blocked in production unless explicitly allowed */
  demoPaymentsAllowed() {
    if (this.provider() !== 'demo') return false;
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_PAYMENTS !== 'true') {
      return false;
    }
    return true;
  }

  async listCompanyInvoices(companyId: string) {
    return this.invoiceModel
      .find({ companyId: new Types.ObjectId(companyId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  async listAllInvoices(limit = 100) {
    return this.invoiceModel
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('companyId', 'name email plan')
      .lean();
  }

  async createCheckout(companyId: string, planCode: string) {
    const plan = await this.plansService.findByCode(planCode);
    if (!plan || !plan.isActive) throw new NotFoundException('الباقة غير متاحة');

    const company = await this.companyModel.findById(companyId);
    if (!company) throw new NotFoundException('الشركة غير موجودة');

    if ((plan.price || 0) <= 0) {
      return this.activatePaid(companyId, plan.code, 0, 'demo', `free_${Date.now()}`);
    }

    const count = await this.invoiceModel.countDocuments({});
    const number = `SUB-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
    const provider = this.provider();
    const frontend = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    const api = this.config.get('API_URL', 'http://localhost:3001');

    if (provider === 'demo' && !this.demoPaymentsAllowed()) {
      throw new BadRequestException(
        'وضع الدفع التجريبي معطّل في الإنتاج. عيّن PAYMENT_PROVIDER=stripe|moyasar أو ALLOW_DEMO_PAYMENTS=true للتطوير فقط.',
      );
    }

    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    let checkoutUrl = `${frontend}/dashboard/billing?checkout=demo&invoice=${number}`;
    let providerRef = `demo_${number}`;

    if (provider === 'stripe') {
      const session = await this.createStripeCheckout({
        plan,
        company,
        number,
        successUrl: `${frontend}/dashboard/billing?paid=1`,
        cancelUrl: `${frontend}/dashboard/billing?cancelled=1`,
        webhookBase: api,
      });
      checkoutUrl = session.url;
      providerRef = session.id;
    } else if (provider === 'moyasar') {
      const session = await this.createMoyasarInvoice({
        plan,
        company,
        number,
        successUrl: `${frontend}/dashboard/billing?paid=1`,
      });
      checkoutUrl = session.url;
      providerRef = session.id;
    }

    const invoice = await this.invoiceModel.create({
      companyId: company._id,
      number,
      planCode: plan.code,
      amount: plan.price,
      currency: plan.currency || 'USD',
      status: 'pending',
      provider,
      providerRef,
      checkoutUrl,
      periodStart,
      periodEnd,
    });

    // في وضع demo يمكن إكمال الدفع فوراً عبر /payments/confirm
    return {
      invoice,
      checkoutUrl,
      provider,
      note:
        provider === 'demo'
          ? 'وضع تجريبي: أكمل الدفع من زر تأكيد الدفع أو POST /payments/confirm'
          : `سيتم التحويل إلى ${provider}`,
    };
  }

  async confirmDemoPayment(companyId: string, invoiceId: string) {
    if (!this.demoPaymentsAllowed()) {
      throw new BadRequestException('تأكيد الدفع التجريبي غير متاح في بيئة الإنتاج');
    }

    const invoice = await this.invoiceModel.findOne({
      _id: invoiceId,
      companyId: new Types.ObjectId(companyId),
    });
    if (!invoice) throw new NotFoundException('الفاتورة غير موجودة');
    if (invoice.status === 'paid') return { success: true, invoice };

    if (this.provider() !== 'demo' && invoice.provider !== 'demo') {
      throw new BadRequestException('التأكيد اليدوي متاح في وضع demo فقط');
    }

    return this.markPaidAndActivate(invoice);
  }

  async handleProviderWebhook(provider: string, body: Record<string, unknown>) {
    this.logger.log(`Payment webhook from ${provider}`);

    if (provider === 'stripe') {
      const session = body.data as { object?: { id?: string; payment_status?: string; metadata?: Record<string, string> } } | undefined;
      const obj = session?.object || (body as { id?: string; payment_status?: string; metadata?: Record<string, string> });
      if (obj.payment_status === 'paid' || (body.type as string)?.includes('checkout.session.completed')) {
        const ref = obj.id || obj.metadata?.invoiceNumber;
        const invoice = await this.invoiceModel.findOne({
          $or: [{ providerRef: ref }, { number: obj.metadata?.invoiceNumber }],
        });
        if (invoice) return this.markPaidAndActivate(invoice);
      }
    }

    if (provider === 'moyasar') {
      const id = (body.id as string) || ((body as { data?: { id?: string } }).data?.id);
      const status = (body.status as string) || ((body as { data?: { status?: string } }).data?.status);
      if (status === 'paid') {
        const invoice = await this.invoiceModel.findOne({ providerRef: id });
        if (invoice) return this.markPaidAndActivate(invoice);
      }
    }

    return { received: true };
  }

  private async markPaidAndActivate(invoice: SubscriptionInvoiceDocument) {
    invoice.status = 'paid';
    invoice.paidAt = new Date();
    await invoice.save();
    await this.activatePaid(
      String(invoice.companyId),
      invoice.planCode,
      invoice.amount,
      invoice.provider,
      invoice.providerRef || invoice.number,
      invoice.periodEnd,
    );
    return { success: true, invoice };
  }

  private async activatePaid(
    companyId: string,
    planCode: string,
    amount: number,
    provider: string,
    providerRef: string,
    periodEnd?: Date,
  ) {
    const plan = await this.plansService.findByCode(planCode);
    if (!plan) throw new NotFoundException('الباقة غير موجودة');

    const expiresAt = periodEnd || new Date();
    if (!periodEnd) expiresAt.setDate(expiresAt.getDate() + 30);

    const company = await this.companyModel.findByIdAndUpdate(
      companyId,
      {
        plan: plan.code,
        planExpiresAt: expiresAt,
        isActive: true,
        isArchived: false,
        suspendedReason: null,
        suspendedAt: null,
        'billing.provider': provider,
        'billing.subscriptionId': providerRef,
        'settings.salesAgentEnabled': plan.salesAgentEnabled,
        'settings.autoFollowUp': plan.autoFollowUp,
        'settings.invoicesEnabled': plan.invoicesEnabled,
        'settings.knowledgeEnabled': plan.knowledgeEnabled,
        'settings.opportunitiesEnabled': plan.opportunitiesEnabled,
      },
      { new: true },
    );

    if (amount <= 0) {
      const count = await this.invoiceModel.countDocuments({});
      await this.invoiceModel.create({
        companyId: new Types.ObjectId(companyId),
        number: `SUB-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`,
        planCode: plan.code,
        amount: 0,
        currency: plan.currency || 'USD',
        status: 'paid',
        provider,
        providerRef,
        paidAt: new Date(),
        periodStart: new Date(),
        periodEnd: expiresAt,
      });
    }

    return {
      success: true,
      company,
      plan: this.plansService.toLegacyShape(plan as never),
      expiresAt,
      note: 'تم تفعيل الاشتراك بعد الدفع',
    };
  }

  private async createStripeCheckout(opts: {
    plan: { code: string; name: string; price: number; currency?: string };
    company: CompanyDocument;
    number: string;
    successUrl: string;
    cancelUrl: string;
    webhookBase: string;
  }) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!key) {
      return {
        id: `stripe_demo_${opts.number}`,
        url: `${opts.successUrl}&demoStripe=1&invoice=${opts.number}`,
      };
    }

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append('success_url', opts.successUrl);
    params.append('cancel_url', opts.cancelUrl);
    params.append('line_items[0][price_data][currency]', (opts.plan.currency || 'usd').toLowerCase());
    params.append('line_items[0][price_data][product_data][name]', opts.plan.name);
    params.append('line_items[0][price_data][unit_amount]', String(Math.round(opts.plan.price * 100)));
    params.append('line_items[0][quantity]', '1');
    params.append('metadata[invoiceNumber]', opts.number);
    params.append('metadata[planCode]', opts.plan.code);
    params.append('metadata[companyId]', String(opts.company._id));
    params.append('customer_email', opts.company.email || '');

    const { data } = await axios.post('https://api.stripe.com/v1/checkout/sessions', params, {
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return { id: data.id as string, url: data.url as string };
  }

  private async createMoyasarInvoice(opts: {
    plan: { code: string; name: string; price: number; currency?: string };
    company: CompanyDocument;
    number: string;
    successUrl: string;
  }) {
    const key = this.config.get<string>('MOYASAR_SECRET_KEY');
    if (!key) {
      return {
        id: `moyasar_demo_${opts.number}`,
        url: `${opts.successUrl}&demoMoyasar=1&invoice=${opts.number}`,
      };
    }

    const { data } = await axios.post(
      'https://api.moyasar.com/v1/invoices',
      {
        amount: Math.round(opts.plan.price * 100),
        currency: opts.plan.currency || 'SAR',
        description: `${opts.plan.name} - ${opts.number}`,
        callback_url: opts.successUrl,
        metadata: {
          invoiceNumber: opts.number,
          planCode: opts.plan.code,
          companyId: String(opts.company._id),
        },
      },
      {
        auth: { username: key, password: '' },
      },
    );

    return { id: data.id as string, url: (data.url as string) || opts.successUrl };
  }
}
