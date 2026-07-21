import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { DeviceBanService } from './device-ban.service';

@Injectable()
export class DeviceBanGuard implements CanActivate {
  constructor(private deviceBanService: DeviceBanService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const path = (req.originalUrl || req.url || '').split('?')[0];

    // مسارات يجب أن تبقى متاحة (صحة، ويب هوك، فحص الحظر نفسه)
    if (
      path.startsWith('/api/health') ||
      path.startsWith('/api/webhooks') ||
      path === '/api/devices/check' ||
      path === '/api/devices/heartbeat'
    ) {
      return true;
    }

    const fp = String(
      req.headers['x-device-fingerprint'] ||
        req.headers['x-device-id'] ||
        '',
    ).trim();

    if (fp) {
      await this.deviceBanService.assertNotBanned(fp);
    }

    return true;
  }
}
