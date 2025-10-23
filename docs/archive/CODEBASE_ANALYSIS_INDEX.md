# MoneyWise Codebase Analysis Index

## Overview

This index provides comprehensive documentation of the MoneyWise codebase structure, architecture, and organization patterns. These documents were generated through thorough analysis of the entire monorepo.

**Project:** MoneyWise Personal Finance Management  
**Version:** 0.5.0  
**Type:** pnpm monorepo (3 apps + 4 shared packages)  
**Generated:** October 2024  

---

## Documentation Files

### 1. CODEBASE_STRUCTURE_OVERVIEW.md (812 lines, 25KB)

**Comprehensive deep-dive analysis** covering all aspects of the codebase architecture.

**Contents:**
- **Section 1:** Project Organization & Monorepo Structure
  - Root level architecture overview
  - Workspace configuration
  - Path alias system

- **Section 2:** Technology Stack
  - Framework versions and purposes
  - Frontend UI libraries (Radix UI, Tailwind, Recharts)
  - Backend services (Auth, Database, Monitoring)
  - Testing infrastructure

- **Section 3:** Module Architecture
  - Backend NestJS module structure (core, auth, users, accounts, transactions)
  - Frontend Next.js app router structure
  - Mobile React Native layout
  - Shared packages details

- **Section 4:** Configuration Management
  - Multi-environment strategy (.env files)
  - Backend NestJS config modules
  - Frontend Next.js configuration
  - Tailwind and Vitest configs

- **Section 5:** Build System & Dependency Management
  - Turbo.json pipeline orchestration
  - Root package.json scripts
  - Dependency management strategy
  - Package manager (pnpm) configuration

- **Section 6:** File Organization Patterns
  - Backend feature module pattern
  - Frontend component pattern
  - Testing file organization
  - Database organization (Prisma)

- **Section 7:** Configuration Files Inventory
  - Root-level configurations
  - Backend app configs
  - Web app configs
  - Infrastructure configs

- **Section 8:** Development & CI/CD Setup
  - Local development environment
  - GitHub Actions workflows
  - Code quality standards

- **Section 9:** Key Architectural Patterns
  - Dependency Injection
  - Module Encapsulation
  - Layered Architecture
  - Type Safety
  - Component Library Pattern
  - Environment Abstraction
  - Testing Strategy

- **Section 10:** Critical Dependencies & Versions
  - Production dependencies
  - Development dependencies
  - Version constraints

- **Section 11:** Monitoring & Observability
  - Sentry error tracking
  - Health checks
  - Logging infrastructure

- **Section 12:** Architecture Recommendations & Strengths
  - Identified strengths
  - Areas for evolution

**Best For:** Architects, senior developers, code reviewers, new team leads

---

### 2. QUICK_REFERENCE_GUIDE.md (304 lines, 9KB)

**Developer-friendly quick reference** for day-to-day development.

**Contents:**
- Directory structure at a glance
- Technology stack summary (table format)
- Key file locations (organized by layer)
- Core modules overview
- Common development commands
  - Setup & startup
  - Building
  - Testing
  - Code quality
  - Database operations
- Architecture patterns (visual format)
- Database schema highlights
- CI/CD pipeline overview
- Key dependencies (categorized)
- Development environment specs
- File organization conventions
- Quick debugging tips

**Best For:** Developers, junior team members, quick lookups during development

---

## Monorepo Structure at a Glance

```
money-wise/
├── apps/              (3 Applications)
│   ├── backend/       NestJS REST API
│   ├── web/           Next.js 15 SPA
│   └── mobile/        React Native + Expo
│
├── packages/          (4 Shared Libraries)
│   ├── types/         TypeScript type definitions
│   ├── ui/            Radix UI + Tailwind components
│   ├── utils/         Helper functions
│   └── test-utils/    Testing utilities
│
├── docs/              Comprehensive documentation
├── infrastructure/    Docker & deployment configs
├── scripts/           Build and utility scripts
└── .github/workflows/ GitHub Actions CI/CD
```

---

## Technology Stack Summary

