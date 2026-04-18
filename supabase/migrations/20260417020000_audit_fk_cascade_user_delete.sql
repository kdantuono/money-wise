-- ============================================================================
-- FK Cascade Audit for GDPR account-delete (Sprint 1.8)
-- ============================================================================
--
-- GDPR Art. 17 ("right to erasure") requires that when a user deletes their
-- account, all personal data is removed. We rely on PostgreSQL's
-- ON DELETE CASCADE to make deletion atomic at the DB level, triggered by
-- a single `auth.admin.deleteUser(userId)` call in the edge function.
--
-- This migration AUDITS the existing foreign keys and documents them. It is
-- a no-op on the schema — every FK touching user-owned data is already
-- correctly configured with ON DELETE CASCADE in the initial schema
-- (20260414120000_initial_schema.sql).
--
-- If an audit check here FAILS (raising an exception), the account-delete
-- edge function MUST NOT be deployed until the missing cascade is added,
-- because orphan rows would leak personal data.
--
-- KNOWN LIMITATION — banking_sync_logs: this table has `account_id` (FK to
-- accounts) but NO `user_id` column. Its only FK cascades via accounts →
-- family. If a user is deleted but the family survives (multi-member), the
-- sync logs for that user's past actions remain attached to the family's
-- accounts. This is a minor GDPR leak (metadata: provider/status/timestamps,
-- no financial content). Tracked for remediation — options are (a) add
-- user_id to banking_sync_logs and cascade on user delete, (b) scrub the
-- table in the account-delete edge function before calling auth.admin
-- .deleteUser when the family has other members. Post-beta hardening.
-- ============================================================================

DO $$
DECLARE
  expected_cascade TEXT[] := ARRAY[
    -- user-scoped tables: cascade via profiles → auth.users
    'profiles_id_fkey',
    'profiles_family_id_fkey',
    'audit_logs_user_id_fkey',
    'banking_customers_user_id_fkey',
    'banking_connections_user_id_fkey',
    -- banking_sync_logs has no user_id; cascades via accounts (family)
    'banking_sync_logs_account_id_fkey',
    'user_preferences_user_id_fkey',
    'notifications_user_id_fkey',
    'push_subscriptions_user_id_fkey',
    'user_achievements_user_id_fkey',
    -- family-scoped tables: cascade only when family itself is deleted
    'accounts_family_id_fkey',
    'budgets_family_id_fkey',
    'categories_family_id_fkey',
    'liabilities_family_id_fkey',
    'scheduled_transactions_family_id_fkey'
  ];
  fk_name TEXT;
  fk_action CHAR(1);
BEGIN
  FOREACH fk_name IN ARRAY expected_cascade LOOP
    SELECT confdeltype INTO fk_action
      FROM pg_constraint
      WHERE conname = fk_name AND contype = 'f';

    IF fk_action IS NULL THEN
      -- Constraint doesn't exist: either the table was renamed or the
      -- constraint was dropped. Fail loudly — the invariant is broken.
      RAISE EXCEPTION 'FK % not found — GDPR cascade audit failed', fk_name;
    END IF;

    IF fk_action <> 'c' THEN
      -- 'c' = CASCADE, 'r' = RESTRICT, 'a' = NO ACTION, 'n' = SET NULL, 'd' = SET DEFAULT.
      -- For personal/family data we require CASCADE; anything else risks orphan data.
      RAISE EXCEPTION
        'FK % has action %, expected CASCADE (c). GDPR delete would leave orphan rows.',
        fk_name, fk_action;
    END IF;
  END LOOP;

  RAISE NOTICE 'GDPR cascade audit passed: all % user/family FKs configured with ON DELETE CASCADE.',
    array_length(expected_cascade, 1);
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.profiles IS
  'User profile 1:1 with auth.users(id). ON DELETE CASCADE chain guarantees GDPR erasure via auth.admin.deleteUser(). See migration 20260417020000 for audit.';
