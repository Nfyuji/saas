import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AutomationDocument = Automation & Document;

@Schema({ timestamps: true })
export class Automation {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, enum: ['new_customer', 'keyword', 'schedule', 'no_reply'] })
  trigger!: string;

  @Prop({ type: Object, required: true })
  triggerConfig!: Record<string, unknown>;

  @Prop({ type: [Object], default: [] })
  actions!: Array<{
    type: 'send_message' | 'assign_agent' | 'add_tag' | 'create_task' | 'ai_reply';
    config: Record<string, unknown>;
  }>;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: 0 })
  executionCount!: number;
}

export const AutomationSchema = SchemaFactory.createForClass(Automation);
