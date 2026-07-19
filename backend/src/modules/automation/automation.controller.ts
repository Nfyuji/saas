import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Automation } from '../../schemas/automation.schema';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

class CreateAutomationDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsString() trigger!: string;
  triggerConfig!: Record<string, unknown>;
  @IsArray() actions!: Array<{ type: string; config: Record<string, unknown> }>;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Controller('automations')
@UseGuards(JwtAuthGuard)
export class AutomationController {
  constructor(private automationService: AutomationService) {}

  @Get()
  findAll(@CurrentUser('companyId') companyId: string) {
    return this.automationService.findAll(companyId);
  }

  @Post()
  create(@CurrentUser('companyId') companyId: string, @Body() dto: CreateAutomationDto) {
    return this.automationService.create(companyId, {
      name: dto.name,
      description: dto.description,
      trigger: dto.trigger as Automation['trigger'],
      triggerConfig: dto.triggerConfig,
      actions: dto.actions as Automation['actions'],
      isActive: dto.isActive,
    });
  }

  @Put(':id/toggle')
  toggle(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.automationService.toggle(companyId, id);
  }

  @Delete(':id')
  remove(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.automationService.remove(companyId, id);
  }
}
