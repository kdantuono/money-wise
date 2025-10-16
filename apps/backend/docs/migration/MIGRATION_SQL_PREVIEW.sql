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

-- ... [299 more lines] ...
-- TOTAL: 399 lines, 14 KB
-- FULL SQL: prisma/migrations/20251012173537_initial_schema/migration.sql
