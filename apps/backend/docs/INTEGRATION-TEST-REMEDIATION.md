# Integration Test Remediation Plan

**Status**: Post-PR #153 Merge - Investigation Phase
**Issue**: [#154](https://github.com/kdantuono/money-wise/issues/154)
**Created**: 2025-11-04
**Last Updated**: 2025-11-04

---

## Executive Summary

Integration test suite currently has **87% failure rate** (181 failing, 30 skipped out of 217 total tests). This document tracks remediation efforts to achieve production-ready test coverage.

### Current State

```
Test Suites: 6 failed, 1 skipped, 2 passed (9 total)
Tests:       181 failed, 30 skipped, 6 passed (217 total)
Failure Rate: 87%
Success Rate: 2.8%
```

### Target State (MVP Launch)

```
Test Suites: 0 failed, 0-2 skipped (documented), 9 passed
Tests:       0 failed, 0-10 skipped (documented), 217+ passed
Failure Rate: 0%
Success Rate: 95-100%
```

---

## Test Suite Status

### ✅ PASSING (2/9 suites)

| Suite | Tests | Status | Notes |
|-------|-------|--------|-------|
| `health.test.ts` | 6 | ✅ PASS | Health checks working |
| `database/repositories.integration.spec.ts` | 0 | ✅ PASS | Database repositories (2 skipped) |

### ❌ FAILING (6/9 suites)

| Suite | Tests | Failed | Skipped | Priority | Root Cause (TBD) |
|-------|-------|--------|---------|----------|------------------|
| `auth-real.integration.spec.ts` | TBD | TBD | 3 | 🔴 HIGH | Cookie auth migration? |
| `transactions/transactions-api.integration.spec.ts` | TBD | TBD | 0 | 🔴 HIGH | API changes? |
| `accounts/accounts-api.integration.spec.ts` | TBD | TBD | 0 | 🔴 HIGH | API changes? |
| `accounts/accounts.service.integration.spec.ts` | TBD | TBD | 0 | 🟡 MEDIUM | Service layer changes? |
| `accounts/accounts.performance.spec.ts` | TBD | TBD | 0 | 🟢 LOW | Performance thresholds? |
| `accounts/data-integrity.spec.ts` | TBD | TBD | 0 | 🟡 MEDIUM | Schema changes? |

### ⏭️ SKIPPED (1/9 suites)

| Suite | Tests | Reason |
|-------|-------|--------|
| Unknown | TBD | Needs investigation |

---

## Known Skipped Tests (30 total)

### Authentication Tests (3 skipped)
From `auth-real.integration.spec.ts`:
- ❌ "should prevent login with unverified email (INACTIVE status)"
- ❌ "should handle complete registration to verification to login flow"
- ❌ "should handle multiple users with independent verification tokens"

**Investigation Needed**: Are these skipped due to email verification service setup?

### Database Repository Tests (2 skipped)
From `database/repositories.integration.spec.ts`:
- ❌ "should have repositories properly exported from index"
- ❌ "should have repository module and injection tokens exported"

**Investigation Needed**: Export structure validation tests?

### Additional Skipped Tests (25+)
- **Status**: Not yet catalogued
- **Action**: Run tests with `--verbose` to identify all skipped tests

---

## Remediation Roadmap

### Phase 1: Investigation (In Progress)
**Timeline**: 1-2 days
**Owner**: TBD
**Status**: 🔴 Not Started

#### Tasks
- [ ] Run integration tests with `--verbose` logging
- [ ] Capture full error output for each failing test
- [ ] Categorize failures by root cause:
  - [ ] Environment setup (Docker, database, Redis)
  - [ ] Cookie auth migration (CSRF token, HttpOnly cookies)
  - [ ] Test data/fixtures
  - [ ] Async/timing issues
  - [ ] Schema changes (Prisma 6.18.0)
  - [ ] API endpoint changes
- [ ] Document findings in this file
- [ ] Create prioritized fix list

#### Commands to Run
```bash
# Verbose test run
pnpm --filter @money-wise/backend test:integration --verbose 2>&1 | tee integration-test-output.log

# Run specific suite with debugging
NODE_ENV=test DEBUG=* pnpm --filter @money-wise/backend test:integration --testNamePattern="auth-real"

# Check Docker environment
docker compose ps
docker compose logs postgres
docker compose logs redis
```

---

### Phase 2: Quick Wins (Planned)
**Timeline**: 2-3 days
**Owner**: TBD
**Status**: ⚪ Not Started
**Dependencies**: Phase 1 complete

#### Likely Quick Fixes
- [ ] Fix test environment setup (database connections, Redis)
- [ ] Update auth tests for cookie-based authentication
  - [ ] Add CSRF token generation to test helpers
  - [ ] Update request headers for HttpOnly cookies
  - [ ] Fix `apps/backend/__tests__/helpers/cookie-auth.helper.ts` usage
- [ ] Fix database seeding/cleanup between tests
- [ ] Address async/timing issues (increase timeouts if needed)
- [ ] Update test fixtures for Prisma 6.18.0 schema changes

#### Success Criteria
- ✅ At least 50% of tests passing (108+ tests)
- ✅ All critical auth flows working
- ✅ Database repositories fully tested

---

### Phase 3: Systematic Remediation (Planned)
**Timeline**: 1-2 weeks
**Owner**: TBD
**Status**: ⚪ Not Started
**Dependencies**: Phase 2 complete

#### Test Suites to Fix
- [ ] **accounts-api.integration.spec.ts** (🔴 HIGH)
  - Account CRUD operations
  - Account listing/filtering
  - Account validation
- [ ] **transactions-api.integration.spec.ts** (🔴 HIGH)
  - Transaction CRUD operations
  - Categorization API
  - Transaction filtering/search
- [ ] **accounts.service.integration.spec.ts** (🟡 MEDIUM)
  - Service layer business logic
  - Account calculations
  - Family account aggregation
- [ ] **data-integrity.spec.ts** (🟡 MEDIUM)
  - Foreign key constraints
  - Cascade deletes
  - Data consistency checks
- [ ] **accounts.performance.spec.ts** (🟢 LOW)
  - Large dataset queries
  - Pagination performance
  - Index effectiveness

#### Success Criteria
- ✅ 95%+ tests passing (206+ tests)
- ✅ All CRUD operations validated
- ✅ All data integrity checks passing

---

### Phase 4: Prevention & CI/CD (Planned)
**Timeline**: Ongoing
**Owner**: TBD
**Status**: ⚪ Not Started
**Dependencies**: Phase 3 complete

#### Infrastructure Improvements
- [ ] Add pre-commit hook for integration tests (optional, fast subset)
- [ ] Set up CI/CD integration test runner
  - [ ] Docker Compose in GitHub Actions
  - [ ] Test database/Redis provisioning
  - [ ] Parallel test execution
- [ ] Create integration test templates/generators
- [ ] Document integration test best practices
- [ ] Add test coverage reporting for integration tests

#### Success Criteria
- ✅ Integration tests run in CI/CD on every PR
- ✅ Test failures block merges
- ✅ New features require integration tests
- ✅ Test coverage reports generated

---

## Root Cause Analysis (Pending Phase 1)

### Hypothesis 1: Cookie Auth Migration
**Likelihood**: 🔴 HIGH
**Evidence**: PR #153 migrated to HttpOnly cookies + CSRF protection
**Impact**: Auth tests, all API endpoint tests requiring authentication

**Investigation**:
- Check if `cookie-auth.helper.ts` is used correctly in all test suites
- Verify CSRF token generation in test setup
- Compare pre-migration test setup vs. current setup

### Hypothesis 2: Test Environment Setup
**Likelihood**: 🟡 MEDIUM
**Evidence**: Docker services may not be running or properly configured
**Impact**: All integration tests requiring database/Redis

**Investigation**:
- Verify Docker Compose services are running
- Check database connection strings in test environment
- Validate Redis connection in test environment
- Review test setup/teardown hooks

### Hypothesis 3: Prisma 6.18.0 Schema Changes
**Likelihood**: 🟡 MEDIUM
**Evidence**: PR #153 included Prisma upgrade
**Impact**: Tests expecting old schema structure

**Investigation**:
- Compare Prisma schema before/after upgrade
- Check for breaking changes in Prisma Client API
- Verify test fixtures match current schema

### Hypothesis 4: Test Data/Fixtures
**Likelihood**: 🟢 LOW
**Evidence**: Tests may have stale or incorrect seed data
**Impact**: Tests with specific data expectations

**Investigation**:
- Review test data factories
- Check for hardcoded UUIDs or IDs
- Verify database cleanup between tests

### Hypothesis 5: Async/Timing Issues
**Likelihood**: 🟢 LOW
**Evidence**: Race conditions or insufficient timeouts
**Impact**: Intermittently failing tests

**Investigation**:
- Review async/await usage in tests
- Check for missing `await` keywords
- Increase test timeouts if necessary

---

## Test Failure Patterns (To Be Documented)

This section will be populated during Phase 1 investigation.

### Pattern 1: [Pattern Name]
- **Occurrences**: X tests
- **Suites affected**: [list]
- **Error signature**: [error message pattern]
- **Root cause**: [analysis]
- **Fix**: [proposed solution]

---

## Progress Tracking

### Metrics

| Date | Failed | Skipped | Passed | Success Rate | Notes |
|------|--------|---------|--------|--------------|-------|
| 2025-11-04 | 181 | 30 | 6 | 2.8% | Baseline (post-PR #153) |
| TBD | TBD | TBD | TBD | TBD% | After Phase 1 |
| TBD | TBD | TBD | TBD | TBD% | After Phase 2 |
| TBD | TBD | TBD | TBD | TBD% | After Phase 3 |

### Sprint/Week Updates

#### Week 1 (2025-11-04 - TBD)
- ✅ Created GitHub issue #154
- ✅ Established remediation plan
- 🔲 Phase 1: Investigation (in progress)
- 🔲 Phase 2: Quick Wins (pending)

#### Week 2 (TBD)
- TBD

---

## Resources

### Documentation
- **Issue Tracker**: [GitHub Issue #154](https://github.com/kdantuono/money-wise/issues/154)
- **Test Baseline**: `apps/backend/docs/TEST_BASELINE_SUMMARY.md`
- **Pre-Update Report**: `apps/backend/docs/PRE_UPDATE_TEST_BASELINE_REPORT.md`
- **Auth Coverage**: `apps/backend/docs/AUTH_TEST_COVERAGE_ASSESSMENT.md`
- **Cookie Auth Helper**: `apps/backend/__tests__/helpers/cookie-auth.helper.ts`

### Related PRs
- **PR #153**: Cookie Auth + Zero-Tolerance CI/CD + Banking + Security Fixes (merged)

### Commands Reference
```bash
# Run all integration tests
pnpm --filter @money-wise/backend test:integration

# Run with verbose output
pnpm --filter @money-wise/backend test:integration --verbose

# Run specific suite
pnpm --filter @money-wise/backend test:integration --testPathPattern="auth-real"

# Run with coverage
pnpm --filter @money-wise/backend test:integration --coverage

# Check Docker services
docker compose ps
docker compose logs postgres
docker compose logs redis

# Reset test database
docker compose down -v
docker compose up -d
pnpm --filter @money-wise/backend db:migrate
```

---

## Notes for Developers

### Running Integration Tests Locally

**Prerequisites**:
1. Docker and Docker Compose installed
2. Docker services running: `docker compose up -d`
3. Test database migrated: `pnpm --filter @money-wise/backend db:migrate`

**Best Practices**:
- Run integration tests in isolation from unit tests
- Ensure clean database state before running (reset if needed)
- Check Docker logs if tests fail mysteriously
- Use `--verbose` flag to see detailed output
- Run tests multiple times to check for flakiness

### Adding New Integration Tests

**Template**:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from '../helpers/test-app.helper';
import { getCsrfTokenAndCookie } from '../helpers/cookie-auth.helper';

describe('Feature Integration Tests', () => {
  let app: INestApplication;
  let csrfToken: string;
  let cookies: string[];

  beforeAll(async () => {
    app = await createTestApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Get CSRF token and auth cookies
    const auth = await getCsrfTokenAndCookie(app);
    csrfToken = auth.csrfToken;
    cookies = auth.cookies;
  });

  it('should test feature with authentication', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/feature')
      .set('Cookie', cookies)
      .set('X-CSRF-Token', csrfToken)
      .send({ data: 'test' })
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
  });
});
```

---

**Document Owner**: Development Team
**Review Frequency**: Weekly during remediation, Monthly after completion
**Last Review**: 2025-11-04
