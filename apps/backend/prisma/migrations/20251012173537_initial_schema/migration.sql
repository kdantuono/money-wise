-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "account_type" AS ENUM ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'LOAN', 'MORTGAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "account_status" AS ENUM ('ACTIVE', 'INACTIVE', 'CLOSED', 'ERROR');

-- CreateEnum
CREATE TYPE "account_source" AS ENUM ('PLAID', 'MANUAL');

-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "transaction_status" AS ENUM ('PENDING', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "transaction_source" AS ENUM ('PLAID', 'MANUAL', 'IMPORT');

-- CreateEnum
CREATE TYPE "category_type" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "category_status" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "budget_period" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "budget_status" AS ENUM ('ACTIVE', 'COMPLETED', 'DRAFT');

-- CreateEnum
CREATE TYPE "achievement_type" AS ENUM ('SAVINGS', 'BUDGET', 'CONSISTENCY', 'EDUCATION');

-- CreateEnum
CREATE TYPE "achievement_status" AS ENUM ('LOCKED', 'IN_PROGRESS', 'UNLOCKED');

-- CreateEnum
CREATE TYPE "audit_event_type" AS ENUM ('PASSWORD_CHANGED', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_LOCKED', 'ACCOUNT_CREATED', 'ACCOUNT_DELETED', 'ACCOUNT_SUSPENDED', 'ACCOUNT_REACTIVATED', 'TWO_FACTOR_ENABLED', 'TWO_FACTOR_DISABLED');

-- CreateTable
CREATE TABLE "families" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(255) NOT NULL,
    "last_name" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "user_role" NOT NULL DEFAULT 'MEMBER',
    "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
    "avatar" VARCHAR(255),
    "timezone" VARCHAR(50),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "preferences" JSONB,
    "last_login_at" TIMESTAMPTZ,
    "email_verified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "family_id" UUID NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "account_type" NOT NULL DEFAULT 'OTHER',
    "status" "account_status" NOT NULL DEFAULT 'ACTIVE',
    "source" "account_source" NOT NULL,
    "currentBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "availableBalance" DECIMAL(15,2),
    "creditLimit" DECIMAL(15,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "institutionName" VARCHAR(255),
    "accountNumber" VARCHAR(255),
    "routingNumber" VARCHAR(255),
    "plaid_account_id" VARCHAR(255),
    "plaid_item_id" VARCHAR(255),
    "plaid_access_token" TEXT,
    "plaidMetadata" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMPTZ,
    "sync_error" VARCHAR(500),
    "settings" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "user_id" UUID,
    "family_id" UUID,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "type" "transaction_type" NOT NULL,
    "status" "transaction_status" NOT NULL DEFAULT 'POSTED',
    "source" "transaction_source" NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "date" DATE NOT NULL,
    "authorized_date" TIMESTAMPTZ,
    "description" VARCHAR(500) NOT NULL,
    "merchant_name" VARCHAR(255),
    "original_description" VARCHAR(255),
    "reference" VARCHAR(255),
    "check_number" VARCHAR(255),
    "notes" TEXT,
    "is_pending" BOOLEAN NOT NULL DEFAULT false,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "include_in_budget" BOOLEAN NOT NULL DEFAULT true,
    "plaid_transaction_id" VARCHAR(255),
    "plaid_account_id" VARCHAR(255),
    "plaidMetadata" JSONB,
    "location" JSONB,
    "tags" JSONB,
    "attachments" JSONB,
    "split_details" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "account_id" UUID NOT NULL,
    "category_id" UUID,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "category_type" NOT NULL,
    "status" "category_status" NOT NULL DEFAULT 'ACTIVE',
    "color" VARCHAR(7),
    "icon" VARCHAR(100),
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "rules" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "parent_id" UUID,
    "family_id" UUID NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "period" "budget_period" NOT NULL DEFAULT 'MONTHLY',
    "status" "budget_status" NOT NULL DEFAULT 'ACTIVE',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "alert_thresholds" INTEGER[] DEFAULT ARRAY[50, 75, 90]::INTEGER[],
    "settings" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "category_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "type" "achievement_type" NOT NULL,
    "icon" VARCHAR(100),
    "points" INTEGER NOT NULL DEFAULT 0,
    "requirements" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_repeatable" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" UUID NOT NULL,
    "status" "achievement_status" NOT NULL DEFAULT 'LOCKED',
    "progress" JSONB,
    "unlocked_at" TIMESTAMPTZ,
    "notified_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "achievement_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_history" (
    "id" UUID NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,

    CONSTRAINT "password_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "event_type" "audit_event_type" NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(255),
    "metadata" JSONB,
    "is_security_event" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_family_id" ON "users"("family_id");

-- CreateIndex
CREATE INDEX "idx_users_status_created" ON "users"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_users_family_role" ON "users"("family_id", "role");

-- CreateIndex
CREATE INDEX "idx_accounts_user_id" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "idx_accounts_family_id" ON "accounts"("family_id");

-- CreateIndex
CREATE INDEX "idx_accounts_user_status" ON "accounts"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_accounts_family_status" ON "accounts"("family_id", "status");

-- CreateIndex
CREATE INDEX "idx_accounts_plaid_item" ON "accounts"("plaid_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_plaid_account_id_key" ON "accounts"("plaid_account_id");

-- CreateIndex
CREATE INDEX "idx_transactions_account_date" ON "transactions"("account_id", "date");

-- CreateIndex
CREATE INDEX "idx_transactions_category_date" ON "transactions"("category_id", "date");

-- CreateIndex
CREATE INDEX "idx_transactions_status_date" ON "transactions"("status", "date");

-- CreateIndex
CREATE INDEX "idx_transactions_merchant_date" ON "transactions"("merchant_name", "date");

-- CreateIndex
CREATE INDEX "idx_transactions_amount_date" ON "transactions"("amount", "date");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_plaid_transaction_id_key" ON "transactions"("plaid_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "idx_categories_family_type" ON "categories"("family_id", "type");

-- CreateIndex
CREATE INDEX "idx_categories_family_status" ON "categories"("family_id", "status");

-- CreateIndex
CREATE INDEX "idx_categories_parent_id" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "idx_categories_type_status" ON "categories"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "categories_family_id_slug_key" ON "categories"("family_id", "slug");

-- CreateIndex
CREATE INDEX "idx_budgets_family_status" ON "budgets"("family_id", "status");

-- CreateIndex
CREATE INDEX "idx_budgets_family_period" ON "budgets"("family_id", "period");

-- CreateIndex
CREATE INDEX "idx_budgets_category_id" ON "budgets"("category_id");

-- CreateIndex
CREATE INDEX "idx_budgets_date_range" ON "budgets"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "idx_achievements_type_active" ON "achievements"("type", "is_active");

-- CreateIndex
CREATE INDEX "idx_achievements_sort" ON "achievements"("sort_order");

-- CreateIndex
CREATE INDEX "idx_user_achievements_user_status" ON "user_achievements"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_user_achievements_user_unlocked" ON "user_achievements"("user_id", "unlocked_at");

-- CreateIndex
CREATE INDEX "idx_user_achievements_achievement" ON "user_achievements"("achievement_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_achievement_id_user_id_key" ON "user_achievements"("achievement_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_password_history_user_created" ON "password_history"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_user_event_created" ON "audit_logs"("user_id", "event_type", "created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_event_created" ON "audit_logs"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_ip_created" ON "audit_logs"("ip_address", "created_at");

-- CreateIndex
CREATE INDEX "idx_audit_logs_security_created" ON "audit_logs"("is_security_event", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_history" ADD CONSTRAINT "password_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

