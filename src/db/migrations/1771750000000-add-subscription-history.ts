import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionHistory1771750000000 implements MigrationInterface {
  name = 'AddSubscriptionHistory1771750000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "subscription_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "subscription_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "plan_id" uuid NOT NULL,
        "stripe_subscription_id" character varying(255) NOT NULL,
        "status" character varying(30) NOT NULL,
        "current_period_start" TIMESTAMP NOT NULL,
        "current_period_end" TIMESTAMP NOT NULL,
        "cancel_at_period_end" boolean NOT NULL DEFAULT false,
        "event_type" character varying(30) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscription_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_subscription_history_subscription" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_subscription_history_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_subscription_history_plan" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_subscription_history_subscription_id" ON "subscription_history" ("subscription_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscription_history_user_id" ON "subscription_history" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscription_history_created_at" ON "subscription_history" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_subscription_history_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_subscription_history_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_subscription_history_subscription_id"`,
    );
    await queryRunner.query(`DROP TABLE "subscription_history"`);
  }
}
