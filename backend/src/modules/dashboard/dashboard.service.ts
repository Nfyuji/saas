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
