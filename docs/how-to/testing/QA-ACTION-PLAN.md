# MoneyWise QA Action Plan

**Date**: 2025-10-21
**Status**: MVP Phase - Testing Optimization
**Target**: Production-Ready Quality Standards

---

## Quick Summary

MoneyWise has a **strong testing foundation** (7.6/10 overall) with mature infrastructure but needs focused improvements in coverage and E2E testing before production launch.

### Current State

```
Testing Maturity:  Level 4/5 (Managed)
Overall Score:     7.6/10
Coverage:          Backend 63%, Frontend (target 70%)
CI/CD Integration: Excellent (9/10)
Test Count:        81 test files
```

### Production Blockers

1. Backend coverage below 80% threshold (currently 63%)
2. Performance tests failing (database connectivity)
3. Limited E2E coverage (only 2 main flows)

---

## Sprint 1: Critical Path (Weeks 1-2)

### Goal: Unblock Production Launch

#### Task 1.1: Increase Backend Coverage to 80%

**Current**: 63.03% statements
**Target**: 80%+ statements
**Effort**: 3-5 days

**Files to Prioritize**:
```bash
# Focus on high-value, low-coverage modules
apps/backend/src/auth/services/           # Currently 73% → Target 85%
apps/backend/src/core/monitoring/         # Currently ~60% → Target 80%
apps/backend/src/core/health/             # Currently 76% → Target 85%
apps/backend/src/core/database/           # Currently ~65% → Target 80%
```

**Test Types Needed**:
- ✅ Error handling paths
- ✅ Edge cases (empty inputs, boundary conditions)
- ✅ Concurrent request handling
- ✅ Validation failures
- ✅ Database constraint violations

**Example Test Template**:
```typescript
// apps/backend/__tests__/unit/auth/services/auth.service.spec.ts
describe('AuthService - Error Handling', () => {
  it('should handle database connection failure gracefully', async () => {
    // Arrange
    prismaUserService.findOne.mockRejectedValue(
      new Error('Database connection timeout')
    );

    // Act & Assert
    await expect(service.login(credentials)).rejects.toThrow(
      'Authentication service temporarily unavailable'
    );
  });

  it('should rate limit failed login attempts', async () => {
    // Test account lockout after 5 failed attempts
  });

  it('should sanitize SQL injection attempts', async () => {
    // Test input validation
  });
});
```

**Success Criteria**:
- [ ] Backend coverage ≥ 80% statements
- [ ] Branch coverage ≥ 75%
- [ ] All auth services ≥ 85% coverage
- [ ] Zero new flaky tests

---

#### Task 1.2: Fix Performance Tests

**Current**: Tests failing with database connectivity errors
**Target**: All performance tests passing
**Effort**: 1-2 days

**Issues**:
```
❌ "Cannot reach database server at localhost:5432"
❌ "Expected 201 Created, got 401 Unauthorized"
```

**Root Causes**:
1. TestContainers not properly initialized in performance tests
2. Missing JWT authentication setup
3. Database migrations not applied before tests

**Fix Approach**:
```typescript
// apps/backend/__tests__/performance/prisma-performance.spec.ts

beforeAll(async () => {
  // 1. Setup test database with TestContainers
  const testPrismaClient = await setupTestDatabase();

  // 2. Setup auth (generate valid JWT)
  const testUser = await createTestUser(testPrismaClient);
  const authToken = generateJWT(testUser);

  // 3. Configure supertest with auth
  request = () => supertest(app.getHttpServer())
    .set('Authorization', `Bearer ${authToken}`);
});
```

**Success Criteria**:
- [ ] All performance tests passing
- [ ] Benchmarks meeting thresholds (<200ms average)
- [ ] Performance tests integrated into CI/CD

---

#### Task 1.3: Expand E2E Coverage

**Current**: 2 auth flows only
**Target**: 10-15 critical user journeys
**Effort**: 4-5 days

**Priority Flows** (in order):

1. **User Registration & Onboarding** ✅ (exists)
   ```typescript
   // apps/web/e2e/auth/registration.e2e.spec.ts
   test('complete registration flow', async ({ page }) => {
     // Already implemented
   });
   ```

