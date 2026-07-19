import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import axios from 'axios';
import { createHmac } from 'crypto';
import { OutboundWebhook, OutboundWebhookDocument } from '../../schemas/outbound-webhook.schema';

@Injectable()
export class OutboundWebhooksService {
  private readonly logger = new Logger(OutboundWebhooksService.name);

  constructor(
    @InjectModel(OutboundWebhook.name)
    private webhookModel: Model<OutboundWebhookDocument>,
  ) {}

  list(companyId: string) {
    return this.webhookModel.find({ companyId: new Types.ObjectId(companyId) }).lean();
  }

  async create(
    companyId: string,
    data: { url: string; events?: string[]; secret?: string; isActive?: boolean },
  ) {
    return this.webhookModel.create({
      companyId: new Types.ObjectId(companyId),
      url: data.url,
      events: data.events || ['message.received', 'message.sent', 'deal.updated', 'invoice.created'],
      secret: data.secret || createHmac('sha256', companyId).update(String(Date.now())).digest('hex').slice(0, 24),
      isActive: data.isActive !== false,
    });
  }

  async update(companyId: string, id: string, data: Partial<OutboundWebhook>) {
    const doc = await this.webhookModel.findOneAndUpdate(
      { _id: id, companyId: new Types.ObjectId(companyId) },
      { $set: data },
      { new: true },
    );
    if (!doc) throw new NotFoundException('Webhook غير موجود');
    return doc;
  }

  async remove(companyId: string, id: string) {
    await this.webhookModel.deleteOne({ _id: id, companyId: new Types.ObjectId(companyId) });
    return { success: true };
  }

  async dispatch(companyId: string, event: string, payload: Record<string, unknown>) {
    const hooks = await this.webhookModel.find({
      companyId: new Types.ObjectId(companyId),
      isActive: true,
      events: event,
    });

    for (const hook of hooks) {
      const body = {
        event,
        companyId,
        timestamp: new Date().toISOString(),
        data: payload,
      };
      const signature = hook.secret
        ? createHmac('sha256', hook.secret).update(JSON.stringify(body)).digest('hex')
        : '';

      try {
        await axios.post(hook.url, body, {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-BusinessOS-Event': event,
            'X-BusinessOS-Signature': signature,
          },
        });
        hook.lastTriggeredAt = new Date();
        hook.failureCount = 0;
        await hook.save();
      } catch (err) {
        hook.failureCount = (hook.failureCount || 0) + 1;
        await hook.save();
        this.logger.warn(`Webhook failed ${hook.url}: ${(err as Error).message}`);
      }
    }
  }
}
