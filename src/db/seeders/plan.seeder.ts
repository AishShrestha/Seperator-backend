import { DataSource } from 'typeorm';
import { getPlanConfigs } from '../../config/plan-config';
import { Plan } from '../../plan/entity/plan.entity';

/**
 * Seeds plans from config into DB.
 * Uses ON CONFLICT (slug) DO UPDATE.
 * Does NOT call Stripe - Stripe sync is API-triggered via POST /api/sync/plans.
 */
export async function seedPlans(dataSource: DataSource): Promise<void> {
  const planRepository = dataSource.getRepository(Plan);
  const configs = getPlanConfigs();

  for (const config of configs) {
    await planRepository
      .createQueryBuilder()
      .insert()
      .into(Plan)
      .values({
        name: config.name,
        slug: config.slug,
        description: config.description,
        stripeProductId: config.stripe_plan_id,
        stripePriceId: config.stripe_price_id,
        planConfiguration: config.configuration,
      })
      .orUpdate(
        ['name', 'description', 'plan_configuration', 'stripe_product_id', 'stripe_price_id', 'updated_at'],
        ['slug'],
      )
      .execute();
  }
}
