import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './entity/plan.entity';
import { getPlanConfigs, PlanConfigItem } from '../config/plan-config';
import { PlanConfiguration } from '../config/plan-config';

export interface SyncPlanResult {
  slug: string;
  created: boolean;
  updated: boolean;
  error?: string;
}

@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name);

  constructor(
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
  ) {}

  /**
   * Sync plans from config to database.
   * Config is the source of truth - creates or updates plans by slug.
   */
  async syncPlansFromConfig(): Promise<{
    created: number;
    updated: number;
    errors: number;
    results: SyncPlanResult[];
  }> {
    const configs = getPlanConfigs();
    const results: SyncPlanResult[] = [];
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const config of configs) {
      try {
        const result = await this.upsertPlanFromConfig(config);
        results.push(result);
        if (result.created) created++;
        else if (result.updated) updated++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Sync plan ${config.slug} failed: ${message}`, err instanceof Error ? err.stack : undefined);
        results.push({
          slug: config.slug,
          created: false,
          updated: false,
          error: message,
        });
        errors++;
      }
    }

    return { created, updated, errors, results };
  }

  /**
   * Upsert a single plan from config.
   */
  private async upsertPlanFromConfig(config: PlanConfigItem): Promise<SyncPlanResult> {
    const existing = await this.planRepository.findOne({
      where: { slug: config.slug },
    });

    const planData = {
      name: config.name,
      description: config.description,
      planConfiguration: config.configuration as PlanConfiguration,
      stripePlanId: config.stripe_plan_id,
      stripePriceId: config.stripe_price_id,
    };

    if (!existing) {
      await this.planRepository.save({
        ...planData,
        slug: config.slug,
      });
      this.logger.log(`Plan created: ${config.slug}`);
      return { slug: config.slug, created: true, updated: false };
    }

    await this.planRepository.update(
      { id: existing.id },
      planData,
    );
    this.logger.log(`Plan updated: ${config.slug}`);
    return { slug: config.slug, created: false, updated: true };
  }

  /**
   * Update Stripe IDs for a plan after Stripe sync.
   */
  async updateStripeIds(
    slug: string,
    productId: string | null,
    priceId: string | null,
  ): Promise<Plan> {
    const plan = await this.planRepository.findOne({ where: { slug } });
    if (!plan) {
      throw new NotFoundException(`Plan not found: ${slug}`);
    }

    const updateData: Partial<Plan> = {};
    if (productId != null) updateData.stripePlanId = productId;
    if (priceId != null) updateData.stripePriceId = priceId;

    await this.planRepository.update({ id: plan.id }, updateData);
    return this.planRepository.findOneOrFail({ where: { slug } });
  }

  /**
   * Find plan by slug.
   */
  async findBySlug(slug: string): Promise<Plan | null> {
    return this.planRepository.findOne({ where: { slug } });
  }

  /**
   * Find all plans.
   */
  async findAll(): Promise<Plan[]> {
    return this.planRepository.find({
      order: { slug: 'ASC' },
    });
  }

  /**
   * Get plans for sync - returns configs with DB stripe IDs merged.
   */
  async getPlansWithStripeIds(): Promise<PlanConfigItem[]> {
    const configs = getPlanConfigs();
    const plans = await this.planRepository.find({
      where: configs.map((c) => ({ slug: c.slug })),
    });
    const planMap = new Map(plans.map((p) => [p.slug, p]));

    return configs.map((config) => {
      const plan = planMap.get(config.slug);
      return {
        ...config,
        stripe_plan_id: plan?.stripePlanId ?? config.stripe_plan_id,
        stripe_price_id: plan?.stripePriceId ?? config.stripe_price_id,
      };
    });
  }
}
