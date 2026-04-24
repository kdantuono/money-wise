-- ADR-005 Fase 2.1 — financial_instruments VIEW (Patrimonio foundation)
--
-- Implements design ~/vault/moneywise/research/adr-005-fase-2-1-design.md.
-- Closes Fase 2.1 foundation task (Sprint 1.6.6 Fase 2 execution).
--
-- Scope:
--   - UNION ALL accounts (class='ASSET', filtered) + liabilities (class='LIABILITY')
--   - security_invoker = true → RLS transitive da tabelle base (zero bypass)
--   - Filter accounts.type NOT IN (CREDIT_CARD, LOAN, MORTGAGE) — legacy USA-style
--     debit accounts NON contano come asset (doppio tracking con liabilities).
--
-- Formula net worth (client-side, Fase 2.1):
--   SUM(current_balance WHERE class='ASSET') - SUM(current_balance WHERE class='LIABILITY')
--   Convenzione italiana: current_balance positivo sia per asset sia per debito;
--   il segno è gestito nella formula, non nel dato.
--
-- Migration SAFE:
--   - Additive-only (CREATE VIEW)
--   - Zero data migration
--   - Rollback: DROP VIEW IF EXISTS public.financial_instruments (idempotent)
--
-- Security: VIEW con security_invoker=true (PG15+). RLS policies su accounts +
-- liabilities applicano transitively al caller. Nessun bypass.
--
-- Performance: UNION ALL (no sort+dedup) ~0.1ms per scala beta (N<20 row).
-- Indici esistenti: idx_accounts_user_id, idx_accounts_family_id,
-- idx_liabilities_family_status coprono RLS filter.

-- Preconditions
DO $$ BEGIN
  ASSERT (SELECT current_setting('server_version_num')::int >= 150000),
    'PostgreSQL 15+ required for security_invoker VIEW option';
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='accounts' AND column_name='goal_id'),
    'Fase 2A migration (accounts.goal_id) must precede ADR-005 Fase 2.1';
  ASSERT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='liabilities' AND column_name='goal_id'),
    'Fase 2A migration (liabilities.goal_id) must precede ADR-005 Fase 2.1';
END $$;

CREATE VIEW public.financial_instruments
WITH (security_invoker = true)
AS
SELECT
  a.id                                        AS id,
  'ASSET'::text                               AS class,
  a.type::text                                AS type,
  a.user_id                                   AS user_id,
  a.family_id                                 AS family_id,
  a.name                                      AS name,
  a.current_balance                           AS current_balance,
  a.currency                                  AS currency,
  NULL::numeric(15,2)                         AS original_amount,
  a.credit_limit                              AS credit_limit,
  NULL::numeric(5,2)                          AS interest_rate,
  NULL::numeric(15,2)                         AS minimum_payment,
  a.goal_id                                   AS goal_id,
  a.status::text                              AS status,
  a.institution_name                          AS institution_name,
  a.created_at                                AS created_at,
  a.updated_at                                AS updated_at
FROM public.accounts a
WHERE a.type NOT IN ('CREDIT_CARD','LOAN','MORTGAGE')

UNION ALL

SELECT
  l.id                                        AS id,
  'LIABILITY'::text                           AS class,
  l.type::text                                AS type,
  NULL::uuid                                  AS user_id,
  l.family_id                                 AS family_id,
  l.name                                      AS name,
  l.current_balance                           AS current_balance,
  l.currency                                  AS currency,
  l.original_amount                           AS original_amount,
  l.credit_limit                              AS credit_limit,
  l.interest_rate                             AS interest_rate,
  l.minimum_payment                           AS minimum_payment,
  l.goal_id                                   AS goal_id,
  l.status::text                              AS status,
  NULL::varchar(255)                          AS institution_name,
  l.created_at                                AS created_at,
  l.updated_at                                AS updated_at
FROM public.liabilities l;

COMMENT ON VIEW public.financial_instruments IS
  'ADR-005 Fase 2.1: unified read-only view su accounts (ASSET, excluded legacy CC/LOAN/MORTGAGE) + liabilities (LIABILITY). security_invoker delega RLS alle tabelle base. Closes Sprint 1.6.6 Fase 2 foundation.';

GRANT SELECT ON public.financial_instruments TO authenticated;
