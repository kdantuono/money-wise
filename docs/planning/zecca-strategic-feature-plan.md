# Zecca — Strategic Feature & Innovation Plan

> **Created**: April 14, 2026
> **Status**: Approved
> **Scope**: Brand strategy + Feature roadmap + Infrastructure decisions

## Context

MoneyWise MVP is 100% complete (11 phases, 1941+ tests, CI green). We're in consolidation phase.
**Zecca** is the unified public brand — an agent-first financial platform.
Target: 18-48 year olds. Family plan extends to <18 with gamification.
Competitors: Copilot.money, Cleo, YNAB. None combine AI agent + family + European-first.

---

## Brand Strategy: Unified "Zecca" (Option C)

**Public brand**: Everything is **Zecca**. Web, mobile, marketing, App Store, social.
**Internal code**: Stays `money-wise` (repo, packages, namespaces). Zero refactoring risk.
**Future**: Parent company brand TBD when sibling products (CRM, marketing agents) materialize.

```
What the public sees          What developers see
-----------------------       --------------------------
zecca.app (web)               apps/web/
Zecca (App Store)             apps/mobile/
@zecca (social)               @money-wise/* (packages)
"Powered by Zecca"            money-wise (repo name)
```

### Web vs Mobile — Different Experiences, One Brand

```
Zecca Web (dashboard)          Zecca Mobile (agent-first)
---------------------          --------------------------
Full dashboard                 Autonomous financial agent
Analytics & reports            Proactive alerts & actions
Settings & admin               Quick entry (3 taps)
Banking management             Voice input & receipt camera
Family admin panel             Savings challenges & gamification
                               Push: "Zecca dice che..."
                               Widget: budget remaining
```

### Why "Zecca"

- "La Zecca" = Italian State Mint (money authority)
- "Hai le zecche" = you're stingy (= you save = good!)
- Z initial = stands out in App Store (Zelle, Zoom pattern)
- 2 syllables = winning fintech pattern (Monzo, Klarna, Stripe)
- Zero search competition in tech/finance space
- Works internationally as Italian brand name (like Revolut, Satispay)
- "MoneyWise" retired as public name (conflicts with Wise fintech, generic, unsearchable)

---

## Competitive Gap Analysis

| Feature | Copilot | Cleo | YNAB | Zecca |
|---------|---------|------|------|-------|
| Auto bank sync | Yes | Yes | Yes | Yes (SaltEdge) |
| AI agent (autonomous) | No | Chatbot only | No | **Zecca IS the agent** |
| Auto-categorization | Basic | Good | Manual | ML + user learning |
| Savings automation | No | Round-ups | No | Smart rules + challenges |
| Subscription tracker | Yes | Yes | No | Auto-detect from txns |
| Family/multi-user | No | No | No | **Core differentiator** |
| Gamification | No | Basic | No | Full engine + family |
| Mobile-first | iOS only | Yes | Weak | **Agent-first mobile** |
| Voice input | No | No | No | Whisper + Claude parsing |
| European-first | No | No | No | **GDPR, SEPA, multi-currency** |
| Free tier | No ($11/mo) | Yes | No ($15/mo) | Yes |

**Our moat**: Agent-first + Family-first + European-first. Nobody else occupies this space.

---

## Feature Roadmap (Prioritized)

### Tier 1 — Differentiators

#### 1. Zecca Mobile Agent (the product IS the agent)
The app doesn't wait for the user. It monitors, analyzes, and acts:
- Proactive push: "Hai speso il 40% in più in ristoranti questa settimana"
- Auto-categorization that learns from user corrections
- Budget reallocation: "Sposta 50 EUR da Shopping a Risparmio?"
- Anomaly detection: unusual charges, duplicate subscriptions
- Weekly financial digest push + email
- Quick expense entry: 3 taps max
- Swipe to categorize pending transactions
- Camera receipt scanning (OCR)
- Home widget: "Puoi spendere EUR X oggi"
- Biometric auth (FaceID/fingerprint)
- Offline-first with background sync
- **Backend**: Supabase Edge Functions + DB functions/scheduled jobs (agent orchestration, weekly digests, anomaly checks, Claude API integration)
- **Mobile**: Full build of `apps/mobile/src/` (Expo Router + NativeWind)
- **Effort**: 8-10 weeks (agent logic + mobile screens)

#### 2. Family Hub
Netflix model for family finances:
- Family dashboard: all members' spending at a glance
- Per-member budgets with parental controls
- Allowance system (weekly/monthly, auto or manual)
- Shared family goals (vacation fund, new car, etc.)
- Age-appropriate views (schema already supports UserRole: ADMIN/MEMBER/VIEWER)
- Kids mode: visual savings jars, achievement badges, mascot
- **Backend**: Supabase families schema + RLS policies for household access, parental controls, and shared goals
- **Frontend**: New dashboard pages under `/dashboard/family/`
- **Effort**: 4-5 weeks

#### 3. Stripe Billing (enables monetization)
- Free tier: 1 user, manual entry, basic budgets
- Zecca Pro (4.99 EUR/mo): AI agent, voice, bank sync, analytics
- Zecca Family (7.99 EUR/mo): up to 5 profiles, parental controls, shared goals
- Customer portal for self-service billing
- EU payment methods (SEPA, cards, iDEAL)
- Webhook-driven subscription lifecycle
- **Implementation**: Supabase Edge Functions + Stripe webhooks + DB subscription state
- **Effort**: 2-3 weeks