| Layer | Primary Technology | Version | Purpose |
|-------|-------------------|---------|---------|
| Backend | NestJS | ^10.0.0 | REST API, Modules, DI |
| Frontend | Next.js | ^15.4.7 | React SSR, App Router |
| Mobile | React Native | 0.72.6 | Cross-platform app |
| Database | PostgreSQL | 15 | Primary data store |
| Time-series | TimescaleDB | - | Extension for analytics |
| ORM | Prisma | ^6.17.1 | Type-safe DB access |
| Cache | Redis | 7 | Session/rate limiting |
| UI Components | Radix UI | Latest | Accessible primitives |
| CSS Framework | Tailwind | ^3.3.6 | Utility-first styling |
| State (Frontend) | Zustand | ^4.4.7 | Lightweight state mgmt |
| State (Backend) | NestJS DI | Built-in | Dependency injection |
| Auth | Passport + JWT | Latest | Authentication |
| Testing | Jest, Playwright | ^29.x, ^1.4x | Unit, integration, E2E |
| Monitoring | Sentry | ^10.15.0 | Error tracking |
| Build Orchestration | Turbo | ^1.11.2 | Task caching & parallelization |
| Package Manager | pnpm | ^8.15.1 | Fast, strict dependency mgmt |

---

## Key Directories Explained

