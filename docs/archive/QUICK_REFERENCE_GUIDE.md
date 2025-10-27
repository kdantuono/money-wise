# MoneyWise Codebase - Quick Reference Guide

## Directory Structure at a Glance

```
money-wise (pnpm monorepo)
│
├── 📁 apps/                    (3 Applications)
│   ├── backend/                NestJS API (port 3001)
│   │   └── src/ → auth, users, accounts, transactions, core
│   ├── web/                    Next.js SPA (port 3000)
│   │   └── app/ → auth routes, dashboard, components
│   └── mobile/                 React Native (Expo)
│
├── 📁 packages/                (4 Shared Libraries)
│   ├── types/                  Centralized TypeScript types
│   ├── ui/                     Radix UI + Tailwind components (Storybook)
│   ├── utils/                  date-fns, lodash helpers
│   └── test-utils/             Testing fixtures & factories
│
├── 📁 docs/                    Comprehensive documentation
│   ├── architecture/           System design & decisions
│   ├── development/            Setup, debugging guides
│   ├── planning/               Roadmaps & milestones
│   ├── auth/                   Authentication flows
│   └── testing/                Test strategies
│
├── 📁 infrastructure/          Docker & deployment configs
├── 📁 scripts/                 Build, testing, CI utilities
├── 📁 .github/workflows/       GitHub Actions (ci-cd.yml, release.yml)
│
├── 📄 package.json             Monorepo definition + scripts
├── 📄 tsconfig.json            Base TypeScript config
├── 📄 turbo.json               Build pipeline orchestration
├── 📄 docker-compose.dev.yml   Local dev: PostgreSQL + Redis
└── 📄 .eslintrc.js             Global ESLint rules
```

## Technology Stack Summary

| Layer | Tech | Version |
|-------|------|---------|
| Backend | NestJS | ^10.0.0 |
| Frontend | Next.js | ^15.4.7 |
| Mobile | React Native | 0.72.6 |
| Database | PostgreSQL | 15 (TimescaleDB) |
| ORM | Prisma | ^6.17.1 |
| Cache | Redis | 7 |
| UI Components | Radix UI + Tailwind | Latest |
| Auth | Passport + JWT | Latest |
| Testing | Jest, Playwright | ^29.x, ^1.4x |
| Monitoring | Sentry | ^10.15.0 |
| Build | Turbo | ^1.11.2 |
| Package Manager | pnpm | ^8.15.1 |

## Key File Locations

### Configuration Files
```
Root-level config:
├── tsconfig.json               TypeScript paths + compiler options
├── turbo.json                  Build task graph
├── jest.config.base.js         Base test config
├── .eslintrc.js                Linting rules
└── .prettierrc.json            Code formatting

Backend (apps/backend/):
├── prisma/schema.prisma        Database schema
├── src/core/config/            Environment configs
├── jest.config.js              Test configuration
└── .env.*                      Environment variables

Frontend (apps/web/):
├── next.config.mjs             Next.js configuration
├── tailwind.config.js          Styling framework
├── vitest.config.ts            Test runner
└── playwright.config.ts        E2E tests
```

### Core Modules

**Backend (src/):**
- `core/` - Infrastructure (config, db, cache, logging, monitoring)
- `auth/` - Authentication + JWT
- `users/` - User management
- `accounts/` - Financial accounts
- `transactions/` - Transaction tracking
- `common/` - Shared interceptors, decorators

**Frontend (app/):**
- `auth/` - Login/Register flows
- `dashboard/` - Main app (protected)
- `components/` - Reusable React components
- `lib/` - Utility functions
- `stores/` - Zustand state management

**Shared (packages/):**
- `types/src/` - Type definitions
- `ui/src/` - Component library
- `utils/src/` - Helper functions
- `test-utils/src/` - Test utilities

## Common Development Commands

### Setup & Startup
```bash
pnpm install                 # Install dependencies
pnpm docker:dev             # Start PostgreSQL + Redis
pnpm dev                    # Start all dev servers (parallel)
pnpm dev:backend            # Backend only
pnpm dev:web                # Web only
```

### Building
```bash
pnpm build                  # Clean build all
pnpm build:backend          # Backend only
turbo run build             # Full build with caching
```

### Testing
```bash
pnpm test                   # All tests
pnpm test:unit              # Unit tests only
pnpm test:integration       # Integration tests
pnpm test:e2e               # End-to-end tests
pnpm test:coverage          # Coverage reports
```

### Code Quality
```bash
pnpm lint                   # Check for issues
pnpm lint:fix               # Auto-fix issues
pnpm typecheck              # TypeScript validation
pnpm format                 # Prettier format
```

