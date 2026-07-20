import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from '../../schemas/conversation.schema';
import { Message, MessageDocument } from '../../schemas/message.schema';
import { Customer, CustomerDocument } from '../../schemas/customer.schema';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {}

  async findAll(companyId: string, query?: { status?: string; channel?: string; customerId?: string }) {
    const filter: Record<string, unknown> = { companyId: new Types.ObjectId(companyId) };
    if (query?.status) filter.status = query.status;
    if (query?.channel) filter.channel = query.channel;
    if (query?.customerId) filter.customerId = new Types.ObjectId(query.customerId);

    const conversations = await this.conversationModel
      .find(filter)
      .sort({ lastMessageAt: -1 })
      .populate('customerId', 'name phone email status')
      .populate('assignedTo', 'name email')
      .lean();

    return conversations;
  }

  async findOne(companyId: string, id: string) {
    const conversation = await this.conversationModel
      .findOne({ _id: id, companyId: new Types.ObjectId(companyId) })
      .populate('customerId')
      .populate('assignedTo', 'name email');
    if (!conversation) throw new NotFoundException('المحادثة غير موجودة');
    return conversation;
  }

  async getMessages(companyId: string, conversationId: string, page = 1, limit = 50) {
    const conversation = await this.conversationModel.findOne({
      _id: conversationId,
      companyId: new Types.ObjectId(companyId),
    });
    if (!conversation) throw new NotFoundException('المحادثة غير موجودة');

    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      this.messageModel
        .find({ conversationId: new Types.ObjectId(conversationId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sentBy', 'name')
        .lean(),
      this.messageModel.countDocuments({ conversationId: new Types.ObjectId(conversationId) }),
    ]);

    if (conversation.unreadCount > 0) {
      conversation.unreadCount = 0;
      await conversation.save();
    }

    return { data: messages.reverse(), total, page, limit };
  }

  async updateStatus(companyId: string, id: string, status: string) {
    const conversation = await this.conversationModel.findOneAndUpdate(
      { _id: id, companyId: new Types.ObjectId(companyId) },
      { status },
      { new: true },
    );
    if (!conversation) throw new NotFoundException('المحادثة غير موجودة');
    return conversation;
  }

  async assignAgent(companyId: string, id: string, agentId: string) {
    const conversation = await this.conversationModel.findOneAndUpdate(
      { _id: id, companyId: new Types.ObjectId(companyId) },
      { assignedTo: new Types.ObjectId(agentId) },
      { new: true },
    );
    if (!conversation) throw new NotFoundException('المحادثة غير موجودة');
    return conversation;
  }

  async setAiPaused(companyId: string, id: string, aiPaused: boolean) {
    const conversation = await this.conversationModel.findOneAndUpdate(
      { _id: id, companyId: new Types.ObjectId(companyId) },
      { aiPaused: !!aiPaused, ...(aiPaused ? { aiHandled: false } : {}) },
      { new: true },
    );
    if (!conversation) throw new NotFoundException('المحادثة غير موجودة');
    return conversation;
  }
}
