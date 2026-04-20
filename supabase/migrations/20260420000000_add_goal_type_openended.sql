-- 20260420000000_add_goal_type_openended.sql
-- Sprint 1.5.1 — Issue #464
--
-- Adds goal type (fixed vs openended) for flexible allocation model.
-- Fondo Emergenza and similar "catch surplus" goals benefit from openended type
-- where target and deadline are optional.
--
-- IMPORTANT: This migration is NOT applied automatically.
-- Apply manually via: mcp__supabase__apply_migration (tier-1 confirm required).

-- 1. Add type column with default 'fixed' for full backward compatibility.
ALTER TABLE public.goals
  ADD COLUMN type TEXT NOT NULL DEFAULT 'fixed' CHECK (type IN ('fixed', 'openended'));

-- 2. Relax NOT NULL on target so openended goals can omit it.
ALTER TABLE public.goals ALTER COLUMN target DROP NOT NULL;

-- 3. Set default for target so INSERT without target still works for fixed goals
--    created outside the wizard (back-compat with existing INSERT statements).
ALTER TABLE public.goals ALTER COLUMN target SET DEFAULT NULL;

-- 4. Enforce: if type='fixed', target must be set and > 0.
ALTER TABLE public.goals
  ADD CONSTRAINT goals_fixed_requires_target CHECK (
    type = 'openended'
    OR (type = 'fixed' AND target IS NOT NULL AND target > 0)
  );

-- 5. Index for filtering goals by type (low-cost, useful for allocation queries).
CREATE INDEX IF NOT EXISTS idx_goals_type_user ON public.goals(user_id, type);

-- Verify: existing rows default to 'fixed', target remains populated.
-- No data migration required — target is still NOT NULL on all pre-migration rows.
