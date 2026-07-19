import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customerId!: Types.ObjectId;

  @Prop({ required: true, enum: ['whatsapp', 'web', 'email'] })
  channel!: string;

  @Prop({ default: 'open', enum: ['open', 'pending', 'resolved', 'closed'] })
  status!: string;

  @Prop()
  lastMessage?: string;

  @Prop()
  lastMessageAt?: Date;

  @Prop({ default: 0 })
  unreadCount!: number;

  @Prop({ default: false })
  aiHandled!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;

  @Prop()
  whatsappConversationId?: string;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
ConversationSchema.index({ companyId: 1, status: 1, lastMessageAt: -1 });
