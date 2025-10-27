-- CreateEnum for BankingProvider
CREATE TYPE "banking_provider" AS ENUM ('MANUAL', 'SALTEDGE', 'TINK', 'YAPILY', 'TRUELAYER');

-- CreateEnum for BankingConnectionStatus
CREATE TYPE "banking_connection_status" AS ENUM ('PENDING', 'IN_PROGRESS', 'AUTHORIZED', 'REVOKED', 'EXPIRED', 'FAILED');

-- CreateEnum for BankingSyncStatus
CREATE TYPE "banking_sync_status" AS ENUM ('PENDING', 'SYNCING', 'SYNCED', 'ERROR', 'DISCONNECTED');

-- Update AccountSource enum
ALTER TYPE "account_source" ADD VALUE 'SALTEDGE' BEFORE 'MANUAL';
ALTER TYPE "account_source" ADD VALUE 'TINK' BEFORE 'MANUAL';
ALTER TYPE "account_source" ADD VALUE 'YAPILY' BEFORE 'MANUAL';

-- Add banking-related columns to Account table
ALTER TABLE "accounts"
ADD COLUMN "banking_provider" "banking_provider",
ADD COLUMN "saltedge_account_id" VARCHAR(255),
ADD COLUMN "saltedge_connection_id" VARCHAR(255),
ADD COLUMN "tink_account_id" VARCHAR(255),
ADD COLUMN "yapily_account_id" VARCHAR(255),
ADD COLUMN "sync_status" "banking_sync_status" NOT NULL DEFAULT 'PENDING';

-- Add unique constraints for banking provider accounts
CREATE UNIQUE INDEX "uq_accounts_saltedge_account" ON "accounts"("saltedge_account_id");
CREATE UNIQUE INDEX "uq_accounts_tink_account" ON "accounts"("tink_account_id");
CREATE UNIQUE INDEX "uq_accounts_yapily_account" ON "accounts"("yapily_account_id");

-- Add index for banking provider sync queries
CREATE INDEX "idx_accounts_provider_sync" ON "accounts"("banking_provider", "sync_status");

-- CreateTable BankingConnection
CREATE TABLE "banking_connections" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "banking_provider" NOT NULL,
    "status" "banking_connection_status" NOT NULL DEFAULT 'PENDING',
    "saltedge_connection_id" VARCHAR(255),
    "tink_connection_id" VARCHAR(255),
    "yapily_connection_id" VARCHAR(255),
    "redirect_url" TEXT,
    "authorization_url" TEXT,
    "expires_at" TIMESTAMPTZ,
    "authorized_at" TIMESTAMPTZ,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banking_connections_pkey" PRIMARY KEY ("id")
);

-- Add unique constraints for banking connections
CREATE UNIQUE INDEX "uq_banking_conn_user_saltedge" ON "banking_connections"("user_id", "saltedge_connection_id");
CREATE UNIQUE INDEX "uq_banking_conn_saltedge_id" ON "banking_connections"("saltedge_connection_id");
CREATE UNIQUE INDEX "uq_banking_conn_tink_id" ON "banking_connections"("tink_connection_id");
CREATE UNIQUE INDEX "uq_banking_conn_yapily_id" ON "banking_connections"("yapily_connection_id");

-- Add indexes for banking connections
CREATE INDEX "idx_banking_conn_user_status" ON "banking_connections"("user_id", "status");
CREATE INDEX "idx_banking_conn_provider_status" ON "banking_connections"("provider", "status");
CREATE INDEX "idx_banking_conn_expires" ON "banking_connections"("expires_at");

-- Add foreign key for banking connections
ALTER TABLE "banking_connections" ADD CONSTRAINT "banking_connections_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable BankingSyncLog
CREATE TABLE "banking_sync_logs" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "provider" "banking_provider" NOT NULL,
    "status" "banking_sync_status" NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,
    "accounts_synced" INTEGER,
    "transactions_synced" INTEGER,
    "balance_updated" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "error_code" VARCHAR(50),
    "metadata" JSONB,

    CONSTRAINT "banking_sync_logs_pkey" PRIMARY KEY ("id")
);

-- Add indexes for banking sync logs
CREATE INDEX "idx_sync_logs_account_date" ON "banking_sync_logs"("account_id", "started_at");
CREATE INDEX "idx_sync_logs_provider_status" ON "banking_sync_logs"("provider", "status");
CREATE INDEX "idx_sync_logs_status_date" ON "banking_sync_logs"("status", "started_at");

-- Add foreign key for banking sync logs
ALTER TABLE "banking_sync_logs" ADD CONSTRAINT "banking_sync_logs_account_id_fkey"
    FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
