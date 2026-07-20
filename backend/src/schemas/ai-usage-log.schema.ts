import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AiUsageLogDocument = AiUsageLog & Document;

@Schema({ timestamps: true })
export class AiUsageLog {
  @Prop({ required: true, enum: ['openai', 'gemini'], index: true })
  provider!: string;

  @Prop({ required: true })
  model!: string;

  @Prop({ default: 'chat' })
  purpose!: string;

  @Prop({ default: 0 })
  promptTokens!: number;

  @Prop({ default: 0 })
  completionTokens!: number;

  @Prop({ default: 0 })
  totalTokens!: number;

  @Prop({ default: true })
  success!: boolean;

  @Prop()
  error?: string;

  @Prop({ index: true })
  dayKey?: string;
}

export const AiUsageLogSchema = SchemaFactory.createForClass(AiUsageLog);
AiUsageLogSchema.index({ provider: 1, createdAt: -1 });
