# Zecca — Unified Roadmap: Audit Remediation + Strategic Features

> **Created**: April 14, 2026
> **Status**: Approved
> **Supersedes**: `zecca-strategic-feature-plan.md` (strategic vision preserved, timeline corrected)
> **Inputs**: Health Audit (2026-04-12) + Zecca Strategic Plan (2026-04-14)

## Context

Two plans merged into one:

1. **Health Audit (2026-04-12)**: Clinical audit identified 10 candidates, 3 hard blockers for private beta with billing. Candidates 7, 10, 6 already merged to main. Remaining: Family multi-tenancy (C3), Deploy (C2), Email (C5), Admin (C4), Billing/Stripe (C1).

2. **Zecca Strategic Plan (2026-04-14)**: Brand unification under "Zecca", 10 features in 5 phases, infrastructure decisions (Vercel yes, Stripe yes, Supabase no).

**Resolution**: Family MUST precede Stripe (audit invariant). Mobile + Vercel run as parallel track with zero audit dependencies. 16-week unified timeline.

---

## What's Done (Audit Remediation)

| Candidate | Description | Status |
|-----------|-------------|--------|
| 7 | Test credibility restoration | DONE (PR #413, #416, #418) |
| 10 | Structural hygiene R1+R2+R3 | DONE (PR #412) |
| 6 | Auth hardening sweep | DONE (PR #420) |
| A1-A5 | Transition blockers | DONE (all 5 resolved) |

## What Remains

| Item | Source | Effort | Dependency |
|------|--------|--------|------------|
| Family multi-tenancy (C3) | Audit | 7-14 days | Blocks Stripe |
| Self-host deployment (C2) | Audit | 4 days | Blocks real beta |
| Email verification (C5) | Audit | 2.5 days | Blocks billing emails |
| Admin/support MVP (C4) | Audit | 4 days | Blocks user ops |
| Stripe billing (C1) | Audit + Zecca | 2-3 weeks | Blocked by C3 |
| Vercel deployment | Zecca | 1-2 days | Independent |
| Zecca mobile v1 | Zecca | 8-10 weeks | Independent |
| AI agent backend | Zecca | 3-4 weeks | After Stripe |
| Gamification | Zecca | 3 weeks | After Family |
| Savings automation | Zecca | 2-3 weeks | After Stripe |
| Subscription tracker | Zecca | 2 weeks | After AI agent |
| Voice input | Zecca | 2 weeks | After mobile v1 |
| Smart insights | Zecca | 3 weeks | After AI agent |
| Bill splitting | Zecca | 2-3 weeks | After Family |
| Zecca Academy | Zecca | 3-4 weeks | After gamification |

---

## Unified Roadmap (Dual Track)

```
TRACK A (Audit Critical Path)     TRACK B (Zecca Mobile + Infra)
============================      ==============================

Week 1-2: Family multi-tenancy   Week 1-2: Vercel deploy setup
  - 12 TODO familyId in              + Zecca mobile: auth screens
    accounts.controller.ts              (Expo Router, biometric)
  - transactions.service:306
    cross-family access
  - Wire familyId through
    budgets, liabilities,
    scheduled transactions
  - Family dashboard (web)
          |                       Week 3-4: Zecca mobile: navigation
Week 3-4: Family completion         + tab bar, dashboard shell
  - Parental controls               + quick expense entry (3 taps)
  - Allowance system                 + swipe categorization
  - Shared family goals
  - Age-appropriate views
          |                       Week 5-6: Zecca mobile: core screens
Week 5: Deploy + Email + Admin      + transaction list
  - C2: Self-host deployment         + budget overview
    (Docker prod, domain)            + account sync status
  - C5: Email verification           + settings
    (AWS SES or Resend)
  - C4: Admin panel (basic)
          |                       Week 7-8: Zecca mobile: polish
Week 6-8: Stripe billing            + offline-first sync
  - Subscription tiers               + push notifications
    (Free/Pro/Family)                + home widget prototype
  - Customer portal                  + receipt camera (OCR)
  - Webhooks lifecycle
  - EU payments (SEPA)
  - Family plan billing
    (single payer, N profiles)
          |                               |
          v                               v
    TRACKS MERGE — Week 9
    ========================
          |
Week 9-10: AI Agent Backend
  - apps/backend/src/ai/ module
  - Claude API for insights
  - Auto-categorization ML
  - Anomaly detection
  - Weekly digest (push + email)
  - Subscription tracker
          |
Week 11-12: Gamification + Savings
  - Achievement system, badges
  - Family leaderboard
  - Financial score (0-100)
  - Challenges engine
  - Round-up rules
  - Auto-save rules
  - Visual savings jar
          |
Week 13-14: Zecca Mobile v2
  - Voice input (Whisper + Claude)
  - Smart insights in mobile
  - AI agent push integration
  - Gamification UI (mobile)
          |
Week 15-16: Growth + Launch
  - Bill splitting
  - Peer benchmarks
  - Zecca Academy (education)
  - App Store submission
  - Marketing site on zecca.app
```

---

## Phase Details

### Phase 1: Family + Mobile Kickoff (Weeks 1-4)

**Track A — Family Multi-tenancy (C3)**
Files to modify:
- `apps/backend/src/accounts/accounts.controller.ts` (12 TODOs)
- `apps/backend/src/accounts/accounts.service.ts` (familyId wiring)
- `apps/backend/src/transactions/transactions.service.ts` (cross-family access)
- `apps/backend/src/budgets/` (family budget support)
- `apps/backend/src/liabilities/` (family visibility)
- `apps/backend/src/scheduled/` (family scheduling)
- `apps/backend/src/core/database/prisma/services/family.service.ts` (extend)
- New: `apps/web/app/dashboard/family/` pages

**Track B — Zecca Mobile + Vercel**
- Vercel: connect repo, configure standalone Next.js, preview deploys
- Mobile: Expo Router navigation, auth screens, biometric, quick entry

### Phase 2: Infrastructure (Weeks 5-8)

**Track A**: C2 (deploy) + C5 (email) + C4 (admin) + C1 (Stripe)
**Track B**: Mobile core screens, offline sync, push, widget, camera

### Phase 3: Intelligence (Weeks 9-12)

Tracks merge. AI agent, gamification, savings automation.

### Phase 4: Mobile Excellence + Growth (Weeks 13-16)

Voice, insights, gamification mobile, bill splitting, academy, App Store launch.

---

## Brand Strategy

**Public brand**: Everything is **Zecca**
**Internal code**: Stays `money-wise`
**Future**: Parent brand TBD when CRM + marketing agents materialize

## Pricing Tiers (post-Stripe)

| Tier | Price | Features |
|------|-------|----------|
| Free | 0 | 1 user, manual entry, basic budgets |
| Zecca Pro | 4.99 EUR/mo | AI agent, voice, bank sync, analytics |
| Zecca Family | 7.99 EUR/mo | Up to 5 profiles, parental controls, shared goals |

---

## Risk Callouts

1. **Family effort uncertainty**: 7-14 days. Timebox to 10, defer advanced features if needed.
2. **Stripe + Family coupling**: Stripe MUST NOT start until Family passes full test coverage.
3. **Mobile parallel track**: Mobile consumes stable APIs first, family-aware APIs only after C3 lands.
