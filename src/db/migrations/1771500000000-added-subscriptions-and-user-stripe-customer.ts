import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedSubscriptionsAndUserStripeCustomer1771500000000
  implements MigrationInterface
{
  name = 'AddedSubscriptionsAndUserStripeCustomer1771500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "stripe_customer_id" character varying(255)`,
    );

    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "plan_id" uuid NOT NULL,
        "stripe_subscription_id" character varying(255) NOT NULL,
        "stripe_customer_id" character varying(255) NOT NULL,
        "status" character varying(30) NOT NULL,
        "current_period_start" TIMESTAMP NOT NULL,
        "current_period_end" TIMESTAMP NOT NULL,
        "cancel_at_period_end" boolean NOT NULL DEFAULT false,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_subscriptions_stripe_subscription_id" UNIQUE ("stripe_subscription_id"),
        CONSTRAINT "PK_subscriptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_subscriptions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_subscriptions_plan" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_subscriptions_user_id" ON "subscriptions" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscriptions_stripe_subscription_id" ON "subscriptions" ("stripe_subscription_id")`,
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_subscriptions_user_active"
      ON "subscriptions" ("user_id")
      WHERE status IN ('active', 'trialing')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_subscriptions_user_active"`);
    await queryRunner.query(
      `DROP INDEX "IDX_subscriptions_stripe_subscription_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_subscriptions_user_id"`);
    await queryRunner.query(`DROP TABLE "subscriptions"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "stripe_customer_id"`,
    );
  }
}
