import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PlatformAdminService } from './platform-admin.service';
import { AiService } from '../ai/ai.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

class SetPlanDto {
  @IsString() planId!: string;
  @IsOptional() @IsNumber() days?: number;
}
class SetActiveDto {
  @IsBoolean() isActive!: boolean;
  @IsOptional() @IsString() reason?: string;
}
class ExtendDto {
  @IsNumber() days!: number;
}
class NotesDto {
  @IsString() notes!: string;
}
class CreateSubscriberDto {
  @IsString() companyName!: string;
  @IsString() ownerName!: string;
  @IsString() email!: string;
  @IsString() @MinLength(6) password!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() plan?: string;
  @IsOptional() @IsString() sector?: string;
  @IsOptional() @IsNumber() days?: number;
}
class ResetPasswordDto {
  @IsString() @MinLength(6) password!: string;
}
class PlanDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() price?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsArray() features?: string[];
  @IsOptional() @IsObject() limits?: Record<string, number>;
  @IsOptional() @IsBoolean() popular?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() visibleToCustomers?: boolean;
  @IsOptional() @IsNumber() sortOrder?: number;
  @IsOptional() @IsBoolean() salesAgentEnabled?: boolean;
  @IsOptional() @IsBoolean() autoFollowUp?: boolean;
  @IsOptional() @IsBoolean() invoicesEnabled?: boolean;
  @IsOptional() @IsBoolean() knowledgeEnabled?: boolean;
  @IsOptional() @IsBoolean() opportunitiesEnabled?: boolean;
}
class TogglePlanDto {
  @IsString() field!: 'isActive' | 'visibleToCustomers' | 'popular';
}
class AiKeysDto {
  @IsOptional() @IsString() aiProvider?: string;
  @IsOptional() @IsString() openaiApiKey?: string;
  @IsOptional() @IsString() openaiModel?: string;
  @IsOptional() @IsString() geminiApiKey?: string;
  @IsOptional() @IsString() geminiModel?: string;
  @IsOptional() @IsNumber() openaiMonthlyTokenBudget?: number;
  @IsOptional() @IsNumber() geminiMonthlyTokenBudget?: number;
  @IsOptional() @IsBoolean() aiEnabled?: boolean;
  @IsOptional() @IsBoolean() resetUsage?: boolean;
}
class AiTestDto {
  @IsString() provider!: string;
}

