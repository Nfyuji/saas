import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { PlatformSettings, PlatformSettingsSchema } from '../../schemas/platform-settings.schema';
import { AiUsageLog, AiUsageLogSchema } from '../../schemas/ai-usage-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlatformSettings.name, schema: PlatformSettingsSchema },
      { name: AiUsageLog.name, schema: AiUsageLogSchema },
    ]),
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