### Tier 2 — Retention Drivers

#### 4. Gamification Engine
- Achievement system (badges: savings streaks, budgets respected, goals met)
- Family leaderboard (chi risparmia di più questo mese?)
- Monthly financial score (0-100)
- Challenges: no-spend week, save X in Y days, 52-week challenge
- XP/levels for younger users (<18)
- **Backend**: New `apps/backend/src/gamification/` module
- **Effort**: 3 weeks

#### 5. Savings Automation ("Salvadanaio Intelligente")
- Round-up rules (arrotonda a 1/5/10 EUR)
- Auto-save: "Se spendo meno del budget, salva la differenza"
- Visual savings jar (fills up as you save)
- Savings challenges with friends/family
- **Effort**: 2-3 weeks

#### 6. Subscription Tracker
- Auto-detect recurring charges from transaction history (pattern matching)
- Dashboard: all active subscriptions + total monthly cost
- Cancellation reminders for unused services
- "Zecca ti avvisa: Netflix non lo usi da 2 mesi"
- **Effort**: 2 weeks

### Tier 3 — Expansion

#### 7. Voice Input
- "Ho speso 30 euro al ristorante" -> parsed, categorized, saved
- Whisper API for speech-to-text + Claude for entity extraction
- Multi-language: IT, EN, ES, FR, DE
- **Effort**: 2 weeks

#### 8. Smart Insights
- Spending velocity: "stai spendendo il 23% più veloce questa settimana"
- Peer comparison (anonymized): "spendi meno della media per la tua età"
- Predictive cash flow: "a fine mese avrai circa EUR X"
- Natural language trend explanations (Claude-generated)
- **Effort**: 3 weeks

#### 9. Bill Splitting
- Split with family or friends, track who owes what
- Settle-up reminders, QR code for quick splits
- **Effort**: 2-3 weeks

#### 10. Zecca Academy (Financial Education)
- Age-appropriate micro-lessons (2-3 min)
- Embedded in app flow (learn while using)
- Quizzes that earn gamification points
- **Effort**: 3-4 weeks

---

## Infrastructure Decisions

### Vercel — YES (web deployment)
- Zero-config for Next.js (standalone output already configured)
- Preview deployments per PR, analytics, image optimization
- **Effort**: 1-2 days | **Cost**: Free tier -> $20/mo Pro

### Stripe — YES (billing)
- Subscriptions, customer portal, EU payments, SCA compliant
- **Effort**: 2-3 weeks | **Cost**: 1.4% + 0.25 EUR/txn

### Supabase — YES (full migration)
> **Decision updated**: Initial assessment was "no". After deeper analysis of solo-dev reality,
> GDPR delegation, RLS solving Family multi-tenancy, and audit findings, decision reversed to full migration.
> See `zecca-phase0-supabase-migration.md` for detailed plan and `zecca-unified-roadmap.md` for timeline.
- Full migration: PostgreSQL + Auth + RLS + Storage + Realtime
- Eliminates 18,000+ LOC NestJS backend → ~1,650 LOC Edge Functions
- RLS policies replace 13 familyId TODOs (audit C3)
- Auth built-in replaces custom JWT with 5 audit-flagged bugs
- **Effort**: 4-5 weeks | **Cost**: Free tier (500MB DB, 50K MAU)

---

## Implementation Roadmap

| Phase | Weeks | Focus | Key Deliverable |
|-------|-------|-------|-----------------|
| A: Foundation | 1-4 | Stripe + Vercel + Zecca auth/nav | Monetization ready, mobile skeleton |
| B: Intelligence | 5-8 | AI agent + insights | Zecca brain: alerts, categorization, digest |
| C: Family | 9-12 | Family Hub + gamification | Multi-user, challenges, leaderboards |
| D: Mobile | 13-16 | Camera, widget, voice, offline | Zecca feature-complete |
| E: Growth | 17-20 | Education, splitting, launch | App Store submission |

---

## Competitive Strategy Summary

```
Copilot -----> Beautiful but passive, iOS-only, $11/mo, no family
Cleo --------> Fun chatbot but shallow, US-only, no family
YNAB --------> Powerful but high friction, $15/mo, no AI

Zecca -------> Agent that ACTS (not talks)
               + Family-first (nobody else does this)
               + European-first (GDPR, SEPA, multi-currency)
               + Free tier with smart upsell
               + Gamification for all ages
               = Uncontested market position
```

**The core insight**: In an agentic world, the app that acts for you wins.
Cleo talks. Zecca acts. That's the difference.

---

## Future Product Ecosystem (Noted, Not Planned)

Sibling products in mind: CRM, marketing agents. When those take shape:
- Create a parent brand (the "Meta" above "Instagram")
- Zecca remains the consumer fintech product
- CRM and marketing agents get their own brand names
- Shared infra: auth (SSO), user database, billing (Stripe)
- For now: focus 100% on Zecca. The parent brand emerges from the products, not the other way around.
