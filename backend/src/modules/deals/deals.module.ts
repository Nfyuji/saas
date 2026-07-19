import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';
import { Deal, DealSchema } from '../../schemas/deal.schema';
import { Customer, CustomerSchema } from '../../schemas/customer.schema';
import { FollowUpsModule } from '../followups/followups.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Deal.name, schema: DealSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
    forwardRef(() => FollowUpsModule),
  ],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
