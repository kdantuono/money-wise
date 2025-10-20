# Turborepo Configuration Documentation

## Overview

This document describes the Turborepo configuration implemented for the MoneyWise monorepo to optimize build performance and achieve a 70% reduction in build times through intelligent caching and task orchestration.

## Configuration Details

### File Location
- **File**: `/turbo.json`
- **Version**: Turborepo v1.13.4 compatible
- **Schema**: https://turbo.build/schema.json

## Pipeline Tasks

### Build Pipeline (`build`)
- **Dependencies**: `^build` (runs after all dependencies are built)
- **Inputs**: Source files, environment files (excluding local)
- **Outputs**: `dist/**`, `.next/**` (excluding cache), `storybook-static/**`
- **Environment Variables**: `NODE_ENV`, `NEXT_PUBLIC_*`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`
- **Caching**: Enabled

**Execution Order**:
1. `@money-wise/types#build` (foundation)
2. `@money-wise/ui#build`, `@money-wise/utils#build` (parallel)
3. `@money-wise/backend#build`, `@money-wise/web#build`, `@money-wise/mobile#build` (parallel, after dependencies)

### Development Pipeline (`dev`)
- **Dependencies**: None (independent development servers)
- **Caching**: Disabled (development is always fresh)
- **Persistent**: True (long-running processes)
- **Parallel Execution**: Enabled via `--parallel` flag

### Testing Pipelines

#### Unit Tests (`test`, `test:unit`)
- **Dependencies**: `^build` (requires built packages)
- **Inputs**: Test files, Jest configuration
- **Outputs**: `coverage/**`
- **Environment Variables**: Minimal (test environment)

#### Integration Tests (`test:integration`)
- **Dependencies**: `^build`
- **Environment Variables**: `DATABASE_URL`, `REDIS_URL` (database connections)
- **Outputs**: `coverage/**`

#### End-to-End Tests (`test:e2e`)
- **Dependencies**: `build` (requires fully built application)
- **Inputs**: Playwright configuration, test files
- **Outputs**: `test-results/**`, `playwright-report/**`
- **Environment Variables**: `NEXT_PUBLIC_*`, `DATABASE_URL` (full application stack)

### Quality Assurance Pipelines

#### Linting (`lint`)
- **Dependencies**: `^build`
- **Inputs**: ESLint configuration files
- **Outputs**: None (validation only)
- **Caching**: Enabled

#### Type Checking (`typecheck`)
- **Dependencies**: `^build`
- **Inputs**: TypeScript configuration files
- **Outputs**: None (validation only)
- **Caching**: Enabled

### Database Operations
- **Tasks**: `db:migrate`, `db:seed`, `db:reset`
- **Caching**: Disabled (stateful operations)
- **Environment Variables**: `DATABASE_URL`, `NODE_ENV`

## Performance Optimizations

### Cache Strategy
1. **Input-based Hashing**: Tasks are cached based on source file changes
2. **Dependency Tracking**: `^build` pattern ensures proper build order
3. **Output Caching**: Build artifacts are cached and reused
4. **Environment Sensitivity**: Cache invalidation on environment changes

### Expected Performance Gains
- **Cold Builds**: Full dependency resolution and optimization
- **Incremental Builds**: 70%+ faster through aggressive caching
- **Parallel Execution**: Multiple non-dependent tasks run simultaneously
- **Smart Invalidation**: Only rebuild what actually changed

## Monorepo Structure Integration

### Package Dependencies
```
@money-wise/types (foundation)
├── @money-wise/utils
├── @money-wise/ui
└── @money-wise/backend
    └── @money-wise/web
        └── @money-wise/mobile
```

### Build Optimization
- **Foundation First**: Types package builds first (everything depends on it)
- **Layer-by-Layer**: Each layer builds in parallel after dependencies
- **Smart Filtering**: Use `--filter` for specific package builds

## Usage Examples

### Development
```bash
# Start all development servers
pnpm dev

# Start specific application
pnpm dev:web
pnpm dev:backend
pnpm dev:mobile
```

### Building
```bash
# Build everything
pnpm build

# Build specific application
pnpm build:web
pnpm build:backend

# Build with dependency filtering
turbo run build --filter=@money-wise/web...
```

### Testing
```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm test:unit
pnpm test:integration
pnpm test:e2e

# Test specific package
turbo run test --filter=@money-wise/backend
```

### Quality Assurance
```bash
# Lint everything
pnpm lint

# Type check everything
pnpm typecheck

# Run both with caching
turbo run lint typecheck
```

## Configuration Choices Explained

### 1. Pipeline over Tasks
- Uses `pipeline` configuration for Turborepo v1.13.4 compatibility
- Ensures broad tooling support across development environments

### 2. Dependency Chains
- `^build` pattern ensures packages build dependencies first
- Prevents runtime errors from missing build artifacts
- Optimizes for correctness over speed (speed comes from caching)

### 3. Environment Variable Strategy
- Minimal variables in most tasks (better caching)
- Full environment for integration/e2e tests
- Explicit variable listing prevents cache pollution

### 4. Output Specification
- Comprehensive output patterns catch all build artifacts
- `.next/cache/**` exclusion prevents cache-of-cache issues
- Storybook support for UI package development

### 5. Cache Controls
- Development tasks never cached (always fresh)
- Database operations never cached (stateful)
- Lint/typecheck cached aggressively (deterministic)

## Troubleshooting

### Cache Issues
```bash
# Clear all caches
turbo run clean
rm -rf .turbo

# Force rebuild without cache
turbo run build --force
```

### Dependency Problems
```bash
# Check dependency graph
turbo run build --dry-run

# Visualize dependencies
turbo run build --graph
```

### Performance Analysis
```bash
# Measure build performance
time turbo run build

# Detailed task timing
turbo run build --profile
```

## Remote Caching Setup (Future)

To enable remote caching for team collaboration:

1. **Vercel Integration**:
   ```bash
   turbo login
   turbo link
   ```

2. **Custom Remote Cache**:
   ```json
   "remoteCache": {
     "signature": true
   }
   ```

3. **Environment Variables**:
   - `TURBO_TOKEN`: Authentication token
   - `TURBO_TEAM`: Team identifier

## Maintenance

### Regular Tasks
1. **Update Dependencies**: Keep Turborepo updated for performance improvements
2. **Cache Cleanup**: Periodic cleanup of `.turbo` directories
3. **Configuration Review**: Adjust cache strategies based on usage patterns

### Monitoring
- **Build Times**: Track build performance over time
- **Cache Hit Rates**: Monitor caching effectiveness
- **Resource Usage**: Ensure optimal parallel execution

---

**Implementation Status**: ✅ Complete
**Performance Target**: 70% build time reduction
**Last Updated**: 2025-09-26
**Turbo Version**: v1.13.4