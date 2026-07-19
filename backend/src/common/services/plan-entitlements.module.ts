import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Company, CompanySchema } from '../../schemas/company.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Message, MessageSchema } from '../../schemas/message.schema';
import { Conversation, ConversationSchema } from '../../schemas/conversation.schema';
import { Customer, CustomerSchema } from '../../schemas/customer.schema';
import { KnowledgeDocument, KnowledgeDocumentSchema } from '../../schemas/knowledge.schema';
import { PlansModule } from '../../modules/plans/plans.module';
import { PlanEntitlementsService } from './plan-entitlements.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: User.name, schema: UserSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: KnowledgeDocument.name, schema: KnowledgeDocumentSchema },
    ]),
    PlansModule,
  ],
  providers: [PlanEntitlementsService],
  exports: [PlanEntitlementsService],
})
export class PlanEntitlementsModule {}
