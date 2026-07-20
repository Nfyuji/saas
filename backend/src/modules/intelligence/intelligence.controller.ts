import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { IsArray, IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IntelligenceService } from './intelligence.service';

class SocialDto {
  @IsString() channel!: string;
  @IsString() @MinLength(2) displayName!: string;
  @IsOptional() @IsString() handle?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsBoolean() inboxEnabled?: boolean;
  @IsOptional() @IsBoolean() postingEnabled?: boolean;
}

class ContentDto {
  @IsString() @MinLength(2) topic!: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsString() channel?: string;
  @IsOptional() @IsString() tone?: string;
}

class CompetitorDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() website?: string;
  @IsOptional() @IsArray() channels?: string[];
  @IsOptional() @IsString() notes?: string;
}

class CampaignFilterDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @IsBoolean() purchasedOnly?: boolean;
  @IsOptional() @IsBoolean() dryRun?: boolean;
}

@Controller('intelligence')
@UseGuards(JwtAuthGuard)
export class IntelligenceController {
  constructor(private intelligence: IntelligenceService) {}

  @Get('executive')
  executive(@CurrentUser('companyId') companyId: string) {
    return this.intelligence.executiveBriefing(companyId);
  }

  @Get('forecast')
  forecast(@CurrentUser('companyId') companyId: string) {
    return this.intelligence.salesForecast(companyId);
  }

  @Get('workflows/suggest')
  suggestWorkflows(@CurrentUser('companyId') companyId: string) {
    return this.intelligence.suggestWorkflows(companyId);
  }

  @Get('social')
  listSocial(@CurrentUser('companyId') companyId: string) {
    return this.intelligence.listSocial(companyId);
  }

  @Post('social')
  addSocial(@CurrentUser('companyId') companyId: string, @Body() dto: SocialDto) {
    return this.intelligence.upsertSocial(companyId, dto);
  }

  @Delete('social/:id')
  removeSocial(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.intelligence.removeSocial(companyId, id);
  }

  @Get('content')
  listContent(@CurrentUser('companyId') companyId: string) {
    return this.intelligence.listContent(companyId);
  }

  @Post('content/generate')
  generateContent(@CurrentUser('companyId') companyId: string, @Body() dto: ContentDto) {
    return this.intelligence.generateContent(companyId, dto);
  }

  @Put('content/:id/publish')
  publishContent(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.intelligence.markContentPublished(companyId, id);
  }

  @Post('content/:id/whatsapp-campaign')
  contentCampaign(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: CampaignFilterDto,
  ) {
    return this.intelligence.sendContentAsWhatsAppCampaign(companyId, userId, id, dto);
  }

  @Delete('content/:id')
  deleteContent(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.intelligence.deleteContent(companyId, id);
  }

  @Get('competitors')
  listCompetitors(@CurrentUser('companyId') companyId: string) {
    return this.intelligence.listCompetitors(companyId);
  }

  @Post('competitors')
  addCompetitor(@CurrentUser('companyId') companyId: string, @Body() dto: CompetitorDto) {
    return this.intelligence.addCompetitor(companyId, dto);
  }

  @Post('competitors/:id/analyze')
  analyze(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.intelligence.analyzeCompetitor(companyId, id);
  }

  @Delete('competitors/:id')
  removeCompetitor(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.intelligence.removeCompetitor(companyId, id);
  }
}
