import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true })
export class Customer {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true, index: true })
  phone?: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop({ default: 'lead', enum: ['lead', 'prospect', 'customer', 'vip', 'inactive'] })
  status!: string;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;

  @Prop()
  whatsappId?: string;

  @Prop()
  lastContactAt?: Date;

  @Prop({ default: 0 })
  totalMessages!: number;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
CustomerSchema.index({ companyId: 1, phone: 1 });
CustomerSchema.index({ companyId: 1, whatsappId: 1 });
