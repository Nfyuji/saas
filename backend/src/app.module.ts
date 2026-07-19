import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { AiModule } from './modules/ai/ai.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AutomationModule } from './modules/automation/automation.module';
import { DealsModule } from './modules/deals/deals.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { FollowUpsModule } from './modules/followups/followups.module';
import { BillingModule } from './modules/billing/billing.module';
import { HealthModule } from './modules/health/health.module';
import { PlansModule } from './modules/plans/plans.module';
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SubscriptionAlertsModule } from './modules/subscription-alerts/subscription-alerts.module';
import { TeamModule } from './modules/team/team.module';
import { OutboundWebhooksModule } from './modules/outbound-webhooks/outbound-webhooks.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI', 'mongodb://localhost:27017/businessos'),
      }),
    }),
    AuthModule,
    UsersModule,
    CompaniesModule,
    CustomersModule,
    ConversationsModule,
    MessagesModule,
    WhatsappModule,
    AiModule,
    WebhooksModule,
    DashboardModule,
    AutomationModule,
    DealsModule,
    InvoicesModule,
    KnowledgeModule,
    FollowUpsModule,
    BillingModule,
    HealthModule,
    PlansModule,
    PlatformAdminModule,
    PaymentsModule,
    SubscriptionAlertsModule,
    TeamModule,
    OutboundWebhooksModule,
    CampaignsModule,
  ],
})
export class AppModule {}
