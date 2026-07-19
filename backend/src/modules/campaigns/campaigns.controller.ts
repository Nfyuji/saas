import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CampaignsService } from './campaigns.service';

class BroadcastDto {
  @IsString()
  @MinLength(3)
  message!: string;

  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @IsBoolean() purchasedOnly?: boolean;
  @IsOptional() @IsBoolean() dryRun?: boolean;
}

class PreviewDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @IsBoolean() purchasedOnly?: boolean;
}

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private campaignsService: CampaignsService) {}

  @Post('preview')
  preview(@CurrentUser('companyId') companyId: string, @Body() dto: PreviewDto) {
    return this.campaignsService.previewAudience(companyId, dto);
  }

  @Post('broadcast')
  broadcast(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: BroadcastDto,
  ) {
    return this.campaignsService.broadcast(companyId, userId, dto);
  }
}
