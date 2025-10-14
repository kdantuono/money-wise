# CI/CD Test Failures - Verification Checklist

## Quick Verification Steps

After the PR is merged, verify these fixes work by checking:

### 1. CI/CD Pipeline Workflow (ci-cd.yml)
- [ ] Navigate to: https://github.com/kdantuono/money-wise/actions/workflows/ci-cd.yml
- [ ] Check that the "🧪 Testing Pipeline" job passes
- [ ] Verify database migrations run before tests
- [ ] Verify all three test types complete successfully:
  - [ ] Unit Tests
  - [ ] Integration Tests  
  - [ ] Performance Tests

### 2. Quality Gates Workflow (quality-gates.yml)
- [ ] Navigate to: https://github.com/kdantuono/money-wise/actions/workflows/quality-gates.yml
- [ ] Check that "Integration Tests" job passes
- [ ] Check that "Performance Tests" job passes
- [ ] Verify PostgreSQL and Redis services are running for both jobs

### 3. Local Testing
```bash
# Verify turbo recognizes the new task
pnpm turbo run test:performance --dry-run

# Expected output should show:
# Tasks to Run
# @money-wise/backend#test:performance

# Verify the script works (if database is available)
pnpm test:performance
# Expected: Tests run (currently skipped but infrastructure works)
```

### 4. Check Workflow Logs

#### For Integration Tests:
- [ ] Verify PostgreSQL service starts successfully
- [ ] Verify "Wait for PostgreSQL to be ready" step succeeds
- [ ] Verify "Run database migrations" step completes
- [ ] Verify tests have DATABASE_URL environment variable set
- [ ] Check test output for successful database connections

#### For Performance Tests:
- [ ] Verify PostgreSQL and Redis services start
- [ ] Verify migrations run successfully
- [ ] Verify tests execute (even if skipped)
- [ ] Check for no connection errors

#### For CI/CD Testing Pipeline:
- [ ] Verify migration step runs before any tests
- [ ] Verify DATABASE_URL is set for all test steps
- [ ] Verify all environment variables are properly configured

## Key Environment Variables to Check

### ci-cd.yml Test Steps Should Have:
```yaml
DATABASE_URL: postgresql://postgres:testpassword@localhost:5432/moneywise_test
DB_HOST: localhost
DB_PORT: 5432
DB_USERNAME: postgres
DB_PASSWORD: testpassword
DB_NAME: moneywise_test
```

### quality-gates.yml Test Steps Should Have:
```yaml
DATABASE_URL: postgresql://test:testpass@localhost:5432/test_db
```

## Expected Results

### Before Fixes:
- ❌ CI/CD Pipeline / 🧪 Testing Pipeline - Failed after 6m
- ❌ Quality Gates / Integration Tests - Failed after 2m
- ❌ Quality Gates / Performance Tests - Failed after 1m

### After Fixes:
- ✅ CI/CD Pipeline / 🧪 Testing Pipeline - Passes
- ✅ Quality Gates / Integration Tests - Passes
- ✅ Quality Gates / Performance Tests - Passes

## Troubleshooting

If tests still fail:

1. **Check PostgreSQL service health**:
   - Look for "pg_isready" health check in logs
   - Verify service starts before tests run
   - Check port 5432 is accessible

2. **Check DATABASE_URL format**:
   - Must be: `postgresql://user:pass@host:port/dbname`
   - Verify credentials match service configuration

3. **Check migrations**:
   - Ensure migration step runs before tests
   - Check for migration errors in logs
   - Verify schema is created successfully

4. **Check environment variables**:
   - Verify DATABASE_URL is set in test step
   - Check all DB_* variables are present
   - Verify JWT secrets are set

## Reference Documentation

- Full analysis: [docs/troubleshooting/ci-cd-test-failures-2025-10-14.md](./ci-cd-test-failures-2025-10-14.md)
- Workflow files:
  - [.github/workflows/ci-cd.yml](../../.github/workflows/ci-cd.yml)
  - [.github/workflows/quality-gates.yml](../../.github/workflows/quality-gates.yml)
- Configuration:
  - [turbo.json](../../turbo.json)
  - [package.json](../../package.json)
  - [.env.test](../../apps/backend/.env.test)
