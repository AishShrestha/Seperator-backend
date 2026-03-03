import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateUserDto } from '../../dto/create-user.dto';
import { UserService } from '../user/user.service';
import { PasswordService } from '../password/password.service';
import { PlanService } from '../../../plan/plan.service';
import { StripeService } from '../../../stripe/stripe.service';
import { SubscriptionHistoryService } from '../../../subscription/subscription-history.service';
import { SubscriptionHistoryEvent } from '../../../subscription/enums/subscription-history-event.enum';
import { User } from '../../entity/user.entity';
import { UserRole } from '../../enums/user-role.enum';
import { UserStatus } from '../../enums/user-status.enum';
import { Subscription } from '../../../subscription/entity/subscription.entity';
import { SubscriptionStatus } from '../../../subscription/enums/subscription-status.enum';
import { getPlanConfigs, PlanConfigItem } from '../../../config/plan-config';
import { createHash } from 'crypto';

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    private readonly userService: UserService,
    private readonly passwordService: PasswordService,
    private readonly planService: PlanService,
    private readonly stripeService: StripeService,
    private readonly subscriptionHistoryService: SubscriptionHistoryService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Registers user with subscription. Webhook-driven: user starts PENDING,
   * becomes ACTIVE when invoice.paid fires.
   */
  async registerWithSubscription(dto: CreateUserDto): Promise<{
    user: Partial<User>;
    accessToken: string;
    refreshToken: string;
  }> {
    const email = dto.email.toLowerCase();
    const name = dto.name;

    try {
      const existingUser = await this.userService.isUserExists(email);
      if (existingUser) {
        throw new HttpException('User already exists', HttpStatus.BAD_REQUEST);
      }

      // Step 1 — Validate Plan
      const plan = await this.planService.findById(dto.planId);
      if (!plan) {
        throw new NotFoundException(`Plan not found: ${dto.planId}`);
      }
      if (!plan.stripePriceId) {
        throw new BadRequestException(
          `Plan ${plan.slug} is not configured for billing. Run sync first.`,
        );
      }

      const config = getPlanConfigs().find((c: PlanConfigItem) => c.slug === plan.slug);
      const trialDays = config?.configuration.billing.is_trial_enabled
        ? config.configuration.billing.trial_days ?? 0
        : 0;

      // Step 2 — Create User FIRST (DB Transaction)
      const result = await this.dataSource.transaction(async (manager) => {
        const hashedPassword = await this.passwordService.generate(dto.password);
        const userRepo = manager.getRepository(User);
        const user = userRepo.create({
          email,
          name,
          password: hashedPassword,
          role: UserRole.USER,
          status: UserStatus.PENDING,
          stripeCustomerId: null,
        });
        const savedUser = await userRepo.save(user) as User;
        console.log('user created in db:', savedUser);
        return { user: savedUser };
      });

      const user = result.user;

      const idempotencyKeyCustomer = this.buildIdempotencyKey(
        email,
        dto.planId,
        user.id,
        'customer',
      );
      const idempotencyKeySubscription = this.buildIdempotencyKey(
        email,
        dto.planId,
        user.id,
        'subscription',
      );

      // Step 3 — Create Stripe Customer (after DB commit)
      let stripeCustomerId: string;
      try {
        stripeCustomerId = await this.stripeService.createCustomer({
          email,
          name,
          metadata: {
            user_id: user.id,
            environment: process.env.NODE_ENV ?? 'development',
          },
          idempotencyKey: idempotencyKeyCustomer,
        });
      } catch (err) {
        await this.rollbackOrphanedUser(user.id);
        const message = this.extractErrorMessage(err);
        this.logger.error(`Stripe customer creation failed: ${message}`, err instanceof Error ? err.stack : undefined);
        throw new BadRequestException(`Payment setup failed. Please try again.`);
      }

      try {
        await this.dataSource.getRepository(User).update(user.id, {
          stripeCustomerId,
        });
      } catch (err) {
        await this.rollbackOrphanedUser(user.id);
        const message = this.extractErrorMessage(err);
        this.logger.error(`Failed to update user with Stripe customer ID: ${message}`, err instanceof Error ? err.stack : undefined);
        throw new HttpException('Registration failed. Please try again.', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Step 4 — Create Stripe Subscription (ALL PLANS)
      let stripeSubscriptionId: string;
      let currentPeriodStart: number;
      let currentPeriodEnd: number;
      try {
        const stripeSub = await this.stripeService.createSubscription({
          customerId: stripeCustomerId,
          priceId: plan.stripePriceId,
          trialDays,
          metadata: {
            user_id: user.id,
            plan_id: plan.id,
          },
          idempotencyKey: idempotencyKeySubscription,
        });

        stripeSubscriptionId = stripeSub.id;
        const { start, end } = this.extractSubPeriodDates(stripeSub);
        currentPeriodStart = start;
        currentPeriodEnd = end;
      } catch (err) {
        const message = this.extractErrorMessage(err);
        this.logger.error(`Stripe subscription creation failed: ${message}`, err instanceof Error ? err.stack : undefined);
        await this.rollbackOrphanedUser(user.id);
        throw new BadRequestException(`Payment setup failed. Please try again.`);
      }

      try {
        const subscriptionRepo = this.dataSource.getRepository(Subscription);
        const subscription = subscriptionRepo.create({
          userId: user.id,
          planId: plan.id,
          stripeSubscriptionId,
          stripeCustomerId,
          status: SubscriptionStatus.INCOMPLETE,
          currentPeriodStart: new Date(currentPeriodStart * 1000),
          currentPeriodEnd: new Date(currentPeriodEnd * 1000),
          cancelAtPeriodEnd: false,
        });
        const savedSubscription = await subscriptionRepo.save(subscription);
        await this.subscriptionHistoryService.record(
          this.subscriptionHistoryService.snapshotFromSubscription(
            savedSubscription,
          ),
          SubscriptionHistoryEvent.CREATED,
        );
      } catch (err) {
        const message = this.extractErrorMessage(err);
        this.logger.error(`Failed to save subscription: ${message}`, err instanceof Error ? err.stack : undefined);
        throw new HttpException('Registration failed. Please try again.', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const tokens = await this.userService.generateTokensForUser(user);
      console.log('generated tokens for user:', user.id, tokens);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (err) {
      if (err instanceof HttpException || err instanceof NotFoundException || err instanceof BadRequestException) {
        throw err;
      }
      const message = this.extractErrorMessage(err);
      this.logger.error(`Registration failed: ${message}`, err instanceof Error ? err.stack : undefined);
      throw new HttpException(
        'Registration failed. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async rollbackOrphanedUser(userId: string): Promise<void> {
    try {
      await this.dataSource.getRepository(User).delete(userId);
      this.logger.log(`Rolled back orphaned user ${userId}`);
    } catch (rollbackErr) {
      this.logger.error(
        `Failed to rollback orphaned user ${userId}: ${this.extractErrorMessage(rollbackErr)}`,
      );
    }
  }

  /**
   * Extracts current_period_start and current_period_end from Stripe subscription.
   * Stripe API 2026+ may have these on subscription items (items.data[0]) instead of the subscription root.
   * Falls back to sensible defaults (now, now + 1 month) if not found.
   */
  private extractSubPeriodDates(stripeSub: unknown): { start: number; end: number } {
    const sub = stripeSub as Record<string, unknown>;
    let start = sub.current_period_start as number | undefined;
    let end = sub.current_period_end as number | undefined;

    if (
      (start == null || !Number.isFinite(start) || Number.isNaN(start)) &&
      sub.items
    ) {
      const items = (sub.items as { data?: Array<{ current_period_start?: number; current_period_end?: number }> })
        ?.data;
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

  private buildIdempotencyKey(
    email: string,
    planId: string,
    userId: string,
    suffix: string,
  ): string {
    return createHash('sha256')
      .update(`${email}:${planId}:${userId}:${suffix}`)
      .digest('hex')
      .slice(0, 32);
  }
}
