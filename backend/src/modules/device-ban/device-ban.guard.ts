import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { DeviceBanService } from './device-ban.service';

function clientIp(req: Request): string {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0]?.trim();
  return xf || req.ip || req.socket?.remoteAddress || '';
}

@Injectable()
export class DeviceBanGuard implements CanActivate {
  constructor(private deviceBanService: DeviceBanService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const path = (req.originalUrl || req.url || '').split('?')[0];

    if (
      path.startsWith('/api/health') ||
      path.startsWith('/api/webhooks') ||
      path === '/api/devices/check' ||
      path === '/api/devices/heartbeat'
    ) {
      return true;
    }

    const fp = String(
      req.headers['x-device-fingerprint'] || req.headers['x-device-id'] || '',
    ).trim();

    if (fp) {
      await this.deviceBanService.assertNotBanned(fp, {
        ip: clientIp(req),
        userAgent: String(req.headers['user-agent'] || ''),
        path,
      });
    }

    return true;
  }
}
