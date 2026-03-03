import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { SubscriptionWebhookLog } from '../subscription/entity/subscription-webhook-log.entity';
import { Subscription } from '../subscription/entity/subscription.entity';
import { User } from '../user/entity/user.entity';
import { Plan } from '../plan/entity/plan.entity';
import { SubscriptionHistoryService } from '../subscription/subscription-history.service';
import { SubscriptionHistoryEvent } from '../subscription/enums/subscription-history-event.enum';
import { UserStatus } from '../user/enums/user-status.enum';
import { SubscriptionStatus } from '../subscription/enums/subscription-status.enum';
import { StripeService } from './stripe.service';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(
    @InjectRepository(SubscriptionWebhookLog)
    private readonly webhookLogRepo: Repository<SubscriptionWebhookLog>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    private readonly subscriptionHistoryService: SubscriptionHistoryService,
    private readonly stripeService: StripeService,
  ) {}

  async handleEvent(event: Stripe.Event): Promise<void> {
    const eventId = event.id;
    const eventType = event.type;

    try {
      // Idempotency: skip if already processed
      const existing = await this.webhookLogRepo.findOne({
        where: { stripeEventId: eventId },
      });
      if (existing) {
        this.logger.log(`Skipping duplicate webhook event: ${eventId}`);
        return;
      }

      console.log("Event triggered:", eventType);

      switch (eventType) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event);
          break;
        case 'invoice.paid':
          await this.handleInvoicePaid(event);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event);
          break;
        case 'setup_intent.succeeded':
          await this.handleSetupIntentSucceeded(event);
          break;
        default:
          this.logger.log(`Unhandled webhook event type: ${eventType}`);
      }
    } catch (err) {
      const message = this.extractErrorMessage(err);
      this.logger.error(
        `Webhook event ${eventId} (${eventType}) failed: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    } finally {
      await this.logWebhookEvent(eventId, eventType, event);
    }
  }

  private async handleSubscriptionCreated(event: Stripe.Event): Promise<void> {
    try {
      const stripeSub = event.data.object as Stripe.Subscription;
      const stripeSubscriptionId = stripeSub.id;
      const userId = stripeSub.metadata?.user_id;
      const planId = stripeSub.metadata?.plan_id;

      if (!userId || !planId) {
        this.logger.warn(
          `Subscription ${stripeSubscriptionId} missing user_id or plan_id in metadata`,
        );
        return;
      }

      const { start: periodStart, end: periodEnd } =
        this.extractSubPeriodDates(stripeSub);

      const existing = await this.subscriptionRepo.findOne({
        where: { stripeSubscriptionId },
      });

      if (existing) {
        const mappedStatus = this.mapStripeStatus(stripeSub.status);
        if (existing.status !== mappedStatus) {
          await this.subscriptionRepo.update(existing.id, {
            status: mappedStatus,
            currentPeriodStart: new Date(periodStart * 1000),
            currentPeriodEnd: new Date(periodEnd * 1000),
            cancelAtPeriodEnd: stripeSub.cancel_at_period_end ?? false,
          } as any);
        }
        return;
      }

      const customerId = stripeSub.customer as string;
      await this.subscriptionRepo.insert({
        userId,
        planId,
        stripeSubscriptionId,
        stripeCustomerId: customerId,
        status: this.mapStripeStatus(stripeSub.status),
        currentPeriodStart: new Date(periodStart * 1000),
        currentPeriodEnd: new Date(periodEnd * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end ?? false,
      } as any);

      const inserted = await this.subscriptionRepo.findOne({
        where: { stripeSubscriptionId },
      });
      if (inserted) {
        await this.subscriptionHistoryService.record(
          this.subscriptionHistoryService.snapshotFromSubscription(inserted),
          SubscriptionHistoryEvent.CREATED,
        );
      }
    } catch (err) {
      const message = this.extractErrorMessage(err);
      this.logger.error(
        `handleSubscriptionCreated failed: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  private async handleInvoicePaid(event: Stripe.Event): Promise<void> {
    try {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string;
      };
      const subscriptionId = invoice.subscription ?? null;

      if (!subscriptionId) {
        this.logger.log(`Invoice ${invoice.id} has no subscription - skipping`);
        return;
      }

      const sub = await this.subscriptionRepo.findOne({
        where: { stripeSubscriptionId: subscriptionId },
        relations: ['user'],
      });

      if (!sub) {
        this.logger.warn(
          `Subscription ${subscriptionId} not found for invoice.paid`,
        );
        return;
      }

      const wasPastDue = sub.status === SubscriptionStatus.PAST_DUE;
      const isRenewal =
        !wasPastDue && sub.status === SubscriptionStatus.ACTIVE;

      await this.subscriptionRepo.update(sub.id, {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: invoice.period_start
          ? new Date(invoice.period_start * 1000)
          : sub.currentPeriodStart,
        currentPeriodEnd: invoice.period_end
          ? new Date(invoice.period_end * 1000)
          : sub.currentPeriodEnd,
      });

      await this.userRepo.update(sub.userId, { status: UserStatus.ACTIVE });

      if (wasPastDue || isRenewal) {
        const updatedSub = await this.subscriptionRepo.findOne({
          where: { id: sub.id },
        });
        if (updatedSub) {
          await this.subscriptionHistoryService.record(
            this.subscriptionHistoryService.snapshotFromSubscription(updatedSub),
            wasPastDue
              ? SubscriptionHistoryEvent.RECOVERED
              : SubscriptionHistoryEvent.RENEWED,
          );
        }
      }

      this.logger.log(
        `Activated user ${sub.userId} and subscription ${sub.id} via invoice.paid${wasPastDue ? ' (recovered from past_due)' : isRenewal ? ' (renewed)' : ''}`,
      );
    } catch (err) {
      const message = this.extractErrorMessage(err);
      this.logger.error(
        `handleInvoicePaid failed: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  private async handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
    try {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string;
      };
      const subscriptionId = invoice.subscription ?? null;

      if (!subscriptionId) return;

      const sub = await this.subscriptionRepo.findOne({
        where: { stripeSubscriptionId: subscriptionId },
      });

      if (!sub) return;

      await this.subscriptionHistoryService.record(
        this.subscriptionHistoryService.snapshotFromSubscription(sub),
        SubscriptionHistoryEvent.PAST_DUE,
      );

      await this.subscriptionRepo.update(sub.id, {
        status: SubscriptionStatus.PAST_DUE,
      });
      this.logger.log(`Set subscription ${sub.id} to PAST_DUE`);
    } catch (err) {
      const message = this.extractErrorMessage(err);
      this.logger.error(
        `handleInvoicePaymentFailed failed: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  private async handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
    try {
      const stripeSub = event.data.object as Stripe.Subscription;
      const stripeSubscriptionId = stripeSub.id;

      const sub = await this.subscriptionRepo.findOne({
        where: { stripeSubscriptionId },
        relations: ['plan'],
      });

      if (!sub) {
        this.logger.warn(
          `Subscription ${stripeSubscriptionId} not found for customer.subscription.updated`,
        );
        return;
      }

      const { start: periodStart, end: periodEnd } =
        this.extractSubPeriodDates(stripeSub);
      const mappedStatus = this.mapStripeStatus(stripeSub.status);
      const cancelAtPeriodEnd = stripeSub.cancel_at_period_end ?? false;

      // Resolve plan from Stripe price if subscription items changed
      const priceId = this.extractPriceId(stripeSub);
      let newPlanId: string | null = null;
      if (priceId) {
        const plan = await this.planRepo.findOne({
          where: { stripePriceId: priceId },
        });
        if (plan && plan.id !== sub.planId) {
          newPlanId = plan.id;
        }
      }

      const planChanged = newPlanId !== null;
      if (planChanged) {
        await this.subscriptionHistoryService.record(
          this.subscriptionHistoryService.snapshotFromSubscription(sub),
          SubscriptionHistoryEvent.PLAN_CHANGED,
        );
      }

      await this.subscriptionRepo.update(sub.id, {
        status: mappedStatus,
        currentPeriodStart: new Date(periodStart * 1000),
        currentPeriodEnd: new Date(periodEnd * 1000),
        cancelAtPeriodEnd,
        ...(newPlanId && { planId: newPlanId }),
      } as any);

      this.logger.log(
        `Updated subscription ${sub.id} (status=${mappedStatus}, cancelAtPeriodEnd=${cancelAtPeriodEnd}${planChanged ? ', plan changed' : ''})`,
      );
    } catch (err) {
      const message = this.extractErrorMessage(err);
      this.logger.error(
        `handleSubscriptionUpdated failed: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  /**
   * When a customer adds a payment method via SetupIntent, check if they have a past_due
   * subscription (e.g. trial ended with no payment method). If so, pay the open invoice.
   * Subsequent invoice.paid / invoice.payment_failed / customer.subscription.updated
   * webhooks will update subscription and user state.
   */
  private async handleSetupIntentSucceeded(event: Stripe.Event): Promise<void> {
    try {
      const setupIntent = event.data.object as Stripe.SetupIntent;
      const customerId =
        typeof setupIntent.customer === 'string'
          ? setupIntent.customer
          : setupIntent.customer?.id;
      const paymentMethodId =
        typeof setupIntent.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent.payment_method?.id;

      if (!customerId) {
        this.logger.log(
          `SetupIntent ${setupIntent.id} has no customer - skipping`,
        );
        return;
      }

      if (!paymentMethodId) {
        this.logger.warn(
          `SetupIntent ${setupIntent.id} has no payment_method - cannot pay invoice`,
        );
        return;
      }

      const pastDueSub = await this.subscriptionRepo.findOne({
        where: {
          stripeCustomerId: customerId,
          status: SubscriptionStatus.PAST_DUE,
        },
      });

      if (!pastDueSub) {
        this.logger.debug(
          `Customer ${customerId} has no past_due subscription - skipping invoice pay`,
        );
        return;
      }

      const openInvoice = await this.stripeService.getLatestOpenInvoice(
        customerId,
      );

      if (!openInvoice) {
        this.logger.log(
          `No open invoice for customer ${customerId} (subscription ${pastDueSub.id}) - skipping`,
        );
        return;
      }

      if (openInvoice.status !== 'open') {
        this.logger.log(
          `Invoice ${openInvoice.id} is not open (status=${openInvoice.status}) - skipping`,
        );
        return;
      }

      await this.stripeService.payInvoice(
        openInvoice.id,
        paymentMethodId,
      );

      this.logger.log(
        `Triggered payment for invoice ${openInvoice.id} (customer ${customerId}, subscription ${pastDueSub.id}). Awaiting invoice.paid / invoice.payment_failed webhooks.`,
      );
    } catch (err) {
      const message = this.extractErrorMessage(err);
      this.logger.error(
        `handleSetupIntentSucceeded failed: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  private async handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
    try {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeSubscriptionId = subscription.id;

      const sub = await this.subscriptionRepo.findOne({
        where: { stripeSubscriptionId },
        relations: ['plan'],
      });

      if (!sub) return;

      await this.subscriptionHistoryService.record(
        this.subscriptionHistoryService.snapshotFromSubscription(sub),
        SubscriptionHistoryEvent.CANCELED,
      );

      await this.subscriptionRepo.update(sub.id, {
        status: SubscriptionStatus.CANCELED,
      });
      this.logger.log(`Set subscription ${sub.id} to CANCELED`);
    } catch (err) {
      const message = this.extractErrorMessage(err);
      this.logger.error(
        `handleSubscriptionDeleted failed: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw err;
    }
  }

  private async logWebhookEvent(
    eventId: string,
    eventType: string,
    event: Stripe.Event,
  ): Promise<void> {
    try {
      await this.webhookLogRepo.upsert(
        {
          stripeEventId: eventId,
          eventType,
          payload: JSON.parse(JSON.stringify(event)),
        } as any,
        {
          conflictPaths: ['stripeEventId'],
          skipUpdateIfNoValuesChanged: true,
        },
      );
    } catch (err) {
      this.logger.error(
        `Failed to log webhook event ${eventId}: ${this.extractErrorMessage(err)}`,
      );
    }
  }

  /**
   * Extracts price ID from the first subscription item.
   * Price can be a string ID or an expanded Price object.
   */
  private extractPriceId(stripeSub: Stripe.Subscription): string | null {
    const items = stripeSub.items?.data;
    const firstItem = items?.[0];
    if (!firstItem?.price) return null;
    const price = firstItem.price;
    return typeof price === 'string' ? price : price.id;
  }

  /**
   * Extracts current_period_start and current_period_end from Stripe subscription.
   * Stripe API 2026+ may have these on subscription items instead of the subscription root.
   */
  private extractSubPeriodDates(stripeSub: Stripe.Subscription): {
    start: number;
    end: number;
  } {
    const sub = stripeSub as unknown as Record<string, unknown>;
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

  private extractErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'object' && err !== null && 'message' in err) {
      return String((err as { message: unknown }).message);
    }
    return String(err);
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
    return map[stripeStatus] ?? SubscriptionStatus.INCOMPLETE;
  }
}
