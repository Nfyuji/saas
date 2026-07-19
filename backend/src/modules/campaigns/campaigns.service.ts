import { BadRequestException, Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from '../../schemas/customer.schema';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @Inject(forwardRef(() => WhatsappService)) private whatsappService: WhatsappService,
  ) {}

  async previewAudience(
    companyId: string,
    filter: { status?: string; tag?: string; purchasedOnly?: boolean },
  ) {
    const q = this.buildQuery(companyId, filter);
    const total = await this.customerModel.countDocuments(q);
    const sample = await this.customerModel.find(q).select('name phone status tags').limit(8).lean();
    return { total, sample };
  }

  async broadcast(
    companyId: string,
    userId: string,
    data: {
      message: string;
      status?: string;
      tag?: string;
      purchasedOnly?: boolean;
      dryRun?: boolean;
    },
  ) {
    const text = data.message?.trim();
    if (!text || text.length < 3) {
      throw new BadRequestException('نص الحملة قصير جداً');
    }

    const customers = await this.customerModel
      .find(this.buildQuery(companyId, data))
      .select('name phone')
      .limit(200)
      .lean();

    if (!customers.length) {
      throw new BadRequestException('لا عملاء مطابقين لمعايير الحملة');
    }

    if (data.dryRun) {
      return { dryRun: true, audience: customers.length, wouldSend: customers.length };
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const c of customers) {
      if (!c.phone) {
        failed += 1;
        continue;
      }
      try {
        await this.whatsappService.sendMessage(companyId, userId || 'system', {
          to: c.phone,
          type: 'text',
          text: text.replace(/\{name\}/g, c.name || 'عميلنا'),
        });
        sent += 1;
      } catch (e) {
        failed += 1;
        if (errors.length < 5) {
          errors.push(e instanceof Error ? e.message : String(e));
        }
      }
    }

    return {
      success: true,
      audience: customers.length,
      sent,
      failed,
      errors,
      note: 'الحملة أُرسلت كنصوص واتساب. للأرقام خارج نافذة 24 ساعة قد تحتاج قالب Meta معتمد.',
    };
  }

  private buildQuery(
    companyId: string,
    filter: { status?: string; tag?: string; purchasedOnly?: boolean },
  ) {
    const q: Record<string, unknown> = {
      companyId: new Types.ObjectId(companyId),
      phone: { $exists: true, $nin: [null, ''] },
    };
    if (filter.status) q.status = filter.status;
    if (filter.tag) q.tags = filter.tag;
    if (filter.purchasedOnly) {
      q.$or = [{ status: { $in: ['customer', 'vip'] } }, { tags: 'purchased' }];
    }
    return q;
  }
}
