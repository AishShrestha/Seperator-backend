import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedSettlementEntity1771100000000 implements MigrationInterface {
  name = 'AddedSettlementEntity1771100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create payment_method enum
    await queryRunner.query(
      `CREATE TYPE "payment_method_enum" AS ENUM('cash', 'bank_transfer', 'credit_card', 'debit_card', 'paypal', 'venmo', 'other','khalti','esewa')`,
    );

    // Create settlements table
    await queryRunner.query(`
      CREATE TABLE "settlements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "group_id" uuid NOT NULL,
        "payer_id" uuid NOT NULL,
        "payee_id" uuid NOT NULL,
        "amount" decimal(10,2) NOT NULL,
        "notes" character varying(255),
        "payment_method" "payment_method_enum",
        "settled_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_settlements" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "settlements" 
      ADD CONSTRAINT "FK_settlements_group" 
      FOREIGN KEY ("group_id") 
      REFERENCES "groups"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "settlements" 
      ADD CONSTRAINT "FK_settlements_payer" 
      FOREIGN KEY ("payer_id") 
      REFERENCES "users"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "settlements" 
      ADD CONSTRAINT "FK_settlements_payee" 
      FOREIGN KEY ("payee_id") 
      REFERENCES "users"("id") 
      ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "settlements" DROP CONSTRAINT "FK_settlements_payee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "settlements" DROP CONSTRAINT "FK_settlements_payer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "settlements" DROP CONSTRAINT "FK_settlements_group"`,
    );

    // Drop settlements table
    await queryRunner.query(`DROP TABLE "settlements"`);

    // Drop payment_method enum
    await queryRunner.query(`DROP TYPE "payment_method_enum"`);
  }
}
