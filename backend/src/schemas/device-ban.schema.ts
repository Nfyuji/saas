import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DeviceBanDocument = DeviceBan & Document;

@Schema({ timestamps: true })
export class DeviceBan {
  @Prop({ required: true, unique: true, index: true, trim: true })
  fingerprint!: string;

  @Prop({ trim: true })
  reason?: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  bannedBy?: Types.ObjectId;

  @Prop({ trim: true })
  bannedByEmail?: string;

  @Prop({ trim: true })
  userAgent?: string;

  @Prop({ trim: true })
  lastIp?: string;

  @Prop({ type: [String], default: [] })
  ipHistory!: string[];

  @Prop({ type: Object, default: {} })
  meta?: Record<string, unknown>;

  @Prop()
  bannedAt?: Date;

  @Prop()
  revokedAt?: Date;

  /** عدد محاولات الدخول بعد الحظر */
  @Prop({ default: 0 })
  attemptCount!: number;

  @Prop()
  lastAttemptAt?: Date;

  @Prop({ trim: true })
  lastAttemptIp?: string;

  @Prop({ trim: true })
  lastAttemptPath?: string;
}

export const DeviceBanSchema = SchemaFactory.createForClass(DeviceBan);

export type DeviceVisitDocument = DeviceVisit & Document;

@Schema({ timestamps: true })
export class DeviceVisit {
  @Prop({ required: true, unique: true, index: true, trim: true })
  fingerprint!: string;

  @Prop({ trim: true })
  userAgent?: string;

  @Prop({ trim: true })
  lastIp?: string;

  @Prop({ type: [String], default: [] })
  ipHistory!: string[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  lastUserId?: Types.ObjectId;

  @Prop({ trim: true })
  lastUserEmail?: string;

  @Prop({ default: 1 })
  visitCount!: number;

  @Prop()
  lastSeenAt!: Date;

  @Prop({ type: Object, default: {} })
  meta?: Record<string, unknown>;
}

export const DeviceVisitSchema = SchemaFactory.createForClass(DeviceVisit);
DeviceVisitSchema.index({ lastSeenAt: -1 });

export type DeviceBanAttemptDocument = DeviceBanAttempt & Document;

@Schema({ timestamps: true })
export class DeviceBanAttempt {
  @Prop({ required: true, index: true, trim: true })
  fingerprint!: string;

  @Prop({ type: Types.ObjectId, ref: 'DeviceBan' })
  banId?: Types.ObjectId;

  @Prop({ trim: true })
  ip?: string;

  @Prop({ trim: true })
  userAgent?: string;

  @Prop({ trim: true })
  path?: string;

  @Prop({ default: 'check', enum: ['check', 'api', 'login', 'page'] })
  source!: string;

  @Prop({ type: Object, default: {} })
  meta?: Record<string, unknown>;

  @Prop()
  attemptedAt!: Date;
}

export const DeviceBanAttemptSchema = SchemaFactory.createForClass(DeviceBanAttempt);
DeviceBanAttemptSchema.index({ attemptedAt: -1 });
DeviceBanAttemptSchema.index({ fingerprint: 1, attemptedAt: -1 });
