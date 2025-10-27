# MoneyWise Codebase Structure - Comprehensive Overview

**Project**: MoneyWise Personal Finance Management  
**Version**: 0.5.0  
**Repository**: github.com/kdantuono/money-wise  
**Last Updated**: October 2024

---

## 1. PROJECT ORGANIZATION & MONOREPO STRUCTURE

### Root Level Architecture

MoneyWise is a **pnpm monorepo** with workspaces containing 3 applications and 4 shared packages:

```
money-wise/
├── apps/                          # Application layer
│   ├── backend/                   # NestJS API server
│   ├── web/                       # Next.js web application
│   └── mobile/                    # React Native mobile app
├── packages/                      # Shared libraries
│   ├── types/                     # Centralized TypeScript types
│   ├── ui/                        # Shared UI component library
│   ├── utils/                     # Utility functions
│   └── test-utils/                # Testing utilities
├── docs/                          # Comprehensive documentation
├── infrastructure/                # Infrastructure configs
├── scripts/                        # Build and deployment scripts
└── .github/workflows/             # CI/CD automation
```

### Workspace Configuration

**Root `package.json` workspaces:**
```json
{
  "workspaces": ["apps/*", "packages/*", "test-utils"]
}
```

**Path aliases in `tsconfig.json`:**
```typescript
{
  "@money-wise/types": "packages/types/src",
  "@money-wise/types/*": "packages/types/src/*",
  "@money-wise/ui": "packages/ui/src",
  "@money-wise/ui/*": "packages/ui/src/*",
  "@money-wise/utils": "packages/utils/src",
  "@money-wise/utils/*": "packages/utils/src/*",
  "@money-wise/test-utils": "packages/test-utils/src",
  "@money-wise/test-utils/*": "packages/test-utils/src/*"
}
```

---

## 2. TECHNOLOGY STACK

### Core Framework Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Backend** | NestJS | ^10.0.0 | REST API, DI container, modular architecture |
| **Frontend** | Next.js | ^15.4.7 | React SSR, file-based routing, API routes |
| **Mobile** | React Native | 0.72.6 | Cross-platform mobile (iOS/Android) |
| **Database** | PostgreSQL + TimescaleDB | 15 | Relational data + time-series extension |
| **ORM** | Prisma | ^6.17.1 | Type-safe database access, migrations |
| **Cache** | Redis | 7 | Session management, rate limiting, cache |

### Frontend UI Libraries

**Web (Next.js):**
- **Radix UI**: Headless component primitives (dialog, dropdown, toast, etc.)
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: React charts library for financial visualizations
- **React Hook Form**: Form state management
- **Zod**: TypeScript-first schema validation
- **Zustand**: Lightweight state management

**Mobile (React Native):**
- **Expo**: Framework for React Native development
- **Expo Router**: File-based routing for React Native
- **NativeWind**: Tailwind CSS for React Native
- **Zod**: Schema validation

**Shared UI Package:**
- Built with Radix UI + Tailwind
- Exported as compiled components
- Includes Storybook for documentation

### Backend Services

**Authentication:**
- Passport.js (JWT, Local strategies)
- @nestjs/jwt (JWT token generation)
- Argon2/bcryptjs (password hashing)
- Speakeasy (2FA/TOTP)

**Database:**
- @prisma/client (ORM)
- prisma (CLI, migrations)

**Error Handling & Monitoring:**
- Sentry (@sentry/nestjs, @sentry/node, @sentry/profiling-node)
- Custom logging module
- Health checks module

**Infrastructure:**
- Helmet (security headers)
- Compression (gzip)
- ioredis (Redis client)
- pg (PostgreSQL driver)

### Testing & Validation

| Layer | Tools | Purpose |
|-------|-------|---------|
| **Unit Tests** | Jest, ts-jest | Backend + Frontend unit testing |
| **E2E Tests** | Playwright | Web app end-to-end testing |
| **Test Data** | @faker-js/faker | Mock data generation |
| **Mocking** | MSW (Mock Service Worker) | API mocking in frontend |
| **Performance** | Jest (performance tests) | Performance benchmarking |

---

## 3. MODULE ARCHITECTURE

### Backend Module Structure (NestJS)

The backend follows **Domain-Driven Design** with layered architecture:

