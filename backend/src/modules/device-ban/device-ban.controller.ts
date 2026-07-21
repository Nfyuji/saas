import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { Request } from 'express';
import { DeviceBanService } from './device-ban.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class FingerprintDto {
  @IsString()
  @MinLength(8)
  fingerprint!: string;

  @IsOptional() @IsString() userAgent?: string;
  @IsOptional() @IsObject() meta?: Record<string, unknown>;
}

class BanDto {
  @IsString()
  @MinLength(8)
  fingerprint!: string;

  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() userAgent?: string;
}

class BanVisitDto {
  @IsOptional() @IsString() reason?: string;
}

function clientIp(req: Request): string {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0]?.trim();
  return xf || req.ip || req.socket?.remoteAddress || '';
}

@Controller('devices')
export class DeviceBanPublicController {
  constructor(private deviceBanService: DeviceBanService) {}

  /** فحص سريع — يعمل حتى للجهاز المحظور */
  @Post('check')
  async check(@Body() dto: FingerprintDto, @Req() req: Request) {
    const result = await this.deviceBanService.checkAndTrack({
      fingerprint: dto.fingerprint,
      userAgent: dto.userAgent || req.headers['user-agent'],
      ip: clientIp(req),
      meta: dto.meta,
    });
    return {
      banned: result.banned,
      fingerprint: result.fingerprint,
      code: result.banned ? 'DEVICE_BANNED' : 'OK',
      message: result.banned
        ? 'تم حظر هذا الجهاز نهائياً من الوصول للمنصة'
        : 'ok',
    };
  }

  @Post('heartbeat')
  async heartbeat(@Body() dto: FingerprintDto, @Req() req: Request) {
    return this.check(dto, req);
  }
}

@Controller('platform-admin/device-bans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'platform_support')
export class DeviceBanAdminController {
  constructor(private deviceBanService: DeviceBanService) {}

  @Get()
  listBans() {
    return this.deviceBanService.listBans();
  }

  @Get('visits')
  listVisits(@Query('limit') limit?: string) {
    return this.deviceBanService.listVisits(limit ? Number(limit) : 100);
  }

  @Get('attempts')
  listAttempts(@Query('limit') limit?: string, @Query('fingerprint') fingerprint?: string) {
    return this.deviceBanService.listAttempts(limit ? Number(limit) : 200, fingerprint);
  }

  @Post()
  ban(
    @Body() dto: BanDto,
    @CurrentUser('sub') adminId: string,
    @CurrentUser('email') email: string,
    @Req() req: Request,
  ) {
    return this.deviceBanService.banDevice({
      fingerprint: dto.fingerprint,
      reason: dto.reason,
      bannedBy: adminId,
      bannedByEmail: email,
      userAgent: dto.userAgent,
      ip: clientIp(req),
    });
  }

  @Post('from-visit/:visitId')
  banVisit(
    @Param('visitId') visitId: string,
    @Body() dto: BanVisitDto,
    @CurrentUser('sub') adminId: string,
    @CurrentUser('email') email: string,
  ) {
    return this.deviceBanService.banFromVisit(visitId, dto.reason || 'حظر من سجل الأجهزة', {
      id: adminId,
      email,
    });
  }

  /** رفع الحظر ببصمة الجهاز — يجب أن يكون قبل :id/revoke */
  @Put('by-fingerprint/:fingerprint/revoke')
  revokeByFingerprint(@Param('fingerprint') fingerprint: string) {
    return this.deviceBanService.revokeByFingerprint(decodeURIComponent(fingerprint));
  }

  @Put(':id/revoke')
  revoke(@Param('id') id: string) {
    return this.deviceBanService.revokeBan(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const ban = await this.deviceBanService.revokeBan(id);
    return { success: true, ban };
  }
}
