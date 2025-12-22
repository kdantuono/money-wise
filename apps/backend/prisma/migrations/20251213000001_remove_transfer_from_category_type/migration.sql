-- Remove TRANSFER from CategoryType enum
-- TRANSFER is now handled via FlowType on Transaction, not as a category type.
-- Transfers don't need categories - fromAccount/toAccount describes the transfer.

-- Safety check: Ensure no categories have type = 'TRANSFER'
-- This will fail if any exist, preventing data loss
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "categories" WHERE "type" = 'TRANSFER') THEN
    RAISE EXCEPTION 'Cannot remove TRANSFER from CategoryType: existing categories with type TRANSFER found. Please migrate or delete them first.';
  END IF;
END $$;

-- PostgreSQL doesn't support ALTER TYPE DROP VALUE directly
-- We need to recreate the enum type

-- Step 1: Create new enum type without TRANSFER
CREATE TYPE "category_type_new" AS ENUM ('INCOME', 'EXPENSE');

-- Step 2: Alter the column to use the new type
ALTER TABLE "categories"
  ALTER COLUMN "type" TYPE "category_type_new"
  USING ("type"::text::"category_type_new");

-- Step 3: Drop the old enum type
DROP TYPE "category_type";

-- Step 4: Rename new type to original name
ALTER TYPE "category_type_new" RENAME TO "category_type";
