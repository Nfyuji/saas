import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TeamInviteDocument = TeamInvite & Document;

@Schema({ timestamps: true })
export class TeamInvite {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId!: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ default: 'agent', enum: ['admin', 'agent', 'viewer'] })
  role!: string;

  @Prop({ required: true, unique: true })
  token!: string;

  @Prop({ default: 'pending', enum: ['pending', 'accepted', 'revoked', 'expired'] })
  status!: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  invitedBy?: Types.ObjectId;

  @Prop()
  expiresAt?: Date;
}

export const TeamInviteSchema = SchemaFactory.createForClass(TeamInvite);
