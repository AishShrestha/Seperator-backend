import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Subscription } from './entity/subscription.entity';
import { Plan } from '../plan/entity/plan.entity';
import { User } from '../user/entity/user.entity';
import { PlanService } from '../plan/plan.service';
import { UserService } from '../user/services/user/user.service';
import { StripeService } from '../stripe/stripe.service';
import { SubscriptionHistoryService } from './subscription-history.service';
import { SubscriptionStatus } from './enums/subscription-status.enum';
import { SubscriptionHistoryEvent } from './enums/subscription-history-event.enum';
import { getPlanConfigs } from '../config/plan-config';

const ACTIVE_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
];

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    private readonly planService: PlanService,
    private readonly userService: UserService,
    private readonly stripeService: StripeService,
    private readonly subscriptionHistoryService: SubscriptionHistoryService,
    private readonly dataSource: DataSource,
  ) {}

  async createSubscription(
    userId: string,
    planSlug: string,
    paymentMethodId?: string,
  ): Promise<Subscription> {
    const user = await this.userService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const plan = await this.planService.findBySlug(planSlug);
    if (!plan) throw new NotFoundException(`Plan not found: ${planSlug}`);
    if (!plan.stripePriceId) {
      throw new BadRequestException(`Plan ${planSlug} is not configured for billing`);
    }

    const config = getPlanConfigs().find((c) => c.slug === planSlug);
    const trialDays = config?.configuration.billing.is_trial_enabled
      ? config.configuration.billing.trial_days ?? 0
      : 0;

    const existing = await this.findActiveSubscription(userId);
    if (existing) {
      throw new BadRequestException(
        'User already has an active subscription. Cancel or change plan first.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        stripeCustomerId = await this.stripeService.createCustomer({
          email: user.email,
          name: user.name,
          existingCustomerId: user.stripeCustomerId,
        });
        await manager.getRepository(User).update(userId, { stripeCustomerId });
      }

      const stripeSub = await this.stripeService.createSubscription({
        customerId: stripeCustomerId,
        priceId: plan.stripePriceId!,
        paymentMethodId: paymentMethodId ?? undefined,
        trialDays,
        metadata: { user_id: userId, plan_slug: planSlug },
      });

      const { start: periodStart, end: periodEnd } =
        this.extractSubPeriodDates(stripeSub);

      const subscription = manager.create(Subscription, {
        userId,
        planId: plan.id,
        stripeSubscriptionId: stripeSub.id,
        stripeCustomerId,
        status: this.mapStripeStatus(stripeSub.status),
        currentPeriodStart: new Date(periodStart * 1000),
        currentPeriodEnd: new Date(periodEnd * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end ?? false,
      });

      const saved = await manager.save(subscription);
      await this.subscriptionHistoryService.record(
        this.subscriptionHistoryService.snapshotFromSubscription(saved),
        SubscriptionHistoryEvent.CREATED,
      );
      return saved;
    });
  }

  async changePlan(userId: string, newPlanSlug: string): Promise<Subscription> {
    const subscription = await this.findActiveSubscription(userId);
    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    const plan = await this.planService.findBySlug(newPlanSlug);
    if (!plan) throw new NotFoundException(`Plan not found: ${newPlanSlug}`);
    if (!plan.stripePriceId) {
      throw new BadRequestException(`Plan ${newPlanSlug} is not configured for billing`);
    }

    if (subscription.plan.slug === newPlanSlug) {
      throw new BadRequestException(`Already subscribed to ${newPlanSlug}`);
    }

    const stripeSub = await this.stripeService.updateSubscription(
      subscription.stripeSubscriptionId,
      plan.stripePriceId,
    );

    // Record old plan state before overwriting (preserves history)
    await this.subscriptionHistoryService.record(
      this.subscriptionHistoryService.snapshotFromSubscription(subscription),
      SubscriptionHistoryEvent.PLAN_CHANGED,
    );

    const { start: periodStart, end: periodEnd } =
      this.extractSubPeriodDates(stripeSub);
    subscription.planId = plan.id;
    subscription.plan = plan;
    subscription.status = this.mapStripeStatus(stripeSub.status as string);
    subscription.currentPeriodStart = new Date(periodStart * 1000);
    subscription.currentPeriodEnd = new Date(periodEnd * 1000);
    subscription.cancelAtPeriodEnd = stripeSub.cancel_at_period_end ?? false;

    return this.subscriptionRepository.save(subscription);
  }

  async cancelSubscription(
    userId: string,
    atPeriodEnd: boolean = true,
  ): Promise<Subscription> {
    const subscription = await this.findActiveSubscription(userId);
    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    const stripeSub = await this.stripeService.cancelSubscription(
      subscription.stripeSubscriptionId,
      atPeriodEnd,
    );

    subscription.status = this.mapStripeStatus(stripeSub.status as string);
    subscription.cancelAtPeriodEnd = stripeSub.cancel_at_period_end ?? false;

    const saved = await this.subscriptionRepository.save(subscription);

    // Record cancellation when subscription is actually canceled
    if (saved.status === SubscriptionStatus.CANCELED) {
      await this.subscriptionHistoryService.record(
        this.subscriptionHistoryService.snapshotFromSubscription(saved),
        SubscriptionHistoryEvent.CANCELED,
      );
    }

    return saved;
  }

  /**
   * Attaches a payment method to the user's Stripe customer and sets it as default.
   * Called post-signup when frontend collects payment details via Stripe Elements.
   * Webhooks will update subscription state when invoices are paid.
   */
  async attachPaymentMethod(
    userId: string,
    paymentMethodId: string,
  ): Promise<{ message: string }> {
    const user = await this.userService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!user.stripeCustomerId) {
      throw new BadRequestException(
        'No Stripe customer found. Complete registration first.',
      );
    }

    await this.stripeService.attachPaymentMethodToCustomer(
      user.stripeCustomerId,
      paymentMethodId,
    );

    return {
      message:
        'Payment method attached successfully. Future invoices will use this method.',
    };
  }

  async getCurrentSubscription(userId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: {
        userId,
        status: In(ACTIVE_STATUSES),
      },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Returns subscription history for the user (plan changes, cancellations, etc.).
   */
  async getSubscriptionHistory(userId: string, limit = 50) {
    return this.subscriptionHistoryService.findByUserId(userId, limit);
  }

  private async findActiveSubscription(userId: string): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: {
        userId,
        status: In(ACTIVE_STATUSES),
      },
      relations: ['plan'],
    });
  }

  private extractSubPeriodDates(stripeSub: unknown): {
    start: number;
    end: number;
  } {
    const sub = stripeSub as Record<string, unknown>;
    let start = sub.current_period_start as number | undefined;
    let end = sub.current_period_end as number | undefined;

    if (
      (start == null || !Number.isFinite(start) || Number.isNaN(start)) &&
      sub.items
    ) {
      const items = (sub.items as {
        data?: Array<{
          current_period_start?: number;
          current_period_end?: number;
        }>;
      })?.data;
      const firstItem = items?.[0];
      if (firstItem) {
        start = firstItem.current_period_start;
        end = firstItem.current_period_end;
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const oneMonthLater = now + 30 * 24 * 60 * 60;
    const resultStart =
      start != null && Number.isFinite(start) && !Number.isNaN(start)
        ? start
        : now;
    const resultEnd =
      end != null && Number.isFinite(end) && !Number.isNaN(end)
        ? end
        : oneMonthLater;
    return { start: resultStart, end: resultEnd };
  }

  private mapStripeStatus(stripeStatus: string): SubscriptionStatus {
    const map: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      canceled: SubscriptionStatus.CANCELED,
      incomplete: SubscriptionStatus.INCOMPLETE,
      incomplete_expired: SubscriptionStatus.INCOMPLETE_EXPIRED,
      past_due: SubscriptionStatus.PAST_DUE,
      paused: SubscriptionStatus.PAUSED,
      trialing: SubscriptionStatus.TRIALING,
      unpaid: SubscriptionStatus.UNPAID,
    };
    return map[stripeStatus] ?? SubscriptionStatus.ACTIVE;
  }
}
