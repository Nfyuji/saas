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
import { IntelligenceModule } from './modules/intelligence/intelligence.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DeviceBanModule } from './modules/device-ban/device-ban.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri = config.get<string>('MONGODB_URI');
        if (!uri) {
          throw new Error(
            'MONGODB_URI is missing. Add it in Render → Environment (Atlas connection string).',
          );
        }
        return { uri };
      },
    }),
    DeviceBanModule,
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
    IntelligenceModule,
    NotificationsModule,
  ],
})
export class AppModule {}
