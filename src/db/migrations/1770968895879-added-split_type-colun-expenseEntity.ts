import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedSplitTypeColunExpenseEntity1770968895879 implements MigrationInterface {
    name = 'AddedSplitTypeColunExpenseEntity1770968895879'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_expenses_category"`);
        await queryRunner.query(`ALTER TABLE "settlements" DROP CONSTRAINT "FK_settlements_group"`);
        await queryRunner.query(`ALTER TABLE "settlements" DROP CONSTRAINT "FK_settlements_payer"`);
        await queryRunner.query(`ALTER TABLE "settlements" DROP CONSTRAINT "FK_settlements_payee"`);
        await queryRunner.query(`CREATE TYPE "public"."expenses_split_type_enum" AS ENUM('equal', 'percentage', 'exact')`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD "split_type" "public"."expenses_split_type_enum" NOT NULL DEFAULT 'equal'`);
        await queryRunner.query(`ALTER TYPE "public"."payment_method_enum" RENAME TO "payment_method_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."settlements_payment_method_enum" AS ENUM('cash', 'bank_transfer', 'credit_card', 'debit_card', 'paypal', 'venmo', 'khalti', 'esewa', 'other')`);
        await queryRunner.query(`ALTER TABLE "settlements" ALTER COLUMN "payment_method" TYPE "public"."settlements_payment_method_enum" USING "payment_method"::"text"::"public"."settlements_payment_method_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payment_method_enum_old"`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_5d1f4be708e0dfe2afa1a3c376c" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "settlements" ADD CONSTRAINT "FK_6c8f4669439022b4a709819e975" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "settlements" ADD CONSTRAINT "FK_724c20b87fea139496395178cc8" FOREIGN KEY ("payer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "settlements" ADD CONSTRAINT "FK_f34bb9bc8e9cec81b0dca99ca6c" FOREIGN KEY ("payee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "settlements" DROP CONSTRAINT "FK_f34bb9bc8e9cec81b0dca99ca6c"`);
        await queryRunner.query(`ALTER TABLE "settlements" DROP CONSTRAINT "FK_724c20b87fea139496395178cc8"`);
        await queryRunner.query(`ALTER TABLE "settlements" DROP CONSTRAINT "FK_6c8f4669439022b4a709819e975"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_5d1f4be708e0dfe2afa1a3c376c"`);
        await queryRunner.query(`CREATE TYPE "public"."payment_method_enum_old" AS ENUM('cash', 'bank_transfer', 'credit_card', 'debit_card', 'paypal', 'venmo', 'other', 'khalti', 'esewa')`);
        await queryRunner.query(`ALTER TABLE "settlements" ALTER COLUMN "payment_method" TYPE "public"."payment_method_enum_old" USING "payment_method"::"text"::"public"."payment_method_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."settlements_payment_method_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."payment_method_enum_old" RENAME TO "payment_method_enum"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP COLUMN "split_type"`);
        await queryRunner.query(`DROP TYPE "public"."expenses_split_type_enum"`);
        await queryRunner.query(`ALTER TABLE "settlements" ADD CONSTRAINT "FK_settlements_payee" FOREIGN KEY ("payee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "settlements" ADD CONSTRAINT "FK_settlements_payer" FOREIGN KEY ("payer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "settlements" ADD CONSTRAINT "FK_settlements_group" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_expenses_category" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

}
