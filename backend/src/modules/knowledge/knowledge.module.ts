import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeDocument, KnowledgeDocumentSchema } from '../../schemas/knowledge.schema';
import { PlanEntitlementsModule } from '../../common/services/plan-entitlements.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: KnowledgeDocument.name, schema: KnowledgeDocumentSchema }]),
    PlanEntitlementsModule,
  ],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
