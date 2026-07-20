import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';
import { SocialAccount, SocialAccountSchema } from '../../schemas/social-account.schema';
import { ContentAsset, ContentAssetSchema } from '../../schemas/content-asset.schema';
import { Competitor, CompetitorSchema } from '../../schemas/competitor.schema';
import { Company, CompanySchema } from '../../schemas/company.schema';
import { Customer, CustomerSchema } from '../../schemas/customer.schema';
import { Conversation, ConversationSchema } from '../../schemas/conversation.schema';
import { Message, MessageSchema } from '../../schemas/message.schema';
import { Deal, DealSchema } from '../../schemas/deal.schema';
import { Invoice, InvoiceSchema } from '../../schemas/invoice.schema';
import { KnowledgeDocument, KnowledgeDocumentSchema } from '../../schemas/knowledge.schema';
import { AiModule } from '../ai/ai.module';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SocialAccount.name, schema: SocialAccountSchema },
      { name: ContentAsset.name, schema: ContentAssetSchema },
      { name: Competitor.name, schema: CompetitorSchema },
      { name: Company.name, schema: CompanySchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Deal.name, schema: DealSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: KnowledgeDocument.name, schema: KnowledgeDocumentSchema },
    ]),
    AiModule,
    forwardRef(() => CampaignsModule),
  ],
  controllers: [IntelligenceController],
  providers: [IntelligenceService],
  exports: [IntelligenceService],
})
export class IntelligenceModule {}
