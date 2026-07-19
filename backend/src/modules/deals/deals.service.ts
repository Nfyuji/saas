import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Deal, DealDocument } from '../../schemas/deal.schema';
import { Customer, CustomerDocument } from '../../schemas/customer.schema';
import { FollowUpsService } from '../followups/followups.service';

@Injectable()
export class DealsService {
  constructor(
    @InjectModel(Deal.name) private dealModel: Model<DealDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @Inject(forwardRef(() => FollowUpsService)) private followUps: FollowUpsService,
  ) {}

  async findAll(companyId: string, stage?: string, customerId?: string) {
    const filter: Record<string, unknown> = { companyId: new Types.ObjectId(companyId) };
    if (stage) filter.stage = stage;
    if (customerId) filter.customerId = new Types.ObjectId(customerId);
    return this.dealModel
      .find(filter)
      .populate('customerId', 'name phone email status')
      .sort({ updatedAt: -1 })
      .lean();
  }

  async findOne(companyId: string, id: string) {
    const deal = await this.dealModel
      .findOne({ _id: id, companyId: new Types.ObjectId(companyId) })
      .populate('customerId');
    if (!deal) throw new NotFoundException('الصفقة غير موجودة');
    return deal;
  }

  async create(
    companyId: string,
    data: {
      customerId: string;
      title: string;
      value?: number;
      currency?: string;
      stage?: string;
      items?: Array<{ name: string; quantity: number; price: number }>;
      conversationId?: string;
      notes?: string;
    },
  ) {
    const customer = await this.customerModel.findOne({
      _id: data.customerId,
      companyId: new Types.ObjectId(companyId),
    });
    if (!customer) throw new NotFoundException('العميل غير موجود');

    const value =
      data.value ??
      (data.items || []).reduce((sum, i) => sum + i.quantity * i.price, 0);

    return this.dealModel.create({
      companyId: new Types.ObjectId(companyId),
      customerId: new Types.ObjectId(data.customerId),
      conversationId: data.conversationId ? new Types.ObjectId(data.conversationId) : undefined,
      title: data.title,
      value,
      currency: data.currency || 'SAR',
      stage: data.stage || 'lead',
      items: data.items || [],
      notes: data.notes,
      nextFollowUpAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
    });
  }

  async updateStage(companyId: string, id: string, stage: string, lostReason?: string) {
    const update: Record<string, unknown> = { stage };
    if (stage === 'lost' && lostReason) update.lostReason = lostReason;
    if (stage === 'cold') update.nextFollowUpAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const deal = await this.dealModel.findOneAndUpdate(
      { _id: id, companyId: new Types.ObjectId(companyId) },
      { $set: update },
      { new: true },
    );
    if (!deal) throw new NotFoundException('الصفقة غير موجودة');

    if (stage === 'won') {
      const productHint = deal.items?.[0]?.name || deal.title || 'المنتج/الجهاز';
      await this.followUps.onPurchaseCompleted({
        companyId,
        customerId: deal.customerId,
        dealId: deal._id,
        conversationId: deal.conversationId,
        productHint,
      });
    }

    return deal;
  }

  async update(companyId: string, id: string, data: Partial<Deal>) {
    const deal = await this.dealModel.findOneAndUpdate(
      { _id: id, companyId: new Types.ObjectId(companyId) },
      { $set: data },
      { new: true },
    );
    if (!deal) throw new NotFoundException('الصفقة غير موجودة');
    return deal;
  }

  async sendQuotePayload(companyId: string, id: string) {
    const deal = await this.findOne(companyId, id);
    const itemsText = (deal.items || [])
      .map((i) => `• ${i.name} × ${i.quantity} = ${i.price * i.quantity} ${deal.currency}`)
      .join('\n');

    const message =
      `📋 عرض سعر: ${deal.title}\n\n` +
      (itemsText || `القيمة: ${deal.value} ${deal.currency}`) +
      `\n\n💰 الإجمالي: ${deal.value} ${deal.currency}\n\nهل يناسبك العرض؟ يمكنني إصدار فاتورة مباشرة.`;

    deal.quoteSent = true;
    deal.stage = deal.stage === 'lead' || deal.stage === 'qualified' ? 'proposal' : deal.stage;
    await deal.save();

    return { deal, message };
  }

  async getPipelineStats(companyId: string) {
    const companyObjId = new Types.ObjectId(companyId);
    const stages = await this.dealModel.aggregate([
      { $match: { companyId: companyObjId } },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          value: { $sum: '$value' },
        },
      },
    ]);

    const map: Record<string, { count: number; value: number }> = {};
    for (const s of stages) map[s._id] = { count: s.count, value: s.value };
    return map;
  }

  async ensureDealForCustomer(
    companyId: string,
    customerId: Types.ObjectId,
    conversationId: Types.ObjectId,
    title?: string,
  ) {
    let deal = await this.dealModel.findOne({
      companyId: new Types.ObjectId(companyId),
      customerId,
      stage: { $in: ['lead', 'qualified', 'proposal', 'negotiation'] },
    });

    if (!deal) {
      deal = await this.dealModel.create({
        companyId: new Types.ObjectId(companyId),
        customerId,
        conversationId,
        title: title || 'فرصة من واتساب',
        stage: 'lead',
        value: 0,
        nextFollowUpAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      });
    }
    return deal;
  }
}
