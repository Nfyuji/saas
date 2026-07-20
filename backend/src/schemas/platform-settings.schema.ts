import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlatformSettingsDocument = PlatformSettings & Document;

@Schema({ timestamps: true })
export class PlatformSettings {
  @Prop({ default: 'default', unique: true })
  key!: string;

  @Prop({ default: 'BusinessOS AI' })
  platformName!: string;

  @Prop({ default: 'مرحباً بك في BusinessOS AI' })
  supportMessage?: string;

  @Prop({ default: 'admin@businessos.ai' })
  supportEmail?: string;

  @Prop({ default: true })
  allowRegistration!: boolean;

  @Prop({ default: true })
  trialEnabled!: boolean;

  @Prop({ default: 14 })
  trialDays!: number;

  @Prop({ default: 'starter' })
  defaultPlanCode!: string;

  @Prop({ default: false })
  maintenanceMode!: boolean;

  /** openai | gemini | auto (يجرب الأول المتاح) */
  @Prop({ default: 'auto', enum: ['openai', 'gemini', 'auto'] })
  aiProvider!: string;

  @Prop()
  openaiApiKey?: string;

  @Prop({ default: 'gpt-4o-mini' })
  openaiModel?: string;

  @Prop()
  geminiApiKey?: string;

  @Prop({ default: 'gemini-2.0-flash' })
  geminiModel?: string;

  /** ميزانية التوكنات الشهرية (0 = بلا حد) */
  @Prop({ default: 1_000_000 })
  openaiMonthlyTokenBudget!: number;

  @Prop({ default: 1_000_000 })
  geminiMonthlyTokenBudget!: number;

  @Prop({ default: 0 })
  openaiTokensUsedMonth!: number;

  @Prop({ default: 0 })
  geminiTokensUsedMonth!: number;

  @Prop({ default: 0 })
  openaiRequestsMonth!: number;

  @Prop({ default: 0 })
  geminiRequestsMonth!: number;

  /** YYYY-MM لتصفير العداد شهرياً */
  @Prop()
  aiUsageMonthKey?: string;

  @Prop({ default: true })
  aiEnabled!: boolean;
}

export const PlatformSettingsSchema = SchemaFactory.createForClass(PlatformSettings);
