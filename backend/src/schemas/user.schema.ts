import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: false })
  companyId?: Types.ObjectId;

  @Prop({
    default: 'agent',
    enum: [
      'super_admin',
      'platform_support',
      'platform_finance',
      'owner',
      'admin',
      'agent',
      'viewer',
    ],
  })
  role!: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop()
  avatar?: string;

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  resetPasswordToken?: string;

  @Prop()
  resetPasswordExpires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
