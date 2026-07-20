import { Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser('companyId') companyId: string, @Query('limit') limit?: string) {
    return this.notifications.list(companyId, Number(limit) || 40);
  }

  @Get('unread-count')
  unread(@CurrentUser('companyId') companyId: string) {
    return this.notifications.unreadCount(companyId).then((count) => ({ count }));
  }

  @Put('read-all')
  markAll(@CurrentUser('companyId') companyId: string) {
    return this.notifications.markAllRead(companyId);
  }

  @Put(':id/read')
  markOne(@CurrentUser('companyId') companyId: string, @Param('id') id: string) {
    return this.notifications.markRead(companyId, id);
  }
}
