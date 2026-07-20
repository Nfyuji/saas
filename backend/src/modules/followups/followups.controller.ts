import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { FollowUpsService } from './followups.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

class RescheduleDto {
  @IsString() scheduledAt!: string;
}

class CreateFollowUpDto {
  @IsString() customerId!: string;
  @IsString() @MinLength(2) message!: string;
  @IsOptional() @IsString() scheduledAt?: string;
  @IsOptional() @IsString() conversationId?: string;
  @IsOptional() @IsString() dealId?: string;
  @IsOptional() @IsString() type?: string;
}

@Controller('followups')
@UseGuards(JwtAuthGuard)
export class FollowUpsController {
  constructor(private followUpsService: FollowUpsService) {}

  @Get()
  findAll(@CurrentUser('companyId') companyId: string, @Query('status') status?: string) {
    return this.followUpsService.findAll(companyId, status);
  }

  @Get('opportunities')
  opportunities(@CurrentUser('companyId') companyId: string) {
    return this.followUpsService.getOpportunities(companyId);
  }

  @Post()
  create(@CurrentUser('companyId') companyId: string, @Body() dto: CreateFollowUpDto) {
    return this.followUpsService.createManual(companyId, dto);
  }

  @Post(':id/send-now')
  sendNow(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.followUpsService.sendNow(companyId, id);
  }

  @Put(':id/cancel')
  cancel(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.followUpsService.cancelOne(companyId, id);
  }

  @Put(':id/reschedule')
  reschedule(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: RescheduleDto,
  ) {
    return this.followUpsService.reschedule(companyId, id, dto.scheduledAt);
  }
}