```
apps/backend/src/
├── app.module.ts                  # Root application module
├── main.ts                        # Application entry point
├── instrument.ts                  # Sentry instrumentation
│
├── core/                          # Core/cross-cutting concerns
│   ├── config/                    # Centralized configuration management
│   │   ├── app.config.ts          # Application settings
│   │   ├── auth.config.ts         # Authentication config
│   │   ├── auth-password-policy.config.ts
│   │   ├── database.config.ts     # Database connection
│   │   ├── redis.config.ts        # Redis cache config
│   │   ├── monitoring.config.ts   # Sentry/monitoring config
│   │   └── config.module.ts       # Config module (DynamicModule)
│   │
│   ├── database/                  # Database abstraction layer
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts   # Prisma service provider
│   │   │   └── prisma.service.ts
│   │   ├── tests/
│   │   │   └── database-test.config.ts
│   │   └── test-database.module.ts
│   │
│   ├── redis/                     # Caching layer
│   │   ├── redis.module.ts
│   │   └── redis.service.ts
│   │
│   ├── logging/                   # Application logging
│   │   ├── logging.module.ts
│   │   └── logger.module.ts
│   │
│   ├── monitoring/                # Error tracking & monitoring
│   │   ├── monitoring.module.ts
│   │   └── sentry integration
│   │
│   ├── health/                    # Health check endpoints
│   │   └── health.module.ts
│   │
│   └── types/                     # Core type definitions
│
├── auth/                          # Authentication domain
│   ├── auth.module.ts             # Auth module
│   ├── auth.service.ts            # Core authentication logic
│   ├── auth-security.service.ts   # Password, 2FA, email verification
│   ├── auth.controller.ts         # Auth REST endpoints
│   │
│   ├── controllers/               # Feature-specific controllers
│   ├── services/                  # Feature services
│   ├── strategies/                # Passport strategies (JWT, Local)
│   ├── guards/                    # Route guards (JwtAuthGuard)
│   ├── decorators/                # Custom decorators (@CurrentUser)
│   ├── dto/                       # Data Transfer Objects
│   │   ├── SignUpDto
│   │   ├── LoginDto
│   │   └── ...
│   └── types/                     # Auth-specific types
│
├── users/                         # User domain
│   ├── users.module.ts
│   ├── users.service.ts
│   ├── users.controller.ts
│   └── dto/
│
├── accounts/                      # Financial accounts
│   ├── accounts.module.ts
│   ├── accounts.service.ts
│   ├── accounts.controller.ts
│   └── dto/
│
├── transactions/                  # Financial transactions
│   ├── transactions.module.ts
│   ├── transactions.service.ts
│   ├── transactions.controller.ts
│   └── dto/
│
└── common/                        # Shared backend utilities
    ├── interceptors/              # Global HTTP interceptors
    └── decorators/                # Global decorators
```

### Frontend Module Structure (Next.js 15)

**App Router Structure (src/app):**
```
apps/web/
├── app/                           # App Router pages
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home page
│   │
│   ├── auth/                      # Authentication routes
│   │   ├── layout.tsx
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   └── layout.tsx
│   │   ├── register/
│   │   │   ├── page.tsx
│   │   │   └── layout.tsx
│   │   └── [...rest]/              # Dynamic catch-all for future routes
│   │
│   ├── dashboard/                 # Protected dashboard
│   │   ├── page.tsx
│   │   └── layout.tsx
│   │
│   └── test-sentry/               # Testing utilities
│
├── components/                    # React components
│   ├── auth/                      # Auth-specific components
│   ├── layout/                    # Layout components (Header, Sidebar, etc.)
│   ├── providers/                 # Context providers (Auth, Sentry, etc.)
│   └── ui/                        # Generic UI components (buttons, inputs, etc.)
│
├── lib/                           # Utility functions
│   ├── config/                    # Configuration
│   └── performance.ts
│
├── stores/                        # Zustand state stores
│   └── auth store, UI store, etc.
│
├── src/                           # Smaller source utilities
│   ├── components/
│   └── lib/
│
├── e2e/                           # Playwright E2E tests
│   ├── auth/                      # Auth flow tests
│   ├── examples/
│   ├── pages/                     # Page object models
│   └── visual/                    # Visual regression tests
│
└── __tests__/                     # Unit tests (Vitest)
    ├── components/
    ├── lib/
    └── pages/
```

### Mobile Module Structure (React Native)

```
apps/mobile/
├── app/                           # Expo Router screens
├── src/                           # Source code
├── components/                    # React Native components
└── lib/                           # Utilities
```

### Shared Packages

**1. Types Package** (`packages/types/`)
- Centralized TypeScript type definitions
- Eliminates 'any' types across monorepo
- Shared between backend and frontend

**2. UI Package** (`packages/ui/`)
- Radix UI + Tailwind component library
- Built with tsup (bundler)
- Includes Storybook for documentation
- Re-exported from web/mobile apps

