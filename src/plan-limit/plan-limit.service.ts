import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Expense } from '../expense/entity/expense.entity';
import { GroupMember } from '../group/entity/group-member.entity';
import { SubscriptionService } from '../subscription/subscription.service';
import { getPlanConfigs, PlanConfigItem } from '../config/plan-config';
import { PlanLimitException } from './plan-limit.exception';
import { PlanLimitAction } from './enums/plan-limit-action.enum';

const FREE_PLAN_SLUG = 'free';

@Injectable()
export class PlanLimitService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(GroupMember)
    private readonly groupMemberRepository: Repository<GroupMember>,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  /**
   * Validates plan limits for the given action.
   * Throws PlanLimitException if limit exceeded.
   * No-op if plan has unlimited (null) for that limit.
   */
  async assertWithinLimits(
    userId: string,
    action: PlanLimitAction,
    context?: { groupId?: string },
  ): Promise<void> {
    const { planSlug, config } = await this.resolvePlanConfig(userId);

    switch (action) {
      case PlanLimitAction.CREATE_EXPENSE:
        await this.assertExpenseLimit(userId, planSlug, config);
        break;
      case PlanLimitAction.CREATE_GROUP:
        await this.assertGroupLimit(userId, planSlug, config);
        break;
      case PlanLimitAction.ADD_GROUP_MEMBER:
        if (!context?.groupId) {
          throw new Error('groupId required for ADD_GROUP_MEMBER');
        }
        await this.assertMemberLimit(context.groupId, planSlug, config);
        break;
      default:
        throw new Error(`Unknown plan limit action: ${action}`);
    }
  }

  /**
   * Returns the history_days limit for the user's plan.
   * Returns null if unlimited.
   */
  async getHistoryDaysLimit(userId: string): Promise<number | null> {
    const { config } = await this.resolvePlanConfig(userId);
    const limit = config?.configuration?.limits?.history_days;
    return limit != null && Number.isFinite(limit) ? limit : null;
  }

  private async resolvePlanConfig(
    userId: string,
  ): Promise<{ planSlug: string; config: PlanConfigItem | undefined }> {
    const subscription = await this.subscriptionService.getCurrentSubscription(userId);
    const planSlug = subscription?.plan?.slug ?? FREE_PLAN_SLUG;
    const config = getPlanConfigs().find((c) => c.slug === planSlug);
    return { planSlug, config };
  }

  private async assertExpenseLimit(
    userId: string,
    planSlug: string,
    config: PlanConfigItem | undefined,
  ): Promise<void> {
    const limit = config?.configuration?.limits?.max_expenses_per_day;
    if (limit == null || !Number.isFinite(limit)) {
      return; // Unlimited
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await this.expenseRepository.count({
      where: {
        created_by: userId,
        created_at: MoreThanOrEqual(twentyFourHoursAgo),
      },
    });

    if (count >= limit) {
      throw new PlanLimitException({
        code: 'PLAN_LIMIT_REACHED',
        upgrade_required: true,
        current_plan: planSlug,
        message: `${config?.name ?? planSlug} plan allows only ${limit} expenses per 24 hours`,
      });
    }
  }

  private async assertGroupLimit(
    userId: string,
    planSlug: string,
    config: PlanConfigItem | undefined,
  ): Promise<void> {
    const limit = config?.configuration?.limits?.max_groups;
    if (limit == null || !Number.isFinite(limit)) {
      return; // Unlimited
    }

    const count = await this.groupMemberRepository.count({
      where: { user_id: userId },
    });

    if (count >= limit) {
      throw new PlanLimitException({
        code: 'PLAN_LIMIT_REACHED',
        upgrade_required: true,
        current_plan: planSlug,
        message: `${config?.name ?? planSlug} plan allows only ${limit} groups`,
      });
    }
  }

  private async assertMemberLimit(
    groupId: string,
    planSlug: string,
    config: PlanConfigItem | undefined,
  ): Promise<void> {
    const limit = config?.configuration?.limits?.max_members_per_group;
    if (limit == null || !Number.isFinite(limit)) {
      return; // Unlimited
    }

    const count = await this.groupMemberRepository.count({
      where: { group_id: groupId },
    });

    if (count >= limit) {
      throw new PlanLimitException({
        code: 'PLAN_LIMIT_REACHED',
        upgrade_required: true,
        current_plan: planSlug,
        message: `${config?.name ?? planSlug} plan allows only ${limit} members per group`,
      });
    }
  }
}
