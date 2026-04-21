-- Sprint 1.6.5 Fase 2A — Account/Liability ↔ Goal linking (cardinality 1:N)
--
-- Abilita goal progress tracking via balance aggregation (Fase 3a successiva).
-- Cardinality scelta (plan ultrathink 2026-04-21 Q4 approved):
--   1 goal can have N accounts (savings distribuiti cross-banca)
--   1 goal can have N liabilities (payoff multipli finanziamenti)
--   1 account/liability has 0-1 goal (FK nullable)
--
-- Design decisions (ultrathink 2026-04-21):
--   - FK NULL default: backward-compat zero breaking per dati esistenti
--   - ON DELETE SET NULL: delete goal non distrugge account/liability, solo unlink
--   - Partial index goal_id IS NOT NULL: performance query balance aggregation
--   - RLS extension: goal_id ownership check consistency (prevent cross-user linking)
--
-- Scenarios abilitati:
--   A) 1 savings dedicato → Fondo Emergenza
--   E) CC → "Estingui debito CC" (liability_type CREDIT_CARD)
--   F) Finanziamento → "Estingui debito auto" (liability_type LOAN)
--   G) Transfer checking→savings tracked via linked savings account
--   H) 1 goal Casa split su N accounts (savings + invest distribuiti)

-- ============================================================================
-- 1. Add accounts.goal_id + index
-- ============================================================================
ALTER TABLE accounts
    ADD COLUMN goal_id UUID NULL REFERENCES goals(id) ON DELETE SET NULL;

CREATE INDEX idx_accounts_goal ON accounts(goal_id) WHERE goal_id IS NOT NULL;

COMMENT ON COLUMN accounts.goal_id IS 'Optional link to goal for auto-progress tracking (Sprint 1.6 Fase 2). NULL = not linked (goal.current editable manual).';

-- ============================================================================
-- 2. Add liabilities.goal_id + index
-- ============================================================================
ALTER TABLE liabilities
    ADD COLUMN goal_id UUID NULL REFERENCES goals(id) ON DELETE SET NULL;

CREATE INDEX idx_liabilities_goal ON liabilities(goal_id) WHERE goal_id IS NOT NULL;

COMMENT ON COLUMN liabilities.goal_id IS 'Optional link to payoff goal. Goal.current = target - liability.current_balance formula (sign inversion per debt reduction semantics).';

-- ============================================================================
-- 3. RLS extension — accounts: goal_id ownership on INSERT/UPDATE
-- ============================================================================
-- Rationale: without check, authenticated user could link own account to another
-- user's goal_id, creating cross-user data leak. Mirror of sprint 1.5
-- goal_allocations RLS ownership fix.
--
-- Accounts dual ownership: personal (user_id) XOR family (family_id). goal_id is
-- always personal (goals.user_id check). Member role gates write path.

DROP POLICY IF EXISTS "Members can create accounts" ON accounts;
DROP POLICY IF EXISTS "Members can update accessible accounts" ON accounts;

CREATE POLICY "Members can create accounts"
  ON accounts FOR INSERT
  WITH CHECK (
    (user_id = auth.uid() OR family_id = private.get_my_family_id())
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
    AND (
      goal_id IS NULL
      OR goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Members can update accessible accounts"
  ON accounts FOR UPDATE
  USING (
    (user_id = auth.uid() OR family_id = private.get_my_family_id())
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  )
  WITH CHECK (
    (user_id = auth.uid() OR family_id = private.get_my_family_id())
    AND (
      goal_id IS NULL
      OR goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid())
    )
  );

-- ============================================================================
-- 4. RLS extension — liabilities: goal_id ownership check
-- ============================================================================
-- Liabilities family-scoped. goal_id check via goals.user_id (personal goals
-- linked to family liability è acceptable — user owns the goal + è member della
-- family che possiede liability).

DROP POLICY IF EXISTS "Members can create liabilities" ON liabilities;
DROP POLICY IF EXISTS "Members can update family liabilities" ON liabilities;

CREATE POLICY "Members can create liabilities"
  ON liabilities FOR INSERT
  WITH CHECK (
    family_id = private.get_my_family_id()
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
    AND (
      goal_id IS NULL
      OR goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Members can update family liabilities"
  ON liabilities FOR UPDATE
  USING (
    family_id = private.get_my_family_id()
    AND private.get_my_role() IN ('ADMIN', 'MEMBER')
  )
  WITH CHECK (
    family_id = private.get_my_family_id()
    AND (
      goal_id IS NULL
      OR goal_id IN (SELECT id FROM goals WHERE user_id = auth.uid())
    )
  );
