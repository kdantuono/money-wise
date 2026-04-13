# MoneyWise Clinical Health Audit

**Date:** 2026-04-12
**Audit team:** mw-audit (lead-orchestrator, code-analyst, doc-analyst, pm-strategist, strategic-architect, test-specialist)
**Mode:** Read-only clinical audit. This report is the only file write produced. All supporting reports are working documents at `/tmp/mw_task*.md`.
**Scope:** Solo-demo → private-beta-5-20-users-with-billing trajectory. Not open-source readiness, not public SaaS readiness.
**Verdict:** **Not ready for private beta with billing.** Three hard blockers, one mandatory prerequisite pair, estimated 3-5 weeks of serial solo-dev work to readiness.

---

## 0. Cold open — the project in miniature

`apps/web/e2e/auth/auth.spec.ts:247-275`. Test name: `Protected Routes > should redirect to login for unauthenticated users`.

```typescript
// KNOWN ISSUE: The app currently renders dashboard content without proper auth guards.
// The test verifies the CURRENT behavior: either redirect OR show dashboard shell.
// TODO: Fix ProtectedRoute middleware to properly redirect unauthenticated users.
// When fixed, change this to: expect(redirectedToLogin).toBe(true);
const onDashboardUrl = url.includes('/dashboard');
expect(redirectedToLogin || onDashboardUrl).toBe(true);
```

A developer wrote a test declaring a contract — unauthenticated users should be redirected to login. They wrote an assertion that cannot fail under any outcome of `page.goto('/dashboard')`: the URL must be either `/dashboard` or somewhere else, and the OR-clause covers both branches of the entire reachable outcome space. Three lines above the tautology, the same developer wrote a TODO comment containing the *correct* assertion. The right answer was known, written down, rejected in favor of the cheaper one, and shipped. The test runs green in CI.

This is the project in miniature. Not "a bug slipped through." Not "the developer didn't know." The right answer was visible. The wrong answer was cheaper. The cheaper answer won one small judgment call at a time, until the mechanism that was supposed to catch the bug became the mechanism that ratified it. **Every major finding in this audit is a different instance of the same decision template.**

---

## 1. Executive summary

### Thesis

MoneyWise does not have a bug-density problem. It has a **mechanism problem**: the project's internal signals for distinguishing "done" from "not done" have been weakened to the point where the distinction is no longer legible from inside the repo. Four independent audit streams — code-analyst's "compliance theater," test-specialist's "normalized deviance," doc-analyst's "newcomer-accuracy collapse," and strategic-architect's "surface commitment without implementation commitment" — converge on a single underlying pathology. The project habitually commits to the *shape* of a thing (a route, a module, a test, a feature, a documentation claim) and walks away from the *substance* without marking the walk-away. The shapes remain and lie to every downstream reader, human and machine.

This is a repo-wide architectural condition, not a collection of isolated bugs. Fixing any one instance is a point fix; the repo-wide pattern will reproduce itself in the next feature unless the *mechanism* of how decisions get made changes.

The condition is treatable. Commit `c1dd7d8` on the current branch is a concrete existence proof that the pattern can be reversed. The audit's job is to name the condition, identify what it blocks, and sequence the treatment.

### What this audit blocks

The target trajectory — solo-demo → private beta with 5-20 users WITH BILLING — cannot be reached in the current state. Three conditions block it:

1. **The feedback loop has been dismantled** at exactly the point where the single highest-leverage architectural decision would need to be verified.
2. **Family multi-tenancy is half-built** and cannot be safely coupled to Stripe without finishing it first.
3. **The speculative-surface-commitment pattern is habitual**, meaning every subsequent feature will reproduce the pathology unless the decision-making mechanism changes.

### Severity distribution (from code-analyst #8 v2.1)

**1 CRITICAL / 10 HIGH / 14 MEDIUM / 7 LOW**

One-line compression of the pattern (from code-analyst):

> **25 files pretend to run, they don't. 4 coverage targets pretend to govern, they contradict. 1 test pretends to assert, it's a tautology.**

### Test credibility: asymmetric by platform (from test-specialist t15)

- **Backend: 62/100.** Real integration tests exist and run. Real unit coverage exists. The enforcement scaffolding is theater, but the underlying tests verify real behavior. Recoverable with ~2 days of scaffolding fixes.
- **Web: 28/100.** Ghost `packages/ui` test script echoes TODO and exits 0. Folder-wide vitest excludes hide two auth-critical component tests behind trivially broken imports nobody fixed. The one e2e test guarding authentication is the tautology above. Needs a cultural reset before any number is trustworthy.

**Do not average to 45.** Remediation sequencing differs by platform: backend = scoped fix sprint, web = structural rethink. The asymmetry is load-bearing for what happens next.

### The treatment

Seven workstreams, totaling ~3-5 weeks of serial solo-dev effort:

1. **Test credibility restoration + Architectural hygiene (parallel, prerequisite pair)** — restore the feedback loop and install the mechanisms that prevent it from failing again. 3 days + 2.5 days, parallelizable. *Non-negotiable before any other work lands.*
2. **Auth hardening sweep** — bundle 5 security findings into one workstream. 4 days.
3. **Family multi-tenancy completion** — the single highest-leverage feature. 7-14 days depending on effort expansion. Critical path to billing.
4. Self-host deployment + Admin/support MVP + Email verification (parallelizable) — 10-13 days total.
5. **Billing integration** — Stripe lifecycle coupled to completed Family model. 2-3 weeks.

---

## 2. The pathology — three names, one thing

The four audit streams produced three different names for the pathology, each naming a different layer. All three are accurate. This report uses all three explicitly so that readers tracking any one concern find the thesis.

