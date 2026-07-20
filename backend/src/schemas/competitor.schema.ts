import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CompetitorDocument = Competitor & Document;

@Schema({ timestamps: true })
export class Competitor {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  website?: string;

  @Prop({ type: [String], default: [] })
  channels!: string[];

  @Prop()
  notes?: string;

  @Prop({ type: Object, default: {} })
  lastAnalysis?: {
    at?: Date;
    summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    opportunities?: string[];
    contentIdeas?: string[];
  };
}

export const CompetitorSchema = SchemaFactory.createForClass(Competitor);