2. **Account Management** (NEW)
   ```typescript
   // apps/web/e2e/accounts/account-management.spec.ts
   test('user can create checking account', async ({ page }) => {
     await page.goto('/dashboard/accounts');
     await page.click('[data-testid="create-account-button"]');
     await page.fill('[name="accountName"]', 'My Checking');
     await page.selectOption('[name="accountType"]', 'checking');
     await page.fill('[name="initialBalance"]', '1000.00');
     await page.click('[data-testid="submit-account"]');

     await expect(page.locator('[data-testid="account-list"]'))
       .toContainText('My Checking');
   });
   ```

3. **Transaction Creation** (NEW)
   ```typescript
   // apps/web/e2e/transactions/transaction-creation.spec.ts
   test('user can record expense transaction', async ({ page }) => {
     await page.goto('/dashboard/transactions');
     await page.click('[data-testid="new-transaction"]');
     await page.selectOption('[name="account"]', 'My Checking');
     await page.fill('[name="amount"]', '45.67');
     await page.fill('[name="description"]', 'Grocery Store');
     await page.selectOption('[name="category"]', 'Food & Dining');
     await page.click('[data-testid="save-transaction"]');

     await expect(page.locator('[data-testid="transaction-list"]'))
       .toContainText('Grocery Store');
   });
   ```

4. **Budget Creation** (NEW)
5. **Dashboard Overview** (NEW)
6. **User Profile Management** (NEW)
7. **Multi-Account Transfers** (NEW)
8. **Category Management** (NEW)
9. **Search & Filtering** (NEW)
10. **Data Export** (NEW)

**Success Criteria**:
- [ ] 10+ E2E tests covering critical paths
- [ ] All tests passing in Chrome, Firefox, Safari
- [ ] Mobile viewport testing included
- [ ] Screenshot on failure enabled
- [ ] Test execution <5 minutes

---

## Sprint 2: Quality Enhancement (Weeks 3-4)

### Goal: Achieve Production-Grade Quality

#### Task 2.1: Contract Testing

**Tool**: OpenAPI validation with `jest-openapi`
**Effort**: 2-3 days

**Implementation**:
```typescript
// apps/backend/__tests__/contracts/api-contract.spec.ts
import jestOpenAPI from 'jest-openapi';
import apiSpec from '@/docs/openapi-spec.json';

jestOpenAPI(apiSpec);

describe('API Contract Tests', () => {
  it('POST /auth/login matches OpenAPI spec', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'pass' });

    expect(response).toSatisfyApiSpec();
  });

  it('GET /accounts matches OpenAPI spec', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/accounts')
      .set('Authorization', `Bearer ${token}`);

    expect(response).toSatisfyApiSpec();
  });
});
```

**Coverage**:
- [ ] Auth endpoints (login, register, logout, refresh)
- [ ] User endpoints (profile, settings)
- [ ] Account endpoints (CRUD)
- [ ] Transaction endpoints (CRUD, filters)
- [ ] Budget endpoints (CRUD)
- [ ] Analytics endpoints (summary, reports)

---

#### Task 2.2: Visual Regression Testing

**Tool**: Playwright screenshots
**Effort**: 2-3 days

**Implementation**:
```typescript
// apps/web/e2e/visual/component-snapshots.spec.ts
test('dashboard page matches snapshot', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveScreenshot('dashboard.png', {
    fullPage: true,
    animations: 'disabled',
  });
});

test('transaction form matches snapshot', async ({ page }) => {
  await page.goto('/transactions/new');

  await expect(page.locator('[data-testid="transaction-form"]'))
    .toHaveScreenshot('transaction-form.png');
});
```

**Coverage**:
- [ ] Dashboard (desktop/mobile)
- [ ] Transaction list/form
- [ ] Account list/form
- [ ] Budget overview
- [ ] User settings
- [ ] Error states

---

#### Task 2.3: Load Testing

**Tool**: k6
**Effort**: 2 days

**Implementation**:
```javascript
// tests/load/api-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up
    { duration: '1m', target: 100 },  // Sustained load
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'],  // 95% under 500ms
    'http_req_failed': ['rate<0.01'],    // <1% failures
  },
};

export default function () {
  const loginRes = http.post('http://localhost:3001/api/auth/login', {
    email: 'test@example.com',
    password: 'password',
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
```

**Scenarios**:
- [ ] 100 concurrent users
- [ ] Transaction creation load
- [ ] Dashboard rendering performance
- [ ] Search/filter operations
- [ ] Report generation

