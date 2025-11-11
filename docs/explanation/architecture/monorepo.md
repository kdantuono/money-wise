# MoneyWise Monorepo Structure

**Last Updated**: 2025-10-07
**Status**: Optimized (STORY-1.5.6 Complete)

## Overview

MoneyWise uses a monorepo architecture managed by pnpm workspaces and Turborepo. This structure enables code sharing, consistent tooling, and efficient builds across multiple applications and shared packages.

## Directory Structure

```
money-wise/
├── apps/                       # Applications (deployment units)
│   ├── backend/               # NestJS API server (port 3001)
│   ├── web/                   # Next.js web application (port 3000)
│   └── mobile/                # React Native mobile app
│
├── packages/                   # Shared packages (libraries)
│   ├── types/                 # Shared TypeScript type definitions
│   ├── utils/                 # Shared utility functions
│   ├── ui/                    # Shared React UI components
│   └── test-utils/            # Shared testing utilities
│
├── docs/                       # Documentation
│   ├── api/                   # API documentation
│   ├── architecture/          # Architecture decisions (ADRs)
│   ├── auth/                  # Authentication documentation
│   ├── development/           # Development guides
│   ├── features/              # Feature documentation
│   ├── monitoring/            # Monitoring & observability
│   ├── planning/              # Project planning & roadmaps
│   └── security/              # Security documentation
│
├── scripts/                    # Development scripts
│   ├── ci/                    # CI/CD scripts
│   ├── dev/                   # Development utilities
│   ├── monitoring/            # Monitoring scripts
│   └── testing/               # Testing utilities
│
├── infrastructure/             # Infrastructure as Code
│   ├── docker/                # Docker configurations
│   └── monitoring/            # Monitoring configs (Grafana, Prometheus)
│
├── .github/                    # GitHub-specific files
│   └── workflows/             # GitHub Actions CI/CD
│
├── .claude/                    # Claude AI development context
│   ├── agents/                # AI agent configurations
│   ├── orchestration/         # Multi-agent workflows
│   └── workflows/             # Development workflows
│
├── package.json                # Root package.json (workspace configuration)
├── pnpm-workspace.yaml         # pnpm workspace configuration
├── turbo.json                  # Turborepo configuration
├── tsconfig.json               # Root TypeScript configuration
├── .eslintrc.monorepo.json     # Import boundary rules
├── jest.config.base.js         # Base Jest configuration
└── docker-compose.dev.yml      # Development services (PostgreSQL, Redis)
```

## Applications (apps/)

### Purpose
Applications are **deployment units** - they are built, deployed, and run independently. Each application represents a complete product or service.

### Applications Overview

#### backend (NestJS API)
- **Purpose**: RESTful API server for MoneyWise application
- **Tech Stack**: NestJS, TypeORM, PostgreSQL, Redis, JWT auth
- **Port**: 3001
- **Package Name**: `@money-wise/backend`
- **Build Output**: `dist/`
- **Entry Point**: `src/main.ts`

#### web (Next.js)
- **Purpose**: Web frontend for MoneyWise
- **Tech Stack**: Next.js 15, React 18, Tailwind CSS, Zustand
- **Port**: 3000
- **Package Name**: `@money-wise/web`
- **Build Output**: `.next/`
- **Entry Point**: `app/`

#### mobile (React Native)
- **Purpose**: Mobile application (iOS & Android)
- **Tech Stack**: React Native, Expo, NativeWind
- **Package Name**: `@money-wise/mobile`
- **Build Output**: `android/build/`, `ios/build/`
- **Entry Point**: `App.tsx`

### App Guidelines

1. **No App-to-App Imports**: Apps MUST NOT import from other apps
2. **Use Shared Packages**: Extract common code to `packages/`
3. **Environment Specific**: Each app has its own environment configuration
4. **Independent Deployment**: Can be deployed separately

## Packages (packages/)

### Purpose
Packages are **shared libraries** that provide reusable functionality across applications. They enable code reuse and maintain consistency.

### Package Overview

#### types (@money-wise/types)
- **Purpose**: Shared TypeScript type definitions
- **Contents**: Interfaces, types, enums used across all apps
- **No Runtime Code**: Type-only package
- **Zero Dependencies**: Keeps build lightweight

**Key Exports**:
- User types (User, UserRole)
- Transaction types (Transaction, TransactionType)
- Account types (Account, AccountStatus)
- API request/response types
- Common utility types

#### utils (@money-wise/utils)
- **Purpose**: Shared utility functions
- **Contents**: Pure functions for formatting, validation, date manipulation
- **Platform Agnostic**: Works in Node.js, browsers, and React Native

**Key Exports**:
- Currency formatting (`formatCurrency`)
- Date utilities (`addDays`, `formatRelativeTime`)
- Validation functions (`isValidEmail`, `isValidPassword`)
- Array/object helpers (`groupBy`, `sortBy`, `unique`)

