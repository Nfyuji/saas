import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubscriptionInvoiceDocument = SubscriptionInvoice & Document;

@Schema({ timestamps: true })
export class SubscriptionInvoice {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, unique: true })
  number!: string;

  @Prop({ required: true })
  planCode!: string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ default: 'USD' })
  currency!: string;

  @Prop({
    default: 'pending',
    enum: ['pending', 'paid', 'failed', 'refunded', 'cancelled'],
    index: true,
  })
  status!: string;

  @Prop({ default: 'demo', enum: ['demo', 'stripe', 'moyasar'] })
  provider!: string;

  @Prop()
  providerRef?: string;

  @Prop()
  checkoutUrl?: string;

  @Prop()
  paidAt?: Date;

  @Prop()
  periodStart?: Date;

  @Prop()
  periodEnd?: Date;

  @Prop({ type: Object, default: {} })
  meta?: Record<string, unknown>;
}

export const SubscriptionInvoiceSchema = SchemaFactory.createForClass(SubscriptionInvoice);
