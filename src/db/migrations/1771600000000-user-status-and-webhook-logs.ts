import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserStatusAndWebhookLogs1771600000000 implements MigrationInterface {
  name = 'UserStatusAndWebhookLogs1771600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "status" character varying(20) NOT NULL DEFAULT 'ACTIVE'`,
    );

    await queryRunner.query(`
      CREATE TABLE "subscription_webhook_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "stripe_event_id" character varying(255) NOT NULL,
        "event_type" character varying(100) NOT NULL,
        "processed_at" TIMESTAMP NOT NULL DEFAULT now(),
        "payload" jsonb,
        CONSTRAINT "PK_subscription_webhook_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_subscription_webhook_logs_stripe_event_id" ON "subscription_webhook_logs" ("stripe_event_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_subscription_webhook_logs_event_type" ON "subscription_webhook_logs" ("event_type")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_subscription_webhook_logs_event_type"`,
    );
    await queryRunner.query(
      `DROP INDEX "UQ_subscription_webhook_logs_stripe_event_id"`,
    );
    await queryRunner.query(`DROP TABLE "subscription_webhook_logs"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "status"`);
  }
}
