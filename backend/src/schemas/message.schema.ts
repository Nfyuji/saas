import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true, index: true })
  conversationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customerId?: Types.ObjectId;

  @Prop({ required: true, enum: ['inbound', 'outbound', 'system'] })
  direction!: string;

  @Prop({ required: true, enum: ['text', 'image', 'video', 'audio', 'document', 'template', 'location', 'contacts', 'sticker', 'reaction'] })
  type!: string;

  @Prop()
  content?: string;

  @Prop({ type: Object })
  media?: {
    id?: string;
    url?: string;
    mimeType?: string;
    filename?: string;
    caption?: string;
  };

  @Prop({ type: Object })
  template?: {
    name: string;
    language: string;
    components?: unknown[];
  };

  @Prop({ default: 'whatsapp', enum: ['whatsapp', 'web', 'system'] })
  channel!: string;

  @Prop({ default: 'sent', enum: ['pending', 'sent', 'delivered', 'read', 'failed'] })
  status!: string;

  @Prop()
  whatsappMessageId?: string;

  @Prop({ default: false })
  isAiGenerated!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  sentBy?: Types.ObjectId;

  @Prop()
  errorMessage?: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ conversationId: 1, createdAt: -1 });
