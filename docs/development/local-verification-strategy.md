# Local Verification Strategy

> **Goal**: Verify all tests pass locally BEFORE pushing to CI to save costs and time.

## Quick Reference

### Full Local Verification (Before PR Push)

```bash
# Run from /home/nemesi/dev/money-wise-tech-debt

# 1. Install and build dependencies
pnpm install --frozen-lockfile
pnpm --filter @money-wise/types build

# 2. Type checking (all workspaces)
pnpm typecheck

# 3. Linting (all workspaces)  
pnpm lint

# 4. Unit tests (all workspaces)
pnpm test:unit

# 5. Integration tests (requires Docker)
docker compose -f docker-compose.dev.yml up -d postgres redis
pnpm test:integration
docker compose -f docker-compose.dev.yml down

# 6. E2E tests (requires full Docker infrastructure)
docker compose -f docker-compose.e2e.yml up -d --build
cd apps/web && pnpm exec playwright test
docker compose -f docker-compose.e2e.yml down -v
```

### One-Liner Quick Check

```bash
# Fast check (type + lint only, ~2 mins)
pnpm typecheck && pnpm lint

# Medium check (type + lint + unit tests, ~5 mins)
pnpm typecheck && pnpm lint && pnpm test:unit

# Full check (everything except E2E, ~10 mins)
pnpm typecheck && pnpm lint && pnpm test:unit && pnpm test:integration
```

---

## Detailed Verification Steps

### Step 1: Environment Setup

```bash
# Ensure correct Node.js version
node -v  # Should be v18.x or v20.x (CI uses v18)

# Ensure correct pnpm version
pnpm -v  # Should be 10.11.0

# Clean install if needed
pnpm install --frozen-lockfile
```

### Step 2: Build Shared Packages

```bash
# Types package must be built first (other packages depend on it)
pnpm --filter @money-wise/types build

# Verify build success
ls packages/types/dist/
```

### Step 3: TypeScript Validation

```bash
# Run TypeScript compilation check on all workspaces
pnpm typecheck

# Expected: No errors (warnings are OK)
```

### Step 4: ESLint Validation

```bash
# Run linting on all workspaces
pnpm lint

# Note: Some warnings are expected (deprecated dependencies)
# Errors will fail CI, warnings won't
```

### Step 5: Unit Tests

```bash
# Run all unit tests
pnpm test:unit

# Or run by workspace
pnpm --filter @money-wise/backend test:unit
pnpm --filter @money-wise/web test:unit

# Expected: ~1550 tests passing
```

### Step 6: Integration Tests

**Requires Docker services running:**

```bash
# Start required services
docker compose -f docker-compose.dev.yml up -d postgres redis

# Wait for services to be healthy
docker compose -f docker-compose.dev.yml ps

# Run integration tests
pnpm test:integration

# Cleanup
docker compose -f docker-compose.dev.yml down
```

### Step 7: E2E Tests

**Requires full Docker infrastructure:**

```bash
# Build and start all E2E services
docker compose -f docker-compose.e2e.yml up -d --build

# Wait for services to be healthy (check status)
docker compose -f docker-compose.e2e.yml ps

# Wait for backend health check
curl -f http://localhost:3001/api/health

# Wait for frontend
curl -f http://localhost:3000

# Install Playwright browsers (first time only)
cd apps/web
pnpm exec playwright install chromium --with-deps

# Run E2E tests
pnpm exec playwright test

# Or run with headed browser for debugging
pnpm exec playwright test --headed

# View test report
pnpm exec playwright show-report

# Cleanup
cd ../..
docker compose -f docker-compose.e2e.yml down -v
```

---

## CI vs Local Differences

| Aspect | CI | Local |
|--------|-----|-------|
| Node.js | v18 | v18+ (v24 OK) |
| pnpm | 10.11.0 | 10.11.0 |
| Database | Service container | Docker Compose |
| Redis | Service container | Docker Compose |
| E2E Browser | Chromium only | Chromium (can add others) |
| Playwright cache | GitHub Actions cache | ~/.cache/ms-playwright |

---

## Common Issues

### Lockfile Mismatch

```bash
# If pnpm install fails with lockfile error
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### TypeScript Errors in Monorepo

```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm --filter @money-wise/types build
```

### E2E Services Not Starting

```bash
# Check Docker logs
docker compose -f docker-compose.e2e.yml logs backend-e2e
docker compose -f docker-compose.e2e.yml logs frontend-e2e

# Force rebuild
docker compose -f docker-compose.e2e.yml down -v
docker compose -f docker-compose.e2e.yml build --no-cache
docker compose -f docker-compose.e2e.yml up -d
```

### Database Connection Errors

```bash
# Verify PostgreSQL is running
docker compose -f docker-compose.dev.yml ps postgres

# Check database is accessible
docker compose -f docker-compose.dev.yml exec postgres psql -U test -d test_db -c "SELECT 1"
```

---

## Automation Script

Save as `scripts/local-verify.sh`:

```bash
#!/bin/bash
set -e

echo "🔍 Starting local verification..."

echo "📦 Step 1: Installing dependencies..."
pnpm install --frozen-lockfile

echo "🏗️ Step 2: Building types package..."
pnpm --filter @money-wise/types build

echo "📝 Step 3: TypeScript check..."
pnpm typecheck

echo "🧹 Step 4: Linting..."
pnpm lint

echo "🧪 Step 5: Unit tests..."
pnpm test:unit

echo "✅ Local verification PASSED!"
echo ""
echo "To run integration tests:"
echo "  docker compose -f docker-compose.dev.yml up -d && pnpm test:integration"
echo ""
echo "To run E2E tests:"
echo "  docker compose -f docker-compose.e2e.yml up -d --build"
echo "  cd apps/web && pnpm exec playwright test"
```

---

## Pre-Push Checklist

Before running `git push`:

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes (no errors, warnings OK)
- [ ] `pnpm test:unit` passes (~1550 tests)
- [ ] `pnpm test:integration` passes (if changes affect API)
- [ ] E2E tests pass (if changes affect UI/UX flows)

---

*Last updated: Phase 4 Tech Debt Cleanup*
