# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MoneyWise (brand: **Zecca**) is a personal finance management application. Monorepo using pnpm workspaces + Turborepo. All UI text is in Italian (hardcoded now, i18n via next-intl planned).

**Stack**: Next.js 15 (web) + Supabase (PostgreSQL, Auth, Edge Functions) + Expo/React Native (mobile)
**UI**: Tailwind v4 + Radix UI + Framer Motion. Design from Figma Make (reference at `~/dev/figma-reference/`)
**Package manager**: pnpm 10+ (Node 22+)
**Database**: Supabase-hosted PostgreSQL with RLS policies (schema in `supabase/migrations/`)
**No custom backend** — all server logic lives in Supabase Edge Functions (Deno). No NestJS, no Express.

## Monorepo Structure

```
apps/
  web/        - Next.js App Router (Zustand + TanStack Query, Tailwind v4, Radix UI, Vitest)
  mobile/     - Expo/React Native (NativeWind, Expo Router)
packages/
  types/      - Shared TypeScript type definitions
  ui/         - 46 Figma-derived shadcn components (Radix + Tailwind + CVA, built with tsup)
  utils/      - Shared utility functions (placeholder)
  test-utils/ - Shared testing helpers (Testing Library, currently excluded from workspace)
supabase/
  migrations/ - SQL migrations (schema, RLS policies, seed functions)
  functions/  - Deno Edge Functions (banking, categorization, transfer detection, BNPL)
  config.toml - Supabase project configuration
```

Path aliases: `@money-wise/types`, `@money-wise/utils`, `@money-wise/ui`, `@money-wise/test-utils`

## Common Commands

### Development
```bash
pnpm install                  # Install all dependencies
pnpm dev                      # Run all apps in parallel (Turbo)
pnpm dev:web                  # Web only (Next.js dev server, port 3000)
```

### Build
```bash
pnpm build                    # Build all (runs scripts/build-clean.sh)
pnpm build:web                # Build web only
```

