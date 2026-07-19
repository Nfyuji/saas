import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionAlertsService } from './subscription-alerts.service';
import { Company, CompanySchema } from '../../schemas/company.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import {
  SubscriptionAlert,
  SubscriptionAlertSchema,
} from '../../schemas/subscription-alert.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: User.name, schema: UserSchema },
      { name: SubscriptionAlert.name, schema: SubscriptionAlertSchema },
    ]),
  ],
  providers: [SubscriptionAlertsService],
  exports: [SubscriptionAlertsService],
})
export class SubscriptionAlertsModule {}
