import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { TeamInvite, TeamInviteDocument } from '../../schemas/team-invite.schema';
import { User, UserDocument } from '../../schemas/user.schema';
import { Company, CompanyDocument } from '../../schemas/company.schema';
import { PlanEntitlementsService } from '../../common/services/plan-entitlements.service';

@Injectable()
export class TeamService {
  constructor(
    @InjectModel(TeamInvite.name) private inviteModel: Model<TeamInviteDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    private entitlements: PlanEntitlementsService,
  ) {}

  async listMembers(companyId: string) {
    return this.userModel
      .find({ companyId: new Types.ObjectId(companyId) })
      .select('-password')
      .lean();
  }

  async listInvites(companyId: string) {
    return this.inviteModel
      .find({ companyId: new Types.ObjectId(companyId), status: 'pending' })
      .sort({ createdAt: -1 })
      .lean();
  }

  async invite(companyId: string, invitedBy: string, email: string, role: string = 'agent') {
    await this.entitlements.assertLimit(companyId, 'teamUsers');

    const existing = await this.userModel.findOne({ email: email.toLowerCase() });
    if (existing) throw new ConflictException('البريد مستخدم مسبقاً');

    const pending = await this.inviteModel.findOne({
      companyId: new Types.ObjectId(companyId),
      email: email.toLowerCase(),
      status: 'pending',
    });
    if (pending) throw new ConflictException('دعوة موجودة مسبقاً');

    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await this.inviteModel.create({
      companyId: new Types.ObjectId(companyId),
      email: email.toLowerCase(),
      role: ['admin', 'agent', 'viewer'].includes(role) ? role : 'agent',
      token,
      status: 'pending',
      invitedBy: new Types.ObjectId(invitedBy),
      expiresAt,
    });

    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
    return {
      invite,
      acceptUrl: `${frontend}/invite/${token}`,
      note: 'أرسل رابط الدعوة بالبريد للعضو الجديد',
    };
  }

  async acceptInvite(token: string, name: string, password: string) {
    const invite = await this.inviteModel.findOne({ token, status: 'pending' });
    if (!invite) throw new NotFoundException('الدعوة غير صالحة');
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      invite.status = 'expired';
      await invite.save();
      throw new ForbiddenException('انتهت صلاحية الدعوة');
    }

    await this.entitlements.assertLimit(String(invite.companyId), 'teamUsers');

    const hashed = await bcrypt.hash(password, 12);
    const user = await this.userModel.create({
      name,
      email: invite.email,
      password: hashed,
      companyId: invite.companyId,
      role: invite.role,
      isActive: true,
    });

    invite.status = 'accepted';
    await invite.save();

    return { success: true, email: user.email, companyId: invite.companyId };
  }

  async revokeInvite(companyId: string, inviteId: string) {
    const invite = await this.inviteModel.findOneAndUpdate(
      { _id: inviteId, companyId: new Types.ObjectId(companyId) },
      { status: 'revoked' },
      { new: true },
    );
    if (!invite) throw new NotFoundException('الدعوة غير موجودة');
    return invite;
  }

  async updateBranding(
    companyId: string,
    branding: { logoUrl?: string; primaryColor?: string; accentColor?: string; companyDisplayName?: string },
  ) {
    const company = await this.companyModel.findByIdAndUpdate(
      companyId,
      { $set: { branding } },
      { new: true },
    );
    if (!company) throw new NotFoundException('الشركة غير موجودة');
    return company.branding;
  }

  getBranding(companyId: string) {
    return this.companyModel.findById(companyId).select('name branding').lean();
  }
}
