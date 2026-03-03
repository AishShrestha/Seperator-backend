import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSubscriptionMetadata1771700000000
  implements MigrationInterface
{
  name = 'RemoveSubscriptionMetadata1771700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "metadata"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD "metadata" jsonb`,
    );
  }
}