### Database
```bash
pnpm db:migrate             # Run migrations
pnpm db:seed                # Seed test data
pnpm db:reset               # Reset database
pnpm prisma:studio          # Open Prisma Studio GUI
```

## Architecture Patterns

### 1. Dependency Injection (Backend)
NestJS modules declare dependencies → DI container resolves automatically
```typescript
// Example: Auth module imports Prisma & Redis
AuthModule -> PrismaModule, RedisModule
```

### 2. Feature Module Structure
```
feature/
├── feature.module.ts         // Module declaration
├── feature.service.ts        // Business logic
├── feature.controller.ts     // HTTP endpoints
├── dto/                      // Data Transfer Objects
├── guards/                   // Authentication/Authorization
├── strategies/               // Passport strategies (if auth-related)
└── __tests__/               // Unit, integration, E2E tests
```

### 3. Type Safety Across Monorepo
```
Centralized Types (@money-wise/types)
        ↓
Backend (NestJS) + Frontend (Next.js) + Mobile (React Native)
```

### 4. Component Library Pattern
```
Radix UI (Headless) + Tailwind (Styling) = @money-wise/ui
        ↓
Web (Next.js) + Mobile (React Native via NativeWind)
```

## Database Schema Highlights

**Core Models:**
- `Family` - Organizational unit for multi-user families
- `User` - User accounts with roles (ADMIN, MEMBER, VIEWER)
- `Account` - Financial accounts (checking, savings, credit card, etc.)
- `Transaction` - Income/expense transactions
- `Category` - Transaction categories
- `Budget` - Budget tracking
- `Achievement` - Gamification system
- `AuditEvent` - Security/compliance logging

**Enums:**
- `UserRole`: ADMIN, MEMBER, VIEWER
- `AccountType`: CHECKING, SAVINGS, CREDIT_CARD, INVESTMENT, LOAN, MORTGAGE
- `TransactionType`: DEBIT, CREDIT
- `CategoryType`: INCOME, EXPENSE, TRANSFER

## CI/CD Pipeline

**GitHub Actions Workflows:**
1. **ci-cd.yml** (Main)
   - Lint & typecheck
   - Unit/integration tests
   - E2E tests
   - Build verification
   - Sentry integration

2. **specialized-gates.yml** (Quality)
   - Security scanning
   - Performance checks
   - Advanced linting

3. **release.yml** (Automation)
   - Version bumping
   - Changelog generation
   - Release deployment

## Key Dependencies

**Critical Frontend:**
- @radix-ui/* - Accessible components
- tailwindcss - CSS framework
- react-hook-form - Form management
- zod - Schema validation
- zustand - State management
- recharts - Financial charts

**Critical Backend:**
- @nestjs/* - Web framework
- @prisma/client - Database ORM
- passport - Authentication
- @nestjs/jwt - JWT tokens
- ioredis - Redis client
- sentry - Error tracking

## Development Environment

**Required Services (Docker):**
- PostgreSQL 15 (port 5432)
- Redis 7 (port 6379)

**Development Servers:**
- Backend: http://localhost:3001 (NestJS)
- Frontend: http://localhost:3000 (Next.js)

**Tools Included:**
- Sentry for error tracking
- Prisma Studio for database GUI
- Storybook for component library
- Playwright for E2E testing

## File Organization Conventions

### Backend
```
✅ /src/auth/services/auth-security.service.ts   (specific service)
✅ /src/auth/dto/login.dto.ts                     (clear purpose)
✅ /src/__tests__/unit/auth.service.test.ts       (test location)
```

### Frontend
```
✅ /components/auth/LoginForm.tsx                 (component file)
✅ /components/auth/index.ts                      (barrel export)
✅ /app/auth/login/page.tsx                       (route file)
```

### Tests
```
✅ __tests__/unit/                                (unit tests)
✅ __tests__/integration/                         (integration tests)
✅ e2e/                                           (E2E tests)
```

## Quick Debugging

**Port conflicts?**
```bash
lsof -i :3000          # Check port 3000
lsof -i :3001          # Check port 3001
lsof -i :5432          # Check database
lsof -i :6379          # Check Redis
```

**Database issues?**
```bash
pnpm prisma:studio    # GUI inspection
pnpm db:reset         # Fresh database
pnpm db:seed          # Add test data
```

**Build fails?**
```bash
pnpm clean            # Clear all caches
pnpm install          # Fresh install
pnpm typecheck        # Check types first
```

---

**Last Updated:** October 2024  
**Project Version:** 0.5.0  
**For Details:** See CODEBASE_STRUCTURE_OVERVIEW.md