### Testing
```bash
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

### Database (Supabase)
```bash
supabase db push              # Push schema changes
supabase db reset             # Reset database
supabase migration new <name> # Create new migration
supabase functions serve      # Serve Edge Functions locally
supabase functions deploy     # Deploy all Edge Functions
```

## Architecture

### Web (`apps/web/src/`)
Next.js 15 App Router with standalone output mode. UI follows Figma 1:1 (Design Sprint v2 completed).

- `app/` - Next.js App Router pages and layouts (all dashboard pages are Figma-derived)
- `components/` - Feature-grouped: `ui/` (shadcn base), `layout/` (sidebar + topbar), `transactions/`, `categories/`, `accounts/`, `banking/`, `budgets/`, `onboarding/`, `notifications/`, `providers/`
- `services/` - Supabase client layer (per-domain: accounts, transactions, budgets, categories, banking, etc.)
- `hooks/` - Custom hooks (query wrappers, theme, dashboard)
- `store/` + `stores/` - Zustand stores (banking, budgets, transactions, auth)
- `lib/` - Auth service (Supabase Auth), performance utilities
- `utils/` - CSV export, sanitization, budget helpers, Supabase client setup

Forms: react-hook-form + Zod. Charts: recharts. Icons: lucide-react. Animations: framer-motion.
Auth: Supabase Auth via `@supabase/ssr` (cookie-based sessions, middleware refresh).
i18n: next-intl (framework setup, messages in `messages/it.json` and `messages/en.json`).

### Supabase (`supabase/`)
- `migrations/` - SQL schema (20+ tables, 27 enums, 63 RLS policies, 4 analytics RPCs)
  - Rich financial model: `transaction_type` (DEBIT/CREDIT), `flow_type` (EXPENSE/INCOME/TRANSFER/LIABILITY_PAYMENT/REFUND), `liability_type` (CREDIT_CARD/BNPL/LOAN/MORTGAGE), `expense_class` (FIXED/VARIABLE on categories), `scheduled_transactions` + `recurrence_rules` + `installments`
- `functions/` - Deno Edge Functions:
  - `categorize-transaction` - 5-strategy categorization cascade
  - `detect-transfers` - Scoring algorithm for transfer pair detection
  - `detect-bnpl` - 10 BNPL provider pattern matching
  - `banking-*` - SaltEdge integration (DISABLED — provider decision pending, see banking note below)
  - `_shared/` - Shared utilities (CORS, Supabase client, SaltEdge client, responses)
- `config.toml` - Project config (project ID: `qhsrkuucldwklkdzbkuw`)

### Infrastructure
- `docker-compose.e2e.yml` - E2E test environment (web only, connects to Supabase)
- `docker-compose.monitoring.yml` - Monitoring stack
- `.claude/scripts/infra.sh` - Runtime-agnostic service management
- `.claude/scripts/bootstrap-dev.sh` - Unified dev environment setup

### Claude Code Settings
- `.claude/settings.json` - Shared project config (committed). Contains env flags like Agent Teams.
- `.claude/settings.local.json` - Personal permissions (gitignored). Auto-generated by Claude Code as you grant tool permissions. Do not commit.

## Git Workflow

- **Default branch: `develop`** (from 2026-04-16). Source of truth for ongoing work. `main` = release branch, updated bi-weekly via deliberate `develop` → `main` PR. See ADR-002 in vault.
- **Never work directly on develop or main** - always use feature/fix/chore branches
- Commit format: `type(scope): description` (commitlint enforced)
- Types: fix, feat, refactor, test, docs, chore, ci, perf, style
- Pre-commit hooks (Husky): doc governance, actionlint (if workflows staged), lint, typecheck, unit tests
- Pre-push validation: `./.claude/scripts/validate-ci.sh 8` on Steam Deck (no Docker → levels 9-10 can't run locally). Use `10` only on machines with Docker + `act` installed. Remote GitHub Actions is the authoritative gate.
- Protected branches: main, develop, gh-pages, safety/*
- After push: verify CI with `gh run list --branch [branch] --limit 1`

## Banking Integration (status: DISABLED)

Banking sync via SaltEdge is implemented but **disabled by default** (`BANKING_INTEGRATION_ENABLED=false`). Provider decision pending — SaltEdge requires certification for production, Nordigen/GoCardless closed to new customers (09/2025). For beta: CSV Import is the bridge. DB schema supports multi-provider (SaltEdge, Tink, Yapily, Plaid columns).

## Testing Patterns

- **Web**: Vitest with jsdom. Coverage: 70% statements/lines/functions, 65% branches.
- **E2E**: Playwright. Tests in `apps/web/e2e/`. Runs against localhost:3000 + Supabase. Projects: chromium, mobile chrome.

## Session & CI Discipline

- Run `/resume-work` at session start to restore previous context
- Run `./.claude/scripts/init-session.sh` to verify environment
- Run `./.claude/scripts/validate-ci.sh 8` before any push on Steam Deck (levels 1-8 cover lint/typecheck/tests/yaml/actions-syntax). Levels 9-10 require Docker + `act` and are validated in remote CI.
- Never claim CI success without verifying via `gh run view`
- Failed pipelines block all further work until fixed
- **One session = one worktree**: when running concurrent local Claude sessions, spawn each one in its own worktree via `scripts/bootstrap-worktree.sh <branch>`. Sharing the main worktree between sessions causes HEAD-drift commits that land on the wrong branch.
- **Active context briefing**: before invoking remote agents (ultraplan, autofix-pr), prepend the "Active Context" snippet from `~/vault/moneywise/planning/ACTIVE-CONTEXT.md` to the prompt so the remote agent inherits current Focus/Out-of-scope.

## Subagent Usage

- Do not use `Agent({isolation: "worktree"})`: the sandbox treats `.claude/` as config area and blocks `Write`/`Edit` inside the worktree. Rules in `.claude/rules/subagent-sandbox.rules`.
- Every `Agent(...)` prompt must include: *"Do not invoke any Skill tool. If a skill name seems to match, refuse and continue with your available tools only."*
- Default pattern for overnight / multi-step work: Opus-implementer (Opus writes + validates, Sonnet explores only).

## Documentation Governance

Files allowed in root: README.md, CHANGELOG.md, CONTRIBUTING.md, FRONTEND_HANDOFF.md, LICENSE.md, CLAUDE.md. All other docs auto-moved by pre-commit hook. Rules in `.claude/rules/markdown.rules`.

## Agent & Orchestration References

- Agent details: `.claude/agents/README.md`
- Commands: `.claude/commands/README.md`
- Epic workflow: `.claude/workflows/epic-workflow.md`
- Architecture decisions: `.claude/knowledge/architecture.md`
- MVP planning: `docs/planning/README.md`
- Development setup: `docs/development/setup.md`

## Knowledge Vault (Obsidian)

Shared knowledge lives at `~/vault/moneywise/` — plain Markdown, Obsidian-compatible, outside the repo for privacy. It is the **single source of truth** for long-lived knowledge (memories, planning, postmortems, ADR, research).

**Two access paths, same files**:
- `~/.claude/projects/<project-id>/memory/` is a **symlink** to `~/vault/moneywise/memory/`. Claude's auto-memory system writes there transparently. `<project-id>` is machine-specific (derived by Claude Code from the absolute repo path, e.g. `-home-deck-dev-money-wise` when the repo lives at `/home/deck/dev/money-wise`). To discover the correct directory on a fresh machine: `ls ~/.claude/projects/ | grep money-wise`.
- `~/vault/moneywise/` exposes the full vault (planning, postmortems, decisions, research, references).

**Entry points**: `README.md` (conventions) + `index.md` (navigation) + `memory/MEMORY.md` (auto-memory index).

**MCP integration**: `obsidian-mcp-server` is configured in `~/.claude.json`. When Obsidian is running with Local REST API plugin active, Claude can use `mcp__obsidian__*` tools for semantic search, tag queries, and frontmatter-aware ops. **Fallback**: filesystem Read/Write works always, even with Obsidian closed.

**When to write where**:
- New memory (feedback/project/reference/user) → `memory/` via auto-memory system
- ADR (architectural decision) → `decisions/<name>.md` in vault
- Incident/postmortem → `postmortems/<name>.md` in vault
- Research note → `research/<name>.md` in vault
- Active plan → `planning/<name>.md` in vault
