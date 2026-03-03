import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({
  name: 'subscription_webhook_logs',
})
@Index('IDX_subscription_webhook_logs_stripe_event_id', ['stripeEventId'], {
  unique: true,
})
@Index('IDX_subscription_webhook_logs_event_type', ['eventType'])
export class SubscriptionWebhookLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'stripe_event_id', type: 'varchar', length: 255, unique: true })
  stripeEventId: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  eventType: string;

  @CreateDateColumn({ name: 'processed_at' })
  processedAt: Date;

  @Column({
    name: 'payload',
    type: 'jsonb',
    nullable: true,
  })
  payload: Record<string, unknown> | null;
}
