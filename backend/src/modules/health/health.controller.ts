import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private connection: Connection) {}

  @Get()
  check() {
    const dbOk = this.connection.readyState === 1;
    return {
      status: dbOk ? 'ok' : 'degraded',
      service: 'BusinessOS AI',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      checks: {
        api: true,
        mongodb: dbOk,
      },
    };
  }
}