**3. Utils Package** (`packages/utils/`)
- Date formatting utilities (date-fns)
- Object/array helpers (lodash)
- Cross-app utility functions

**4. Test Utils Package** (`packages/test-utils/`)
- Shared test fixtures
- Test data factories
- Helper functions for testing

---

## 4. CONFIGURATION MANAGEMENT

### Environment Configuration Strategy

**Multi-environment support:**
```
apps/backend/
├── .env                           # Local development
├── .env.development               # Dev environment
├── .env.test                      # Test environment
├── .env.example                   # Template
├── .env.staging.example           # Staging template
└── .env.production.example        # Production template

apps/web/
├── .env.local                     # Local
├── .env.example
├── .env.staging.example
└── .env.production.example
```

### Backend Configuration Modules

**NestJS Config patterns** (`src/core/config/`):

1. **app.config.ts** - General app settings
   - NODE_ENV, APP_PORT, API_BASE_URL
   - Exported as ConfigService

2. **auth.config.ts** - Authentication settings
   - JWT_SECRET, JWT_EXPIRY, PASSWORD_POLICY
   - 2FA/TOTP configuration

3. **database.config.ts** - Database connection
   - DATABASE_URL parsing
   - Connection pooling settings

4. **redis.config.ts** - Redis cache
   - REDIS_URL configuration
   - TTL settings

5. **monitoring.config.ts** - Sentry integration
   - SENTRY_DSN, SENTRY_ENVIRONMENT
   - Error tracking settings

**Configuration loading** (`config.module.ts`):
```typescript
- Loads .env files using ConfigModule.forRoot()
- Validates environment variables
- Provides typed config access throughout app
```

### Frontend Configuration

**Next.js** (`next.config.mjs`):
- Sentry webpack plugin
- Bundle analyzer integration
- React strict mode
- TypeScript/ESLint enforcement

**Tailwind** (`tailwind.config.js`):
- HSL color system for dark mode
- Custom theme extensions
- Radix UI animation keyframes

**Vitest** (`vitest.config.ts`):
- JSX support
- TypeScript configuration
- Global setup files

---

## 5. BUILD SYSTEM & DEPENDENCY MANAGEMENT

### Monorepo Build Orchestration (Turbo)

**`turbo.json` pipeline configuration:**

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "typecheck": {
      "dependsOn": ["^build", "build"],
      "outputs": []
    }
  }
}
```

**Key tasks:**
- `build`: Dependency-aware build (packages first, then apps)
- `dev`: Parallel development server startup
- `test`: Unit testing with coverage
- `test:integration`: Integration tests
- `test:e2e`: End-to-end tests
- `lint`: ESLint + custom rules
- `typecheck`: TypeScript validation

### Root Package.json Scripts

**Development:**
```bash
pnpm dev              # All apps parallel
pnpm dev:backend      # Backend only
pnpm dev:web          # Web app only
pnpm dev:mobile       # Mobile app only
```

**Building:**
```bash
pnpm build            # Clean build all apps
pnpm build:backend    # Backend only
pnpm build:web        # Web only
```

**Testing:**
```bash
pnpm test             # All tests
pnpm test:unit        # Unit tests only
pnpm test:integration # Integration tests
pnpm test:e2e         # E2E tests (web)
pnpm test:coverage    # Coverage reports
pnpm test:ci          # CI testing suite
```

### Dependency Management

**Package Manager:** pnpm 8.15.1+  
**Node Version:** 18.0.0+

**Key dependencies managed:**
- Workspace interdependencies (apps/packages)
- Override policies for security (ip, semver, esbuild, etc.)
- Peer dependencies for UI components

**Backend Dependencies:**
- Framework: NestJS, Passport, JWT
- Database: Prisma, PostgreSQL driver
- Cache: ioredis, Redis
- Security: Argon2, bcryptjs, Helmet
- Monitoring: Sentry
- Testing: Jest, TestContainers

**Frontend Dependencies:**
- Framework: React 18, Next.js 15
- UI: Radix UI components, Tailwind CSS
- Forms: React Hook Form, Zod
- Data: Recharts, date-fns
- State: Zustand
- Testing: Vitest, Playwright

---

## 6. FILE ORGANIZATION PATTERNS

### Backend Module Pattern (Feature-Driven)

Each feature module follows consistent structure:

```
src/[feature]/
├── [feature].module.ts            # NestJS module declaration
├── [feature].service.ts           # Business logic
├── [feature].controller.ts        # HTTP handlers
├── controllers/                   # Sub-controllers if needed
│   └── [action].controller.ts
├── services/                      # Additional services
│   └── [specific].service.ts
├── dto/                           # Data Transfer Objects
│   ├── create-[feature].dto.ts
│   ├── update-[feature].dto.ts
│   └── response-[feature].dto.ts
├── guards/                        # Route guards
├── decorators/                    # Custom decorators
├── strategies/                    # Auth strategies (auth module)
├── types/                         # Feature-specific types
├── __tests__/                     # Tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/                          # Feature documentation
```

### Frontend Component Pattern (React)

```
components/[feature]/
├── [Component].tsx                # Main component
├── [Component].module.css         # Tailwind styles (via className)
├── [Component].types.ts           # TypeScript interfaces
├── __tests__/
│   └── [Component].test.tsx
└── index.ts                       # Barrel export