@Controller('platform-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'platform_support', 'platform_finance')
export class PlatformAdminController {
  constructor(
    private platformAdminService: PlatformAdminService,
    private aiService: AiService,
  ) {}

  @Get('overview')
  overview() {
    return this.platformAdminService.overview();
  }

  @Get('reports')
  reports() {
    return this.platformAdminService.reports();
  }

  @Get('subscription-invoices')
  subscriptionInvoices() {
    return this.platformAdminService.listSubscriptionInvoices();
  }

  @Get('export/subscribers.csv')
  async exportSubscribers() {
    const csv = await this.platformAdminService.exportSubscribersCsv();
    return { csv, filename: 'subscribers.csv' };
  }

  @Get('export/users.csv')
  async exportUsers() {
    const csv = await this.platformAdminService.exportUsersCsv();
    return { csv, filename: 'users.csv' };
  }

  @Get('platform-admins')
  @Roles('super_admin')
  platformAdmins() {
    return this.platformAdminService.listPlatformAdmins();
  }

  @Post('platform-admins')
  @Roles('super_admin')
  createPlatformAdmin(
    @Body()
    dto: {
      name: string;
      email: string;
      password: string;
      role: 'super_admin' | 'platform_support' | 'platform_finance';
    },
  ) {
    return this.platformAdminService.createPlatformAdmin(dto);
  }

  // Plans
  @Get('plans')
  plans(): Promise<unknown> {
    return this.platformAdminService.listPlans();
  }

  @Post('plans')
  @Roles('super_admin', 'platform_finance')
  createPlan(@Body() dto: PlanDto) {
    return this.platformAdminService.createPlan(dto);
  }

  @Put('plans/:id')
  @Roles('super_admin', 'platform_finance')
  updatePlan(@Param('id') id: string, @Body() dto: PlanDto) {
    return this.platformAdminService.updatePlan(id, dto);
  }

  @Put('plans/:id/toggle')
  @Roles('super_admin', 'platform_finance')
  togglePlan(@Param('id') id: string, @Body() dto: TogglePlanDto) {
    return this.platformAdminService.togglePlan(id, dto.field);
  }

  @Delete('plans/:id')
  @Roles('super_admin', 'platform_finance')
  deletePlan(@Param('id') id: string) {
    return this.platformAdminService.deletePlan(id);
  }

  // Users
  @Get('users')
  users(@Query('search') search?: string) {
    return this.platformAdminService.listUsers({ search });
  }

  @Put('users/:id/status')
  setUserStatus(@Param('id') id: string, @Body() dto: SetActiveDto) {
    return this.platformAdminService.setUserActive(id, dto.isActive);
  }

  @Get('activity')
  activity(): Promise<unknown> {
    return this.platformAdminService.listActivity();
  }

  // Settings
  @Get('settings')
  @Roles('super_admin')
  getSettings() {
    return this.platformAdminService.getSettings();
  }

  @Put('settings')
  @Roles('super_admin')
  updateSettings(@Body() body: Record<string, unknown>) {
    return this.platformAdminService.updateSettings(body);
  }

  @Get('ai-keys')
  @Roles('super_admin')
  getAiKeys() {
    return this.aiService.getAdminAiStatus();
  }

  @Put('ai-keys')
  @Roles('super_admin')
  updateAiKeys(@Body() dto: AiKeysDto) {
    return this.aiService.updateAdminAiKeys(dto);
  }

  @Post('ai-keys/test')
  @Roles('super_admin')
  testAiKey(@Body() dto: AiTestDto) {
    const provider = dto.provider === 'gemini' ? 'gemini' : 'openai';
    return this.aiService.testProvider(provider);
  }

  // Subscribers
  @Get('subscribers')
  subscribers(
    @Query('search') search?: string,
    @Query('plan') plan?: string,
    @Query('status') status?: string,
  ): Promise<unknown> {
    return this.platformAdminService.listSubscribers({ search, plan, status });
  }

  @Post('subscribers')
  createSubscriber(@Body() dto: CreateSubscriberDto) {
    return this.platformAdminService.createSubscriber(dto);
  }

  @Get('subscribers/:id')
  getOne(@Param('id') id: string) {
    return this.platformAdminService.getSubscriber(id);
  }

  @Put('subscribers/:id/plan')
  setPlan(@Param('id') id: string, @Body() dto: SetPlanDto) {
    return this.platformAdminService.setPlan(id, dto.planId, dto.days ?? 30);
  }

  @Put('subscribers/:id/status')
  setStatus(@Param('id') id: string, @Body() dto: SetActiveDto) {
    return this.platformAdminService.setActive(id, dto.isActive, dto.reason);
  }

  @Put('subscribers/:id/extend')
  extend(@Param('id') id: string, @Body() dto: ExtendDto) {
    return this.platformAdminService.extendSubscription(id, dto.days);
  }

  @Put('subscribers/:id/notes')
  notes(@Param('id') id: string, @Body() dto: NotesDto) {
    return this.platformAdminService.updateCompanyNotes(id, dto.notes);
  }

  @Put('subscribers/:id/reset-password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.platformAdminService.resetOwnerPassword(id, dto.password);
  }

  @Post('subscribers/:id/impersonate')
  @Roles('super_admin', 'platform_support')
  impersonate(@Param('id') id: string) {
    return this.platformAdminService.impersonate(id);
  }

  @Put('subscribers/:id/archive')
  archive(@Param('id') id: string, @Body() body: { archive?: boolean }) {
    return this.platformAdminService.archiveCompany(id, body.archive !== false);
  }

  @Delete('subscribers/:id')
  @Roles('super_admin')
  remove(@Param('id') id: string) {
    return this.platformAdminService.deleteCompany(id);
  }
}

