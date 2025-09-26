import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1758926681909 implements MigrationInterface {
    name = 'InitialSchema1758926681909'

    public async up(_queryRunner: QueryRunner): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
        // This is a baseline migration created after the initial schema
        // was synchronized from entities. No changes needed as the
        // database already contains the initial schema.
    }

    public async down(_queryRunner: QueryRunner): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars, no-unused-vars
        // This would drop all tables created by the initial schema
        // For now, leaving empty as this represents the baseline state
    }

}
