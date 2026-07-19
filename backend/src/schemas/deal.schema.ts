import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DealDocument = Deal & Document;

@Schema({ timestamps: true })
export class Deal {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conversation' })
  conversationId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ default: 'lead', enum: ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'cold'] })
  stage!: string;

  @Prop({ default: 0 })
  value!: number;

  @Prop({ default: 'SAR' })
  currency!: string;

  @Prop()
  notes?: string;

  @Prop({ type: [Object], default: [] })
  items!: Array<{ name: string; quantity: number; price: number }>;

  @Prop()
  lostReason?: string;

  @Prop()
  lastFollowUpAt?: Date;

  @Prop()
  nextFollowUpAt?: Date;

  @Prop({ default: 0 })
  followUpCount!: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;

  @Prop({ default: false })
  quoteSent!: boolean;

  @Prop()
  paymentLink?: string;
}

export const DealSchema = SchemaFactory.createForClass(Deal);
DealSchema.index({ companyId: 1, stage: 1, updatedAt: -1 });