#### ui (@money-wise/ui)
- **Purpose**: Shared React UI components
- **Contents**: Reusable components for web and mobile
- **Design System**: Centralized theme and styling

**Key Exports**:
- Button components
- Form inputs (TextField, Select, Checkbox)
- Layout components (Card, Modal, Grid)
- Data display (Table, List, Badge)
- Feedback (Alert, Toast, Spinner)

#### test-utils (@money-wise/test-utils)
- **Purpose**: Shared testing utilities
- **Contents**: Mock data factories, test helpers, custom matchers
- **DevDependency Only**: Not included in production builds

**Key Exports**:
- Mock data factories (`createMockUser`, `createMockTransaction`)
- React testing utilities (`renderWithProviders`)
- API mocking (MSW handlers)
- Custom Jest matchers

### Package Guidelines

1. **No App Dependencies**: Packages MUST NOT import from apps
2. **Platform Agnostic**: Should work in all environments
3. **Well Tested**: Minimum 80% code coverage
4. **Tree-Shakeable**: Use named exports
5. **Documented**: Comprehensive README and JSDoc

## Import Rules & Boundaries

### Enforced via ESLint (.eslintrc.monorepo.json)

```
Allowed:
✅ App → Package    (apps can import packages)
✅ Package → Package (packages can import other packages)

Forbidden:
❌ App → App        (apps cannot import from other apps)
❌ Package → App    (packages cannot import apps)
```

### Example Valid Imports

```typescript
// ✅ Backend app importing from packages
import { User, Transaction } from '@money-wise/types';
import { formatCurrency } from '@money-wise/utils';

// ✅ Web app importing from packages
import { Button, Card } from '@money-wise/ui';
import type { Account } from '@money-wise/types';

// ✅ Package importing another package
// In @money-wise/ui
import type { User } from '@money-wise/types';
```

### Example Invalid Imports

```typescript
// ❌ FORBIDDEN: Web app importing from backend
import { AuthService } from '@money-wise/backend';

// ❌ FORBIDDEN: Package importing from app
// In @money-wise/utils
import { config } from '@money-wise/backend';

// Solution: Extract shared code to a package
```

## TypeScript Configuration

### Path Aliases (tsconfig.json)

All packages are accessible via clean import paths:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@money-wise/types": ["packages/types/src"],
      "@money-wise/types/*": ["packages/types/src/*"],
      "@money-wise/utils": ["packages/utils/src"],
      "@money-wise/utils/*": ["packages/utils/src/*"],
      "@money-wise/ui": ["packages/ui/src"],
      "@money-wise/ui/*": ["packages/ui/src/*"],
      "@money-wise/test-utils": ["packages/test-utils/src"],
      "@money-wise/test-utils/*": ["packages/test-utils/src/*"]
    }
  }
}
```

### Benefits
- Clean imports (`@money-wise/types` instead of `../../packages/types`)
- IDE autocomplete support
- Easier refactoring
- Consistent across the monorepo

## Build System (Turborepo)

### Build Pipeline

```
@money-wise/types     (foundation)
    ↓
@money-wise/utils     @money-wise/ui      @money-wise/test-utils
    ↓                      ↓                       ↓
@money-wise/backend   @money-wise/web   @money-wise/mobile
```

### Caching Strategy

**Global Dependencies** (invalidate all caches when changed):
- `.env.*local`
- `jest.config.base.js`
- `tsconfig.json`
- `.eslintrc.monorepo.json`

**Global Environment Variables**:
- `NODE_ENV`
- `CI`

### Common Commands

```bash
# Build everything
pnpm build

# Build specific app
pnpm build --filter @money-wise/web

# Build app with dependencies
turbo run build --filter @money-wise/backend...

# Run tests
pnpm test

# Run tests for specific package
pnpm test --filter @money-wise/utils

# Lint all code
pnpm lint

# Type check everything
pnpm typecheck

# Clean all build artifacts
pnpm clean
```

## Dependency Management

### pnpm Workspaces

**Workspace Protocol**: `workspace:*`

```json
{
  "dependencies": {
    "@money-wise/types": "workspace:*",
    "@money-wise/utils": "workspace:*"
  }
}
```

### Version Synchronization

- **Shared Dependencies**: Defined in root `package.json`
- **Package-Specific**: Defined in individual `package.json`
- **Version Overrides**: Handled via `pnpm.overrides`

### Installing Dependencies

```bash
# Install all dependencies
pnpm install

# Add dependency to specific package
pnpm add axios --filter @money-wise/backend

# Add dev dependency to root
pnpm add -D -w typescript

# Update all dependencies
pnpm update --latest
```

## Testing Strategy

### Test Organization

```
apps/backend/__tests__/
├── unit/              # Unit tests (fast, isolated)
├── integration/       # Integration tests (database, services)
├── e2e/              # End-to-end tests (full API flows)
├── performance/      # Performance benchmarks
└── contracts/        # API contract tests

