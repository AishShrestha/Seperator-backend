import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedUserIdExpenseShareEntity1770972491435 implements MigrationInterface {
    name = 'AddedUserIdExpenseShareEntity1770972491435'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "expense_shares" DROP CONSTRAINT "FK_562d5c2c4874f0088a1509530e5"`);
        await queryRunner.query(`ALTER TABLE "expense_shares" ALTER COLUMN "user_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "expense_shares" ADD CONSTRAINT "FK_562d5c2c4874f0088a1509530e5" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "expense_shares" DROP CONSTRAINT "FK_562d5c2c4874f0088a1509530e5"`);
        await queryRunner.query(`ALTER TABLE "expense_shares" ALTER COLUMN "user_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "expense_shares" ADD CONSTRAINT "FK_562d5c2c4874f0088a1509530e5" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
