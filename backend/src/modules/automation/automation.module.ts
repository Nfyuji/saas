import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { Automation, AutomationSchema } from '../../schemas/automation.schema';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Automation.name, schema: AutomationSchema }]),
    forwardRef(() => WhatsappModule),
  ],
  controllers: [AutomationController],
  providers: [AutomationService],
  exports: [AutomationService],
})
export class AutomationModule {}
