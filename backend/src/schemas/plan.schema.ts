import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlanDocument = Plan & Document;

@Schema({ timestamps: true })
export class Plan {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  code!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ default: '' })
  description?: string;

  @Prop({ default: 0 })
  price!: number;

  @Prop({ default: 'USD' })
  currency!: string;

  @Prop({ type: [String], default: [] })
  features!: string[];

  @Prop({ type: Object, default: {} })
  limits!: {
    conversations?: number;
    agents?: number;
    knowledgeDocs?: number;
    teamUsers?: number;
    whatsappNumbers?: number;
    messagesPerDay?: number;
  };

  @Prop({ default: false })
  popular!: boolean;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: true })
  visibleToCustomers!: boolean;

  @Prop({ default: 0 })
  sortOrder!: number;

  @Prop({ default: false })
  salesAgentEnabled!: boolean;

  @Prop({ default: false })
  autoFollowUp!: boolean;

  @Prop({ default: false })
  invoicesEnabled!: boolean;

  @Prop({ default: false })
  knowledgeEnabled!: boolean;

  @Prop({ default: false })
  opportunitiesEnabled!: boolean;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
