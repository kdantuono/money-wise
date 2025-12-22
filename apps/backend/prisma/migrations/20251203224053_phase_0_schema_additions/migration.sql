-- CreateEnum
CREATE TYPE "flow_type" AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER', 'LIABILITY_PAYMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "transfer_role" AS ENUM ('SOURCE', 'DESTINATION');

-- CreateEnum
CREATE TYPE "liability_type" AS ENUM ('CREDIT_CARD', 'BNPL', 'LOAN', 'MORTGAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "liability_status" AS ENUM ('ACTIVE', 'PAID_OFF', 'CLOSED');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('BUDGET_ALERT', 'BILL_REMINDER', 'TRANSACTION_ALERT', 'SYNC_ERROR', 'ACHIEVEMENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "notification_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('PENDING', 'SENT', 'READ', 'DISMISSED');

-- CreateEnum
CREATE TYPE "recurrence_frequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "scheduled_transaction_status" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "flow_type" "flow_type",
ADD COLUMN     "transfer_group_id" UUID,
ADD COLUMN     "transfer_role" "transfer_role";

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "date_format" VARCHAR(20) NOT NULL DEFAULT 'YYYY-MM-DD',
    "locale" VARCHAR(10) NOT NULL DEFAULT 'en-US',
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "push_notifications" BOOLEAN NOT NULL DEFAULT true,
    "budget_alerts" BOOLEAN NOT NULL DEFAULT true,
    "bill_reminders" BOOLEAN NOT NULL DEFAULT true,
    "weekly_digest" BOOLEAN NOT NULL DEFAULT true,
    "ui_preferences" JSONB,
    "financial_preferences" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "notification_type" NOT NULL,
    "priority" "notification_priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "notification_status" NOT NULL DEFAULT 'PENDING',
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "link" VARCHAR(500),
    "sent_at" TIMESTAMPTZ,
    "read_at" TIMESTAMPTZ,
    "dismissed_at" TIMESTAMPTZ,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" VARCHAR(255) NOT NULL,
    "auth" VARCHAR(255) NOT NULL,
    "user_agent" VARCHAR(500),
    "device_name" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used_at" TIMESTAMPTZ,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liabilities" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "type" "liability_type" NOT NULL,
    "status" "liability_status" NOT NULL DEFAULT 'ACTIVE',
    "name" VARCHAR(255) NOT NULL,
    "current_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit_limit" DECIMAL(15,2),
    "original_amount" DECIMAL(15,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "interest_rate" DECIMAL(5,2),
    "minimum_payment" DECIMAL(15,2),
    "billing_cycle_day" INTEGER,
    "payment_due_day" INTEGER,
    "statement_close_day" INTEGER,
    "last_statement_date" DATE,
    "account_id" UUID,
    "provider" VARCHAR(100),
    "external_id" VARCHAR(255),
    "purchase_date" DATE,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "liabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installment_plans" (
    "id" UUID NOT NULL,
    "liability_id" UUID NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "installment_amount" DECIMAL(15,2) NOT NULL,
    "number_of_installments" INTEGER NOT NULL,
    "remaining_installments" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_paid_off" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "installment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installments" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "installment_number" INTEGER NOT NULL,
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMPTZ,
    "transaction_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_transactions" (
    "id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "status" "scheduled_transaction_status" NOT NULL DEFAULT 'ACTIVE',
    "amount" DECIMAL(15,2) NOT NULL,
    "type" "transaction_type" NOT NULL,
    "flow_type" "flow_type",
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "description" VARCHAR(500) NOT NULL,
    "merchant_name" VARCHAR(255),
    "category_id" UUID,
    "next_due_date" DATE NOT NULL,
    "last_executed_at" TIMESTAMPTZ,
    "auto_create" BOOLEAN NOT NULL DEFAULT false,
    "reminder_days_before" INTEGER NOT NULL DEFAULT 3,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "scheduled_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurrence_rules" (
    "id" UUID NOT NULL,
    "scheduled_transaction_id" UUID NOT NULL,
    "frequency" "recurrence_frequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "day_of_week" INTEGER,
    "day_of_month" INTEGER,
    "end_date" DATE,
    "end_count" INTEGER,
    "occurrence_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "recurrence_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "idx_notifications_user_status" ON "notifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "idx_notifications_user_created" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_notifications_type_status" ON "notifications"("type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "idx_push_subscriptions_user_active" ON "push_subscriptions"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "idx_liabilities_family_status" ON "liabilities"("family_id", "status");

-- CreateIndex
CREATE INDEX "idx_liabilities_family_type" ON "liabilities"("family_id", "type");

-- CreateIndex
CREATE INDEX "idx_liabilities_account" ON "liabilities"("account_id");

-- CreateIndex
CREATE INDEX "idx_installment_plans_liability" ON "installment_plans"("liability_id");

-- CreateIndex
CREATE INDEX "idx_installments_plan_due" ON "installments"("plan_id", "due_date");

-- CreateIndex
CREATE INDEX "idx_installments_due_status" ON "installments"("due_date", "is_paid");

-- CreateIndex
CREATE INDEX "idx_scheduled_tx_family_status" ON "scheduled_transactions"("family_id", "status");

-- CreateIndex
CREATE INDEX "idx_scheduled_tx_due_status" ON "scheduled_transactions"("next_due_date", "status");

-- CreateIndex
CREATE INDEX "idx_scheduled_tx_account" ON "scheduled_transactions"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "recurrence_rules_scheduled_transaction_id_key" ON "recurrence_rules"("scheduled_transaction_id");

-- CreateIndex
CREATE INDEX "idx_transactions_flow_type_date" ON "transactions"("flow_type", "date");

-- CreateIndex
CREATE INDEX "idx_transactions_transfer_group" ON "transactions"("transfer_group_id");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liabilities" ADD CONSTRAINT "liabilities_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liabilities" ADD CONSTRAINT "liabilities_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_liability_id_fkey" FOREIGN KEY ("liability_id") REFERENCES "liabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "installment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_transactions" ADD CONSTRAINT "scheduled_transactions_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurrence_rules" ADD CONSTRAINT "recurrence_rules_scheduled_transaction_id_fkey" FOREIGN KEY ("scheduled_transaction_id") REFERENCES "scheduled_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "uq_transactions_saltedge_id" RENAME TO "transactions_saltedge_transaction_id_key";
