import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FollowUpsService } from './followups.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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
}
