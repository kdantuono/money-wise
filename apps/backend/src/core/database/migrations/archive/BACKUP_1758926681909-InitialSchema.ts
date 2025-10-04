import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1758926681909 implements MigrationInterface {
    name = 'InitialSchema1758926681909'

    public async up(_queryRunner: QueryRunner): Promise<void> {
        // This is a baseline migration created after the initial schema
        // was synchronized from entities. No changes needed as the
        // database already contains the initial schema.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _queryRunner;
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        // This would drop all tables created by the initial schema
        // For now, leaving empty as this represents the baseline state
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _queryRunner;
    }

}
