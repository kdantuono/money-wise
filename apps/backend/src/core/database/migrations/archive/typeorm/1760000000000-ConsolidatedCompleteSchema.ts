 
import { MigrationInterface, QueryRunner } from "typeorm";

export class ConsolidatedCompleteSchema1760000000000 implements MigrationInterface {
    name = 'ConsolidatedCompleteSchema1760000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enable uuid-ossp extension for UUID generation
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

        // Create ENUM types first (idempotent - safe for multiple runs)
        // User enums
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin');
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive', 'suspended');
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);

        // Account enums
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."accounts_type_enum" AS ENUM('checking', 'savings', 'credit_card', 'investment', 'loan', 'mortgage', 'other');
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."accounts_status_enum" AS ENUM('active', 'inactive', 'closed', 'error');
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."accounts_source_enum" AS ENUM('plaid', 'manual');
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);

        // Category enums
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."categories_type_enum" AS ENUM('income', 'expense', 'transfer');
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."categories_status_enum" AS ENUM('active', 'inactive', 'archived');
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);

        // Transaction enums
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."transactions_type_enum" AS ENUM('debit', 'credit');
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."transactions_status_enum" AS ENUM('pending', 'posted', 'cancelled');
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."transactions_source_enum" AS ENUM('plaid', 'manual', 'import');
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);

        // Create Users table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "users" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying(255) NOT NULL,
                "firstName" character varying(255) NOT NULL,
                "lastName" character varying(255) NOT NULL,
                "passwordHash" character varying(255) NOT NULL,
                "role" "public"."users_role_enum" NOT NULL DEFAULT 'user',
                "status" "public"."users_status_enum" NOT NULL DEFAULT 'active',
                "avatar" character varying(255),
                "timezone" character varying(10),
                "currency" character varying(3) NOT NULL DEFAULT 'USD',
                "preferences" jsonb,
                "lastLoginAt" TIMESTAMP,
                "emailVerifiedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")
            );
        `);

        // Create Accounts table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "accounts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "name" character varying(255) NOT NULL,
                "type" "public"."accounts_type_enum" NOT NULL,
                "status" "public"."accounts_status_enum" NOT NULL DEFAULT 'active',
                "source" "public"."accounts_source_enum" NOT NULL,
                "currentBalance" numeric(15,2) NOT NULL DEFAULT '0',
                "availableBalance" numeric(15,2),
                "creditLimit" numeric(15,2),
                "currency" character varying(3) NOT NULL DEFAULT 'USD',
                "institutionName" character varying(255),
                "accountNumber" character varying(255),
                "routingNumber" character varying(255),
                "plaid_account_id" character varying(255),
                "plaid_item_id" character varying(255),
                "plaid_access_token" text,
                "plaidMetadata" jsonb,
                "isActive" boolean NOT NULL DEFAULT true,
                "syncEnabled" boolean NOT NULL DEFAULT true,
                "lastSyncAt" TIMESTAMP,
                "syncError" character varying(500),
                "settings" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY ("id")
            );
        `);

        // Create Categories table with nested set model support
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "categories" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying(255) NOT NULL,
                "slug" character varying(255) NOT NULL,
                "description" text,
                "type" "public"."categories_type_enum" NOT NULL,
                "status" "public"."categories_status_enum" NOT NULL DEFAULT 'active',
                "color" character varying(7),
                "icon" character varying(100),
                "isDefault" boolean NOT NULL DEFAULT false,
                "isSystem" boolean NOT NULL DEFAULT false,
                "sortOrder" integer NOT NULL DEFAULT '0',
                "rules" jsonb,
                "metadata" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "parentId" uuid,
                "nsleft" integer NOT NULL DEFAULT '1',
                "nsright" integer NOT NULL DEFAULT '2',
                CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_420d9f679d41281f282f5bc7d09" UNIQUE ("slug")
            );
        `);

        // Create Transactions table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "transactions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "accountId" uuid NOT NULL,
                "categoryId" uuid,
                "amount" numeric(15,2) NOT NULL,
                "type" "public"."transactions_type_enum" NOT NULL,
                "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'posted',
                "source" "public"."transactions_source_enum" NOT NULL,
                "date" date NOT NULL,
                "authorizedDate" TIMESTAMP,
                "description" character varying(500) NOT NULL,
                "merchantName" character varying(255),
                "originalDescription" character varying(255),
                "currency" character varying(3) NOT NULL DEFAULT 'USD',
                "reference" character varying(255),
                "checkNumber" character varying(255),
                "isPending" boolean NOT NULL DEFAULT false,
                "isRecurring" boolean NOT NULL DEFAULT false,
                "isHidden" boolean NOT NULL DEFAULT false,
                "includeInBudget" boolean NOT NULL DEFAULT true,
                "plaid_transaction_id" character varying(255),
                "plaid_account_id" character varying(255),
                "plaidMetadata" jsonb,
                "location" jsonb,
                "notes" text,
                "tags" jsonb,
                "attachments" jsonb,
                "splitDetails" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_a219afd8dd77ed80f5a862f1db9" PRIMARY KEY ("id")
            );
        `);

        // Create all indexes as defined in entities
        // User indexes
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email");`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_f09a678f7a939bed58006d9be0" ON "users" ("status", "createdAt");`);

        // Account indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_1f2f9a5c612e70c37579c0cd2f" ON "accounts" ("userId", "status");`);

        // Category indexes
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_420d9f679d41281f282f5bc7d0" ON "categories" ("slug");`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_ac4a48ba34656dd8c491827069" ON "categories" ("type", "status");`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_052bd705a991fb83f7ea1bc65c" ON "categories" ("parentId", "status");`);

        // Transaction indexes
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_da2770eb9a35f7ad1fdaf64601" ON "transactions" ("accountId", "date");`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_2a1e90d5d68c4af2d9cb92b282" ON "transactions" ("categoryId", "date");`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_af739975df3831311827aa41cc" ON "transactions" ("status", "date");`);
        await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_8018d7b2e26fd07cc530b49601" ON "transactions" ("plaid_transaction_id") WHERE plaid_transaction_id IS NOT NULL;`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_1bb91630a0e3c46d28d218a9cc" ON "transactions" ("amount", "date");`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_d7fd9555329142e8722de51408" ON "transactions" ("merchantName", "date");`);

        // Create foreign key constraints (idempotent)
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "accounts" ADD CONSTRAINT "FK_3aa23c0a6d107393e8b40e3e2a6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "categories" ADD CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "transactions" ADD CONSTRAINT "FK_26d8aec71ae9efbe468043cd2b9" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                ALTER TABLE "transactions" ADD CONSTRAINT "FK_86e965e74f9cc66149cf6c90f64" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
            EXCEPTION WHEN duplicate_object THEN null;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_86e965e74f9cc66149cf6c90f64";`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_26d8aec71ae9efbe468043cd2b9";`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa";`);
        await queryRunner.query(`ALTER TABLE "accounts" DROP CONSTRAINT "FK_3aa23c0a6d107393e8b40e3e2a6";`);

        // Drop indexes
        await queryRunner.query(`DROP INDEX "public"."IDX_d7fd9555329142e8722de51408";`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1bb91630a0e3c46d28d218a9cc";`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8018d7b2e26fd07cc530b49601";`);
        await queryRunner.query(`DROP INDEX "public"."IDX_af739975df3831311827aa41cc";`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2a1e90d5d68c4af2d9cb92b282";`);
        await queryRunner.query(`DROP INDEX "public"."IDX_da2770eb9a35f7ad1fdaf64601";`);
        await queryRunner.query(`DROP INDEX "public"."IDX_052bd705a991fb83f7ea1bc65c";`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ac4a48ba34656dd8c491827069";`);
        await queryRunner.query(`DROP INDEX "public"."IDX_420d9f679d41281f282f5bc7d0";`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1f2f9a5c612e70c37579c0cd2f";`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f09a678f7a939bed58006d9be0";`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be";`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "transactions";`);
        await queryRunner.query(`DROP TABLE "categories";`);
        await queryRunner.query(`DROP TABLE "accounts";`);
        await queryRunner.query(`DROP TABLE "users";`);

        // Drop ENUM types
        await queryRunner.query(`DROP TYPE "public"."transactions_source_enum";`);
        await queryRunner.query(`DROP TYPE "public"."transactions_status_enum";`);
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum";`);
        await queryRunner.query(`DROP TYPE "public"."categories_status_enum";`);
        await queryRunner.query(`DROP TYPE "public"."categories_type_enum";`);
        await queryRunner.query(`DROP TYPE "public"."accounts_source_enum";`);
        await queryRunner.query(`DROP TYPE "public"."accounts_status_enum";`);
        await queryRunner.query(`DROP TYPE "public"."accounts_type_enum";`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum";`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum";`);
    }
}