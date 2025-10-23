import { Controller, Get, Req, UseGuards, Param, Patch } from '@nestjs/common';
import { NotificationService } from './notification.service';

import { Request } from 'express';
import { Auth } from 'src/common/decorator/auth.decorator';

@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Auth()
  @Get()
  async getMyNotifications(@Req() req: Request) {
    const user = req.user as any;
    return this.notificationService.findForUser(user.id);
  }

  @Patch(':id/read')
  async markRead(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.notificationService.markAsRead(id, user.id);
  }
}
