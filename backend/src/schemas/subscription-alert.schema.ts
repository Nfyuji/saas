import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionAlertDocument = SubscriptionAlert & Document;

@Schema({ timestamps: true })
export class SubscriptionAlert {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, enum: ['expiring_7d', 'expired', 'renewed'] })
  type!: string;

  @Prop({ default: 'queued', enum: ['queued', 'sent', 'failed'] })
  status!: string;

  @Prop({ default: 'log', enum: ['log', 'email', 'whatsapp'] })
  channel!: string;

  @Prop()
  sentAt?: Date;

  @Prop()
  note?: string;
}

export const SubscriptionAlertSchema = SchemaFactory.createForClass(SubscriptionAlert);
SubscriptionAlertSchema.index({ companyId: 1, type: 1, createdAt: -1 });
