import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument } from '../../schemas/invoice.schema';
import { Customer, CustomerDocument } from '../../schemas/customer.schema';
import { Deal, DealDocument } from '../../schemas/deal.schema';
import { PlanEntitlementsService } from '../../common/services/plan-entitlements.service';
import { FollowUpsService } from '../followups/followups.service';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Deal.name) private dealModel: Model<DealDocument>,
    private entitlements: PlanEntitlementsService,
    @Inject(forwardRef(() => FollowUpsService)) private followUps: FollowUpsService,
  ) {}

  async findAll(companyId: string, status?: string, customerId?: string) {
    await this.entitlements.assertFeature(companyId, 'invoicesEnabled');
    const filter: Record<string, unknown> = { companyId: new Types.ObjectId(companyId) };
    if (status) filter.status = status;
    if (customerId) filter.customerId = new Types.ObjectId(customerId);
    return this.invoiceModel
      .find(filter)
      .populate('customerId', 'name phone email')
      .sort({ createdAt: -1 })
      .lean();
  }

  async create(
    companyId: string,
    data: {
      customerId: string;
      dealId?: string;
      items: Array<{ name: string; quantity: number; price: number }>;
      tax?: number;
      currency?: string;
      dueDate?: string;
      notes?: string;
    },
  ) {
    await this.entitlements.assertFeature(companyId, 'invoicesEnabled');
    const customer = await this.customerModel.findOne({
      _id: data.customerId,
      companyId: new Types.ObjectId(companyId),
    });
    if (!customer) throw new NotFoundException('العميل غير موجود');

    const subtotal = data.items.reduce((s, i) => s + i.quantity * i.price, 0);
    const tax = data.tax ?? Math.round(subtotal * 0.15 * 100) / 100;
    const total = subtotal + tax;
    const count = await this.invoiceModel.countDocuments({ companyId: new Types.ObjectId(companyId) });
    const number = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const paymentBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const paymentLink = `${paymentBase}/pay/${number}`;

    const invoice = await this.invoiceModel.create({
      companyId: new Types.ObjectId(companyId),
      customerId: new Types.ObjectId(data.customerId),
      dealId: data.dealId ? new Types.ObjectId(data.dealId) : undefined,
      number,
      items: data.items,
      subtotal,
      tax,
      total,
      currency: data.currency || 'SAR',
      status: 'draft',
      paymentLink,
      dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      notes: data.notes,
    });

    if (data.dealId) {
      await this.dealModel.updateOne(
        { _id: data.dealId },
        { $set: { paymentLink, stage: 'negotiation', value: total } },
      );
    }

    return invoice;
  }

  async markSent(companyId: string, id: string) {
    const invoice = await this.invoiceModel.findOneAndUpdate(
      { _id: id, companyId: new Types.ObjectId(companyId) },
      { status: 'sent' },
      { new: true },
    );
    if (!invoice) throw new NotFoundException('الفاتورة غير موجودة');
    return invoice;
  }

  async markPaid(companyId: string, id: string) {
    const invoice = await this.invoiceModel.findOneAndUpdate(
      { _id: id, companyId: new Types.ObjectId(companyId) },
      { status: 'paid', paidAt: new Date() },
      { new: true },
    );
    if (!invoice) throw new NotFoundException('الفاتورة غير موجودة');

    let conversationId: Types.ObjectId | undefined;
    if (invoice.dealId) {
      const deal = await this.dealModel.findByIdAndUpdate(
        invoice.dealId,
        { stage: 'won' },
        { new: true },
      );
      conversationId = deal?.conversationId;
    }

    const productHint = invoice.items?.[0]?.name || 'المنتج/الجهاز';
    await this.followUps.onPurchaseCompleted({
      companyId,
      customerId: invoice.customerId,
      dealId: invoice.dealId,
      conversationId,
      productHint,
    });

    return invoice;
  }

  async getWhatsAppMessage(companyId: string, id: string) {
    const invoice = await this.invoiceModel
      .findOne({ _id: id, companyId: new Types.ObjectId(companyId) })
      .populate('customerId', 'name phone');
    if (!invoice) throw new NotFoundException('الفاتورة غير موجودة');

    const message =
      `🧾 فاتورة رقم ${invoice.number}\n` +
      `المبلغ: ${invoice.total} ${invoice.currency}\n` +
      `الاستحقاق: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('ar') : '—'}\n\n` +
      `ادفع الآن عبر الرابط:\n${invoice.paymentLink}\n\nشكراً لتعاملك معنا 🙏`;

    return { invoice, message };
  }

  async getStats(companyId: string) {
    const companyObjId = new Types.ObjectId(companyId);
    const [draft, sent, paid, overdue, paidTotal] = await Promise.all([
      this.invoiceModel.countDocuments({ companyId: companyObjId, status: 'draft' }),
      this.invoiceModel.countDocuments({ companyId: companyObjId, status: 'sent' }),
      this.invoiceModel.countDocuments({ companyId: companyObjId, status: 'paid' }),
      this.invoiceModel.countDocuments({
        companyId: companyObjId,
        status: 'sent',
        dueDate: { $lt: new Date() },
      }),
      this.invoiceModel.aggregate([
        { $match: { companyId: companyObjId, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    return {
      draft,
      sent,
      paid,
      overdue,
      revenue: paidTotal[0]?.total || 0,
    };
  }
}
