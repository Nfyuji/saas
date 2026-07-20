import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { User, UserDocument } from '../../schemas/user.schema';
import { Company, CompanyDocument } from '../../schemas/company.schema';
import { PlatformSettings, PlatformSettingsDocument } from '../../schemas/platform-settings.schema';
import { PlansService } from '../plans/plans.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    @InjectModel(PlatformSettings.name) private settingsModel: Model<PlatformSettingsDocument>,
    private jwtService: JwtService,
    private plansService: PlansService,
    private config: ConfigService,
  ) {}

  private async getPlatformSettings() {
    let settings = await this.settingsModel.findOne({ key: 'default' });
    if (!settings) {
      settings = await this.settingsModel.create({ key: 'default' });
    }
    return settings;
  }

  async register(dto: RegisterDto) {
    const settings = await this.getPlatformSettings();
    if (settings.maintenanceMode) {
      throw new ServiceUnavailableException('المنصة قيد الصيانة حالياً');
    }
    if (!settings.allowRegistration) {
      throw new ForbiddenException('التسجيل مغلق حالياً. تواصل مع الدعم.');
    }

    const existing = await this.userModel.findOne({ email: dto.email });
    if (existing) throw new ConflictException('البريد الإلكتروني مستخدم مسبقاً');

    const planCode = settings.defaultPlanCode || 'starter';
    const plan = await this.plansService.findByCode(planCode);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (settings.trialEnabled ? settings.trialDays || 14 : 30));

    const company = await this.companyModel.create({
      name: dto.companyName,
      email: dto.email,
      phone: dto.phone,
      plan: plan?.code || planCode,
      planExpiresAt: expiresAt,
      sector: 'general',
      settings: {
        language: 'ar',
        aiEnabled: true,
        salesAgentEnabled: plan?.salesAgentEnabled ?? true,
        autoFollowUp: plan?.autoFollowUp ?? true,
        invoicesEnabled: plan?.invoicesEnabled ?? false,
        knowledgeEnabled: plan?.knowledgeEnabled ?? true,
        opportunitiesEnabled: plan?.opportunitiesEnabled ?? false,
        followUpHours: [2, 24, 72],
      },
      whatsapp: { aiAutoReply: true, welcomeMessage: 'مرحباً! كيف يمكنني مساعدتك؟' },
    });

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.userModel.create({
      name: dto.name,
      email: dto.email,
      password: hashed,
      companyId: company._id,
      role: 'owner',
    });

    return this.buildAuthResponse(user, company);
  }

  async login(dto: LoginDto) {
    const user = await this.userModel.findOne({ email: dto.email });
    if (!user || !user.isActive || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    let company: CompanyDocument | null = null;
    if (user.role === 'super_admin') {
      // أدمن المنصة — لا يشترط شركة نشطة
    } else {
      if (!user.companyId) throw new UnauthorizedException('الحساب غير مرتبط بشركة');
      company = await this.companyModel.findById(user.companyId);
      if (!company?.isActive) {
        const reason = company?.suspendedReason ? `: ${company.suspendedReason}` : '';
        throw new UnauthorizedException(`اشتراك الشركة موقوف${reason}`);
      }
      if (company.planExpiresAt && new Date(company.planExpiresAt) < new Date()) {
        throw new UnauthorizedException('انتهت مدة الاشتراك. تواصل مع الدعم للتجديد.');
      }

      const settings = await this.getPlatformSettings();
      if (settings.maintenanceMode) {
        throw new ServiceUnavailableException('المنصة قيد الصيانة حالياً');
      }
    }

    user.lastLoginAt = new Date();
    await user.save();

    return this.buildAuthResponse(user, company);
  }

  async getPublicSettings() {
    const settings = await this.getPlatformSettings();
    return {
      platformName: settings.platformName,
      supportEmail: settings.supportEmail,
      supportMessage: settings.supportMessage,
      allowRegistration: settings.allowRegistration,
      maintenanceMode: settings.maintenanceMode,
      trialEnabled: settings.trialEnabled,
      trialDays: settings.trialDays,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) throw new BadRequestException('كلمة المرور الحالية غير صحيحة');
    if (newPassword.length < 6) {
      throw new BadRequestException('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف');
    }
    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    return { success: true, message: 'تم تحديث كلمة المرور' };
  }

  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email: email.toLowerCase().trim() });
    // لا نكشف إن كان الإيميل موجوداً أم لا
    const generic = {
      success: true,
      message: 'إن وُجد الحساب، ستصلك تعليمات إعادة التعيين.',
    };
    if (!user || !user.isActive) return generic;

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const frontend = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontend}/reset-password?token=${rawToken}`;
    this.logger.warn(`Password reset for ${user.email}: ${resetUrl}`);

    const isProd = this.config.get('NODE_ENV') === 'production';
    return {
      ...generic,
      ...(isProd ? {} : { resetUrl, token: rawToken }),
    };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token?.trim()) throw new BadRequestException('رمز إعادة التعيين مطلوب');
    if (newPassword.length < 6) {
      throw new BadRequestException('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف');
    }
    const hashed = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const user = await this.userModel.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) throw new BadRequestException('رابط إعادة التعيين غير صالح أو منتهٍ');

    user.password = await bcrypt.hash(newPassword, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    return { success: true, message: 'تم تعيين كلمة المرور الجديدة. يمكنك الدخول الآن.' };
  }

  async updateProfile(userId: string, name: string) {
    const trimmed = name?.trim();
    if (!trimmed || trimmed.length < 2) {
      throw new BadRequestException('الاسم يجب ألا يقل عن حرفين');
    }
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: { name: trimmed } }, { new: true })
      .select('-password')
      .lean();
    if (!user) throw new UnauthorizedException();
    return { success: true, message: 'تم تحديث الملف الشخصي', user };
  }

  async getProfile(userId: string): Promise<{
    user: Record<string, unknown>;
    company: Record<string, unknown> | null;
  }> {
    const user = await this.userModel.findById(userId).select('-password').lean();
    if (!user) throw new UnauthorizedException();
    const company = user.companyId
      ? await this.companyModel.findById(user.companyId).select('-whatsapp.accessToken').lean()
      : null;

    let settings = company?.settings as Record<string, unknown> | undefined;
    if (company) {
      const plan = await this.plansService.findByCode(company.plan || 'starter');
      if (plan) {
        settings = {
          ...(settings || {}),
          salesAgentEnabled: company.settings?.salesAgentEnabled ?? plan.salesAgentEnabled,
          autoFollowUp: company.settings?.autoFollowUp ?? plan.autoFollowUp,
          invoicesEnabled: company.settings?.invoicesEnabled ?? plan.invoicesEnabled,
          knowledgeEnabled: company.settings?.knowledgeEnabled ?? plan.knowledgeEnabled,
          opportunitiesEnabled: company.settings?.opportunitiesEnabled ?? plan.opportunitiesEnabled,
        };
      }
    }

    return {
      user: {
        id: String(user._id),
        _id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId ? String(user.companyId) : null,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: (user as { createdAt?: Date }).createdAt,
        updatedAt: (user as { updatedAt?: Date }).updatedAt,
      },
      company: company
        ? {
            id: String(company._id),
            _id: String(company._id),
            name: company.name,
            email: company.email,
            phone: company.phone,
            industry: company.industry,
            plan: company.plan,
            planExpiresAt: company.planExpiresAt,
            isActive: company.isActive,
            sector: company.sector,
            settings,
            whatsapp: {
              configured: !!company.whatsapp?.phoneNumberId,
              demo: !!company.whatsapp?.phoneNumberId?.startsWith('demo_'),
              displayPhoneNumber: company.whatsapp?.displayPhoneNumber,
              verifiedName: company.whatsapp?.verifiedName,
              aiAutoReply: company.whatsapp?.aiAutoReply,
            },
          }
        : null,
    };
  }

  private buildAuthResponse(user: UserDocument, company: CompanyDocument | null) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      companyId: company?._id?.toString() || '',
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: company?._id || null,
      },
      company: company
        ? {
            id: company._id,
            name: company.name,
            plan: company.plan,
            planExpiresAt: company.planExpiresAt,
            isActive: company.isActive,
            settings: {
              salesAgentEnabled: company.settings?.salesAgentEnabled,
              autoFollowUp: company.settings?.autoFollowUp,
              invoicesEnabled: company.settings?.invoicesEnabled,
              knowledgeEnabled: company.settings?.knowledgeEnabled,
              opportunitiesEnabled: company.settings?.opportunitiesEnabled,
            },
            whatsapp: {
              configured: !!company.whatsapp?.phoneNumberId && !!company.whatsapp?.accessToken,
              displayPhoneNumber: company.whatsapp?.displayPhoneNumber,
              aiAutoReply: company.whatsapp?.aiAutoReply,
            },
          }
        : null,
      isPlatformAdmin: ['super_admin', 'platform_support', 'platform_finance'].includes(user.role),
    };
  }
}
