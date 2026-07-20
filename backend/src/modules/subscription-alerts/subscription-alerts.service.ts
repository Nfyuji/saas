import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Company, CompanyDocument } from '../../schemas/company.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import {
  SubscriptionAlert,
  SubscriptionAlertDocument,
} from '../../schemas/subscription-alert.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SubscriptionAlertsService implements OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionAlertsService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(SubscriptionAlert.name)
    private alertModel: Model<SubscriptionAlertDocument>,
    private notifications: NotificationsService,
  ) {
    this.timer = setInterval(() => {
      this.runChecks().catch((e) => this.logger.error(e));
    }, 60_000);
    setTimeout(() => this.runChecks().catch((e) => this.logger.error(e)), 15_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runChecks() {
    const now = new Date();
    const in7 = new Date(now);
    in7.setDate(in7.getDate() + 7);

    const expiring = await this.companyModel.find({
      isActive: true,
      isArchived: { $ne: true },
      planExpiresAt: { $gte: now, $lte: in7 },
    });

    for (const c of expiring) {
      await this.sendOnce(c, 'expiring_7d', `الاشتراك ينتهي في ${c.planExpiresAt?.toISOString()}`);
    }

    const expired = await this.companyModel.find({
      isActive: true,
      isArchived: { $ne: true },
      planExpiresAt: { $lt: now },
    });

    for (const c of expired) {
      await this.sendOnce(c, 'expired', 'انتهى الاشتراك — تم تقييد الدخول حتى التجديد');
    }
  }

  async list(limit = 50) {
    return this.alertModel.find({}).sort({ createdAt: -1 }).limit(limit).populate('companyId', 'name email').lean();
  }

  private async sendOnce(company: CompanyDocument, type: string, note: string) {
    const since = new Date();
    since.setDate(since.getDate() - 1);
    const exists = await this.alertModel.findOne({
      companyId: company._id,
      type,
      createdAt: { $gte: since },
    });
    if (exists) return;

    const owner = await this.userModel.findOne({ companyId: company._id, role: 'owner' });
    const channels: Array<'log' | 'email' | 'whatsapp'> = ['log'];
    if (owner?.email) channels.push('email');
    if (company.whatsapp?.displayPhoneNumber || company.phone) channels.push('whatsapp');

    for (const channel of channels) {
      this.logger.warn(
        `[subscription-alert] ${type} company=${company.name} channel=${channel} to=${owner?.email || company.phone || 'n/a'} :: ${note}`,
      );
      await this.alertModel.create({
        companyId: company._id,
        type,
        status: 'sent',
        channel,
        sentAt: new Date(),
        note,
      });
    }

    await this.notifications.create({
      companyId: company._id.toString(),
      title: type === 'expired' ? 'انتهى الاشتراك' : 'اشتراكك ينتهي قريباً',
      body: note,
      level: type === 'expired' ? 'danger' : 'warn',
      category: 'billing',
      href: '/dashboard/billing',
      meta: { code: type },
    });
  }
}
