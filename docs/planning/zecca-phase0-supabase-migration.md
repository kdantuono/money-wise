# Phase 0 — Supabase Full Migration Plan

> **Created**: April 14, 2026
> **Status**: Draft — requires approval before execution
> **Prerequisite for**: All subsequent Zecca roadmap phases
> **Estimated effort**: 4-5 weeks (solo dev)

---

## 1. What We're Migrating

### Backend Inventory (current NestJS)

| Module | Files | LOC | Supabase replaces? | Action |
|--------|-------|-----|-------------------|--------|
| **Auth** (JWT, guards, strategies, password, CSRF, 2FA, lockout) | 18 files | 5,875 | **YES** — Supabase Auth | DELETE. Supabase handles JWT, MFA, email verify, password reset |
| **Accounts** (CRUD + familyId TODOs) | 7 files | ~800 | **YES** — RLS + Client SDK | DELETE. RLS policies replace 12 TODO comments |
| **Transactions** (CRUD + categorization + transfer detection) | 8 files | 1,588 | **PARTIAL** — CRUD yes, business logic stays | Categorization + transfer detection → Edge Functions |
| **Banking/SaltEdge** (provider, service, webhook, controller) | 7 files | 3,277 | **NO** — server-side API keys required | → Edge Functions (Deno) or standalone micro-service |
| **Budgets** (CRUD + validators) | 7 files | ~600 | **YES** — RLS + Client SDK | DELETE |
| **Categories** (CRUD + spending rollup) | 5 files | ~500 | **PARTIAL** — CRUD yes, rollup → DB function | Spending rollup CTE → Supabase DB function |
| **Liabilities** (CRUD + BNPL detection + installments) | 8 files | ~900 | **PARTIAL** — CRUD yes, BNPL → Edge Function | BNPL detection logic → Edge Function |
| **Scheduled** (CRUD + recurrence + calendar) | 7 files | ~800 | **PARTIAL** — CRUD yes, recurrence → DB function | Recurrence calculation → Supabase DB function |
| **Analytics** (spending reports) | 4 files | ~500 | **YES** — DB functions + Client SDK | Complex queries → Supabase DB functions |
| **Notifications** | 3 files | ~300 | **YES** — Supabase Realtime | DELETE |
| **Users** (CRUD + preferences) | 5 files | ~400 | **YES** — Supabase Auth + profiles table | DELETE |
| **Core** (Prisma, Redis, health, logging, monitoring, config) | 30+ files | ~3,000 | **YES** — Supabase infra | DELETE |
| **Database seeds** | 4 files | ~400 | Port to Supabase SQL seed | Rewrite as SQL |

### Prisma Schema: 21 models → 21 Supabase tables

All models map 1:1 to Supabase PostgreSQL tables. The schema IS the migration guide.

### What SURVIVES as custom code (Edge Functions)

| Logic | Why it can't be client-side | LOC estimate |
|-------|---------------------------|--------------|
| SaltEdge OAuth flow (initiate, complete, sync) | API keys, server-side signatures | ~400 |
| SaltEdge webhook handler | Signature verification, server endpoint | ~150 |
| Transaction categorization (pattern matching) | Shared rules, ML prep | ~300 |
| Transfer detection (A→B→C fallback) | Cross-account logic | ~150 |
| BNPL detection (10 providers) | Pattern matching | ~100 |
| Recurrence calculation | Cron-like scheduling logic | ~200 |
| Balance normalizer | Provider-specific normalization | ~200 |
| Category spending rollup (recursive CTE) | Complex SQL | ~50 (DB function) |
| Analytics aggregation queries | Complex SQL | ~100 (DB functions) |

**Total custom code after migration: ~1,650 LOC** (down from ~18,000+ in NestJS)

---

## 2. What We're NOT Migrating (stays deleted)

| Component | LOC | Why we delete it |
|-----------|-----|-----------------|
| NestJS module boilerplate (*.module.ts) | ~500 | Supabase has no modules |
| All DTOs (validation decorators) | ~2,000 | Zod on client + RLS on DB |
| All controllers (route handlers) | ~3,000 | Supabase Client SDK direct calls |
| All guards/interceptors/decorators | ~1,500 | Supabase Auth + RLS |
| Prisma service layer | ~2,000 | Supabase Client SDK |
| Config/Redis/Health/Monitoring | ~3,000 | Supabase dashboard |
| Auth system (all of it) | ~5,875 | Supabase Auth |

---

## 3. Week-by-Week Execution Plan

### Week 1: Database + Auth Foundation

**Day 1-2: Supabase project setup**
- Create Supabase project (EU region — Frankfurt)
- Convert Prisma schema to Supabase SQL migration
- Create all 21 tables with proper types, constraints, foreign keys
- Create all enums (12 enum types in current schema)
- Verify schema matches Prisma 1:1

