-- AlterEnum
-- Add HIDDEN value to account_status enum for soft-deleted accounts
-- This value was added to the Prisma schema but never migrated

-- PostgreSQL doesn't allow IF NOT EXISTS for enum values, so we use a safe pattern
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'HIDDEN' AND enumtypid = 'account_status'::regtype) THEN
        ALTER TYPE account_status ADD VALUE 'HIDDEN';
    END IF;
END $$;
