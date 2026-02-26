import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedPlansTable1771300000000 implements MigrationInterface {
  name = 'AddedPlansTable1771300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "slug" character varying(100) NOT NULL,
        "description" text,
        "stripe_plan_id" character varying(255),
        "stripe_price_id" character varying(255),
        "plan_configuration" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_plans_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_plans" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "plans"`);
  }
}
