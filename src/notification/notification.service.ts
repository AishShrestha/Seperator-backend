import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entity/notification.entity';
import { NotificationGateway } from './notification.gateaway';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private repo: Repository<Notification>,
    private gateway: NotificationGateway,
  ) {}

  async createAndSend(notificationDto: Partial<Notification>) {
    const saved = await this.repo.save(notificationDto);
    // Send via gateway: emit to user room
    this.gateway.sendNotificationToUser(saved.user_id, saved);
    return saved;
  }

  async findForUser(userId: string, limit = 50) {
    return this.repo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    // Optional security check: only owner can mark
    await this.repo.update({ id: notificationId, user_id: userId }, { read: true });
    return this.repo.findOne({ where: { id: notificationId } });
  }
}
