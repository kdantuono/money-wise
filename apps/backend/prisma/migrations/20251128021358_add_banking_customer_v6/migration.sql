/*
  Warnings:

  - You are about to drop the column `depth` on the `categories` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "banking_connections" ADD COLUMN     "country_code" VARCHAR(10),
ADD COLUMN     "customer_id" UUID,
ADD COLUMN     "last_success_at" TIMESTAMPTZ,
ADD COLUMN     "next_refresh_at" TIMESTAMPTZ,
ADD COLUMN     "provider_code" VARCHAR(255),
ADD COLUMN     "provider_name" VARCHAR(255),
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "categories" DROP COLUMN "depth";

-- CreateTable
CREATE TABLE "banking_customers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "banking_provider" NOT NULL DEFAULT 'SALTEDGE',
    "saltedge_customer_id" VARCHAR(255),
    "tink_customer_id" VARCHAR(255),
    "yapily_customer_id" VARCHAR(255),
    "identifier" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "banking_customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "banking_customers_saltedge_customer_id_key" ON "banking_customers"("saltedge_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "banking_customers_tink_customer_id_key" ON "banking_customers"("tink_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "banking_customers_yapily_customer_id_key" ON "banking_customers"("yapily_customer_id");

-- CreateIndex
CREATE INDEX "idx_banking_customer_provider_active" ON "banking_customers"("provider", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "banking_customers_user_id_provider_key" ON "banking_customers"("user_id", "provider");

-- CreateIndex
CREATE INDEX "idx_banking_conn_customer" ON "banking_connections"("customer_id");

-- AddForeignKey
ALTER TABLE "banking_customers" ADD CONSTRAINT "banking_customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banking_connections" ADD CONSTRAINT "banking_connections_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "banking_customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "uq_accounts_saltedge_account" RENAME TO "accounts_saltedge_account_id_key";

-- RenameIndex
ALTER INDEX "uq_accounts_tink_account" RENAME TO "accounts_tink_account_id_key";

-- RenameIndex
ALTER INDEX "uq_accounts_yapily_account" RENAME TO "accounts_yapily_account_id_key";

-- RenameIndex
ALTER INDEX "uq_banking_conn_saltedge_id" RENAME TO "banking_connections_saltedge_connection_id_key";

-- RenameIndex
ALTER INDEX "uq_banking_conn_tink_id" RENAME TO "banking_connections_tink_connection_id_key";

-- RenameIndex
ALTER INDEX "uq_banking_conn_user_saltedge" RENAME TO "banking_connections_user_id_saltedge_connection_id_key";

-- RenameIndex
ALTER INDEX "uq_banking_conn_yapily_id" RENAME TO "banking_connections_yapily_connection_id_key";
