import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedAvatarUserEntity1770826473184 implements MigrationInterface {
    name = 'AddedAvatarUserEntity1770826473184'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "FK_group_members_user"`);
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "FK_group_members_group"`);
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "UQ_group_members_user_group"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "avatar" character varying`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "UQ_f5939ee0ad233ad35e03f5c65c1" UNIQUE ("user_id", "group_id")`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "FK_20a555b299f75843aa53ff8b0ee" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "FK_2c840df5db52dc6b4a1b0b69c6e" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "FK_2c840df5db52dc6b4a1b0b69c6e"`);
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "FK_20a555b299f75843aa53ff8b0ee"`);
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "UQ_f5939ee0ad233ad35e03f5c65c1"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar"`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "UQ_group_members_user_group" UNIQUE ("user_id", "group_id")`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "FK_group_members_group" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "group_members" ADD CONSTRAINT "FK_group_members_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
