# MoneyWise — Planning Pointer

> **Authoritative roadmap is in the private knowledge vault at `~/vault/moneywise/planning/roadmap.md`** (Obsidian-compatible Markdown, single source of truth for sprints, decisions, tech debt, backlog, and scope changes).
>
> This folder contains legacy planning documents from pre-Supabase era (NestJS/Express/Prisma stack, MVP phases). Those documents are **historical**: the current architecture is Next.js 15 + Supabase (no custom backend). See `archive/pre-supabase/` for those artifacts, preserved via `git mv` for history.

## Where to look for what

| Need | Location |
|------|----------|
| Current sprint / active focus | `~/vault/moneywise/planning/roadmap.md` (sprint cards) |
| Sprint 1.5 Onboarding Piano Generato detail | `~/vault/moneywise/memory/plan_onboarding_payload_consumption.md` |
| Sprint Infra Lucca migration detail | `~/vault/moneywise/memory/plan_lucca_migration_readiness.md` |
| Architectural Decision Records (ADR-001..005) | `~/vault/moneywise/decisions/` |
| Audit findings + tech debt | `~/vault/moneywise/memory/audit_2026_04_12_outcome.md`, `docs/audits/2026-04-12-health-audit.md` |
| Banking provider research | `~/vault/moneywise/research/banking-provider-comparison.md` |
| Beta strategy | `~/vault/moneywise/memory/beta_strategy_2026_04.md` |
| Legacy NestJS-era planning | `archive/pre-supabase/` |

## Why the vault is private

The vault contains sensitive operational material (test credentials, Supabase project IDs, audit blocker maps, provider call notes, MCP tokens). It is synced P2P between developer machines via Tailscale + bare git repos, never exposed to external Git providers. See ADR-001 (vault architecture) and ADR-005 placeholder (mobile framework).

## Repo-level pointers

- `CLAUDE.md` — Claude Code guidance for this repo (includes vault pointers)
- `docs/development/` — local dev setup, troubleshooting, progress notes
- `docs/audits/` — clinical health audits (2026-04-12 most recent)
- `docs/architecture/` — architecture notes (vault ADRs are authoritative)

## Last consolidation

2026-04-19 — Consolidation inaugurale: 35+ artefatti del vault unificati sotto `~/vault/moneywise/planning/roadmap.md`. Legacy `docs/planning/` archived to `archive/pre-supabase/`. See `CHANGELOG.md` entry of the same date.
