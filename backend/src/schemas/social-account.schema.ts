import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SocialAccountDocument = SocialAccount & Document;

@Schema({ timestamps: true })
export class SocialAccount {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['whatsapp', 'instagram', 'facebook', 'tiktok', 'x', 'linkedin', 'youtube', 'other'],
  })
  channel!: string;

  @Prop({ required: true, trim: true })
  displayName!: string;

  @Prop({ trim: true })
  handle?: string;

  @Prop({ default: 'disconnected', enum: ['connected', 'disconnected', 'error', 'pending'] })
  status!: string;

  @Prop({ type: Object, default: {} })
  meta?: Record<string, unknown>;

  @Prop({ default: true })
  inboxEnabled!: boolean;

  @Prop({ default: true })
  postingEnabled!: boolean;
}

export const SocialAccountSchema = SchemaFactory.createForClass(SocialAccount);
SocialAccountSchema.index({ companyId: 1, channel: 1 });
