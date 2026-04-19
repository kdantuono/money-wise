-- Sprint 1.5 — defense-in-depth: extend goal_id ownership check to SELECT + DELETE
-- policies of goal_allocations.
--
-- Copilot review PR #455 (post 20260419180000 INSERT/UPDATE fix): even though
-- INSERT/UPDATE now gate on both plan_id AND goal_id, SELECT and DELETE still
-- only checked plan_id. If legacy rows or direct DB writes created an allocation
-- row linking a user's plan to another user's goal_id, SELECT could read it and
-- DELETE could remove another user's goal-linked row. Defense-in-depth: lock
-- down all 4 CRUD verbs symmetrically.
--
-- Refs: PR #455 Copilot comment 3107291699.

DROP POLICY IF EXISTS "Users view own allocations" ON goal_allocations;
DROP POLICY IF EXISTS "Users delete own allocations" ON goal_allocations;

CREATE POLICY "Users view own allocations" ON goal_allocations FOR SELECT USING (
    plan_id IN (SELECT id FROM plans WHERE user_id = (SELECT auth.uid()))
    AND goal_id IN (SELECT id FROM goals WHERE user_id = (SELECT auth.uid()))
);

CREATE POLICY "Users delete own allocations" ON goal_allocations FOR DELETE USING (
    plan_id IN (SELECT id FROM plans WHERE user_id = (SELECT auth.uid()))
    AND goal_id IN (SELECT id FROM goals WHERE user_id = (SELECT auth.uid()))
);