**Day 3-4: RLS Policies (the Family multi-tenancy fix)**
- Enable RLS on ALL tables
- Write policies for each table:

```sql
-- Example: accounts table
-- Users can only see accounts belonging to their family
CREATE POLICY "Users see own family accounts"
ON accounts FOR SELECT
USING (
  family_id = (SELECT family_id FROM users WHERE id = auth.uid())
);

-- Users can insert accounts for their family
CREATE POLICY "Users insert own family accounts"
ON accounts FOR INSERT
WITH CHECK (
  family_id = (SELECT family_id FROM users WHERE id = auth.uid())
);

-- Similar for UPDATE, DELETE with role checks
-- ADMIN can manage all family data
-- MEMBER can manage own data
-- VIEWER can only SELECT
```

- Policies needed: ~40 (SELECT/INSERT/UPDATE/DELETE for ~10 core tables)
- This REPLACES: 12 familyId TODOs + transactions.service:306 hard-deny

**Day 5: Auth migration**
- Configure Supabase Auth (email/password, email verification ON)
- Create `profiles` table linked to `auth.users`
- Set up auth triggers (on signup → create family + profile)
- Configure password policy (min 12 chars, complexity)
- Test: register, login, logout, email verify, password reset

### Week 2: Seed Data + Web Frontend Auth Migration

**Day 1-2: Seed data + DB functions**
- Port `category-seed.ts` → SQL seed file
- Port `demo-seed.ts` → SQL seed file
- Create DB functions:
  - `get_category_spending_rollup(family_id, date_from, date_to)` — recursive CTE
  - `get_analytics_summary(family_id, period)` — spending aggregation
  - `calculate_next_occurrences(rule_id, count)` — recurrence calc
  - `get_balance_summary(family_id)` — net worth calculation

**Day 3-5: Web frontend auth migration**
- Replace `apps/web/src/store/auth.store.ts` → Supabase Auth hooks
- Replace `apps/web/src/lib/auth.service.ts` → `@supabase/ssr`
- Replace `apps/web/middleware.ts` → Supabase session check
- Replace all `authService.login/register/logout` calls
- Remove: JWT localStorage handling, refresh token logic, CSRF
- Test: full auth flow in browser (register → verify email → login → logout)

### Week 3: Data Layer Migration (Web)

**Day 1-2: Replace API services with Supabase client**
- Create `apps/web/src/lib/supabase.ts` (browser client + server client)
- Replace `apps/web/src/services/accounts.client.ts` → Supabase queries
- Replace `apps/web/src/services/transactions.client.ts` → Supabase queries
- Replace `apps/web/src/services/budgets.client.ts` → Supabase queries
- Replace `apps/web/src/services/categories.client.ts` → Supabase queries
- Replace `apps/web/src/services/banking.client.ts` → Edge Function calls
- Replace `apps/web/src/services/analytics.client.ts` → Supabase RPC calls

Example migration:
```typescript
// BEFORE (NestJS API call)
const response = await axios.get('/api/accounts', { headers: { Authorization: `Bearer ${token}` } });

// AFTER (Supabase direct)
const { data, error } = await supabase.from('accounts').select('*');
// RLS automatically filters by family. No token needed — session handles it.
```

**Day 3-4: Update Zustand stores**
- `apps/web/src/store/auth.store.ts` → Supabase Auth state
- `apps/web/src/store/banking.store.ts` → keep, point to Edge Functions
- `apps/web/src/stores/budget-store.ts` → Supabase queries
- `apps/web/src/stores/transaction-store.ts` → Supabase queries

**Day 5: Update remaining pages**
- Dashboard: replace `useFinancialSummary` → Supabase RPC
- Settings: replace user prefs API → Supabase direct
- Notifications: replace polling → Supabase Realtime subscription

### Week 4: Banking Edge Functions + Cleanup

**Day 1-3: SaltEdge as Edge Functions**
- `supabase/functions/banking-initiate-link/index.ts` — start OAuth
- `supabase/functions/banking-complete-link/index.ts` — complete OAuth, fetch accounts
- `supabase/functions/banking-sync/index.ts` — sync transactions
- `supabase/functions/banking-webhook/index.ts` — receive SaltEdge webhooks
- `supabase/functions/banking-revoke/index.ts` — disconnect
- Port signature verification logic from `webhook.controller.ts`
- Port SaltEdge API calls from `saltedge.provider.ts`
- Environment variables: move SaltEdge keys to Supabase secrets

**Day 4: Business logic Edge Functions**
- `supabase/functions/categorize-transaction/index.ts` — pattern matching
- `supabase/functions/detect-transfers/index.ts` — A→B→C fallback
- `supabase/functions/detect-bnpl/index.ts` — 10 provider patterns

