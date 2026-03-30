# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MoneyWise is a personal finance management application. Monorepo using pnpm workspaces + Turborepo.

**Stack**: NestJS 11 (backend) + Next.js 15 (web) + Expo/React Native (mobile) + PostgreSQL (TimescaleDB) + Redis
**Package manager**: pnpm 10+ (Node 22+)
**ORM**: Prisma 6 (schema at `apps/backend/prisma/schema.prisma`)

## Monorepo Structure

```
apps/
  backend/    - NestJS REST API (Prisma, Passport JWT, Redis caching, Sentry)
  web/        - Next.js App Router (Zustand + TanStack Query, Tailwind v4, Radix UI, Vitest)
  mobile/     - Expo/React Native (NativeWind, Expo Router)
packages/
  types/      - Shared TypeScript type definitions
  ui/         - Shared React components (Radix + Tailwind + CVA, built with tsup)
  utils/      - Shared utility functions (placeholder)
test-utils/   - Shared testing helpers (Testing Library)
```

Path aliases: `@money-wise/types`, `@money-wise/utils`, `@money-wise/ui`, `@money-wise/test-utils`

## Common Commands

### Development
```bash
pnpm install                  # Install all dependencies
pnpm dev                      # Run all apps in parallel (Turbo)
pnpm dev:backend              # Backend only (NestJS watch mode)
pnpm dev:web                  # Web only (Next.js dev server, port 3000)
pnpm docker:dev               # Start TimescaleDB + Redis containers
pnpm docker:down              # Stop infrastructure containers
```

### Build
```bash
pnpm build                    # Build all (runs scripts/build-clean.sh)
pnpm build:backend            # Build backend only
pnpm build:web                # Build web only
```

### Testing
```bash
# Backend (Jest, ts-jest)
pnpm --filter @money-wise/backend test              # All backend tests
pnpm --filter @money-wise/backend test:unit          # Unit tests only
pnpm --filter @money-wise/backend test:integration   # Integration tests (needs DB)
pnpm --filter @money-wise/backend test -- --testPathPattern="path/to/test"  # Single test file

# Web (Vitest + jsdom)
pnpm --filter @money-wise/web test                   # All web tests
pnpm --filter @money-wise/web test:watch             # Watch mode
pnpm --filter @money-wise/web test -- path/to/test   # Single test file

# E2E (Playwright, from root)
pnpm test:e2e                      # All E2E tests (auto-starts web dev server)
pnpm test:e2e:playwright:headed    # With browser visible
pnpm test:e2e:playwright:debug     # Debug mode

# Coverage
pnpm test:coverage                 # Run with coverage across all apps
pnpm test:coverage:report          # Generate combined report
```

### Linting & Type Checking
```bash
pnpm lint                     # ESLint across all packages
pnpm lint:fix                 # ESLint with auto-fix
pnpm typecheck                # TypeScript type checking across all packages
pnpm format                   # Prettier formatting
```

### Database
```bash
pnpm db:migrate               # Run Prisma migrations
pnpm db:seed                  # Seed database
pnpm db:reset                 # Reset database
pnpm --filter @money-wise/backend prisma:studio   # Open Prisma Studio
```

## Architecture

### Backend (`apps/backend/src/`)
NestJS modular architecture with global JWT auth guard.

- `core/` - Infrastructure: config, database (Prisma), redis, health, monitoring (Sentry), logging
- `auth/` - Authentication: Passport JWT/Local strategies, guards, decorators
- `accounts/` - Financial account management
- `transactions/` - Transaction CRUD with DTOs
- `budgets/` - Budget management with validators
- `categories/` - Category hierarchy
- `banking/` - Banking provider integrations (SaltEdge primary; Tink, Yapily, TrueLayer planned)
- `analytics/` - Reporting and analytics
- `users/`, `notifications/`, `liabilities/`, `scheduled/` - Other domain modules

Backend builds: `prisma generate` runs before `nest build`.

### Web (`apps/web/src/`)
Next.js 15 App Router with standalone output mode.

- `app/` - Next.js App Router pages and layouts
- `components/` - Feature-grouped components + `ui/` base components + `providers/`
- `services/` - API client layer (axios-based, per-domain)
- `hooks/` - Custom hooks (query wrappers, theme, dashboard)
- `store/` + `stores/` - Zustand stores (banking, budgets, transactions, auth)
- `lib/` - Auth service, API helpers, performance utilities
- `utils/` - CSRF, CSV export, sanitization, budget helpers

Forms: react-hook-form + Zod. Charts: recharts. Icons: lucide-react.

### Infrastructure
- `docker-compose.dev.yml` - TimescaleDB (port 5432) + Redis (port 6379)
- `docker-compose.e2e.yml` - E2E test environment
- `docker-compose.monitoring.yml` - Monitoring stack

## Git Workflow

- **Never work directly on main** - always use feature branches
- Commit format: `type(scope): description` (commitlint enforced)
- Types: fix, feat, refactor, test, docs, chore, ci, perf, style
- Pre-commit hooks (Husky): Prettier + ESLint via lint-staged on `*.{ts,tsx,js,jsx}`
- Pre-push validation: `./.claude/scripts/validate-ci.sh 10` (all 10 levels must pass)
- Protected branches: main, develop, gh-pages, safety/*
- After push: verify CI with `gh run list --branch [branch] --limit 1`

## Testing Patterns

- **Backend**: Jest with ts-jest. Tests in `__tests__/` directories. 30s timeout. Integration tests need running DB.
- **Web**: Vitest with jsdom. Coverage target: 70% statements, 65% branches.
- **E2E**: Playwright. Tests in `apps/web/e2e/`. Runs against localhost:3000. Projects: chromium, firefox, webkit, mobile chrome, mobile safari.
- `passWithNoTests: false` in Jest - every package must have tests or explicit skip.

## Session & CI Discipline

- Run `/resume-work` at session start to restore previous context
- Run `./.claude/scripts/init-session.sh` to verify environment
- Run `./.claude/scripts/validate-ci.sh 10` before any push (all levels must pass)
- Never claim CI success without verifying via `gh run view`
- Failed pipelines block all further work until fixed

## Documentation Governance

Files allowed in root: README.md, CHANGELOG.md, CONTRIBUTING.md, FRONTEND_HANDOFF.md, LICENSE.md, CLAUDE.md. All other docs auto-moved by pre-commit hook. Rules in `.claude/rules/markdown.rules`.

## Agent & Orchestration References

- Agent details: `.claude/agents/_README.md`
- Commands: `.claude/commands/README.md`
- Epic workflow: `.claude/workflows/epic-workflow.md`
- Architecture decisions: `.claude/knowledge/architecture.md`
- MVP planning: `docs/planning/README.md`
- Development setup: `docs/development/setup.md`