---

## Sprint 3: Optimization (Weeks 5-6)

### Goal: Continuous Improvement Foundation

#### Task 3.1: Mutation Testing

**Tool**: Stryker
**Effort**: 3 days

**Setup**:
```json
// stryker.conf.json
{
  "mutator": "typescript",
  "packageManager": "pnpm",
  "reporters": ["html", "clear-text", "progress"],
  "testRunner": "jest",
  "coverageAnalysis": "perTest",
  "mutate": [
    "apps/backend/src/auth/**/*.ts",
    "!apps/backend/src/auth/**/*.spec.ts"
  ],
  "thresholds": { "high": 80, "low": 60, "break": 50 }
}
```

**Goal**: Validate test effectiveness (not just coverage)

---

#### Task 3.2: Accessibility Testing

**Tool**: axe-core with Playwright
**Effort**: 2 days

**Implementation**:
```typescript
// apps/web/e2e/accessibility/a11y.spec.ts
import { injectAxe, checkA11y } from 'axe-playwright';

test('dashboard is accessible', async ({ page }) => {
  await page.goto('/dashboard');
  await injectAxe(page);

  await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: { html: true },
  });
});
```

**Coverage**:
- [ ] All major pages
- [ ] Form interactions
- [ ] Navigation
- [ ] Error messages

---

## Metrics & Tracking

### Weekly Progress Dashboard

```
Week 1:
- Backend coverage: 63% → 70% (+7%)
- E2E tests: 2 → 6 (+4 flows)
- Performance tests: Fixed ✅

Week 2:
- Backend coverage: 70% → 80% (+10%)
- E2E tests: 6 → 10 (+4 flows)
- Contract tests: 0 → 15 endpoints

Week 3:
- Visual regression: 0 → 6 pages
- Load testing: Infrastructure setup
- Mutation score: Baseline established

Week 4:
- Mutation score: 60% → 80%
- Accessibility: 0% → 100% WCAG AA
- Load tests: All scenarios passing
```

### Quality Gates

**Pre-Production Checklist**:
- [ ] Backend coverage ≥ 80%
- [ ] Frontend coverage ≥ 70%
- [ ] E2E coverage: 10+ critical flows
- [ ] All performance tests passing
- [ ] Load testing: 100 concurrent users
- [ ] Contract tests: All endpoints
- [ ] Visual regression: 6+ pages
- [ ] Accessibility: WCAG 2.1 Level AA
- [ ] Zero flaky tests
- [ ] CI/CD: <15 minute total runtime

---

## Long-Term Vision (Post-MVP)

### Advanced Testing Capabilities

1. **Chaos Engineering**
   - Network failures
   - Database outages
   - Service degradation

2. **Security Testing**
   - OWASP ZAP integration
   - Dependency scanning
   - Secret detection

3. **Cross-Browser Matrix**
   - Edge, Opera
   - Different OS (Windows, macOS, Linux)
   - Older browser versions

4. **Mobile App Testing**
   - React Native E2E
   - Device farm integration
   - Performance profiling

5. **Test Data Management**
   - Synthetic data generation
   - Production data anonymization
   - Test data versioning

---

## Resources

### Documentation
- [Testing Strategy Assessment](/docs/testing/TESTING-STRATEGY-ASSESSMENT.md)
- [Backend Testing Guide](/apps/backend/__tests__/README.md) (create)
- [Frontend Testing Guide](/apps/web/__tests__/README.md) (create)
- [E2E Testing Guide](/apps/web/e2e/README.md) (create)

### External Resources
- [React Testing Library](https://testing-library.com/react)
- [Playwright Docs](https://playwright.dev)
- [Jest Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [TestContainers](https://testcontainers.com)

---

## Team Responsibilities

**QA Specialist** (Primary):
- Execute action plan
- Write new tests
- Fix failing tests
- Review test PRs

**Backend Developers**:
- Maintain backend test coverage
- Write integration tests for new features
- Review unit test quality

**Frontend Developers**:
- Maintain component test coverage
- Write E2E tests for new flows
- Update visual regression baselines

**DevOps**:
- Maintain CI/CD test infrastructure
- Optimize test execution speed
- Monitor test reliability

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-21
**Owner**: QA Testing Specialist