apps/web/__tests__/
├── components/       # Component tests
├── pages/           # Page tests
├── api/             # API mocking tests
└── e2e/             # Playwright E2E tests
```

### Test Commands

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

## Development Workflow

### 1. Start Development Services

```bash
# Start PostgreSQL and Redis
pnpm docker:dev

# Verify services running
docker compose ps
```

### 2. Start Development Servers

```bash
# Start all apps
pnpm dev

# Start specific app
pnpm dev:backend
pnpm dev:web
pnpm dev:mobile
```

### 3. Make Changes

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes in apps or packages
# Tests run automatically in watch mode (if enabled)
```

### 4. Quality Checks

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Type check
pnpm typecheck

# Run tests
pnpm test

# Format code
pnpm format
```

### 5. Commit Changes

```bash
# Stage changes
git add .

# Commit (runs pre-commit hooks)
git commit -m "feat(scope): description"

# Pre-commit hooks run:
# - Linting
# - Type checking
# - Unit tests
```

### 6. Build Verification

```bash
# Build all apps and packages
pnpm build

# Verify build succeeded
# Check dist/, .next/, build/ directories
```

## CI/CD Integration

### GitHub Actions Workflows

Located in `.github/workflows/`:

- **ci.yml**: Continuous Integration
  - Lint, type check, test, build
  - Runs on PR and main branch pushes
- **deploy-*.yml**: Deployment workflows
  - Deploy to staging/production

### CI Pipeline

```yaml
1. Checkout code
2. Setup Node.js and pnpm
3. Install dependencies (pnpm install)
4. Lint (pnpm lint)
5. Type check (pnpm typecheck)
6. Build (pnpm build)
7. Test (pnpm test:ci)
8. Upload coverage reports
9. Deploy (if main branch)
```

## Adding New Code

### Adding a New Package

```bash
# 1. Create package directory
mkdir -p packages/my-package/src

# 2. Create package.json
cat > packages/my-package/package.json <<EOF
{
  "name": "@money-wise/my-package",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist"
  }
}
EOF

# 3. Create tsconfig.json
cat > packages/my-package/tsconfig.json <<EOF
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
EOF

# 4. Create README.md (document purpose and usage)

# 5. Create src/index.ts (entry point)

# 6. Install and test
pnpm install
pnpm build --filter @money-wise/my-package
```

### Adding a New App

```bash
# 1. Create app directory
mkdir -p apps/my-app

# 2. Initialize with framework
# (Next.js, NestJS, React Native, etc.)

# 3. Add to pnpm-workspace.yaml (automatically included via apps/*)

# 4. Update turbo.json with app-specific tasks

# 5. Add environment variables

# 6. Add to docker-compose.dev.yml if needed
```

## Best Practices

### Code Organization

1. **Keep Apps Small**: Most logic should be in packages
2. **Single Responsibility**: Each package has one purpose
3. **Avoid Circular Dependencies**: Design clean dependency trees
4. **Use TypeScript Strictly**: Enable `strict` mode everywhere

### Performance

1. **Cache Aggressively**: Leverage Turborepo caching
2. **Lazy Load**: Use dynamic imports for large modules
3. **Tree Shaking**: Use named exports
4. **Bundle Analysis**: Check bundle sizes regularly

### Maintenance

1. **Update Dependencies**: Weekly dependency updates
2. **Clean Builds**: Run `pnpm clean && pnpm build` periodically
3. **Monitor Build Times**: Track Turborepo performance
4. **Review Import Boundaries**: Ensure ESLint rules are followed

## Troubleshooting

### Build Issues

```bash
# Clear all caches and rebuild
pnpm clean
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
pnpm build
```

### Dependency Issues

```bash
# Verify workspace integrity
pnpm install --frozen-lockfile

# Check for duplicate dependencies
pnpm dedupe

# List all dependencies
pnpm list --depth 0
```

### Import Errors

```bash
# Rebuild packages
pnpm build --filter ./packages/*

# Check TypeScript paths
pnpm typecheck

# Verify ESLint import rules
pnpm lint
```

## Migration Guide

### From Standalone to Monorepo

If migrating existing code:

1. Create package in `packages/`
2. Move shared code to package
3. Update imports in apps
4. Build package: `pnpm build --filter @money-wise/my-package`
5. Test apps: `pnpm test`
6. Commit incrementally

## Resources

### Internal Documentation
- [Architecture Overview](../architecture/README.md)
- [Development Setup](./setup.md)
- [Testing Guide](./testing-guide.md)
- [API Documentation](../api/authentication.md)

### External Resources
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Monorepo Best Practices](https://monorepo.tools/)

---

**Document Version**: 1.0.0
**Last Review**: 2025-10-07
**Next Review**: 2025-11-07
