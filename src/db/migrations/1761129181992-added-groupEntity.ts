import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedGroupEntity1761129181992 implements MigrationInterface {
    name = 'AddedGroupEntity1761129181992'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "groups" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "invite_code" character varying NOT NULL, CONSTRAINT "UQ_d93a573770a9d8c51c59c6c0f2d" UNIQUE ("invite_code"), CONSTRAINT "PK_659d1483316afb28afd3a90646e" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "groups"`);
    }

}