### Backend (/apps/backend/src/)
- **core/** - Infrastructure layer (config, database, redis, logging, monitoring)
- **auth/** - Authentication & authorization
- **users/** - User management
- **accounts/** - Financial account management
- **transactions/** - Transaction tracking
- **common/** - Shared interceptors, decorators

### Frontend (/apps/web/)
- **app/** - Next.js app router pages (auth, dashboard)
- **components/** - React components (auth, layout, ui)
- **lib/** - Utility functions
- **stores/** - Zustand state management
- **e2e/** - Playwright end-to-end tests

### Shared Packages (/packages/)
- **types/** - Central TypeScript definitions
- **ui/** - Component library (Storybook included)
- **utils/** - Helper utilities (date-fns, lodash)
- **test-utils/** - Testing fixtures and factories

---

## Configuration Files Quick Lookup

### Most Important Files

**Root-level:**
- `package.json` - Workspaces definition, scripts
- `tsconfig.json` - TypeScript configuration with path aliases
- `turbo.json` - Build pipeline configuration
- `.eslintrc.js` - Global linting rules

**Backend:**
- `apps/backend/prisma/schema.prisma` - Database schema
- `apps/backend/src/core/config/` - Configuration modules
- `apps/backend/.env*` - Environment variables

**Frontend:**
- `apps/web/next.config.mjs` - Next.js configuration
- `apps/web/tailwind.config.js` - Tailwind CSS configuration
- `apps/web/.env*` - Environment variables

**CI/CD:**
- `.github/workflows/ci-cd.yml` - Main pipeline
- `.github/workflows/specialized-gates.yml` - Quality gates
- `.github/workflows/release.yml` - Release automation

---

## Development Quick Commands

### Initial Setup
```bash
pnpm install
pnpm docker:dev      # Start PostgreSQL + Redis
```

### Development
```bash
pnpm dev             # All apps (parallel)
pnpm dev:backend     # Backend only
pnpm dev:web         # Web only
```

### Testing
```bash
pnpm test            # All tests
pnpm test:e2e        # End-to-end tests
pnpm test:coverage   # Coverage reports
```

### Code Quality
```bash
pnpm lint
pnpm lint:fix
pnpm typecheck
```

---

## Architecture Patterns

### 1. Monorepo Organization
- **Separation of concerns:** apps/ (applications) vs packages/ (libraries)
- **Path aliases:** Import shared packages without relative paths
- **Turbo:** Dependency-aware build orchestration with caching

### 2. Backend Architecture
- **Layered:** Core infrastructure → Feature modules → Shared utilities
- **Dependency Injection:** NestJS handles provider resolution
- **Module pattern:** Each feature has module, service, controller, dto, guards, tests

### 3. Type Safety
- **Centralized types:** @money-wise/types package
- **Strict TypeScript:** No 'any' types allowed
- **DTOs:** Data validation at API boundaries
- **Zod schemas:** Frontend validation

### 4. Database
- **Prisma ORM:** Type-safe with auto-generated client
- **Migrations:** Version-controlled database changes
- **Schema:** Clear enums and relationships

### 5. Testing
- **Unit tests:** Jest (business logic)
- **Integration tests:** Jest + TestContainers (module interactions)
- **E2E tests:** Playwright (user workflows)

---

## Common Scenarios

### I'm a new developer, where do I start?
1. Read: QUICK_REFERENCE_GUIDE.md
2. Setup: `pnpm install && pnpm docker:dev && pnpm dev`
3. Explore: Backend NestJS modules, Frontend Next.js pages
4. Review: docs/development/setup.md

### I need to understand the architecture
1. Read: CODEBASE_STRUCTURE_OVERVIEW.md Section 1-3
2. Review: Architecture decision records in docs/architecture/adr/
3. Examine: Core module files (app.module.ts, main.ts)

### I'm adding a new feature
1. Backend: Create `src/[feature]/` following the module pattern
2. Frontend: Create `components/[feature]/` and `app/[route]/`
3. Shared: Add types to `@money-wise/types`
4. Tests: Write unit, integration, and E2E tests

### I'm debugging a build issue
1. Check: QUICK_REFERENCE_GUIDE.md "Quick Debugging" section
2. Clean: `pnpm clean` (clear all caches)
3. Reinstall: `pnpm install`
4. Check: Port conflicts with `lsof` command

### I need to understand the database
1. Review: apps/backend/prisma/schema.prisma
2. View: Current schema with `pnpm prisma:studio`
3. Read: docs/development/database/ for migration guides

---

## Key Strengths of This Architecture

✅ **Scalable Monorepo** - Clear boundaries between apps and packages  
✅ **Type Safety** - Strict TypeScript throughout entire codebase  
✅ **Developer Experience** - Hot reload, Turbo caching, clear patterns  
✅ **Testing** - Multi-layer (unit, integration, E2E)  
✅ **CI/CD** - Comprehensive GitHub Actions automation  
✅ **Component Reuse** - Shared UI library with Storybook  
✅ **Database** - Clear schema with Prisma migrations  
✅ **Configuration** - Multi-environment support built-in  
✅ **Monitoring** - Sentry integrated across all platforms  
✅ **Documentation** - Well-organized docs directory  

---

## File References

| Document | Size | Sections | Best For |
|----------|------|----------|----------|
| CODEBASE_STRUCTURE_OVERVIEW.md | 25 KB | 12 detailed sections | Architects, reviewers |
| QUICK_REFERENCE_GUIDE.md | 9 KB | Quick lookups | Developers, daily reference |
| This Index | 5 KB | Navigation guide | Quick orientation |

---

## Related Documentation

Within the repository, find additional context in:
- **docs/architecture/** - Architecture decision records
- **docs/development/** - Setup and development guides
- **docs/planning/** - Roadmaps and requirements
- **README.md** - Project overview and quick start

---

## Navigation Guide

### For Project Overview
Start here -> QUICK_REFERENCE_GUIDE.md -> README.md

### For Architecture Understanding
Start here -> CODEBASE_STRUCTURE_OVERVIEW.md (Sections 1-3) -> docs/architecture/

### For Development
Start here -> QUICK_REFERENCE_GUIDE.md (Commands section) -> docs/development/setup.md

### For Adding Features
1. Read: CODEBASE_STRUCTURE_OVERVIEW.md (Section 6: File Organization)
2. Review: Related feature module in codebase
3. Follow: The established patterns for your layer

### For CI/CD Understanding
1. Read: CODEBASE_STRUCTURE_OVERVIEW.md (Section 8)
2. Review: .github/workflows/ YAML files
3. Check: QUICK_REFERENCE_GUIDE.md (CI/CD Pipeline section)

---

## Document Update Information

**Analysis Date:** October 2024  
**Project Version:** 0.5.0  
**Generated From:** Complete monorepo structure analysis  
**Maintained By:** Development team  

These documents accurately reflect the codebase state as of the analysis date. Update them when:
- Major architectural changes occur
- New packages or applications are added
- Significant technology updates happen
- Development processes change

---

## Quick Links to Key Files

**Monorepo Configuration:**
- /package.json - Workspaces, scripts, overrides
- /tsconfig.json - Path aliases for all packages
- /turbo.json - Build pipeline tasks

**Backend:**
- /apps/backend/src/app.module.ts - Module imports
- /apps/backend/prisma/schema.prisma - Database models
- /apps/backend/src/core/config/ - Configuration management

**Frontend:**
- /apps/web/app/layout.tsx - Root layout
- /apps/web/next.config.mjs - Next.js config
- /apps/web/tailwind.config.js - Tailwind theme

**Shared:**
- /packages/types/src/index.ts - Type exports
- /packages/ui/src/ - Component library
- /packages/utils/src/ - Utility functions

**CI/CD:**
- /.github/workflows/ci-cd.yml - Main pipeline
- /.github/workflows/release.yml - Release automation

**Development:**
- /docker-compose.dev.yml - Local services
- /scripts/ - Utility scripts
- /docs/development/ - Development guides

---

**Last Updated:** October 2024  
**For Issues:** Create a GitHub issue or check docs/troubleshooting/  
**For Questions:** Review QUICK_REFERENCE_GUIDE.md or CODEBASE_STRUCTURE_OVERVIEW.md
