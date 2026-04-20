# Sprint 1.5.3 — 3-Pool Budget Model: Migration & Rollback Runbook

**Status**: active (post-merge tracking)
**Feature flag**: `NEXT_PUBLIC_ENABLE_3POOL_MODEL`
**Related**: Sprint 1.5.3 spec (in Obsidian vault `~/vault/moneywise/planning/sprint-1-5-3-spec.md`, not committed to repo) · [ADR-004](../../decisions/adr-004-banking-strategy-gated-by-piva.md) (pattern riferimento)

## Context

Sprint 1.5.3 WP-Q3 refactora `computeAllocation` da single-pool a 3-pool model (lifestyle locked-info + savings + investments). Change comportamentale significativo in Step 4 onboarding + `/onboarding/plan?mode=edit`.

## Data migration: NESSUNA richiesta

**Scoperta chiave (2026-04-21)**: la funzione `computeAllocation` è **pura** e calcolata on-the-fly ogni volta che il wizard viene aperto. Le allocation persistite in DB sono **per-goal** (tabella `goal_allocations`: `goal_id`, `monthly_amount`, `deadline_feasible`, `reasoning`), NON un JSON blob `allocation_result`.

Conseguenza: utenti esistenti con plan pre-Q3 hanno comunque `goal_allocations` per-goal correttamente persistiti. Quando il wizard si apre in edit mode, `hydrateFromPlan` carica goals + allocations individuali e il wizard ri-calcola `computeAllocation` ex-novo. Con flag ON il nuovo calcolo produce `pools` breakdown; con flag OFF produce il result legacy.

**Non serve né read-adapter né SQL migration**: il DB non cambia schema, nessun backfill, nessuna compat reshape.

## Rollout procedure

1. **Pre-merge**: verifica tutti test verdi (39 unit allocation + 30 inferGoalType + E2E pool-split).
2. **Merge PR**: squash merge su `develop`.
3. **Deploy Vercel automatico**: branch deploy `develop` → staging. Verifica smoke test manuale:
   - Apri onboarding con user scenario 2250/80%/120/300/20
   - Step 4 mostra 3 pool sections distinte (savings / investments / lifestyle)
   - Avanti abilitato (no hardBlock)
   - Persist plan → reload → 3 pool visibili
4. **Production cutover**: promuovi `develop` → `main` via deliberate PR (bi-weekly cadence). Flag default `true` in `.env.production` → tutti gli utenti vedono 3-pool behavior.
5. **Telemetry watch** (14 giorni): monitora Sentry per errori matching `AllocationResult.pools.*`, onboarding completion rate, `loadPlan()` error rate.

## Rollback: flag OFF

### Scenario trigger (qualsiasi di):

- (a) `loadPlan()` error rate **> 2%** sustained 10min
- (b) Onboarding completion rate cala **> 10 pp** vs baseline 7-giorni
- (c) Sentry error matching `AllocationResult.pools.*` o `Cannot read properties of undefined (reading 'pools')`

### Azione rollback (build-time flag, pre-beta):

```bash
# Via Vercel dashboard:
# 1. Environments → Production → Edit NEXT_PUBLIC_ENABLE_3POOL_MODEL=false
# 2. Redeploy (trigger manual redeploy of last good commit)
# Expected: ~2-3 min total downtime while redeploy propagates
```

### Post-rollback:

1. `_is3PoolEnabled()` in `apps/web/src/lib/onboarding/allocation.ts` returns false → dispatcher routes to legacy single-pool path via `_computeSinglePool(goals, monthlySavingsTarget, incomeAfterEssentials, emitCapWarning=true, now)`, preservando comportamento Sprint 1.5.2
2. Utenti non vedono pools breakdown ma allocation base funziona
3. `goal_allocations` DB intatto (nessuna perdita)
4. File issue su GitHub con Sentry trace + repro scenario
5. Triage root cause + fix forward in branch dedicato + re-flip flag ON

## Runtime flag escalation (post-beta)

Se post-beta (> 20 utenti) SLA rollback richiede < 1 minuto:

1. Crea Supabase table `app_config(key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ)`.
2. Row: `('three_pool_enabled', 'true', now())`.
3. Refactor `_is3PoolEnabled()` in `allocation.ts` per leggere da Supabase (server-side only, React server component).
4. Rollback via single row update: `UPDATE app_config SET value='false' WHERE key='three_pool_enabled'` — effettivo in < 1 min cache invalidation.

**Attenzione**: runtime flag complica test harness (vi.stubEnv non applicabile a Supabase read). Valutare trade-off SLA vs test ergonomics prima di switchare.

## Flag removal cadence

**Target removal**: 14 giorni post-merge + zero regression Sentry matching `AllocationResult.pools.*` + ≥ 95% new-path traffic (telemetry `allocation.computed` event con variant dimension).

### Removal procedure:

1. Elimina `_is3PoolEnabled()` helper + il conditional `if (!_is3PoolEnabled()) return legacy...` dispatcher branch da `apps/web/src/lib/onboarding/allocation.ts` — il file mantiene solo il 3-pool path inline nella funzione `computeAllocation` esportata, chiamando `_computeSinglePool` due volte (savings + investments)
2. Rimuovi `NEXT_PUBLIC_ENABLE_3POOL_MODEL` da `apps/web/.env.example`
3. Aggiorna `computeAllocation` jsdoc: "3-pool behavior permanent since 2026-05-05"
4. Rimuovi `describe('computeAllocation — 3-pool model')` wrapper — i test diventano parte del flow principale
5. Rimuovi `emitCapWarning` parametro da `_computeSinglePool` (legacy-only behavior, post-removal il caller chiama sempre con `false`)
6. PR dedicata `chore(onboarding): remove ENABLE_3POOL_MODEL feature flag (post-stability)`

## Dev / test user cleanup (Opzione D fallback)

Se un dev/test user ha plan pre-Q3 in locale che non round-trippa correttamente:

```bash
# Via Supabase CLI (authenticated):
supabase sql <<EOF
-- WARNING: distruttivo, solo per dev users identificabili
DELETE FROM goal_allocations
 WHERE plan_id IN (SELECT id FROM plans WHERE user_id = '<dev-user-uuid>');
DELETE FROM goals WHERE user_id = '<dev-user-uuid>';
DELETE FROM plans WHERE user_id = '<dev-user-uuid>';
UPDATE profiles SET onboarded = false WHERE id = '<dev-user-uuid>';
EOF
```

User forzato al re-onboarding con nuovo 3-pool flow. Accettabile **solo** pre-beta su dev users noti, mai su beta/prod users.
