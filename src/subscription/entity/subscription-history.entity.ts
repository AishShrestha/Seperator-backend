import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Subscription } from './subscription.entity';
import { User } from '../../user/entity/user.entity';
import { Plan } from '../../plan/entity/plan.entity';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { SubscriptionHistoryEvent } from '../enums/subscription-history-event.enum';

/**
 * Immutable audit log of subscription state changes.
 * Records snapshots when subscriptions are created, plan-changed, or canceled,
 * preserving history that would otherwise be lost when the subscription row is updated.
 */
@Entity({
  name: 'subscription_history',
})
@Index('IDX_subscription_history_subscription_id', ['subscriptionId'])
@Index('IDX_subscription_history_user_id', ['userId'])
@Index('IDX_subscription_history_created_at', ['createdAt'])
export class SubscriptionHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'subscription_id', type: 'uuid' })
  subscriptionId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @Column({ name: 'stripe_subscription_id', type: 'varchar', length: 255 })
  stripeSubscriptionId: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 30,
  })
  status: SubscriptionStatus;

  @Column({
    name: 'current_period_start',
    type: 'timestamp',
  })
  currentPeriodStart: Date;

  @Column({
    name: 'current_period_end',
    type: 'timestamp',
  })
  currentPeriodEnd: Date;

  @Column({
    name: 'cancel_at_period_end',
    type: 'boolean',
    default: false,
  })
  cancelAtPeriodEnd: boolean;

  @Column({
    name: 'event_type',
    type: 'varchar',
    length: 30,
  })
  eventType: SubscriptionHistoryEvent;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Subscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription: Subscription;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Plan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;
}
