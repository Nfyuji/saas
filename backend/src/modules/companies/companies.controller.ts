import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsOptional, IsString } from 'class-validator';

class UpdateProfileDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() industry?: string;
}

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Get('me')
  getMyCompany(@CurrentUser('companyId') companyId: string) {
    return this.companiesService.findOne(companyId);
  }

  @Put('me')
  updateProfile(@CurrentUser('companyId') companyId: string, @Body() dto: UpdateProfileDto) {
    return this.companiesService.updateProfile(companyId, dto);
  }

  @Put('me/settings')
  updateSettings(@CurrentUser('companyId') companyId: string, @Body() settings: Record<string, unknown>) {
    return this.companiesService.updateSettings(companyId, settings);
  }
}
