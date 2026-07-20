import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({
    default: 'info',
    enum: ['info', 'warn', 'danger', 'success'],
  })
  level!: string;

  @Prop({
    default: 'system',
    enum: ['system', 'followup', 'deal', 'billing', 'whatsapp', 'team'],
  })
  category!: string;

  @Prop()
  href?: string;

  @Prop({ default: false })
  read!: boolean;

  @Prop({ type: Object, default: {} })
  meta?: Record<string, unknown>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ companyId: 1, read: 1, createdAt: -1 });
