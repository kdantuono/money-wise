-- =====================================================
-- Cleanup Script: Remove Stale SaltEdge References
-- =====================================================
--
-- Purpose:
--   When SaltEdge sandbox connections are deleted externally (e.g., by SaltEdge
--   during sandbox cleanup), our database retains stale references that cause
--   404 errors during sync operations.
--
--   This script cleans up those stale references by:
--   1. Clearing saltEdgeAccountId and saltEdgeConnectionId from affected accounts
--   2. Setting sync status to DISCONNECTED
--   3. Deleting orphaned BankingConnection records
--
-- Usage:
--   1. Run in a transaction to allow rollback if needed
--   2. Review affected rows before committing
--   3. Run with READ COMMITTED isolation to see current state
--
-- Prerequisites:
--   - Identify the SaltEdge ID prefixes for stale resources (e.g., 168552%)
--   - Ensure you have backup or can rollback
--
-- Author: MoneyWise Team
-- Date: 2025-11-30
-- =====================================================

-- Start transaction for safety
BEGIN;

-- =====================================================
-- STEP 1: Preview affected accounts (DRY RUN)
-- =====================================================
SELECT
    id,
    name,
    "saltEdgeAccountId",
    "saltEdgeConnectionId",
    "syncStatus",
    "lastSyncAt"
FROM "Account"
WHERE "saltEdgeAccountId" IS NOT NULL
  AND ("saltEdgeAccountId" LIKE '168552%' OR "saltEdgeConnectionId" LIKE '168553%');

-- =====================================================
-- STEP 2: Update affected accounts
-- =====================================================
UPDATE "Account"
SET
    "syncStatus" = 'ERROR',
    "saltEdgeAccountId" = NULL,
    "saltEdgeConnectionId" = NULL,
    "updatedAt" = NOW()
WHERE "saltEdgeAccountId" LIKE '168552%'
   OR "saltEdgeConnectionId" LIKE '168553%';

-- Report affected rows
-- (PostgreSQL: use GET DIAGNOSTICS or check output)

-- =====================================================
-- STEP 3: Preview affected BankingConnections (DRY RUN)
-- =====================================================
SELECT
    id,
    "saltEdgeConnectionId",
    "saltEdgeCustomerId",
    status,
    "createdAt"
FROM "BankingConnection"
WHERE "saltEdgeConnectionId" LIKE '168553%';

-- =====================================================
-- STEP 4: Delete orphaned BankingConnections
-- =====================================================
DELETE FROM "BankingConnection"
WHERE "saltEdgeConnectionId" LIKE '168553%';

-- =====================================================
-- STEP 5: Create audit record in BankingSyncLog
-- =====================================================
-- This creates a record of the cleanup for debugging purposes
INSERT INTO "BankingSyncLog" (
    id,
    "accountId",
    provider,
    status,
    "startedAt",
    "completedAt",
    "accountsSynced",
    "transactionsSynced",
    "balanceUpdated",
    error,
    "errorCode"
)
SELECT
    gen_random_uuid(),
    a.id,
    a."bankingProvider",
    'ERROR',
    NOW(),
    NOW(),
    0,
    0,
    false,
    'Cleanup: Stale SaltEdge references removed during database maintenance',
    'MAINTENANCE_CLEANUP'
FROM "Account" a
WHERE a."saltEdgeAccountId" IS NULL
  AND a."bankingProvider" = 'SALTEDGE'
  AND a."syncStatus" = 'ERROR'
  AND a."updatedAt" > NOW() - INTERVAL '1 minute';

-- =====================================================
-- STEP 6: Verify cleanup
-- =====================================================
SELECT
    COUNT(*) as remaining_stale_accounts
FROM "Account"
WHERE "saltEdgeAccountId" LIKE '168552%'
   OR "saltEdgeConnectionId" LIKE '168553%';

SELECT
    COUNT(*) as remaining_stale_connections
FROM "BankingConnection"
WHERE "saltEdgeConnectionId" LIKE '168553%';

-- =====================================================
-- COMMIT or ROLLBACK
-- =====================================================
-- Review the results above, then:
-- COMMIT;   -- If everything looks correct
-- ROLLBACK; -- If you need to undo

-- For safety, default to ROLLBACK
ROLLBACK;
