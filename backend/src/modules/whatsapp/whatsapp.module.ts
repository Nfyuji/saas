import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { WhatsappApiService } from './whatsapp-api.service';
import { GreenApiService } from './greenapi.service';
import { Company, CompanySchema } from '../../schemas/company.schema';
import { Customer, CustomerSchema } from '../../schemas/customer.schema';
import { Conversation, ConversationSchema } from '../../schemas/conversation.schema';
import { Message, MessageSchema } from '../../schemas/message.schema';
import { AiModule } from '../ai/ai.module';
import { AutomationModule } from '../automation/automation.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { DealsModule } from '../deals/deals.module';
import { FollowUpsModule } from '../followups/followups.module';
import { PlanEntitlementsModule } from '../../common/services/plan-entitlements.module';
import { OutboundWebhooksModule } from '../outbound-webhooks/outbound-webhooks.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    AiModule,
    forwardRef(() => AutomationModule),
    KnowledgeModule,
    DealsModule,
    forwardRef(() => FollowUpsModule),
    PlanEntitlementsModule,
    OutboundWebhooksModule,
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappApiService, GreenApiService],
  exports: [WhatsappService, WhatsappApiService, GreenApiService],
})
export class WhatsappModule {}
