import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from '../../schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
  ) {}

  async create(data: {
    companyId: string;
    title: string;
    body: string;
    level?: string;
    category?: string;
    href?: string;
    userId?: string;
    meta?: Record<string, unknown>;
  }) {
    return this.notificationModel.create({
      companyId: new Types.ObjectId(data.companyId),
      userId: data.userId ? new Types.ObjectId(data.userId) : undefined,
      title: data.title,
      body: data.body,
      level: data.level || 'info',
      category: data.category || 'system',
      href: data.href,
      meta: data.meta || {},
      read: false,
    });
  }

  async list(companyId: string, limit = 40) {
    return this.notificationModel
      .find({ companyId: new Types.ObjectId(companyId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async unreadCount(companyId: string) {
    return this.notificationModel.countDocuments({
      companyId: new Types.ObjectId(companyId),
      read: false,
    });
  }

  async markRead(companyId: string, id: string) {
    await this.notificationModel.updateOne(
      { _id: id, companyId: new Types.ObjectId(companyId) },
      { $set: { read: true } },
    );
    return { success: true };
  }

  async markAllRead(companyId: string) {
    await this.notificationModel.updateMany(
      { companyId: new Types.ObjectId(companyId), read: false },
      { $set: { read: true } },
    );
    return { success: true };
  }

  /** تنبيهات تشغيل يومية من حالة المتابعات والفرص */
  async syncOperationalAlerts(
    companyId: string,
    summary: { overdueFollowUps: number; waitingNoReply: number; openConversations?: number },
  ) {
    if (summary.overdueFollowUps > 0) {
      const exists = await this.notificationModel.findOne({
        companyId: new Types.ObjectId(companyId),
        category: 'followup',
        'meta.code': 'overdue_followups',
        createdAt: { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
      });
      if (!exists) {
        await this.create({
          companyId,
          title: 'متابعات متأخرة',
          body: `لديك ${summary.overdueFollowUps} متابعة مستحقة الآن.`,
          level: 'warn',
          category: 'followup',
          href: '/dashboard/followups',
          meta: { code: 'overdue_followups' },
        });
      }
    }

    if (summary.waitingNoReply > 0) {
      const exists = await this.notificationModel.findOne({
        companyId: new Types.ObjectId(companyId),
        category: 'deal',
        'meta.code': 'waiting_no_reply',
        createdAt: { $gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
      });
      if (!exists) {
        await this.create({
          companyId,
          title: 'فرص بانتظار ردك',
          body: `${summary.waitingNoReply} صفقة/عميل بانتظار متابعة.`,
          level: 'warn',
          category: 'deal',
          href: '/dashboard/opportunities',
          meta: { code: 'waiting_no_reply' },
        });
      }
    }
  }
}