**Day 5: Delete NestJS backend**
- Archive `apps/backend/` (git history preserves everything)
- Remove from `pnpm-workspace.yaml`
- Remove from `turbo.json`
- Update `docker-compose.dev.yml` (remove backend service, keep Redis if needed for rate limiting, or remove entirely)
- Update CI/CD workflows
- Update `CLAUDE.md`

### Week 5: Testing + Buffer

**Day 1-2: RLS policy testing**
- Test each policy: user A cannot see user B's data
- Test family isolation: family A cannot see family B
- Test role enforcement: VIEWER cannot INSERT/UPDATE/DELETE
- Test edge cases: user without family, orphaned records

**Day 3-4: Integration testing**
- Full auth flow: register → verify → login → CRUD → logout
- Banking flow: initiate → OAuth → complete → sync → revoke
- Cross-cutting: create account → add transactions → view budget → see analytics
- Mobile readiness: test Supabase client from React Native

**Day 5: Documentation + cleanup**
- Update `CLAUDE.md` with new stack
- Update `docs/planning/` with migration complete status
- Clean up old docs referencing NestJS patterns
- Update README

---

## 4. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Supabase Edge Functions (Deno) can't do everything NestJS did | MEDIUM | SaltEdge is the only complex case. If Deno blocks, use a tiny Node.js Cloud Function as fallback |
| RLS policies have bugs allowing data leakage | HIGH | Test-first: write RLS tests BEFORE migrating data. Supabase has `pgTAP` for DB testing |
| Web frontend has too many API call sites to migrate | MEDIUM | `grep -r "axios\|apiClient\|fetch.*api" apps/web/src/` to get exact count. Systematic replacement |
| Supabase free tier limits hit during dev | LOW | Free tier: 500MB DB, 1GB storage, 50K MAU. More than enough for beta |
| Team knowledge: Deno vs Node.js for Edge Functions | MEDIUM | Edge Functions are small (~100-400 LOC each). Deno is close enough to Node.js |

---

## 5. What This Eliminates From the Audit

| Audit Item | Status After Migration |
|------------|----------------------|
| C3: Family multi-tenancy (7-14 days) | **ELIMINATED** — RLS policies handle it |
| C5: Email verification (2.5 days) | **ELIMINATED** — Supabase Auth built-in |
| C2: Self-host deployment (4 days) | **REDUCED** — DB hosted, only need web deploy (Vercel) |
| C4: Admin/support MVP (4 days) | **REDUCED** — Supabase Dashboard IS the admin panel for data |
| C1: Stripe billing (2-3 weeks) | **UNCHANGED** — still needs to be built, but on cleaner foundation |
| Auth bugs (logout race, password bypass, tautology) | **ELIMINATED** — auth is not our code anymore |
| Test theater (25 excluded, tautologies) | **ELIMINATED** — no NestJS tests to exclude. New tests on RLS + E2E |
| Compliance theater (coverage targets) | **ELIMINATED** — fresh start with honest test coverage |

---

## 6. Post-Migration Stack

```
BEFORE                              AFTER
------                              -----
NestJS 11 (Express 5)               Supabase (hosted PostgreSQL + Auth + Storage + Realtime)
Prisma 6                            Supabase Client SDK (@supabase/supabase-js)
PostgreSQL (self-hosted)             PostgreSQL (Supabase-hosted, Frankfurt EU)
Redis (session, cache)               Supabase Auth sessions (no Redis needed)
Custom JWT + guards                  Supabase Auth + RLS
Custom email verification            Supabase Auth email verification
18,000+ LOC backend                  ~1,650 LOC Edge Functions
1941 tests (many unreliable)         New test suite: RLS tests + E2E

Web: Next.js 15 (unchanged)         Web: Next.js 15 + @supabase/ssr
Mobile: Expo 52 (empty)             Mobile: Expo 52 + @supabase/supabase-js
Deploy: Docker self-host             Deploy: Vercel (web) + Supabase (data) + Edge Functions
```

---

## 7. Decision Point: Edge Functions vs Micro-Service for Banking

The SaltEdge integration (~3,277 LOC in NestJS, ~400 LOC essential logic) has two migration paths:

**Option A: Supabase Edge Functions (recommended)**
- 5 small Deno functions (~100 LOC each)
- Deployed with `supabase functions deploy`
- Environment secrets via Supabase dashboard
- Pro: single platform, no separate infra
- Con: Deno runtime (not Node.js), 150s max execution time

**Option B: Standalone Node.js micro-service**
- Tiny Express/Fastify app (~500 LOC total)
- Deployed on Fly.io / Railway / Cloud Run
- Pro: familiar Node.js, no execution limits
- Con: separate deployment, separate monitoring

**Recommendation**: Start with Option A. If Deno causes friction with SaltEdge SDK, fall back to Option B. The code is small enough that rewriting between the two is ~1 day.
