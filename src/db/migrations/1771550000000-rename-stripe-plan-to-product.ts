import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameStripePlanToProduct1771550000000 implements MigrationInterface {
  name = 'RenameStripePlanToProduct1771550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plans" RENAME COLUMN "stripe_plan_id" TO "stripe_product_id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "plans" RENAME COLUMN "stripe_product_id" TO "stripe_plan_id"`,
    );
  }
}
