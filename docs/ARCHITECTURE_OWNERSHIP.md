# Architecture Ownership

> Module map and ownership table for the MoneyWise codebase.

## Backend (`apps/backend/src/`)

| Module | Owner | Test Status | Notes |
|---|---|---|---|
| `accounts/` | @kdantuono | 7 test files, passing | Financial account CRUD |
| `analytics/` | @kdantuono | 4 test files, passing | Reporting and analytics |
| `auth/` | @kdantuono | 21 test files, passing | JWT/Local auth, guards, decorators |
| `banking/` | @kdantuono | 7 test files, passing | SaltEdge integration |
| `budgets/` | @kdantuono | 6 test files, passing | Budget management |
| `categories/` | @kdantuono | 4 test files, passing | Category hierarchy |
| `common/` | @kdantuono | 6 test files, passing | Decorators, interceptors, types |
| `config/` | @kdantuono | 2 test files, 1 skip | SaltEdge config (1 skip: path edge case) |
| `core/` | @kdantuono | 17 test files, some skips | Database, redis, health, monitoring, logging |
| `database/` | @kdantuono | 12 test files, passing | Prisma services, repositories |
| `docs/` | @kdantuono | 3 test files, passing | OpenAPI schema |
| `liabilities/` | @kdantuono | 5 test files, passing | Liability tracking |
| `notifications/` | @kdantuono | 2 test files, passing | Notification system |
| `scheduled/` | @kdantuono | 6 test files, passing | Scheduled tasks |
| `transactions/` | @kdantuono | 8 test files, passing | Transaction CRUD, transfers, categorization |
| `users/` | @kdantuono | 4 test files, passing | User management |

## Web (`apps/web/`)

| Route / Area | Owner | Test Status | Notes |
|---|---|---|---|
| `app/accounts/` | @kdantuono | Covered by E2E | Account pages |
| `app/auth/` | @kdantuono | E2E + unit (some skips) | Login, registration |
| `app/banking/` | @kdantuono | Covered by E2E | Banking connection pages |
| `app/dashboard/` | @kdantuono | Unit tests (some skips) | Dashboard layout |
| `app/reports/` | @kdantuono | Covered by E2E | Report pages |
| `app/settings/` | @kdantuono | Unit tests (all skipped) | Settings page — mock mismatch |
| `app/transactions/` | @kdantuono | Unit tests (some skips) | Transaction pages |
| `components/` | @kdantuono | 59+ test files | UI components |
| `services/` | @kdantuono | Covered by component tests | API client layer |
| `stores/` | @kdantuono | Covered by component tests | Zustand stores |
| `hooks/` | @kdantuono | Covered by component tests | Custom hooks |
| `lib/` | @kdantuono | Unit tests (some skips) | Auth service, utilities |

## Shared Packages (`packages/`)

| Package | Owner | Test Status | Notes |
|---|---|---|---|
| `types/` | @kdantuono | Skip (no logic) | TypeScript type definitions |
| `ui/` | @kdantuono | Skip (placeholder) | Shared Radix + Tailwind components |
| `utils/` | @kdantuono | Skip (placeholder) | Shared utility functions |
| `test-utils/` | @kdantuono | N/A (excluded from workspace) | Testing helpers |

## Infrastructure

| Area | Owner | Notes |
|---|---|---|
| `.github/workflows/` | @kdantuono | CI/CD pipeline |
| `docker-compose.*.yml` | @kdantuono | Dev, E2E, monitoring stacks |
| `.claude/` | @kdantuono | Claude Code config, scripts, agents |
| `scripts/` | @kdantuono | Build, testing, deployment scripts |

## Coverage Summary

- **Backend**: 72.46% statements, 67.04% branches, 74.13% functions, 72.69% lines
- **Web**: 70% statements target (enforced via vitest.config.mts)
- **Thresholds enforced**: Backend jest.config.js, Web vitest.config.mts
