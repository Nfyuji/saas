import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FollowUpsController } from './followups.controller';
import { FollowUpsService } from './followups.service';
import { FollowUp, FollowUpSchema } from '../../schemas/followup.schema';
import { Deal, DealSchema } from '../../schemas/deal.schema';
import { Customer, CustomerSchema } from '../../schemas/customer.schema';
import { Company, CompanySchema } from '../../schemas/company.schema';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { AiModule } from '../ai/ai.module';
import { PlanEntitlementsModule } from '../../common/services/plan-entitlements.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FollowUp.name, schema: FollowUpSchema },
      { name: Deal.name, schema: DealSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    forwardRef(() => WhatsappModule),
    AiModule,
    PlanEntitlementsModule,
  ],
  controllers: [FollowUpsController],
  providers: [FollowUpsService],
  exports: [FollowUpsService],
})
export class FollowUpsModule {}
