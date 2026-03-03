import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubscriptionHistory } from './entity/subscription-history.entity';
import { Subscription } from './entity/subscription.entity';
import { SubscriptionStatus } from './enums/subscription-status.enum';
import { SubscriptionHistoryEvent } from './enums/subscription-history-event.enum';

export interface SubscriptionSnapshot {
  subscriptionId: string;
  userId: string;
  planId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

@Injectable()
export class SubscriptionHistoryService {
  private readonly logger = new Logger(SubscriptionHistoryService.name);

  constructor(
    @InjectRepository(SubscriptionHistory)
    private readonly historyRepo: Repository<SubscriptionHistory>,
  ) {}

  /**
   * Records a subscription state snapshot into history.
   * Call before overwriting subscription data (e.g. plan change) or when a significant event occurs.
   */
  async record(
    snapshot: SubscriptionSnapshot,
    eventType: SubscriptionHistoryEvent,
  ): Promise<SubscriptionHistory> {
    const record = this.historyRepo.create({
      ...snapshot,
      eventType,
    } as Partial<SubscriptionHistory>);
    const saved = await this.historyRepo.save(record);
    this.logger.debug(
      `Recorded subscription history: ${eventType} for subscription ${snapshot.subscriptionId}`,
    );
    return saved;
  }

  /**
   * Builds a snapshot from a Subscription entity.
   */
  snapshotFromSubscription(sub: Subscription): SubscriptionSnapshot {
    return {
      subscriptionId: sub.id,
      userId: sub.userId,
      planId: sub.planId,
      stripeSubscriptionId: sub.stripeSubscriptionId,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    };
  }

  /**
   * Fetches subscription history for a user, ordered by most recent first.
   */
  async findByUserId(
    userId: string,
    limit = 50,
  ): Promise<SubscriptionHistory[]> {
    return this.historyRepo.find({
      where: { userId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Fetches subscription history for a specific subscription.
   */
  async findBySubscriptionId(
    subscriptionId: string,
    limit = 50,
  ): Promise<SubscriptionHistory[]> {
    return this.historyRepo.find({
      where: { subscriptionId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
