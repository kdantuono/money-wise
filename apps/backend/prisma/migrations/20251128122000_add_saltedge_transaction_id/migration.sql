-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "saltedge_transaction_id" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "uq_transactions_saltedge_id" ON "transactions"("saltedge_transaction_id");
