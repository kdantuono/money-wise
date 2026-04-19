-- Sprint 1.5 — Fix goal_allocations RLS to validate goal_id ownership
--
-- Copilot review PR #455 identified cross-tenant attack vector: original RLS
-- policies for INSERT and UPDATE on goal_allocations checked only plan_id
-- ownership, NOT goal_id ownership. This allowed an authenticated user (owning
-- their own plan) to insert/update an allocation row whose goal_id references
-- another user's goal UUID — leaking attribute association across tenants.
--
-- Fix: extend WITH CHECK clauses to assert goal_id is also owned by the caller.
-- SELECT and DELETE policies are left unchanged; they only need plan ownership
-- because goal_allocations rows only exist if they were previously written via
-- INSERT/UPDATE (which are now properly gated).
--
-- Refs: PR #455 Copilot review comments 3107224217 (INSERT) + 3107224255 (UPDATE).

DROP POLICY IF EXISTS "Users create own allocations" ON goal_allocations;
DROP POLICY IF EXISTS "Users update own allocations" ON goal_allocations;

CREATE POLICY "Users create own allocations" ON goal_allocations FOR INSERT WITH CHECK (
    plan_id IN (SELECT id FROM plans WHERE user_id = (SELECT auth.uid()))
    AND goal_id IN (SELECT id FROM goals WHERE user_id = (SELECT auth.uid()))
);

CREATE POLICY "Users update own allocations" ON goal_allocations FOR UPDATE USING (
    plan_id IN (SELECT id FROM plans WHERE user_id = (SELECT auth.uid()))
    AND goal_id IN (SELECT id FROM goals WHERE user_id = (SELECT auth.uid()))
) WITH CHECK (
    plan_id IN (SELECT id FROM plans WHERE user_id = (SELECT auth.uid()))
    AND goal_id IN (SELECT id FROM goals WHERE user_id = (SELECT auth.uid()))
);
