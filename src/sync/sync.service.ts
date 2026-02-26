import { Injectable, Logger } from '@nestjs/common';
import { PlanService } from '../plan/plan.service';
import { StripeService } from '../stripe/stripe.service';
import { getPlanConfigs } from '../config/plan-config';

export interface SyncPlansResponse {
  plans: {
    created: number;
    updated: number;
    errors: number;
  };
  stripe: Array<{
    slug: string;
    product_id: string;
    price_id: string;
  }>;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly planService: PlanService,
    private readonly stripeService: StripeService,
  ) {}

  /**
   * Full sync: Config → DB → Stripe.
   * Does not fail entire sync if one plan fails.
   */
  async syncAllWithStripe(): Promise<SyncPlansResponse> {
    const planSyncResult = await this.planService.syncPlansFromConfig();
    const stripeResults = await this.syncPlansToStripe();

    return {
      plans: {
        created: planSyncResult.created,
        updated: planSyncResult.updated,
        errors: planSyncResult.errors,
      },
      stripe: stripeResults,
    };
  }

  /**
   * Sync all plans to Stripe
   */
  private async syncPlansToStripe(): Promise<SyncPlansResponse['stripe']> {
    const configs = getPlanConfigs();
    const plansWithIds = await this.planService.getPlansWithStripeIds();
    const results: SyncPlansResponse['stripe'] = [];

    

    for (const config of configs) {
      const billingCycle = config.configuration.billing.billing_cycle;
      if (!billingCycle) {
        this.logger.warn(`Skipping ${config.slug}: no billing_cycle defined`);
        continue;
      }

      try {
        const planData = plansWithIds.find((p) => p.slug === config.slug);
        const result = await this.stripeService.ensureProductAndPrice({
          productName: config.name,
          planSlug: config.slug,
          amount: config.configuration.billing.price,
          currency: config.configuration.billing.currency,
          billingCycle,
          existingProductId: planData?.stripe_plan_id ?? null,
          existingPriceId: planData?.stripe_price_id ?? null,
        });

        console.log("result",result)

        await this.planService.updateStripeIds(
          config.slug,
          result.productId,
          result.priceId,
        );

        results.push({
          slug: config.slug,
          product_id: result.productId,
          price_id: result.priceId,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Stripe sync failed for ${config.slug}: ${message}`,
          err instanceof Error ? err.stack : undefined,
        );
      }
    }

    return results;
  }
}
