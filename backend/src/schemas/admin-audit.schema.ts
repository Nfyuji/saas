import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AdminAuditDocument = AdminAudit & Document;

@Schema({ timestamps: true })
export class AdminAudit {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  actorId?: Types.ObjectId;

  @Prop({ trim: true })
  actorEmail?: string;

  @Prop({ required: true, trim: true })
  action!: string;

  @Prop({ trim: true })
  targetType?: string;

  @Prop({ trim: true })
  targetId?: string;

  @Prop({ trim: true })
  targetName?: string;

  @Prop({ type: Object, default: {} })
  meta?: Record<string, unknown>;
}

export const AdminAuditSchema = SchemaFactory.createForClass(AdminAudit);
AdminAuditSchema.index({ createdAt: -1 });
