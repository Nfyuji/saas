import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import {
  SubscriptionInvoice,
  SubscriptionInvoiceSchema,
} from '../../schemas/subscription-invoice.schema';
import { Company, CompanySchema } from '../../schemas/company.schema';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubscriptionInvoice.name, schema: SubscriptionInvoiceSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    PlansModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
