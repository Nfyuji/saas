import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CompanyDocument = Company & Document;

@Schema({ timestamps: true })
export class Company {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true })
  industry?: string;

  @Prop({
    default: 'general',
    enum: ['general', 'clinic', 'realestate', 'ecommerce', 'cars', 'services'],
  })
  sector!: string;

  @Prop({ default: 'starter', trim: true, lowercase: true })
  plan!: string;

  @Prop()
  planExpiresAt?: Date;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isArchived!: boolean;

  @Prop()
  archivedAt?: Date;

  @Prop({ trim: true })
  suspendedReason?: string;

  @Prop()
  suspendedAt?: Date;

  @Prop({ type: Object, default: {} })
  settings!: {
    timezone?: string;
    language?: string;
    aiEnabled?: boolean;
    aiInstructions?: string;
    salesAgentEnabled?: boolean;
    autoFollowUp?: boolean;
    followUpHours?: number[];
    postPurchaseFollowUp?: boolean;
    postPurchaseHours?: number[];
    businessHours?: { start: string; end: string };
    adminNotes?: string;
    invoicesEnabled?: boolean;
    knowledgeEnabled?: boolean;
    opportunitiesEnabled?: boolean;
  };

  @Prop({ type: Object, default: {} })
  branding!: {
    logoUrl?: string;
    primaryColor?: string;
    accentColor?: string;
    companyDisplayName?: string;
  };

  @Prop({ type: Object, default: {} })
  whatsapp!: {
    provider?: 'meta' | 'greenapi' | 'demo';
    phoneNumberId?: string;
    accessToken?: string;
    businessAccountId?: string;
    displayPhoneNumber?: string;
    verifiedName?: string;
    webhookConfigured?: boolean;
    aiAutoReply?: boolean;
    welcomeMessage?: string;
    qualityRating?: string;
    codeVerificationStatus?: string;
    demo?: boolean;
    greenApi?: {
      apiUrl?: string;
      mediaUrl?: string;
      idInstance?: string;
      apiTokenInstance?: string;
    };
  };

  @Prop({ type: Object, default: {} })
  billing!: {
    customerId?: string;
    subscriptionId?: string;
    paymentMethod?: string;
    provider?: string;
  };
}

export const CompanySchema = SchemaFactory.createForClass(Company);
