import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FollowUpDocument = FollowUp & Document;

@Schema({ timestamps: true })
export class FollowUp {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conversation' })
  conversationId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Deal' })
  dealId?: Types.ObjectId;

  @Prop({ required: true })
  scheduledAt!: Date;

  @Prop({ default: 'pending', enum: ['pending', 'sent', 'cancelled', 'failed'] })
  status!: string;

  @Prop({ default: 1 })
  step!: number;

  @Prop()
  message?: string;

  @Prop({ default: 'ai', enum: ['ai', 'manual', 'system'] })
  source!: string;

  /** sales = متابعة بيع · post_purchase = بعد الشراء · nps = رضا */
  @Prop({ default: 'sales', enum: ['sales', 'post_purchase', 'nps'] })
  type!: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;
}

export const FollowUpSchema = SchemaFactory.createForClass(FollowUp);
FollowUpSchema.index({ companyId: 1, status: 1, scheduledAt: 1 });
