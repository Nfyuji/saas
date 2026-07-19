import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Deal' })
  dealId?: Types.ObjectId;

  @Prop({ required: true, unique: true })
  number!: string;

  @Prop({ default: 'draft', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'] })
  status!: string;

  @Prop({ type: [Object], default: [] })
  items!: Array<{ name: string; quantity: number; price: number }>;

  @Prop({ default: 0 })
  subtotal!: number;

  @Prop({ default: 0 })
  tax!: number;

  @Prop({ default: 0 })
  total!: number;

  @Prop({ default: 'SAR' })
  currency!: string;

  @Prop()
  paymentLink?: string;

  @Prop()
  dueDate?: Date;

  @Prop()
  paidAt?: Date;

  @Prop()
  notes?: string;

  @Prop({ default: false })
  reminderSent!: boolean;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
InvoiceSchema.index({ companyId: 1, status: 1, createdAt: -1 });
