import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { Invoice, InvoiceSchema } from '../../schemas/invoice.schema';
import { Customer, CustomerSchema } from '../../schemas/customer.schema';
import { Deal, DealSchema } from '../../schemas/deal.schema';
import { PlanEntitlementsModule } from '../../common/services/plan-entitlements.module';
import { FollowUpsModule } from '../followups/followups.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Deal.name, schema: DealSchema },
    ]),
    PlanEntitlementsModule,
    forwardRef(() => FollowUpsModule),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