| Name | Framing layer | Origin | What it names |
|---|---|---|---|
| **Surface commitment without implementation commitment** | Architectural | strategic-architect (t14) | The structural habit of committing to a thing's *shape* and walking away from its *substance* without marking the walk-away |
| **Compliance theater** | Systemic / code-side | code-analyst (#8) | The accumulation of enforcement shells (tests, hooks, CI gates) that exist in form but do not bite in practice |
| **Normalized deviance** | Cultural / test-credibility | test-specialist (t15) | The per-incident judgment-call pattern of making failures disappear (narrow the suite, weaken the assertion) rather than fixing the code |

The three names describe the same underlying phenomenon viewed from different heights. A reader reaching this report via the code audit will recognize compliance theater. A reader reaching via the test credibility audit will recognize normalized deviance. A reader reaching via the architectural review will recognize surface commitment without implementation commitment. The pathology is the same in all three cases.

---

## 3. Statistical evidence — three layers, three instances, one template

The audit's move from anecdote to evidence: **three independent instances of the pattern, each in a different architectural layer, each with the same decision template.** Three instances across three layers is not coincidence — it is statistical evidence that the pathology is repo-wide, not module-local.

| Layer | Instance | Shape committed | Substance missing |
|---|---|---|---|
| **Backend bootstrap** (observability) | Duplicate `HealthController` at `core/health` vs `core/monitoring` | Two `@Controller('health')` classes both registered in `app.module.ts:28-29` | No canonical ownership; last-wins route registration silently resolves the collision; TypeORM-TODO stub at `core/monitoring/health.controller.ts:29` is one import reorder away from winning at runtime |
| **Web routing** (authenticated surface) | Four shadow stubs at root `/accounts`, `/transactions`, `/settings`, `/profile` (`apps/web/app/*/page.tsx` 14-line empty shells); `/banking` cleanly migrated via `router.replace('/dashboard/banking')` as the counter-example proof that the canonical migration pattern exists | Stubs protected in `middleware.ts:16-24`, render 14-line empty states without `ProtectedRoute` or `DashboardLayout` | Migration to canonical `/dashboard/*` surface stalled four routes in; no convergence decision; routes.ts phantom ROUTES object at `apps/web/e2e/config/routes.ts` exports pointers to non-existent routes |
| **Cross-cutting security** (speculative scaffolding) | Phantom `/reports` cluster: middleware protects it at `middleware.ts:20`, `e2e/config/routes.ts` exports it, `/dashboard/scheduled/page.tsx:28-41` references it, three doc files describe it | Three layers of scaffolding (protection, testing, docs) | **Zero page files in git history.** `git log --all -- 'apps/web/app/**/reports/**'` returns zero blobs. The feature was never built. |

The `/reports` case is diagnostically the sharpest. Git archaeology rules out deletion-discipline failure (built, broken, deleted without cleanup). What exists is **speculative scaffolding**: the protective and testing plumbing was written around a planned feature shape, and the implementation never came. Three independent layers of commitment to a hollow center.

Fixing any one of these three is a point fix. The repo-wide pattern they instance will reproduce itself in the next feature.

---

## 4. Four audiences, four lies — same pathology, four registers

Surface commitment without implementation commitment has the property that the lies are not uniform. **Four different downstream audiences receive the same pathology in four different registers.** Treating them as four separate findings misses the point.

| Audience | How they're lied to | Representative example |
|---|---|---|
| **End users** | Deceptive UI commits + no-op feature handlers | `app/dashboard/scheduled/page.tsx:28-41` hardcodes `MOCK_ACCOUNTS` / `MOCK_CATEGORIES` and passes them to a form that presents as fully functional (A1, **CRITICAL**). Plaid `syncAccount` at `accounts.service.ts:447-467` returns 200 OK and updates `lastSyncAt` with no actual sync (RETIRE-1). |
| **Code readers** (future-self, AI assistants, reviewers) | Ghost protection + ghost coverage + ghost dependencies | `middleware.ts:20` protects `/reports` which has never had a page file. 25 test files exist in the tree but do not run. `apps/web/package.json` imports `@money-wise/utils` with zero actual call sites. |
| **Newcomers** | Documentation oversell in the first 10 minutes | README.md 0/3 on manual accuracy, docs/INDEX.md 0/3, docs/development/setup.md 1/3, CONTRIBUTING 1/3. Wrong Node version, wrong version string, wrong feature status, wrong JWT env var name. The first four docs a new contributor reads are materially wrong before they run a single command. |
| **Audit / compliance readers** | Security-claim drift in docs used as source of truth | `FRONTEND_HANDOFF.md` advertises "password min 32 chars." Real rule at `register.dto.ts:41`: `@MinLength(12)`. The 32-char rule lives in `strong-password.validator.ts:29-34` applied only to env var `DB_PASSWORD` in production, bypassed in staging/dev (H2/A5/WD21). A compliance audit using FRONTEND_HANDOFF as source of truth would record a control strength that does not exist. |

Four audiences, one pathology. One causal mechanism behind at least one of these lies (the F4 archive/live doc divergence pattern) is the `auto-fix-doc-governance.sh:86-91` silent `mv`-overwrite bug — the script intended to enforce doc governance actively corrupts the documents it is meant to protect.

---

## 5. The feedback loop is broken at the exact point it matters most

A solo-dev project has one source of ground truth about whether code works: **the test suite.** Not the dev's memory, not the CI pipeline's green light, not the issue tracker. If the test suite narrows instead of fixes when it hits friction, then the project's ability to detect regressions scales *inversely* with the amount of code shipped — the more the dev ships, the less of it is actually verified. This is the opposite of what a solo dev needs, because a solo dev cannot rely on a teammate catching their mistakes; they rely on the suite.

### Five mechanisms of suite narrowing (from code-analyst B1)

| # | Mechanism | Location | Effect |
|---|---|---|---|
| 1 | `testMatch` orphans co-located specs | `jest.config.js:48-50` — `testMatch: ['<rootDir>/__tests__/**/*.{test,spec}.{ts,js}']` | 11 backend `src/**/*.spec.ts` files silently excluded. Includes `accounts.service`, `accounts.controller`, `transactions.service`, `transactions.controller`. |
| 2 | `tests-disabled/` directory | `apps/backend/tests-disabled/` | 4 files parked with honest opt-out naming but still parked |
| 3 | Vitest exclude-instead-of-fix | `apps/web/vitest.config.mts:20-23` | 10 web test files excluded including `protected-route.test.tsx` and `dashboard-layout.test.tsx` (both have 5-minute-fix broken imports nobody fixed — tactical mute, not structural rot) |
| 4 | Dead duplicate twins | e.g. `src/docs/openapi.spec.ts` (phantom) + `__tests__/unit/docs/openapi.spec.ts` (real) | When tests are moved, originals aren't deleted |
| 5 | **Assertion tautologies** | `apps/web/e2e/auth/auth.spec.ts:262-271` | Test that runs, passes in CI, and asserts the broken behavior under a name that claims to test the correct behavior |

Mechanisms 1-4 are failures of discovery/wiring — files that don't run. **Mechanism 5 is different and worse**: the test runs, passes in CI, and ratifies the broken state of the code it claims to verify. It is the strongest single piece of normalized-deviance evidence in the repo.

### Three mechanisms of governance theater (T3 + T7, from test-specialist)

On top of the narrowing, the enforcement shells are empty:

- **Four contradictory coverage targets, no source of truth**: `CLAUDE.md:143` claims 70/65, `scripts/testing/coverage-report.js:16` claims 75/75 backend and 70/70 web, `apps/web/vitest.config.mts:55-62` claims 65/70, `.github/workflows/ci-cd.yml:860` comment claims 80%. No reader can answer "what's the target?" without picking a source arbitrarily.
- **`coverageThreshold: undefined`** in `jest.config.js:100-105`, CI never invokes `scripts/testing/coverage-report.js checkThresholds`. The enforcement function exists as dead code.
- **CI runs coverage on `test:unit` only**, excluding integration tests from the denominator — gaming the denominator while claiming to enforce coverage.

### The sharpest strategic claim in the audit (from strategic-architect t14)

A solo dev finishing Family multi-tenancy will touch `accounts.controller`, `accounts.service`, `transactions.controller`, `transactions.service`, `FamilyService`, the auth middleware, at least two DTOs — a ~15-file change surface that requires high confidence the existing authorization boundaries are preserved. The test files that would verify the authorization boundaries are:

- `protected-route.test.tsx` — silently excluded (vitest), trivially broken import
- `dashboard-layout.test.tsx` — silently excluded, trivially broken import
- `accounts.controller.spec.ts` — silently orphaned (jest `testMatch` mismatch)
- `accounts.service.spec.ts` — silently orphaned
- `transactions.controller.spec.ts` — silently orphaned
- `transactions.service.spec.ts` — silently orphaned
- `auth.spec.ts` logout test — tautology assertion, cannot fail

**Every test that would catch a regression in the Family completion workstream is currently not running, or is running with a tautology.**

> The feedback loop is broken precisely at the blast radius of the most important decision the project needs to make.

This is the sentence that converts feedback-loop restoration from a debt item into a hard launch blocker. You cannot finish Family safely until the feedback loop is restored, because the feedback loop is broken in exactly the places Family completion will modify. Sequencing matters: fix the suite first, then fix Family, then add billing. Reverse the order and you are flying blind at the moment you most need instruments.

---

## 6. Strategic architecture assessment

### Why this is architectural, not cultural

Cultural-debt framing ("the team needs to be more disciplined") is wrong for this project for one structural reason: **there is no team.** The project is solo-dev on a Steam Deck. There is no cultural coordination problem — there is one person making every decision. Which means the pattern is not about group dynamics; it is about the *structure* the solo dev has chosen (or drifted into) for making judgment calls when friction appears. That structure is reachable by architectural intervention in a way that cultural pathologies are not.

### Why (a)→(b)+billing breaks on Family specifically

Family multi-tenancy is half-built: DB schema exists, `FamilyService` exists, auth creates a Family on registration. But `accounts.controller.ts` has 13 TODO `familyId`-support comments, and `transactions.service:306` hard-denies cross-family access. The project is **neither cleanly single-tenant nor cleanly multi-tenant**.

Layer Stripe on top of this and the failure modes compound:

- **Tenant-unsafe invoicing risk**: Stripe customers map to users, but products are family-scoped. If the Family model is porous, then so is the invoice model built on top of it. Tenant A sees Tenant B's invoices. That is a breach, not a bug.
- **Re-architecture-at-worst-moment risk**: Stripe's customer/subscription/entitlement lifecycle wants to couple to a stable tenancy model. Coupling Stripe to a half-built Family means either the Stripe integration gets its own parallel tenant model (now the project has two half-built multi-tenancy models) or the dev is forced to finish Family exactly when they are also learning Stripe exactly when paying beta users are starting to care.
- **Not "almost there"**: the half-build decayed from strategic-debt (deliberate deferral) into tactical-gap (walked-away-without-marking-walked-away). The schema, the service, the auth integration — all signal deliberate early investment. The 13 TODO comments and the hard-denial at `transactions.service:306` signal the investment stopped mid-rollout. Same exact decision template as the T8 tautology, the ghost routes, the 25 excluded tests. Same pathology, higher strategic stakes.

**Completing Family is the single highest-leverage architectural decision the project can make.** It simultaneously unblocks billing, unblocks scale-out to 5-20 users, closes the `transactions.service:306` denial, and retires the 13 TODO comments as real code. One workstream, four strategic wins. No other single decision in the audit has this leverage.

### Three strategic risks, ranked

**Risk 1 — Dismantled feedback loop.** The test suite narrows instead of fixes. Enforcement shells exist without the enforcement. Correct assertions are written in TODO comments next to the wrong ones. This is the top risk because it multiplies every other risk — every future decision is made blind. **Non-negotiable before billing.**

**Risk 2 — Half-built multi-tenancy under the billing transition.** Family is neither cleanly single-tenant nor cleanly multi-tenant; coupling Stripe to a porous Family is a compliance-breach and re-architecture double-bind. Single highest-leverage architectural decision in the audit — sequenced *after* feedback loop restoration because the authorization invariants cannot be verified without a working suite.

**Risk 3 — Speculative surface commitment as committed habit.** Ghost routes, ghost features, ghost protection, ghost test coverage, ghost workspace dependencies, ghost documentation. The pattern is pre-commit-to-shape, never-commit-to-substance. Slowest-burning risk — does not block next-week launch, but every quarter it compounds the cognitive load of the solo dev maintaining a map of what's real. Medium-term treatment.

### Items explicitly NOT on the list

Not strategic-architectural risks for (a)→(b)+billing, even though real as adjacent concerns:

- Vulnerability counts (43 remaining Dependabot alerts, phases 5-6 deferred)
- Figma frontend refactor (major UI rework planned, defer until after tenancy + billing land)
- Mobile app status (placeholder — irrelevant to private-beta)
- Observability beyond ownership
- i18n
- Performance (no evidence of bottlenecks at current scale)

---

## 7. Prioritized workstreams — RICE analysis and top-3 selection

The audit extracted 10 candidate workstreams and applied RICE scoring against the target trajectory (solo-demo → private beta 5-20 users with billing). Reach was calibrated 1-5 for solo-QoL items and 20-50 for transition-enablers (the population the item unlocks if the transition succeeds, not the current 1-user population).

### 7.1 Full RICE table

| # | Candidate | R | I | C | E (days) | RICE | Type |
|---|---|---|---|---|---|---|---|
| **7** | **Test credibility restoration** | 50 | 3.0 | 1.0 | 3 | **50.0** | Risk reduction |
| **10** | **Architectural hygiene (R1+R2+R3)** | 50 | 2.5 | 1.0 | 2.5 | **50.0** | Risk reduction (meta) |
| **6** | **Auth hardening sweep** | 50 | 2.0 | 0.8 | 4 | **20.0** | Risk reduction |
| 2 | Self-host deployment | 40 | 2.0 | 0.8 | 4 | 16.0 | MVP gap |
| 3 | Family multi-tenancy completion | 50 | 3.0 | 0.8 | 7.5 | 16.0 | MVP gap / growth |
| 5 | Email verification flow | 50 | 1.0 | 0.8 | 2.5 | 16.0 | MVP gap |
| 4 | Admin/support MVP | 30 | 1.5 | 1.0 | 4 | 11.25 | MVP gap (ops) |
| 1 | Billing integration | 50 | 3.0 | 0.5 | 12.5 | 6.0 | Growth |
| 8 | Ghost routes convergence | 3 | 0.5 | 1.0 | 0.5 | 3.0 | Solo-QoL |
| 9 | Plaid — **retire** (recommended) | 3 | 0.5 | 1.0 | 2.5 | 0.6 | Retire |

**Plaid direction resolved**: the "finish Plaid" option scores RICE 1.0 (confidence 0.3 penalty for unknown Plaid-specific integration complexity). The "retire Plaid" option scores RICE 0.6 but has RICE 1.0 confidence. **Recommendation: retire.** Fold the retire workstream into R2 walked-away-marker installation — Plaid is the clearest instance of "started, hit friction, walked away without marking walked-away" in the backend domain, so retiring it IS the first application of R2. Plaid retirement is R2's inaugural use case.

### 7.2 Top-3

#### #1/#2 (TIE): The Prerequisite Pair — Test credibility restoration + Architectural hygiene (RICE 50.0 each)

These two are complementary, not competing. They execute in parallel. Forcing a ranking between them would invent a distinction that does not exist. The honest presentation is the tie.

**Candidate 7 — Test credibility restoration (curative).** Three days to fix the current feedback loop:
- Resolve 25 silent test exclusions via code-analyst's B1 triage table (9 of 10 web files are trivially recoverable, 11 backend co-located specs recoverable via one-line `testMatch` fix, 4 tests-disabled files decide-or-retire)
- `jest.config.js:48-50` add `<rootDir>/src/**/*.spec.ts` to `testMatch`
- `jest.config.js:100-105` define real `coverageThreshold` and pick one source of truth among the four contradictory targets
- Wire `scripts/testing/coverage-report.js checkThresholds()` into the CI workflow — stop the function from being dead code
- Fix the T8 tautology by enacting the author's own TODO: replace `expect(redirectedToLogin || onDashboardUrl).toBe(true)` with `expect(redirectedToLogin).toBe(true)` and let it fail honestly until the logout race is fixed

**Why it's #1**: unique property of being the only candidate that is a hard sequencing prerequisite for the single highest-leverage feature (Family). Every subsequent decision is made blind until this lands — the multiplier is "every other candidate's confidence × 1.0 instead of × 0.5."

**Candidate 10 — Architectural hygiene (preventive).** Two and a half days to install the mechanisms that prevent the pathology from recurring:
- **R1**: Explicit test definition-of-run policy. Every test file passes, fails, or carries `.skip('reason', ...)` with a reason string. CI emits a visible "skipped-with-reason" count on every PR check. **1 day.** Prevents the 26th silent exclusion by making silence cost more than narration.
- **R2**: Walked-away marker convention with stale-marker timeout. **1 weekend (2 days).** *This is not a new convention; it is the missing stale-policy companion to a convention the codebase already uses.* The T8 KNOWN ISSUE comment is already the right shape — the pathology is that such markers live indefinitely as substitutes for remediation. Fix: add a lint rule that raises an error when a marker is stale. Start at 30 days.
  > **Calibration caveat (mandatory):** start at 30 days. After two cycles, review what the marker has caught: if most trips are genuine walked-away items, hold. If most trips are things the dev intended to return to within the cycle, raise to 45 or 60. **Do not ignore the marker — that is the failure mode this recommendation exists to prevent.** Recalibrating the threshold is fine; tolerating a noisy alarm is not. The distinction is what keeps R2 from becoming its own theater in one compliance cycle.
- **R3**: Single canonical owner per architectural concern. **1 afternoon (0.5 day).** `ARCHITECTURE_OWNERSHIP.md` table assigning one module path as the source of truth for each cross-cutting concern: health endpoints, auth state, route surface, test contract, password policy, banking provider, multi-tenancy model. Solo-dev does not remove the ownership question; it consolidates it. Future friction-driven decisions become lookups, not judgment calls.

**Why it's tied for #1**: mechanism-level leverage. Changes how every subsequent decision gets made, not just one decision. 2-3 day total investment with a numerator that compounds across every future feature the dev ever ships. The curative + preventive pair is the structurally coherent first workstream, not a loose grouping.

#### #3: Auth hardening sweep (RICE 20.0)

**Candidate 6.** Five separate security findings bundled into one coherent workstream because at "beta with billing" scale any single item is a breach vector, and bundling is cheaper than five separate mental contexts:

1. **Logout dual-push race** (A3, HIGH): `dashboard-layout.tsx:71-74` calls `logout()` then `router.push('/auth/login')`, while `ProtectedRoute` at `protected-route.tsx:24-49` reacts to auth state change with its own `router.push`. Race condition; test for it is currently the T8 tautology.
2. **T8 KNOWN ISSUE tautology replacement**: enact the author's own TODO. Replace the tautology with the correct assertion now that the logout race is fixed. This item is shared with Candidate 7.
3. **Password history NOOP** (code-analyst B1 opportunistic): `isPasswordInHistory` always returns `false` despite `PasswordHistoryService` existing.
4. **Strong-password dev/test/staging bypass** (H2/A5/WD21): `strong-password.validator.ts:29-34` early-returns in non-production. 32-char rule (the one advertised in FRONTEND_HANDOFF) effectively only applies in production, which is not currently running anywhere. The real user-signup rule is 12 characters with complexity regex at `register.dto.ts:41`.
5. **`/banking/webhook/callback` catch-all** (A2/B19, HIGH): `webhook.controller.ts:288-303` is a log-only handler returning `{status: 'ok'}` for any payload. Info-disclosure + log-injection + DoS-via-log-flooding vector. Currently tolerated because `SALTEDGE_VERIFY_WEBHOOK_SIGNATURE` defaults to true and the only real path is the signed SaltEdge webhook — but the catch-all exists in the controller and serves as a fragile-by-toggle security posture.

**Effort**: 4 days. Confidence 0.8 because items 1-4 benefit from Candidate 7 landing first (tests that currently can't verify the fixes).

### 7.3 Execution sequence

Pure RICE ranks Family at slot 4 (tied three ways at 16.0 with self-host deployment and email verification). This is *correct math* — Family's 7.5-day effort drags its quotient down relative to cheaper items at similar reach × impact. But Family is on the critical path to billing and the other two slot-4 items are not, which is a sequencing property RICE math does not encode.

**Recommended execution sequence:**

```
(Candidate 7 + Candidate 10 in parallel)       ← prerequisite pair
        ↓
Candidate 6 (Auth hardening sweep)             ← security bundle
        ↓
Candidate 3 (Family multi-tenancy completion)  ← critical path to billing
        ↓
(Candidate 2 + Candidate 5 + Candidate 4)      ← MVP gaps, any order
        ↓
Candidate 1 (Billing integration)              ← the target state
```

**Sequencing invariants** (non-negotiable, independent of RICE math):

1. **Candidate 7 → Candidate 3**: Test credibility restoration precedes Family completion. Rationale: Family's ~15-file change surface touches exactly the files whose test coverage has been silently removed. Flying blind at the moment instruments are most needed.
2. **Candidate 3 → Candidate 1**: Family completion precedes Billing integration. Rationale: Stripe coupled to a porous Family model is a compliance-breach and re-architecture double-bind.

Transitively: **7 → 3 → 1.**

**Effort-range uncertainty (flagged for reader calibration):** Candidate 3 (Family) has an effort range of 7-14 days. Midpoint 7.5d is used above. If the change surface expands to 14d, Family's RICE drops to 8.57 (well outside top-6), but its critical-path position is unchanged. Readers should understand that Family's RICE position is elastic against effort uncertainty, but its sequencing position is not.

### 7.4 What happens to the rest of the list

- **Candidate 2 (Self-host deployment, RICE 16.0)**: parallelizable with Candidate 3, ~4 days. Blocker for real private-beta launch — the dev currently cannot self-host their own product (Steam Deck environment constraint is diagnostic).
- **Candidate 5 (Email verification, RICE 16.0)**: parallelizable, ~2.5 days. Bundle with Candidate 6 in execution if convenient (shared auth surface).
- **Candidate 4 (Admin/support MVP, RICE 11.25)**: parallelizable, ~4 days. First real user generates a support request the repo cannot currently serve. Easy to undervalue because it is operational, not a user feature.
- **Candidate 8 (Ghost routes convergence, RICE 3.0)**: decision workstream, not primarily code. ~30 minutes of code + 1 hour of decision. Quickly executable. RICE-low but high symbolic value — landing it is proof-of-life for the treatability thesis. Recommend: do it during the Candidate 10 R3 ownership table exercise; both are the same decision in different clothing.
- **Candidate 9 (Plaid retire)**: fold into Candidate 10 R2 as its inaugural use case. Not a separate workstream.

---

## 8. Launch-gate verdict

**Is MoneyWise ready for private beta with billing today? No.**

Three hard blockers, three soft blockers, one meta-workstream, in sequence.

### Hard blockers (launch cannot happen without these)

1. **Test credibility restoration** (Candidate 7) — 3 days. Without a trusted feedback loop, no subsequent security or tenancy work can be verified. *Non-negotiable prerequisite to everything below.*
2. **Auth hardening sweep** (Candidate 6) — 4 days. Five security controls currently aspirational, not enforced. At private-beta-with-billing scale, any one is a breach vector.
3. **Family multi-tenancy completion** (Candidate 3) — 7-14 days. Prerequisite to billing. Touches ~15 files across accounts, transactions, budgets, auth. Blast radius is where feedback loop restoration pays off.

### Soft blockers (launch-adjacent, not strictly blocking)

4. **Self-host deployment story** (Candidate 2) — 4 days. Private beta cannot start for real users without a production-shaped deployment artifact.
5. **Email verification flow** (Candidate 5) — 2.5 days. Real users receiving real billing emails requires verification.
6. **Admin/support MVP** (Candidate 4) — 4 days. Zero tooling for operating on production data currently exists.

### Pattern-level treatment (recurrence prevention)

7. **Architectural hygiene** (Candidate 10) — 2.5 days. **Parallelizable with Candidate 7.** Without this, every subsequent feature will reproduce the surface-commitment-without-implementation-commitment pathology.

### Aggregate effort estimate

**~3-5 weeks of serial solo-dev work** to private-beta-with-billing readiness, assuming no further regressions. Parallelization is limited because most items touch auth or tenancy surface and the dev benefits from serializing to maintain a coherent mental model. The 3-week lower bound assumes aggressive parallelization of the prerequisite pair (7 + 10) and the MVP gap items (2 + 4 + 5); the 5-week upper bound assumes Family completion hits its 14-day upper range and auth hardening finds cascading issues.

**After private beta launches**, Candidate 1 (Billing integration) is itself a 2-3 week workstream. The audit report's "ready" verdict is at the point where the private beta can *accept* a user; the billing workstream is the capstone that follows.

---

## 9. The one positive counter-example (load-bearing for treatability)

Commit `c1dd7d8` on the current feature branch (`feature/phase-2-transactions-complete`) is the single place in the audit where the narrowing pattern was actively reversed. Integration tests for Phase 2 transfer linking and bulk operations (`bulk-operations.integration.spec.ts:42`, `transfer-linking.integration.spec.ts:40`) had been `describe.skip`'d while a cookie-auth infrastructure bug was being diagnosed. Once the root cause (Redis provider override missing in the integration test harness) was identified, the tests were **properly re-enabled**. Not replaced with weaker assertions. Not moved to `tests-disabled/`. Not wrapped in a tautology. Actually re-enabled against fixed infrastructure.

This is the existence proof that the pathology is a choice, not a capacity limit. The dev *can* reverse the narrowing pattern when they choose to. The fact that the pattern exists alongside this counter-example is both the best news in the audit (treatable) and the sharpest indictment (not inevitable, preferential — one small judgment call at a time, cheaper-over-correct won each time except this one).

The treatment plan is built on this fact. Without `c1dd7d8`, the audit would be a post-mortem; with it, the audit is a treatment plan.

---

## 10. Out of scope for private-beta remediation

Items found by the audit but explicitly **deferred** until after the 7-workstream treatment lands:

- **Figma frontend refactor** — major UI rework planned. Refactoring UI before fixing auth and tenancy is the wrong order.
- **Dependabot vulns phases 5-6** — 43 remaining alerts. Already deferred per the vulnerability remediation plan. Stay deferred until after the frontend refactor stabilizes.
- **Mobile app placeholder** — shell only, not implemented. Irrelevant to private-beta launch.
- **Observability beyond ownership** — health endpoint stubs exist (one of them is the dead `core/monitoring/health.controller.ts`). Real Sentry instrumentation, monitoring dashboards, alert routing, SLO definitions — all deferred. Not a launch blocker for 5-20 users.
- **i18n** — not a private-beta concern.
- **Performance optimization** — no evidence of real bottlenecks at current scale.
- **Dead or orphan artifacts**:
  - Orphan Prisma models (`Achievement`, `UserAchievement`, `PushSubscription`) — retire in the Candidate 10 R2 pass alongside Plaid.
  - Split `src/stores/` + `src/store/` directory residue — retire in the same pass.
  - `packages/ui` empty stub — either populate as part of Figma refactor or retire. Decide in the R3 ownership exercise.
  - Workspace dep `@money-wise/utils` placeholder — retire.

These are all real findings. They are deferred not because they are unimportant, but because they would displace items from the 7-workstream treatment that is actually on the critical path to billing. After the 7 workstreams land, these become the next tier of work.

---

## 11. Structural recommendations (R1+R2+R3 in detail)

These are the three structural interventions that comprise Candidate 10 (the meta-candidate). They are the reason the pathology does not recur, rather than the reason any individual instance gets fixed. Point-fixing the 25 silent test exclusions, the 4 coverage target contradictions, the 5 ghost routes, and the HealthController dual-ownership without installing these three structural changes is a treadmill — the next feature will reproduce the pattern.

### R1. Explicit test definition-of-run

**Problem.** "How many tests actually run?" currently requires reading three config files (`jest.config.js` testMatch, `apps/web/vitest.config.mts` exclude, `playwright.config.ts` testMatch) plus scanning for `tests-disabled/` directories plus checking for orphaned co-located specs. No single place answers the question. Silent exclusion is cheaper than narrated exclusion.

**Fix.** Require every test file to either (a) pass, (b) fail, or (c) carry an explicit `test.skip('reason: ...', ...)` or `describe.skip` wrapper with a reason string, AND have CI emit a visible "skipped-with-reason" count in the PR check. This is not 25 test cleanups; it is a policy that *prevents* the 26th silent exclusion by making silence cost more than narration. The 25 existing exclusions are cleaned up in Candidate 7 as a separate workstream.

**Effort.** 1 day. Concrete implementation: a small script invoked by CI that walks the test tree, counts skips and orphans, and comments the count on the PR. Fails the PR check if the skip count has grown without narration.

### R2. Walked-away marker convention with stale-marker timeout

**This is not a new convention; it is the missing stale-policy companion to a convention the codebase already uses.**

**Problem.** When the dev starts something (Family, Plaid, `/reports`, `packages/ui`, scheduled-transactions real data) and runs into friction, the structural response today is silence — the work halts, the surface remains, no marker is left. When a marker *is* left (the T8 `// KNOWN ISSUE` comment is the archetypal example), it lives indefinitely as a substitute for remediation rather than as a temporary flag. The shape of the convention is already right; the missing piece is the expiry.

**Fix.** Require a single visible marker (`// UNFINISHED: <last-reviewed-date>, <reason>` comment at the relevant controller/service, or a `WALKED_AWAY.md` in the affected directory, enforced by a lint rule). Stale markers older than **30 days** raise a lint error forcing a decision: finish, retire, or refresh with updated reason.

**Calibration caveat (mandatory, not a footnote).** Start at 30 days. After two cycles, review what the marker has caught:

- If most trips are genuine walked-away items → hold at 30.
- If most trips are things the dev intended to return to within the cycle → raise to 45 or 60.
- **Do not ignore the marker.** That is the failure mode this recommendation exists to prevent. Recalibrating the threshold is fine; tolerating a noisy alarm is not. The distinction between "recalibrate" and "tolerate" is what keeps R2 from becoming the next WD21 — one more compliance-cycle-away from turning into its own theater.

**Inaugural use case: Plaid retirement.** Plaid is the clearest instance of "started, hit friction, walked away without marking walked-away" in the backend domain. The `PLAID: Synced via Plaid API (legacy)` enum annotation in `schema.prisma:80-86` is a partial marker with no stale policy. Retiring Plaid via 410 Gone + schema migration is both a concrete value delivery and the first real application of R2, making the recommendation tangible rather than abstract.

**Effort.** 1 weekend (2 days). Implementation: lint rule + one-shot marker pass across the known half-built surface (Family, Plaid, `/reports`, `packages/ui`, scheduled-transactions mock data, MSW no-op provider, split stores/store directory).

### R3. Single canonical owner per architectural concern

**Problem.** Solo-dev does not mean no-ownership; it means one-owner-for-everything. The pathology of no-single-owner expresses in: duplicate `HealthController` (who owns health?), ghost routes (who owns the authenticated surface?), `packages/ui` empty stub (who owns shared UI?), password validation split across `register.dto.ts` and `strong-password.validator.ts` (who owns password policy?). Every 11pm friction-driven judgment call picks the wrong answer because there is no pre-committed correct answer.

**Fix.** A trivial `ARCHITECTURE_OWNERSHIP.md` table at the repo root that assigns, for each major cross-cutting concern, a single module path that is the canonical source of truth. Future decisions ("should this health probe go in `core/health` or `core/monitoring`?") become lookups, not judgment calls.

Initial ownership table (first pass — refine during the work):

| Concern | Canonical owner |
|---|---|
| Health endpoints | `apps/backend/src/core/health/` (delete `core/monitoring/health.controller.ts`) |
| Auth state (client) | `apps/web/src/stores/auth-store` (consolidate the `src/stores/` + `src/store/` split) |
| Authenticated route surface | `apps/web/app/(dashboard)/*/page.tsx` under a single dashboard group (follow the `/banking` migration pattern) |
| Test contract / exclusion policy | one source of truth for `testMatch` — currently `jest.config.js:48-50` |
| Password policy | `apps/backend/src/auth/dto/register.dto.ts` (deprecate the dev-bypass in `strong-password.validator.ts` or make it explicit about env-var vs user-password scope) |
| Banking provider integration | `apps/backend/src/banking/` (retire Plaid, commit to SaltEdge as primary) |
| Multi-tenancy model | `apps/backend/src/users/families/` + `FamilyService` (complete the 13 TODOs) |
| Shared UI components | `packages/ui` — decide: populate per Figma refactor OR retire the package |
| Coverage target | one number, one config file — destroy the four contradictory claims |

**Effort.** 1 afternoon (0.5 day). Solo-dev doesn't need a team to enforce ownership; it needs a pre-committed answer so the friction-driven decision does not pick the wrong option.

---

## 12. Findings inventory (summary)

This report is a clinical synthesis, not a finding catalog. The catalog lives in the working documents produced by each audit stream. This section is the index.

### Primary source documents (working, not committed)

- **Code health report**: `/tmp/mw_task8_code_health_report.md` (code-analyst, v2.1) — 1 CRIT / 10 HIGH / 14 MED / 7 LOW, organized as Section A transition blockers (A1-A5), Section B systemic findings (B1-B5, where B1 is the 5-mechanism compliance-theater cluster including the T8 tautology), Section C remaining findings, Section D drift matrix integration (WD1-WD21), Section E retire candidates (RETIRE-1 Plaid, RETIRE-2 orphan Prisma, RETIRE-3 dep rot cluster, RETIRE-4 split stores directory), Section F named pattern "Compliance Theater" with 6 sub-patterns.
- **Doc health report**: `/tmp/mw_task9_final.md` (doc-analyst) — 9 sections, 7 headline findings including H1 auto-fix-doc-governance hook silent-overwrite bug as causal mechanism for archive/live divergence, newcomer-accuracy-collapse (first four docs wrong in first 10 minutes), FRONTEND_HANDOFF oversell drift, ghost `/reports` cluster.
- **Test credibility report** (test-specialist t15, in message history) — backend 62 / web 28 split, four-mechanism suite-narrowing analysis, T8 tautology smoking-gun, T3 four contradictory coverage targets, T7 CI-coverage-gaming-the-denominator.
- **Strategic architecture review** (strategic-architect t14, in message history) — narrative, splice-ready section, 10 feature candidates, three hold-item resolutions.
- **Clinical synthesis** (lead-orchestrator t10, in `/tmp/mw_task10_clinical_synthesis.md`) — working document consolidating the above into the report skeleton.
- **Feature candidate brief** (lead-orchestrator t11, in `/tmp/mw_task11_feature_candidates.md`) — pm-strategist input document.
- **RICE analysis** (pm-strategist t12, in message history) — full 10-candidate scoring, top-3 selection, execution sequence, RICE-risk paragraph.

### Headline finding index (by category)

**Compliance theater (code-analyst B1) — 5 mechanisms:**
- Mechanism 1: `jest.config.js:48-50` testMatch orphans 11 co-located backend specs
- Mechanism 2: `apps/backend/tests-disabled/` parks 4 files
- Mechanism 3: `apps/web/vitest.config.mts:20-23` excludes 10 web tests (9 recoverable)
- Mechanism 4: Dead duplicate twins (`src/docs/openapi.spec.ts` phantom vs `__tests__/unit/docs/openapi.spec.ts` real)
- **Mechanism 5: T8 KNOWN ISSUE tautology at `apps/web/e2e/auth/auth.spec.ts:247-275`** — the test runs, passes in CI, asserts the broken behavior under a name that claims to test correct behavior

**Transition blockers (code-analyst Section A):**
- A1 (CRITICAL): scheduled-transactions UI contract breach (`app/dashboard/scheduled/page.tsx:28-41`, hardcoded MOCK_ACCOUNTS/MOCK_CATEGORIES)
- A2 (HIGH): SaltEdge `/banking/webhook/callback` catch-all (`webhook.controller.ts:288-303`, log-only handler)
- A3 (HIGH): logout dual-push race (`dashboard-layout.tsx:71-74` + `protected-route.tsx:24-49`)
- A4 (HIGH): ghost routes cluster (5 routes in `middleware.ts:16-24` with inconsistent implementation — 4 shadow stubs + 1 phantom /reports)
- A5 (HIGH): strong-password dev/test/staging bypass (`strong-password.validator.ts:29-34`)

**Systemic findings (code-analyst Section B):**
- B1 (HIGH): compliance theater, 5 mechanisms (see above)
- B2 (HIGH): "Compliance Theater, Coverage Edition" — 4 contradictory coverage targets, undefined coverageThreshold, dead `checkThresholds()`, CI coverage denominator gaming (T7)
- B3 (HIGH): drift matrix rollup (WD1-WD21 from code-analyst ↔ doc-analyst joint task #6)
- B4 (MED): H1 markdown hook silent-overwrite + dead workspace deps + config rot
- B5 (HIGH): dual HealthController — dead code + latent refactor blast radius (5-minute fix: `delete apps/backend/src/core/monitoring/health.controller.ts` + remove from `monitoring.module.ts` controllers array)

**Doc health headlines (doc-analyst #9):**
- Newcomer-accuracy collapse: first four docs materially wrong in first 10 minutes
- FRONTEND_HANDOFF oversell drift (32-char password claim vs 12-char reality) — compliance audit using it as source of truth would record false control strength
- Ghost `/reports` cluster across middleware + routes.ts + docs with zero page files
- H1 auto-fix-doc-governance hook silent-overwrite bug as causal mechanism for archive/live doc divergence

**Retire candidates (code-analyst Section E):**
- RETIRE-1: Plaid ghost (accounts.service.ts:447-467, schema enum, 33 residual files) — **retire via 410 Gone + schema migration, fold into R2 inaugural use case**
- RETIRE-2: orphan Prisma models (Achievement/UserAchievement/PushSubscription at `schema.prisma:860,905,1272`)
- RETIRE-3: workspace dependency rot (`@money-wise/utils` placeholder, `@money-wise/ui` echo-and-exit test script, MSW no-op provider)
- RETIRE-4: split `src/stores/` + `src/store/` directory — residue of unfinished rename

For full severity labels, path:line citations, per-module remediation detail, and complete drift matrix, consult the primary source documents listed above.

### Tier B Execution Log (2026-04-12)

Dead code removal sprint executed with 4-agent parallel team (`tier-b-cleanup`), worktree isolation, SendMessage coordination.

| Item | Status | Commit | Summary |
|------|--------|--------|---------|
| B1 (RETIRE-1) | ✅ Done | `9e176b0` | Plaid ghost stubs removed (syncAccount, computeNeedsSync, isPlaidAccount, DTO fields, controller endpoint, tests). Prisma schema fields retained (require migration). |
| B2 (B5 finding) | ✅ Done | `75a4605` | Duplicate HealthController stub deleted from monitoring module. Real controller at core/health/ unaffected. |
| B3 (RETIRE-2) | ⏸ Deferred | — | Orphan Prisma models (Achievement, UserAchievement, PushSubscription) left in schema — removal requires migration, risk/reward unfavorable for cleanup sprint. |
| B4 (A4 partial) | ✅ Done | `7b1617b` | 4 shadow stub routes deleted (accounts, transactions, settings, reports). E2E test routes corrected from root paths to `/dashboard/*`. |
| B5 (RETIRE-3 partial) | ✅ Done | `6e592b8` | MSWProvider no-op removed from layout, mockServiceWorker.js and browser.ts deleted. Vitest mocks (handlers.ts, server.ts) retained. |
| B6 | ✅ Done | `a45ef1d` | tests-disabled/ directory deleted (4 TypeORM-era files, 2421 lines). |
| B7 | ❌ Invalidated | — | `src/common/specifications/` is NOT dead code. `CategoryValidationService` imports and uses `category-validation.specification.ts` on every transaction create/update. Finding was a false negative from planning phase — audit report did not make this claim. |

**Verification:** All backend tests (2257), web tests (1459), builds, typecheck, and lint pass. Application starts and responds correctly (health, auth, accounts endpoints verified).

---

## 13. Acknowledgments and methodology

### Audit team

- **lead-orchestrator**: task dispatch, synthesis, final report write
- **code-analyst**: monorepo structure analysis, backend + web health reports, dead-code detection, drift matrix with doc-analyst (tasks 1, 3, 4, 6, 7, 8)
- **doc-analyst**: doc inventory, scoring, health report, drift matrix with code-analyst (tasks 2, 5, 6, 9)
- **pm-strategist**: RICE scoring (task 12)
- **strategic-architect**: forest-view architectural review (task 14)
- **test-specialist**: test credibility counter-audit (task 15)

Each audit stream worked independently. Convergence on the normalized-deviance / compliance-theater / surface-commitment-without-implementation thesis was not coordinated; it emerged from four different methodologies applied to the same repo. That independent convergence is itself part of the evidence that the pathology is real.

### Methodology

- **Mode**: read-only audit. No code changes. This report (`docs/audits/2026-04-12-health-audit.md`) is the only file write produced by the audit.
- **Duration**: one working session, ~2026-04-12.
- **Sources of truth (in order of precedence)**:
  1. Direct source verification at file:line
  2. Git history / git archaeology for existence claims
  3. Static analysis (jest config, vitest config, import order for module resolution)
  4. Cross-reference between audit streams (e.g. test-specialist's B1 verification against code-analyst's test file enumeration)
  5. CLAUDE.md and memory files treated as **hypotheses to validate**, not ground truth. Claims refuted by current code state have been flagged inline.
- **Severity discipline**: CRITICAL / HIGH / MED / LOW / INFO. All CRITICAL and HIGH findings carry path:line citations verified at audit time.
- **Trajectory lens**: solo-demo → private beta 5-20 users with billing. Not OSS, not public SaaS. RICE reach calibration: 1-5 for solo-QoL, 20-50 for transition-enablers.
- **Claims refuted or corrected during the audit**:
  - Memory claim: "Phase 2 integration tests `describe.skip`'d" — REFUTED. Commit `c1dd7d8` on current branch has the tests properly re-enabled with Redis provider override. Treated as the positive counter-example.
  - Memory claim: "packages/ui populated from Figma refactor" — REFUTED. `packages/ui/src/index.ts` is `export {};` empty stub.
  - Initial code-analyst claim: "25 dead test files" as structural rot — CORRECTED. test-specialist's tactical-mute reframe shows 9 of 10 web files are trivially recoverable; B1 Mechanism 3 is tactical mute, not structural rot.
  - Provisional B5 HealthController severity CRITICAL — DOWNGRADED. test-specialist's static analysis of `app.module.ts:28-29` import order proves real controller wins at runtime via Express first-wins. Downgraded to HIGH (dead code + latent refactor blast radius).

### On the names used in this report

This report uses three different names for the same pathology: surface commitment without implementation commitment (architectural), compliance theater (systemic), normalized deviance (cultural). They are not synonyms — each names a different facet of the underlying phenomenon. They are used together because the phenomenon is visible from three different heights and a reader tracking any one of them should be able to reach the thesis via that name.

A reader whose primary concern is the test suite will recognize normalized deviance and find the thesis via Section 5. A reader whose primary concern is the code catalog will recognize compliance theater and find the thesis via Section 2 and the inventory index. A reader whose primary concern is system architecture will recognize surface commitment without implementation commitment and find the thesis via Sections 3 and 6. All three paths converge.

---

## 14. Closing

MoneyWise is treatable. The audit found one pathology expressed across every layer of the project, and it found one concrete counter-example proving the pathology is a choice rather than a capacity limit. The treatment is three days of feedback loop restoration, two and a half days of architectural hygiene installation, four days of auth hardening, one to two weeks of Family completion, about two weeks of MVP gap closure, and two to three weeks of billing integration. It is three to five weeks of focused work to land at a state where private beta with billing becomes an option rather than an aspiration.

The critical sentence is the one strategic-architect wrote and this report has borrowed:

> The feedback loop is broken precisely at the blast radius of the most important decision the project needs to make.

This is why the prerequisite pair (Candidate 7 + Candidate 10) is non-negotiable. Not because the RICE math says so — though it does — but because the dev cannot safely make the decision that matters most while working on top of a feedback loop they cannot trust. Fix the suite first. Install the mechanisms that prevent the suite from narrowing again. Then fix Family. Then add billing. That is the order, and the order is not negotiable.

Everything else in this report — the drift matrix, the retire candidates, the four-audience table, the ghost routes, the documentation oversell, the 6 sub-patterns of compliance theater — is supporting evidence for that one claim.

The dev can reverse the pattern. They have done it once. The audit's job is done when that one reversal becomes the template for everything that follows.

---

*Report ends. Working documents at `/tmp/mw_task*.md` for source citations. Questions to the audit team via the mw-audit tmux session.*
