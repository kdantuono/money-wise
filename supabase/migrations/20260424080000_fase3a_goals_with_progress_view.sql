-- Sprint 1.6.6 Fase 3a — goals_with_progress VIEW (balance-driven goal progress)
--
-- Closes atomic note #043. Chiude semantica Fase 2 feature ciclo account↔goal
-- linking: dopo che Fase 2A+2B hanno shipped il FK link, serve il calcolo
-- effective che somma i balance degli account/liability linked al goal.current
-- manuale per ottenere il progresso reale.
--
-- Formula effective_current:
--   goal.current (manual baseline)
--   + SUM(accounts.current_balance WHERE accounts.goal_id = goal.id)
--   - SUM(liabilities.current_balance WHERE liabilities.goal_id = goal.id)
--
-- Semantica:
--   - Goal non-linked: effective = manual (fallback Fase 2C)
--   - Savings goal con account linked (es. Poste €1200 → Fondo Emergenza):
--       effective = manual + €1200
--   - Debt goal con liability linked (es. "Estingui CC" target €0, current=0,
--     liability CC balance €500): effective = 0 + 0 - 500 = -500
--     (progresso inverso: più alto current_balance liability = più debito residuo)
--
-- Security: view SECURITY INVOKER (PG15+ default). RLS policies su goals /
-- accounts / liabilities applicano transitively. Nessun bypass.
--
-- Performance: indici esistenti idx_accounts_goal + idx_liabilities_goal
-- (partial WHERE goal_id IS NOT NULL, Sprint 1.6 Fase 2A) coprono i lookup.

CREATE VIEW public.goals_with_progress
WITH (security_invoker = true)
AS
SELECT
  g.id,
  g.user_id,
  g.name,
  g.target,
  g.current,
  g.deadline,
  g.priority,
  g.monthly_allocation,
  g.status,
  g.type,
  g.created_at,
  g.updated_at,
  g.current + COALESCE(
    (SELECT SUM(a.current_balance)
       FROM public.accounts a
       WHERE a.goal_id = g.id),
    0
  ) - COALESCE(
    (SELECT SUM(l.current_balance)
       FROM public.liabilities l
       WHERE l.goal_id = g.id),
    0
  ) AS effective_current
FROM public.goals g;

COMMENT ON VIEW public.goals_with_progress IS
  'Sprint 1.6.6 Fase 3a: goals with balance-driven effective_current (manual + linked accounts - linked liabilities). Closes atomic #043.';

-- Grant SELECT to authenticated role (RLS su goals/accounts/liabilities applies).
GRANT SELECT ON public.goals_with_progress TO authenticated;
