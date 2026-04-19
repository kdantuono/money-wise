-- Sprint 1.5 — Onboarding Piano Generato
-- Creates: goals, plans, goal_allocations (all user-scoped, no family_id per Sprint 1.5 decision 2026-04-19)
-- Advisor-validated schema (M1 gate): private.* helpers verified, UI mock column names aligned,
-- user-scoped simpler RLS (accounts dual-scope + budgets family-only patterns both rejected
-- for Sprint 1.5 — family sharing is distinct concept deferred to Sprint 3+)
--
-- RLS policies use `(SELECT auth.uid())` caching pattern per Supabase best practice
-- (lint 0003_auth_rls_initplan): prevents per-row re-evaluation of auth.uid() on large result sets.

-- 1. Enum type for goal lifecycle
CREATE TYPE goal_status AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- 2. goals — personal financial goals (user-scoped)
--    Field naming aligns with mock at apps/web/app/dashboard/goals/page.tsx
--    (target, current, priority) for minimal dashboard refactor during integration phase.
CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target NUMERIC(15,2) NOT NULL CHECK (target >= 0),
    current NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (current >= 0),
    deadline DATE,
    priority SMALLINT NOT NULL CHECK (priority BETWEEN 1 AND 3),
    monthly_allocation NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (monthly_allocation >= 0),
    status goal_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_goals_user_status ON goals(user_id, status);
CREATE TRIGGER handle_goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
COMMENT ON TABLE goals IS 'Personal financial goals (user-scoped). Sprint 1.5 Onboarding Piano Generato.';
COMMENT ON COLUMN goals.priority IS 'SMALLINT 1-3 (1=highest, 3=lowest). Algo-friendly math ops; UI maps 1->Alta, 2->Media, 3->Bassa.';

-- 3. plans — onboarding-generated financial plan (one-per-user snapshot)
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    monthly_income NUMERIC(15,2) NOT NULL CHECK (monthly_income > 0),
    monthly_savings_target NUMERIC(15,2) NOT NULL CHECK (monthly_savings_target >= 0),
    essentials_pct NUMERIC(5,2) NOT NULL DEFAULT 50 CHECK (essentials_pct BETWEEN 0 AND 100),
    income_after_essentials NUMERIC(15,2) NOT NULL CHECK (income_after_essentials >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER handle_plans_updated_at BEFORE UPDATE ON plans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
COMMENT ON TABLE plans IS 'Onboarding-generated financial plan (1:1 user, UNIQUE user_id). Atomic snapshot of income + savings + essentials allocation.';

-- 4. goal_allocations — per-goal monthly allocation within a plan (algo output)
CREATE TABLE goal_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    monthly_amount NUMERIC(15,2) NOT NULL CHECK (monthly_amount >= 0),
    deadline_feasible BOOLEAN NOT NULL DEFAULT true,
    reasoning TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(plan_id, goal_id)
);
CREATE INDEX idx_goal_allocations_plan ON goal_allocations(plan_id);
CREATE INDEX idx_goal_allocations_goal ON goal_allocations(goal_id);
COMMENT ON TABLE goal_allocations IS 'Per-goal monthly allocation within a plan. Algo output fields: monthly_amount + deadline_feasible + reasoning (explainable).';

-- 5. RLS enable
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_allocations ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies — goals (user-scoped, no role check: personal data fully owned)
CREATE POLICY "Users view own goals" ON goals FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users create own goals" ON goals FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users update own goals" ON goals FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users delete own goals" ON goals FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- 7. RLS policies — plans (user-scoped)
CREATE POLICY "Users view own plans" ON plans FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users create own plans" ON plans FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users update own plans" ON plans FOR UPDATE USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users delete own plans" ON plans FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- 8. RLS policies — goal_allocations (delegated via plan ownership)
CREATE POLICY "Users view own allocations" ON goal_allocations FOR SELECT USING (
    plan_id IN (SELECT id FROM plans WHERE user_id = (SELECT auth.uid()))
);
CREATE POLICY "Users create own allocations" ON goal_allocations FOR INSERT WITH CHECK (
    plan_id IN (SELECT id FROM plans WHERE user_id = (SELECT auth.uid()))
);
CREATE POLICY "Users update own allocations" ON goal_allocations FOR UPDATE USING (
    plan_id IN (SELECT id FROM plans WHERE user_id = (SELECT auth.uid()))
) WITH CHECK (
    plan_id IN (SELECT id FROM plans WHERE user_id = (SELECT auth.uid()))
);
CREATE POLICY "Users delete own allocations" ON goal_allocations FOR DELETE USING (
    plan_id IN (SELECT id FROM plans WHERE user_id = (SELECT auth.uid()))
);
