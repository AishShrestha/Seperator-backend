import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedExpenseCategories1771000000000 implements MigrationInterface {
  name = 'AddedExpenseCategories1771000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create expense_categories table
    await queryRunner.query(`
      CREATE TABLE "expense_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "description" character varying(255),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_expense_categories_name" UNIQUE ("name"),
        CONSTRAINT "PK_expense_categories" PRIMARY KEY ("id")
      )
    `);

    // Add category_id column to expenses table
    await queryRunner.query(
      `ALTER TABLE "expenses" ADD "category_id" uuid`,
    );

    // Create split_type enum and add column to expenses table
    await queryRunner.query(
      `CREATE TYPE "split_type_enum" AS ENUM('equal', 'percentage', 'exact')`,
    );
    await queryRunner.query(
      `ALTER TABLE "expenses" ADD "split_type" "split_type_enum" NOT NULL DEFAULT 'equal'`,
    );

    // Add foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "expenses" 
      ADD CONSTRAINT "FK_expenses_category" 
      FOREIGN KEY ("category_id") 
      REFERENCES "expense_categories"("id") 
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Insert default categories
    await queryRunner.query(`
      INSERT INTO "expense_categories" ("name", "description") VALUES
      ('Food & Dining', 'Restaurants, groceries, and food delivery'),
      ('Transportation', 'Gas, public transit, rideshares, and parking'),
      ('Entertainment', 'Movies, games, concerts, and events'),
      ('Shopping', 'Retail purchases and online shopping'),
      ('Utilities', 'Electricity, water, internet, and phone bills'),
      ('Housing', 'Rent, mortgage, and home maintenance'),
      ('Healthcare', 'Medical expenses, pharmacy, and insurance'),
      ('Travel', 'Hotels, flights, and vacation expenses'),
      ('Education', 'Tuition, books, and courses'),
      ('Other', 'Miscellaneous expenses')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "expenses" DROP CONSTRAINT "FK_expenses_category"`,
    );

    // Remove split_type column and enum from expenses
    await queryRunner.query(`ALTER TABLE "expenses" DROP COLUMN "split_type"`);
    await queryRunner.query(`DROP TYPE "split_type_enum"`);

    // Remove category_id column from expenses
    await queryRunner.query(`ALTER TABLE "expenses" DROP COLUMN "category_id"`);

    // Drop expense_categories table
    await queryRunner.query(`DROP TABLE "expense_categories"`);
  }
}
