# Legacy Planning — Pre-Supabase Era

**Archived**: 2026-04-19 as part of roadmap consolidation (see repo CHANGELOG.md).

These documents were produced when MoneyWise had a custom NestJS backend (Express + Prisma + PostgreSQL + Redis). In 2026-04-15 the architecture pivoted to **Supabase** (PostgreSQL + Auth + Edge Functions Deno) and the backend app was removed entirely. The planning documents here describe a stack that no longer exists.

## Why archived, not deleted

- **Historical trace**: understand what was considered, attempted, and discarded
- **Audit trail**: ADRs reference past decisions; without the source, the rationale is lost
- **`git mv` preserves history**: `git log --follow` on any file still shows the full evolution

## Current authoritative roadmap

**Single source of truth**: `~/vault/moneywise/planning/roadmap.md`

The vault is a private knowledge base synced P2P between developer machines (Steam Deck ↔ Lucca PC via Tailscale + bare git repos). See ADR-001 (vault architecture) and ADR-005 (mobile framework placeholder) in `~/vault/moneywise/decisions/`.

## What's in here

| Category | Files | Relevance today |
|----------|-------|----------------|
| Phase 1-5 migration plans | PHASE*, phase*, mvp-*.md | Completed or superseded by Supabase migration |
| EPIC-2.x | `epics/EPIC-2.*.md` | Frontend auth/dashboard: implemented, NestJS-specific details obsolete |
| Milestones M1-M6 | `milestones/` | Early planning, all M1-M3 done, M4-M6 superseded |
| MVP 8-week plan | `mvp/` | Original scope, mostly delivered or reframed |
| Banking research Phase 4 | `BANKING-PROVIDER-*.md` | Superseded by `~/vault/moneywise/research/banking-provider-comparison.md` + ADR-004 |
| SaltEdge integration | `integrations/` | Implementation exists but gated (BANKING_INTEGRATION_ENABLED=false) |
| Unified/strategic roadmaps (Apr 14-15) | `zecca-*.md` | Superseded by `~/vault/moneywise/planning/roadmap.md` (2026-04-19) |
| App overview (pre-Supabase vision) | `app-overview.md` | Vision still partially valid; supabase-migrated version in vault |

Do not treat anything in this folder as current.
