import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { Company, CompanySchema } from '../../schemas/company.schema';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { AutomationModule } from '../automation/automation.module';
import { PlansModule } from '../plans/plans.module';
import { PlanEntitlementsModule } from '../../common/services/plan-entitlements.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Company.name, schema: CompanySchema }]),
    KnowledgeModule,
    AutomationModule,
    PlansModule,
    PlanEntitlementsModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
