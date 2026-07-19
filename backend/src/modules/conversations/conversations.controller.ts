import { Controller, Get, Put, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IsString } from 'class-validator';

class UpdateStatusDto {
  @IsString() status!: string;
}

class AssignAgentDto {
  @IsString() agentId!: string;
}

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Get()
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query('status') status?: string,
    @Query('channel') channel?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.conversationsService.findAll(companyId, { status, channel, customerId });
  }

  @Get(':id')
  findOne(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.conversationsService.findOne(companyId, id);
  }

  @Get(':id/messages')
  getMessages(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.conversationsService.getMessages(companyId, id, Number(page) || 1, Number(limit) || 50);
  }

  @Put(':id/status')
  updateStatus(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.conversationsService.updateStatus(companyId, id, dto.status);
  }

  @Put(':id/assign')
  assignAgent(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: AssignAgentDto,
  ) {
    return this.conversationsService.assignAgent(companyId, id, dto.agentId);
  }
}