# Barrel exports enable:
import { Component } from '@/components/feature'
```

### Testing File Organization

**Backend** (`__tests__/`):
```
__tests__/
├── unit/                          # Unit tests (business logic)
├── integration/                   # Integration tests (modules)
├── e2e/                           # End-to-end API tests
├── contracts/                     # Contract tests
├── performance/                   # Performance benchmarks
├── setup.ts                       # Global test setup
└── jest-e2e.json                  # E2E config
```

**Frontend** (`__tests__/` and `e2e/`):
```
__tests__/
├── components/                    # Component tests
├── lib/                           # Utility tests
└── pages/                         # Page tests

e2e/
├── auth/                          # Auth flow tests
├── visual/                        # Visual regression
├── pages/                         # Page objects
└── fixtures/                      # Test data
```

### Database Organization (Prisma)

```
apps/backend/prisma/
├── schema.prisma                  # Data model definition
├── migrations/                    # Versioned migrations
│   ├── 001_init/
│   ├── 002_add_field/
│   └── 003_add_constraint/
└── seeds/                         # Seed scripts
    └── index.ts
```

**Schema Structure** (Prisma):
- Enums (UserRole, AccountType, etc.)
- Models with relationships
- Indexes for performance
- Constraints for data integrity

---

## 7. CONFIGURATION FILES INVENTORY

### Root Level
| File | Purpose |
|------|---------|
| `package.json` | Monorepo definition, scripts, dependencies |
| `tsconfig.json` | Base TypeScript config with path aliases |
| `turbo.json` | Build pipeline orchestration |
| `.eslintrc.js` | Global ESLint rules |
| `jest.config.base.js` | Base Jest configuration |
| `.prettierrc.json` | Code formatting rules |
| `.editorconfig` | Editor settings |
| `Makefile` | Convenience commands |

### Backend App (`apps/backend/`)
| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts |
| `tsconfig.json` | TypeScript config |
| `tsconfig.test.json` | Test TypeScript config |
| `jest.config.js` | Jest configuration |
| `nest-cli.json` | NestJS CLI config |
| `.eslintrc.json` | Backend ESLint rules |
| `prisma/schema.prisma` | Database schema |
| `.env` / `.env.*` | Environment variables |

### Web App (`apps/web/`)
| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts |
| `tsconfig.json` | TypeScript config |
| `next.config.mjs` | Next.js configuration |
| `tailwind.config.js` | Tailwind CSS config |
| `postcss.config.js` | PostCSS config |
| `vitest.config.ts` | Vitest config |
| `playwright.config.ts` | Playwright E2E config |
| `.eslintrc.json` | ESLint rules |
| `.env.*` | Environment variables |

### Infrastructure
| File | Purpose |
|------|---------|
| `docker-compose.dev.yml` | Local dev services (PostgreSQL, Redis) |
| `docker-compose.monitoring.yml` | Monitoring stack |
| `.github/workflows/*.yml` | CI/CD pipeline |

---

## 8. DEVELOPMENT & CI/CD SETUP

### Local Development

**Required Services** (Docker):
- **PostgreSQL + TimescaleDB** (port 5432)
- **Redis** (port 6379)

**Startup:**
```bash
pnpm docker:dev      # Start services
pnpm install         # Install dependencies
pnpm dev             # Start all dev servers
```

**Dev Servers:**
- Backend: http://localhost:3001
- Web: http://localhost:3000
- API Base: http://localhost:3001/api

### GitHub Actions CI/CD

**Main Workflows** (`.github/workflows/`):

1. **ci-cd.yml** - Main pipeline
   - Lint & typecheck
   - Unit/integration tests
   - E2E tests
   - Build verification
   - Sentry release

2. **specialized-gates.yml** - Quality gates
   - Advanced linting
   - Security scanning
   - Performance checks

3. **release.yml** - Release automation
   - Version bumping
   - Changelog generation
   - GitHub release

### Code Quality Standards

**Pre-commit Hooks:**
- Prettier formatting
- ESLint fixing
- TypeScript checking

**Validation Levels:**
- Level 1-8: Local validation (linting, types, tests)
- Level 9-10: Workflow simulation (act)

---

## 9. KEY ARCHITECTURAL PATTERNS

### 1. **Dependency Injection (NestJS)**
- Modules declare providers (services, controllers, guards)
- Angular-style DI container
- Automatic dependency resolution

### 2. **Module Encapsulation**
- Each feature is self-contained
- Explicit exports via module configuration
- Clear separation of concerns

### 3. **Layered Architecture**
- Core: Infrastructure & cross-cutting concerns
- Features: Business domain logic
- Common: Shared utilities

### 4. **Type Safety**
- Strict TypeScript in all packages
- Centralized type definitions
- DTOs for data validation
- Zod schemas for frontend

### 5. **Component Library Pattern**
- Radix UI primitives
- Tailwind utility classes
- Shared via npm package
- Storybook documentation

### 6. **Environment Abstraction**
- ConfigModule for dynamic config
- Environment-specific .env files
- Validation at startup
- Typed config access

### 7. **Testing Strategy**
- Unit: Jest
- Integration: Jest + TestContainers
- E2E: Playwright
- Performance: Jest benchmarks

---

## 10. CRITICAL DEPENDENCIES & VERSIONS

### Production Dependencies

**Backend Core:**
- @nestjs/core: ^10.0.0
- @nestjs/common: ^10.0.0
- @prisma/client: ^6.17.1
- @nestjs/jwt: ^10.2.0
- @nestjs/passport: ^10.0.2

**Frontend Core:**
- next: ^15.4.7
- react: ^18.3.1
- @radix-ui/*: Latest (dialog, dropdown, etc.)
- tailwindcss: ^3.3.6
- zod: ^3.22.4

**Shared:**
- date-fns: ^2.30.0
- lodash: ^4.17.21
- axios: ^1.12.0

### Dev Dependencies

**Build Tools:**
- typescript: ^5.1.3
- tsup: ^8.0.1 (UI package)
- @nestjs/cli: ^10.0.0

**Testing:**
- jest: ^29.7.0
- ts-jest: ^29.1.1
- @playwright/test: ^1.40.0
- vitest: ^1.0.4

**Linting:**
- eslint: ^8.42.0
- prettier: ^3.1.1
- husky: ^8.0.3
- lint-staged: ^15.2.0

---

## 11. MONITORING & OBSERVABILITY

### Error Tracking (Sentry)

Integrated across all platforms:
- **Backend**: @sentry/nestjs + @sentry/profiling-node
- **Frontend**: @sentry/nextjs + @sentry/react
- **Mobile**: @sentry/react-native

### Health Checks

NestJS health module endpoints:
- Database connectivity
- Redis availability
- Basic server status

### Logging

Custom logging module:
- Winston integration (backend)
- Structured logging
- Environment-based levels

---

## 12. ARCHITECTURE RECOMMENDATIONS & STRENGTHS

### Strengths:
1. ✅ **Monorepo organization** - Clear separation with shared packages
2. ✅ **Type safety** - Strict TypeScript everywhere
3. ✅ **Testing infrastructure** - Multi-layer (unit, integration, E2E)
4. ✅ **CI/CD automation** - Comprehensive GitHub Actions workflows
5. ✅ **Component library** - Radix UI + Tailwind for consistency
6. ✅ **Database modeling** - Clear Prisma schema with enums
7. ✅ **Environment management** - Multi-environment support built-in
8. ✅ **Developer experience** - Hot reload, Storybook, clear patterns

### Areas for Evolution:
1. Frontend state management could use Redux Toolkit for complex flows
2. Backend could benefit from CQRS for read-heavy financial queries
3. Event-driven architecture for transaction processing
4. API versioning strategy (v1, v2 routes)
5. GraphQL as alternative/complement to REST

---

## CONCLUSION

MoneyWise demonstrates enterprise-level software architecture for a personal finance application:

- **Scalable Monorepo**: Separate applications + shared packages with clear boundaries
- **Modern Stack**: NestJS + Next.js + React Native + PostgreSQL
- **Developer Friendly**: TypeScript everywhere, Turbo build orchestration, comprehensive tooling
- **Production Ready**: Sentry monitoring, comprehensive testing, CI/CD automation
- **Maintainable**: Clear module patterns, configuration abstraction, documentation

The architecture supports rapid feature development while maintaining code quality and type safety across the full stack.

