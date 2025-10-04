import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserTimezoneLength1735695600000 implements MigrationInterface {
  name = 'UpdateUserTimezoneLength1735695600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Alter timezone column from VARCHAR(10) to VARCHAR(50) to support full IANA timezone strings
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "timezone" TYPE varchar(50)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to VARCHAR(10)
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "timezone" TYPE varchar(10)
    `);
  }
}
