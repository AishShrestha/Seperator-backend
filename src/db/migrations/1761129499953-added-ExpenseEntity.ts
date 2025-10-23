import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedExpenseEntity1761129499953 implements MigrationInterface {
    name = 'AddedExpenseEntity1761129499953'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "expenses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "group_id" uuid NOT NULL, "description" character varying(255) NOT NULL, "total_amount" numeric(10,2) NOT NULL, "created_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_94c3ceb17e3140abc9282c20610" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_d4e9271763ee685f5d746a4e550" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expenses" ADD CONSTRAINT "FK_7c0c012c2f8e6578277c239ee61" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_7c0c012c2f8e6578277c239ee61"`);
        await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "FK_d4e9271763ee685f5d746a4e550"`);
        await queryRunner.query(`DROP TABLE "expenses"`);
    }

}
