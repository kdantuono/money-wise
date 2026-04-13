# Architecture Ownership Table

> **Purpose**: Each architectural concern has ONE canonical owner.
> Friction-driven decisions become lookups. When you need to find the
> authoritative source for a concern, consult this table instead of
> searching the codebase.
>
> This is a living document. Update it when ownership changes.
>
> **Last reviewed**: 2026-04-13

## Ownership Map

| Concern | Canonical Owner | Notes |
|---|---|---|
| Health endpoints | `apps/backend/src/core/health/` | Duplicate at monitoring/ was deleted |
| Auth state (client) | `apps/web/src/stores/auth-store.ts` | Single Zustand store for auth |
| Authenticated route surface | `apps/web/app/dashboard/*/page.tsx` | Shadow stubs deleted, /banking migrated |
| Test contract / exclusion policy | Per-app configs: `jest.config.js` (backend), `vitest.config.mts` (web) | Single testMatch source of truth per app |
| Password policy | `apps/backend/src/auth/dto/register.dto.ts` | Real rule: @MinLength(12) + complexity regex |
| Banking provider | `apps/backend/src/banking/` | SaltEdge primary; Plaid ghost stubs retired |
| Multi-tenancy model | `apps/backend/src/users/` + `apps/backend/src/core/database/prisma/services/family.service.ts` | familyId comments across accounts, budgets, categories |
| Shared UI | `packages/ui/` | Currently empty stub (src/index.ts only); populate during Figma refactor or retire |
| Coverage target | Backend: 70/72/70/65, Web: 70/70/70/65 | Aligned in jest.config.js, vitest.config.mts, coverage-report.js |

## How to Use This Table

1. **Before adding a new module**: Check if the concern already has an owner.
   If it does, extend the existing module rather than creating a parallel one.

2. **Before refactoring**: Verify the canonical owner has not moved. Update
   this table if it has.

3. **During code review**: If a PR introduces a new source of truth for an
   existing concern, flag it. Either the PR should update this table or it
   should use the existing owner.

## Change Log

| Date | Change | Author |
|---|---|---|
| 2026-04-13 | Initial table created from audit findings | CI automation |
