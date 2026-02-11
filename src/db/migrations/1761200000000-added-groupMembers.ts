import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedGroupMembers1761200000000 implements MigrationInterface {
    name = 'AddedGroupMembers1761200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the group role enum type
        await queryRunner.query(`CREATE TYPE "public"."group_members_role_enum" AS ENUM('owner', 'admin', 'member')`);
        
        // Create the group_members table
        await queryRunner.query(`
            CREATE TABLE "group_members" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "group_id" uuid NOT NULL,
                "role" "public"."group_members_role_enum" NOT NULL DEFAULT 'member',
                "joined_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_group_members_user_group" UNIQUE ("user_id", "group_id"),
                CONSTRAINT "PK_group_members" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "group_members" 
            ADD CONSTRAINT "FK_group_members_user" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
        `);
        
        await queryRunner.query(`
            ALTER TABLE "group_members" 
            ADD CONSTRAINT "FK_group_members_group" 
            FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE
        `);

        // Migrate existing data from group_users junction table to group_members
        // All existing members will be set as 'member' role
        await queryRunner.query(`
            INSERT INTO "group_members" ("user_id", "group_id", "role")
            SELECT "usersId", "groupsId", 'member'
            FROM "group_users"
            ON CONFLICT DO NOTHING
        `);

        // Drop the old junction table
        await queryRunner.query(`DROP TABLE IF EXISTS "group_users"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Recreate the old junction table
        await queryRunner.query(`
            CREATE TABLE "group_users" (
                "groupsId" uuid NOT NULL,
                "usersId" uuid NOT NULL,
                CONSTRAINT "PK_group_users" PRIMARY KEY ("groupsId", "usersId")
            )
        `);

        // Migrate data back
        await queryRunner.query(`
            INSERT INTO "group_users" ("groupsId", "usersId")
            SELECT "group_id", "user_id" FROM "group_members"
        `);

        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "FK_group_members_group"`);
        await queryRunner.query(`ALTER TABLE "group_members" DROP CONSTRAINT "FK_group_members_user"`);
        
        // Drop the group_members table
        await queryRunner.query(`DROP TABLE "group_members"`);
        
        // Drop the enum type
        await queryRunner.query(`DROP TYPE "public"."group_members_role_enum"`);
    }
}
