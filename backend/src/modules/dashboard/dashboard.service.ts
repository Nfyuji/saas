import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from '../../schemas/customer.schema';
import { Conversation, ConversationDocument } from '../../schemas/conversation.schema';
import { Message, MessageDocument } from '../../schemas/message.schema';
import { Deal, DealDocument } from '../../schemas/deal.schema';
import { Invoice, InvoiceDocument } from '../../schemas/invoice.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Deal.name) private dealModel: Model<DealDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
  ) {}

  async getStats(companyId: string) {
    const companyObjId = new Types.ObjectId(companyId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalCustomers,
      openConversations,
      todayMessages,
      aiMessages,
      openDeals,
      pipelineValue,
      paidRevenue,
      recentConversations,
      messagesByDay,
    ] = await Promise.all([
      this.customerModel.countDocuments({ companyId: companyObjId }),
      this.conversationModel.countDocuments({ companyId: companyObjId, status: 'open' }),
      this.messageModel.countDocuments({ companyId: companyObjId, createdAt: { $gte: today } }),
      this.messageModel.countDocuments({ companyId: companyObjId, isAiGenerated: true }),
      this.dealModel.countDocuments({
        companyId: companyObjId,
        stage: { $in: ['lead', 'qualified', 'proposal', 'negotiation'] },
      }),
      this.dealModel.aggregate([
        {
          $match: {
            companyId: companyObjId,
            stage: { $in: ['lead', 'qualified', 'proposal', 'negotiation'] },
          },
        },
        { $group: { _id: null, total: { $sum: '$value' } } },
      ]),
      this.invoiceModel.aggregate([
        { $match: { companyId: companyObjId, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      this.conversationModel
        .find({ companyId: companyObjId })
        .sort({ lastMessageAt: -1 })
        .limit(5)
        .populate('customerId', 'name phone')
        .lean(),
      this.getMessagesByDay(companyId, 7),
    ]);

    return {
      totalCustomers,
      openConversations,
      todayMessages,
      aiMessages,
      openDeals,
      pipelineValue: pipelineValue[0]?.total || 0,
      paidRevenue: paidRevenue[0]?.total || 0,
      recentConversations,
      messagesByDay,
    };
  }

  async getReports(companyId: string) {
    const companyObjId = new Types.ObjectId(companyId);
    const now = new Date();
    const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      dealsByStage,
      won30,
      lost30,
      invoices30,
      newCustomers30,
      messages30,
      aiShare,
      topCustomers,
      messagesByDay,
    ] = await Promise.all([
      this.dealModel.aggregate([
        { $match: { companyId: companyObjId } },
        { $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$value' } } },
      ]),
      this.dealModel.aggregate([
        { $match: { companyId: companyObjId, stage: 'won', updatedAt: { $gte: day30 } } },
        { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$value' } } },
      ]),
      this.dealModel.aggregate([
        { $match: { companyId: companyObjId, stage: 'lost', updatedAt: { $gte: day30 } } },
        { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$value' } } },
      ]),
      this.invoiceModel.aggregate([
        { $match: { companyId: companyObjId, createdAt: { $gte: day30 } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            total: { $sum: '$total' },
          },
        },
      ]),
      this.customerModel.countDocuments({ companyId: companyObjId, createdAt: { $gte: day30 } }),
      this.messageModel.countDocuments({ companyId: companyObjId, createdAt: { $gte: day30 } }),
      this.messageModel.aggregate([
        { $match: { companyId: companyObjId, createdAt: { $gte: day30 }, direction: 'outbound' } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            ai: { $sum: { $cond: ['$isAiGenerated', 1, 0] } },
          },
        },
      ]),
      this.dealModel.aggregate([
        { $match: { companyId: companyObjId, stage: 'won' } },
        { $group: { _id: '$customerId', value: { $sum: '$value' }, count: { $sum: 1 } } },
        { $sort: { value: -1 } },
        { $limit: 8 },
        {
          $lookup: {
            from: 'customers',
            localField: '_id',
            foreignField: '_id',
            as: 'customer',
          },
        },
        { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
      ]),
      this.getMessagesByDay(companyId, 14),
    ]);

    const won = won30[0] || { count: 0, value: 0 };
    const lost = lost30[0] || { count: 0, value: 0 };
    const closed = won.count + lost.count;
    const winRate = closed > 0 ? Math.round((won.count / closed) * 100) : 0;
    const ai = aiShare[0] || { total: 0, ai: 0 };
    const aiPercent = ai.total > 0 ? Math.round((ai.ai / ai.total) * 100) : 0;
    const paidInv = invoices30.find((i) => i._id === 'paid');
    const pendingInv = invoices30.find((i) => i._id === 'pending' || i._id === 'sent');

    return {
      period: { days: 30, from: day30, to: now },
      kpis: {
        newCustomers30,
        messages30,
        wonDeals30: won.count,
        wonValue30: won.value,
        lostDeals30: lost.count,
        winRate,
        aiReplyPercent: aiPercent,
        paidInvoices30: paidInv?.count || 0,
        paidRevenue30: paidInv?.total || 0,
        pendingInvoices: pendingInv?.count || 0,
        pendingValue: pendingInv?.total || 0,
      },
      dealsByStage: dealsByStage.map((d) => ({
        stage: d._id,
        count: d.count,
        value: d.value,
      })),
      invoicesByStatus: invoices30,
      messagesByDay,
      topCustomers: topCustomers.map((t) => ({
        customerId: t._id,
        name: t.customer?.name || 'عميل',
        phone: t.customer?.phone,
        value: t.value,
        deals: t.count,
      })),
      weekMessages: messagesByDay.filter((m) => m.date >= day7.toISOString().slice(0, 10)),
    };
  }

  private async getMessagesByDay(companyId: string, days: number) {
    const companyObjId = new Types.ObjectId(companyId);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.messageModel.aggregate([
      { $match: { companyId: companyObjId, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          inbound: { $sum: { $cond: [{ $eq: ['$direction', 'inbound'] }, 1, 0] } },
          outbound: { $sum: { $cond: [{ $eq: ['$direction', 'outbound'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return result.map((r) => ({ date: r._id, inbound: r.inbound, outbound: r.outbound }));
  }
}
