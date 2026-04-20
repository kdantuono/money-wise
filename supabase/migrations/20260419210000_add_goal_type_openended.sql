-- Sprint 1.5.2 WP-K — Goal Type: openended support
-- Adds goals.type TEXT column (fixed | openended) and makes goals.target nullable.
--
-- Context:
--   Sprint 1.5 migration (20260419160000_sprint_1_5_onboarding_plans.sql) created goals
--   with target NUMERIC(15,2) NOT NULL and no type column.
--   WP-K requires:
--     - goals.type to distinguish between concrete-target goals and open-ended
--       goals (e.g. Fondo Emergenza) that have no hard target amount.
--     - goals.target to be nullable: openended goals may have target = NULL.
--
-- Backward compatibility:
--   Existing rows get type = 'fixed' (DEFAULT). Their target is non-null by definition.
--   New openended goals will have type = 'openended' and target IS NULL.
--
-- CHECK constraint:
--   target IS NULL only when type = 'openended'. Fixed goals must still have target >= 0.

-- 1. Drop existing NOT NULL constraint on target (requires recreating the CHECK constraint)
ALTER TABLE goals ALTER COLUMN target DROP NOT NULL;

-- 2. Add type column (default 'fixed' for backward compat — existing rows are unaffected)
ALTER TABLE goals
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'fixed'
  CHECK (type IN ('fixed', 'openended'));

-- 3. Re-add conditional CHECK: fixed goals must have a non-null, non-negative target.
--    openended goals may have target IS NULL (no hard target).
-- Idempotent: DROP IF EXISTS prima di ADD per permettere re-run (es. DB prod
-- già aggiornato via MCP apply_migration prior ai commit landing in git).
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_target_fixed_not_null;
ALTER TABLE goals
  ADD CONSTRAINT goals_target_fixed_not_null
  CHECK (
    (type = 'openended') OR (type = 'fixed' AND target IS NOT NULL AND target >= 0)
  );

COMMENT ON COLUMN goals.type IS 'Goal type: fixed = concrete target amount required; openended = no hard target (e.g. Fondo Emergenza). Sprint 1.5.2 WP-K.';
COMMENT ON COLUMN goals.target IS 'Target amount (nullable). NULL allowed only when type = openended. Fixed goals must have target >= 0.';
