import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  DeviceBan,
  DeviceBanDocument,
  DeviceVisit,
  DeviceVisitDocument,
} from '../../schemas/device-ban.schema';

@Injectable()
export class DeviceBanService {
  private bannedCache = new Map<string, { banned: boolean; at: number }>();
  private readonly cacheTtlMs = 30_000;

  constructor(
    @InjectModel(DeviceBan.name) private banModel: Model<DeviceBanDocument>,
    @InjectModel(DeviceVisit.name) private visitModel: Model<DeviceVisitDocument>,
  ) {}

  private cacheGet(fp: string): boolean | null {
    const hit = this.bannedCache.get(fp);
    if (!hit) return null;
    if (Date.now() - hit.at > this.cacheTtlMs) {
      this.bannedCache.delete(fp);
      return null;
    }
    return hit.banned;
  }

  private cacheSet(fp: string, banned: boolean) {
    this.bannedCache.set(fp, { banned, at: Date.now() });
  }

  invalidateCache(fp?: string) {
    if (fp) this.bannedCache.delete(fp);
    else this.bannedCache.clear();
  }

  async isBanned(fingerprint?: string | null): Promise<boolean> {
    const fp = String(fingerprint || '').trim();
    if (!fp || fp.length < 8) return false;
    const cached = this.cacheGet(fp);
    if (cached !== null) return cached;
    const ban = await this.banModel.findOne({ fingerprint: fp, isActive: true }).lean();
    const banned = !!ban;
    this.cacheSet(fp, banned);
    return banned;
  }

  async assertNotBanned(fingerprint?: string | null) {
    if (await this.isBanned(fingerprint)) {
      throw new ForbiddenException({
        code: 'DEVICE_BANNED',
        message: 'تم حظر هذا الجهاز نهائياً من الوصول للمنصة',
      });
    }
  }

  async checkAndTrack(input: {
    fingerprint: string;
    userAgent?: string;
    ip?: string;
    userId?: string;
    userEmail?: string;
    meta?: Record<string, unknown>;
  }) {
    const fingerprint = String(input.fingerprint || '').trim();
    if (!fingerprint || fingerprint.length < 8) {
      return { banned: false, fingerprint: null as string | null };
    }

    const ip = (input.ip || '').replace(/^::ffff:/, '').trim() || undefined;
    const now = new Date();

    const update: Record<string, unknown> = {
      $set: {
        userAgent: input.userAgent?.slice(0, 500),
        lastIp: ip,
        lastSeenAt: now,
        meta: input.meta || {},
      },
      $inc: { visitCount: 1 },
      $setOnInsert: { fingerprint },
    };

    if (input.userId) {
      (update.$set as Record<string, unknown>).lastUserId = new Types.ObjectId(input.userId);
    }
    if (input.userEmail) {
      (update.$set as Record<string, unknown>).lastUserEmail = input.userEmail;
    }
    if (ip) {
      update.$addToSet = { ipHistory: ip };
    }

    const visit = await this.visitModel.findOneAndUpdate({ fingerprint }, update, {
      upsert: true,
      new: true,
    });

    if (ip && visit.ipHistory?.length > 20) {
      visit.ipHistory = visit.ipHistory.slice(-20);
      await visit.save();
    }

    const banned = await this.isBanned(fingerprint);
    if (banned && ip) {
      await this.banModel.updateOne(
        { fingerprint, isActive: true },
        { $set: { lastIp: ip, userAgent: input.userAgent?.slice(0, 500) }, $addToSet: { ipHistory: ip } },
      );
    }

    return { banned, fingerprint, visitId: visit._id };
  }

  async listBans() {
    return this.banModel.find().sort({ bannedAt: -1, createdAt: -1 }).lean();
  }

  async listVisits(limit = 100) {
    return this.visitModel.find().sort({ lastSeenAt: -1 }).limit(Math.min(limit, 300)).lean();
  }

  async banDevice(input: {
    fingerprint: string;
    reason?: string;
    bannedBy?: string;
    bannedByEmail?: string;
    userAgent?: string;
    ip?: string;
    meta?: Record<string, unknown>;
  }) {
    const fingerprint = String(input.fingerprint || '').trim();
    if (!fingerprint || fingerprint.length < 8) {
      throw new NotFoundException('بصمة الجهاز غير صالحة');
    }

    const visit = await this.visitModel.findOne({ fingerprint }).lean();
    const ip = input.ip || visit?.lastIp;
    const banUpdate: Record<string, unknown> = {
      $set: {
        fingerprint,
        reason: input.reason || 'حظر يدوي من الأدمن',
        isActive: true,
        bannedByEmail: input.bannedByEmail,
        userAgent: input.userAgent || visit?.userAgent,
        lastIp: ip,
        meta: input.meta || visit?.meta || {},
        bannedAt: new Date(),
        revokedAt: null,
      },
    };
    if (input.bannedBy) {
      (banUpdate.$set as Record<string, unknown>).bannedBy = new Types.ObjectId(input.bannedBy);
    }
    if (ip) {
      banUpdate.$addToSet = { ipHistory: ip };
    }

    const ban = await this.banModel.findOneAndUpdate({ fingerprint }, banUpdate, {
      upsert: true,
      new: true,
    });

    this.cacheSet(fingerprint, true);
    return ban;
  }

  async revokeBan(id: string) {
    const ban = await this.banModel.findById(id);
    if (!ban) throw new NotFoundException('الحظر غير موجود');
    ban.isActive = false;
    ban.revokedAt = new Date();
    await ban.save();
    this.cacheSet(ban.fingerprint, false);
    return ban;
  }

  async banFromVisit(visitId: string, reason: string, admin: { id?: string; email?: string }) {
    const visit = await this.visitModel.findById(visitId);
    if (!visit) throw new NotFoundException('الزيارة غير موجودة');
    return this.banDevice({
      fingerprint: visit.fingerprint,
      reason,
      bannedBy: admin.id,
      bannedByEmail: admin.email,
      userAgent: visit.userAgent,
      ip: visit.lastIp,
      meta: visit.meta,
    });
  }
}
