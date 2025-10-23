import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedInitialEntity1761131272137 implements MigrationInterface {
    name = 'AddedInitialEntity1761131272137'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "expense_payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "expense_id" uuid NOT NULL, "user_id" uuid NOT NULL, "amount_paid" numeric(10,2) NOT NULL, CONSTRAINT "PK_7cf2ee63bae4c852652405ad292" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "expense_shares" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "expense_id" uuid NOT NULL, "share" numeric(10,2) NOT NULL, "user_id" uuid, CONSTRAINT "PK_6797467a312af7a82082f86dc91" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "group_users" ("groupsId" uuid NOT NULL, "usersId" uuid NOT NULL, CONSTRAINT "PK_5f8314825cbf9ae169bbb5a33e2" PRIMARY KEY ("groupsId", "usersId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_333c5e0cdca45030a238e7ab0b" ON "group_users" ("groupsId") `);
        await queryRunner.query(`CREATE INDEX "IDX_1fea684a5c78f158af729b7c64" ON "group_users" ("usersId") `);
        await queryRunner.query(`ALTER TABLE "expense_payments" ADD CONSTRAINT "FK_57d4005460118d332e1a0d38be9" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expense_payments" ADD CONSTRAINT "FK_ef2045bad262bb65206893ad22e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expense_shares" ADD CONSTRAINT "FK_07f2ba1f3ce16fa4bf7cb10231e" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "expense_shares" ADD CONSTRAINT "FK_562d5c2c4874f0088a1509530e5" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_users" ADD CONSTRAINT "FK_333c5e0cdca45030a238e7ab0bb" FOREIGN KEY ("groupsId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "group_users" ADD CONSTRAINT "FK_1fea684a5c78f158af729b7c64d" FOREIGN KEY ("usersId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "group_users" DROP CONSTRAINT "FK_1fea684a5c78f158af729b7c64d"`);
        await queryRunner.query(`ALTER TABLE "group_users" DROP CONSTRAINT "FK_333c5e0cdca45030a238e7ab0bb"`);
        await queryRunner.query(`ALTER TABLE "expense_shares" DROP CONSTRAINT "FK_562d5c2c4874f0088a1509530e5"`);
        await queryRunner.query(`ALTER TABLE "expense_shares" DROP CONSTRAINT "FK_07f2ba1f3ce16fa4bf7cb10231e"`);
        await queryRunner.query(`ALTER TABLE "expense_payments" DROP CONSTRAINT "FK_ef2045bad262bb65206893ad22e"`);
        await queryRunner.query(`ALTER TABLE "expense_payments" DROP CONSTRAINT "FK_57d4005460118d332e1a0d38be9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1fea684a5c78f158af729b7c64"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_333c5e0cdca45030a238e7ab0b"`);
        await queryRunner.query(`DROP TABLE "group_users"`);
        await queryRunner.query(`DROP TABLE "expense_shares"`);
        await queryRunner.query(`DROP TABLE "expense_payments"`);
    }

}
