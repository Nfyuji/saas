import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ContentAssetDocument = ContentAsset & Document;

@Schema({ timestamps: true })
export class ContentAsset {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, enum: ['post', 'ad', 'story', 'email', 'whatsapp', 'script'] })
  type!: string;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({ type: [String], default: [] })
  channels!: string[];

  @Prop({ type: [String], default: [] })
  hashtags!: string[];

  @Prop({ default: 'draft', enum: ['draft', 'ready', 'scheduled', 'published'] })
  status!: string;

  @Prop({ default: true })
  aiGenerated!: boolean;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;
}

export const ContentAssetSchema = SchemaFactory.createForClass(ContentAsset);
ContentAssetSchema.index({ companyId: 1, createdAt: -1 });
