import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DeviceBan,
  DeviceBanAttempt,
  DeviceBanAttemptSchema,
  DeviceBanSchema,
  DeviceVisit,
  DeviceVisitSchema,
} from '../../schemas/device-ban.schema';
import { DeviceBanService } from './device-ban.service';
import { DeviceBanGuard } from './device-ban.guard';
import {
  DeviceBanAdminController,
  DeviceBanPublicController,
} from './device-ban.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DeviceBan.name, schema: DeviceBanSchema },
      { name: DeviceVisit.name, schema: DeviceVisitSchema },
      { name: DeviceBanAttempt.name, schema: DeviceBanAttemptSchema },
    ]),
  ],
  controllers: [DeviceBanPublicController, DeviceBanAdminController],
  providers: [
    DeviceBanService,
    {
      provide: APP_GUARD,
      useClass: DeviceBanGuard,
    },
  ],
  exports: [DeviceBanService],
})
export class DeviceBanModule {}
