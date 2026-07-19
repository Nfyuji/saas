import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type KnowledgeDocumentDoc = KnowledgeDocument & Document;

@Schema({ timestamps: true })
export class KnowledgeDocument {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ default: 'catalog', enum: ['catalog', 'faq', 'policy', 'product', 'other'] })
  type!: string;

  @Prop({ required: true })
  content!: string;

  @Prop()
  filename?: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: 0 })
  useCount!: number;
}

export const KnowledgeDocumentSchema = SchemaFactory.createForClass(KnowledgeDocument);
KnowledgeDocumentSchema.index({ companyId: 1, isActive: 1 });
