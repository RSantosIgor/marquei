import { Controller, Get, Patch, Param } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('my')
  @Roles(Role.CLIENT, Role.PROFESSIONAL)
  async findMyNotifications(@CurrentUser('sub') userId: string) {
    return this.notificationsService.findMyNotifications(userId);
  }

  @Patch(':id/read')
  @Roles(Role.CLIENT, Role.PROFESSIONAL)
  async markRead(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    await this.notificationsService.markRead(userId, id);
    return { data: { success: true } };
  }
}
