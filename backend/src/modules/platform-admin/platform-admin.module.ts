import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlatformAdminController } from './platform-admin.controller';
import { PlatformAdminService } from './platform-admin.service';
import { Company, CompanySchema } from '../../schemas/company.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { Customer, CustomerSchema } from '../../schemas/customer.schema';
import { Message, MessageSchema } from '../../schemas/message.schema';
import { Invoice, InvoiceSchema } from '../../schemas/invoice.schema';
import {
  PlatformSettings,
  PlatformSettingsSchema,
} from '../../schemas/platform-settings.schema';
import { AdminAudit, AdminAuditSchema } from '../../schemas/admin-audit.schema';
import {
  SubscriptionInvoice,
  SubscriptionInvoiceSchema,
} from '../../schemas/subscription-invoice.schema';
import { PlansModule } from '../plans/plans.module';
import { PlanEntitlementsModule } from '../../common/services/plan-entitlements.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: User.name, schema: UserSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Message.name, schema: MessageSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: PlatformSettings.name, schema: PlatformSettingsSchema },
      { name: AdminAudit.name, schema: AdminAuditSchema },
      { name: SubscriptionInvoice.name, schema: SubscriptionInvoiceSchema },
    ]),
    PlansModule,
    PlanEntitlementsModule,
    AuthModule,
  ],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService],
})
export class PlatformAdminModule {}
