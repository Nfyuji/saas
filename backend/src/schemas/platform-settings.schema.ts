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
}

export const PlatformSettingsSchema = SchemaFactory.createForClass(PlatformSettings);
