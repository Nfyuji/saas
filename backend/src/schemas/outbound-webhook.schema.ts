import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OutboundWebhookDocument = OutboundWebhook & Document;

@Schema({ timestamps: true })
export class OutboundWebhook {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  url!: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: [String], default: ['message.received', 'message.sent', 'deal.updated', 'invoice.created'] })
  events!: string[];

  @Prop({ trim: true })
  secret?: string;

  @Prop()
  lastTriggeredAt?: Date;

  @Prop({ default: 0 })
  failureCount!: number;
}

export const OutboundWebhookSchema = SchemaFactory.createForClass(OutboundWebhook);
