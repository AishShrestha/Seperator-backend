import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entity/user.entity';
import { Plan } from '../../plan/entity/plan.entity';
import { SubscriptionStatus } from '../enums/subscription-status.enum';

@Entity({
  name: 'subscriptions',
})
@Index('IDX_subscriptions_user_id', ['userId'])
@Index('IDX_subscriptions_stripe_subscription_id', ['stripeSubscriptionId'])
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'plan_id', type: 'uuid' })
  planId: string;

  @Column({ name: 'stripe_subscription_id', type: 'varchar', length: 255, unique: true })
  stripeSubscriptionId: string;

  @Column({ name: 'stripe_customer_id', type: 'varchar', length: 255 })
  stripeCustomerId: string;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Plan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'plan_id' })
  plan: Plan;
}
