# Master Engineering Plan: 80% Test Coverage Achievement

**Version:** 1.0.0
**Date:** 2025-11-08
**Status:** ACTIVE EXECUTION
**Objective:** Achieve 80%+ test coverage across all levels (Backend, Frontend, Integration, E2E) using TDD methodology

---

## Executive Summary

This document outlines a systematic, research-backed approach to achieving 80% test coverage across the MoneyWise application using industry best practices from 2025.

### Research-Backed Methodology

Based on comprehensive research (November 2025):

1. **TDD Cycle**: Red → Green → Refactor (write failing test, make it pass, clean up)
2. **Coverage Target**: 80% industry standard (branches, functions, lines, statements)
3. **Quality Focus**: Projects with systematic tests report 30% fewer bugs
4. **Incremental Approach**: Aim for 20% coverage improvement per week
5. **One Assert Per Test**: Enables precise failure identification

### Success Metrics

- **Backend**: 65.83% → 80%+ (need +545 lines, +124 functions, +323 branches)
- **Frontend**: TBD% → 80%+ (baseline to be established)
- **Integration**: TBD% → 80%+ (baseline to be established)
- **E2E**: 12.6% pass rate (13/103) → 100% (103/103)

---

## Part 1: Foundation & Architecture

### 1.1 Coverage Heat Map Analysis

**Input Required:**
- Backend coverage data (existing: 65.83%)
- Frontend coverage baseline (TBD)
- Integration coverage baseline (TBD)

**Output Deliverable:**
```
docs/testing/coverage-heat-map.md
```

**Contents:**
- File-by-file coverage breakdown
- Priority ranking (lowest coverage first)
- Critical path identification
- Risk assessment matrix

### 1.2 Test Architecture Design

**Principles:**
1. **Dependency Injection for Mocking** (NestJS best practice)
2. **Page Object Model (POM)** for E2E tests
3. **Test Data Factories** for consistent fixtures
4. **Isolated Test Environments** (no shared state)

**Deliverables:**
```
apps/backend/__tests__/utils/
├── factories/           # Test data factories
├── mocks/              # Shared mocks
└── helpers/            # Test helpers

apps/web/__tests__/utils/
├── test-utils.tsx      # React Testing Library setup
├── mocks/              # API mocks
└── fixtures/           # Test data
```

### 1.3 Coverage Configuration

**Jest Configuration Updates:**

```typescript
// apps/backend/jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.module.ts',
    '!src/main.ts',
  ],
  coverageThresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['lcov', 'json', 'text-summary', 'html'],
};
```

**Playwright Configuration Updates:**

```typescript
// apps/web/playwright.config.ts
export default defineConfig({
  // ... existing config
  use: {
    trace: 'retain-on-failure', // For debugging
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Smart sharding for parallel execution
  workers: process.env.CI ? 4 : 6,
});
```

---

## Part 2: Backend Unit Tests (TDD Approach)

### 2.1 Test Writing Workflow (Red-Green-Refactor)

**For Each Module:**

1. **RED Phase**: Write failing test
   ```typescript
   describe('AccountsService', () => {
     describe('create', () => {
       it('should create account with valid data', async () => {
         // Arrange
         const createDto = AccountFactory.build();

         // Act
         const result = await service.create(createDto);

         // Assert
         expect(result.id).toBeDefined();
       });
     });
   });
   ```

2. **GREEN Phase**: Implement minimum code to pass
3. **REFACTOR Phase**: Clean up, optimize, remove duplication

### 2.2 Priority Modules (Lowest Coverage First)

**Phase 1: Accounts Module (Currently 5.26% lines)**

Target Files:
- `apps/backend/src/accounts/accounts.service.ts` (5.26% → 80%)
- `apps/backend/src/accounts/accounts.controller.ts` (65.38% → 80%)

**Estimated Tests Needed:** 45-50 tests
**Estimated Time:** 6-8 hours

**Test Categories:**
- CRUD operations (Create, Read, Update, Delete)
- Validation (input validation, business rules)
- Error handling (not found, duplicate, invalid data)
- Edge cases (null values, boundary conditions)
- Relations (user accounts, family accounts)

**Phase 2: Banking Module**

Target Files:
- `apps/backend/src/banking/**/*.service.ts`
- `apps/backend/src/banking/**/*.controller.ts`

**Estimated Tests Needed:** 60-70 tests
**Estimated Time:** 8-10 hours

**Phase 3: Remaining Modules**

- Transactions module
- Budgets module
- Goals module
- Reports module

**Estimated Tests Needed:** 80-100 tests
**Estimated Time:** 12-15 hours

### 2.3 Test Data Factories

**Implementation:**

```typescript
// apps/backend/__tests__/utils/factories/account.factory.ts
import { faker } from '@faker-js/faker';

export class AccountFactory {
  static build(overrides = {}) {
    return {
      name: faker.finance.accountName(),
      type: 'CHECKING',
      source: 'MANUAL',
      currentBalance: faker.finance.amount(),
      userId: faker.string.uuid(),
      ...overrides,
    };
  }

  static buildMany(count: number, overrides = {}) {
    return Array.from({ length: count }, () => this.build(overrides));
  }
}
```

---

## Part 3: Frontend Unit Tests (React Testing Library + Vitest)

### 3.1 Component Testing Strategy

**80% Focus Areas:**
1. **Core UI Components** (80% of usage)
   - Button, Input, Card, Form components
   - Layout components (Header, Sidebar, Dashboard Layout)

2. **Business Logic Components** (critical paths)
   - Auth forms (Login, Register)
   - Account management
   - Transaction lists/forms
   - Dashboard widgets

3. **State Management** (Zustand stores)
   - Auth store
   - Banking store
   - User store

### 3.2 Testing Patterns

**Component Test Template:**

```typescript
// apps/web/__tests__/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  describe('Rendering', () => {
    it('should render with text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click</Button>);

      fireEvent.click(screen.getByText('Click'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Variants', () => {
    it('should apply variant styles', () => {
      const { container } = render(<Button variant="destructive">Delete</Button>);
      expect(container.firstChild).toHaveClass('bg-destructive');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', () => {
      render(<Button>Press me</Button>);
      const button = screen.getByText('Press me');

      button.focus();
      expect(button).toHaveFocus();
    });
  });
});
```

**Estimated Tests Needed:** 120-150 tests
**Estimated Time:** 15-18 hours

---

## Part 4: Integration Tests

### 4.1 API Integration Testing

**Strategy:**
- Test complete request → response cycles
- Use real database (test instance)
- Verify data persistence
- Test authentication flows

**Example:**

```typescript
// apps/backend/__tests__/integration/auth.integration.spec.ts
describe('Auth Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    // Setup test app
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    // Clean up database
    await prisma.user.deleteMany();
  });

  it('should register → login → access protected route', async () => {
    // 1. Register
    const registerResponse = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'SecurePassword123!',
      });

    expect(registerResponse.status).toBe(201);

    // 2. Login
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'SecurePassword123!',
      });

    expect(loginResponse.status).toBe(200);
    const { accessToken } = loginResponse.body;

    // 3. Access protected route
    const profileResponse = await request(app.getHttpServer())
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.email).toBe('test@example.com');
  });
});
```

**Estimated Tests Needed:** 40-50 tests
**Estimated Time:** 6-8 hours

---

## Part 5: E2E Tests (Playwright - Page Object Model)

### 5.1 Page Object Model Architecture

**Structure:**

```
apps/web/e2e/
├── pages/
│   ├── base.page.ts           # Base page with common methods
│   ├── auth/
│   │   ├── login.page.ts
│   │   └── register.page.ts
│   ├── dashboard/
│   │   └── dashboard.page.ts
│   └── accounts/
│       └── accounts.page.ts
├── fixtures/
│   └── test-data.ts
├── utils/
│   └── test-helpers.ts
└── auth/
    ├── auth.spec.ts
    └── registration.e2e.spec.ts
```

**Page Object Example:**

```typescript
// apps/web/e2e/pages/auth/login.page.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[data-testid="email-input"]');
    this.passwordInput = page.locator('[data-testid="password-input"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
  }

  async goto() {
    await this.page.goto('/auth/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

### 5.2 E2E Test Fixing Strategy (Based on Research)

**80% Coverage on Critical Paths:**
1. **Authentication flow** (register → login → logout)
2. **Account management** (create → update → delete accounts)
3. **Transactions** (view → filter → search transactions)
4. **Dashboard** (data display, navigation)

**Best Practices:**
- ✅ **NO hard waits** - use `waitForLoadState`, `waitForSelector`
- ✅ **User-facing selectors** - prefer `data-testid` and accessibility attributes
- ✅ **Automatic waiting** - Playwright waits for elements automatically
- ✅ **Parallel execution** - utilize sharding (4 workers on CI)
- ✅ **Failure artifacts** - screenshots, videos, traces on failure

**Phase-by-Phase Execution:**

**Phase 8: Authentication (12 tests)**
- Fix login flows
- Fix validation errors
- Fix session management

**Phase 9: Registration (30 tests)**
- Fix form validation
- Fix email verification
- Fix duplicate user handling

**Phase 10: Critical Path (1 test)**
- Complete user journey test

**Phases 11-13: Banking, Dashboard, Remaining (60 tests)**
- Systematic fix using POM
- Verify each test individually
- Run full suite after each module

**Estimated Time:** 20-25 hours total

---

## Part 6: Execution Methodology

### 6.1 TDD Red-Green-Refactor Cycle

**For Every Single Test:**

1. **RED (Write Failing Test)**
   - Write test that describes desired behavior
   - Run test → verify it fails (RED)
   - Commit: `test: add failing test for [feature]`

2. **GREEN (Make It Pass)**
   - Write minimum code to make test pass
   - Run test → verify it passes (GREEN)
   - Commit: `feat: implement [feature] to pass test`

3. **REFACTOR (Clean Up)**
   - Improve code quality
   - Remove duplication
   - Optimize
   - Run all tests → verify still passing
   - Commit: `refactor: improve [feature] implementation`

### 6.2 Incremental Verification

**After Every 5-10 Tests:**
```bash
# Run coverage report
pnpm --filter @money-wise/backend test:unit -- --coverage --coverageReporters=text-summary

# Verify progress toward 80% goal
# Document progress in tracking sheet
```

**After Every Module:**
```bash
# Full test suite
pnpm test

# Full coverage report
pnpm test:coverage

# Commit progress
git add .
git commit -m "test: [module] coverage improved to XX%"
```

### 6.3 Quality Gates

**Before Moving to Next Phase:**
- ✅ All tests in current phase passing
- ✅ Coverage threshold met for current module
- ✅ No regressions in other modules
- ✅ Code reviewed (self or peer)
- ✅ Documentation updated

---

## Part 7: Specialized Agents Execution Plan

### Agent 1: Test Specialist (Backend Unit Tests)
**Responsibility:** Backend coverage 65.83% → 80%+
**Duration:** Phases 1-4 (26-33 hours)
**Deliverable:** 185-220 new backend tests

### Agent 2: Frontend Specialist (Frontend Unit Tests)
**Responsibility:** Frontend coverage TBD% → 80%+
**Duration:** Phases 5-6 (15-18 hours)
**Deliverable:** 120-150 new frontend tests

### Agent 3: Backend Specialist (Integration Tests)
**Responsibility:** Integration coverage TBD% → 80%+
**Duration:** Phase 7 (6-8 hours)
**Deliverable:** 40-50 integration tests

### Agent 4: Frontend Specialist + Test Specialist (E2E Tests)
**Responsibility:** E2E pass rate 12.6% → 100%
**Duration:** Phases 8-13 (20-25 hours)
**Deliverable:** 90 fixed/rewritten E2E tests

### Agent 5: Quality Evolution Specialist (Final Review)
**Responsibility:** Code review, quality verification
**Duration:** Final phase (4-6 hours)
**Deliverable:** Quality report, recommendations

---

## Part 8: Progress Tracking

### Coverage Progress Matrix

```markdown
| Module                | Current | Target | Gap    | Status      |
|-----------------------|---------|--------|--------|-------------|
| Backend - Auth        | 88.5%   | 80%    | ✅      | PASSING     |
| Backend - Accounts    | 5.26%   | 80%    | +74.74%| IN PROGRESS |
| Backend - Banking     | ~30%    | 80%    | +50%   | PENDING     |
| Backend - Transactions| TBD     | 80%    | TBD    | PENDING     |
| Frontend - Components | TBD     | 80%    | TBD    | PENDING     |
| Frontend - Pages      | TBD     | 80%    | TBD    | PENDING     |
| Integration - API     | TBD     | 80%    | TBD    | PENDING     |
| E2E - Auth            | 0%      | 100%   | +100%  | PENDING     |
| E2E - Registration    | 3.3%    | 100%   | +96.7% | PENDING     |
| E2E - Critical Path   | 0%      | 100%   | +100%  | PENDING     |
| E2E - Banking         | 0%      | 100%   | +100%  | PENDING     |
| E2E - Dashboard       | 0%      | 100%   | +100%  | PENDING     |
| E2E - Visual          | 100%    | 100%   | ✅      | PASSING     |
```

### Daily Progress Log

**Location:** `docs/testing/progress-log.md`

**Format:**
```markdown
## 2025-11-08

### Completed
- ✅ Research phase complete
- ✅ Master plan created
- ✅ E2E skip condition removed from CI

### In Progress
- 🔄 Backend Accounts module testing (0/50 tests complete)

### Coverage Snapshot
- Backend: 65.83% (target: 80%)
- Frontend: TBD% (target: 80%)
- E2E: 12.6% (target: 100%)

### Blockers
- ⚠️ Docker not running (required for E2E tests)

### Next Actions
1. Start Docker services
2. Launch Test Specialist agent for Accounts module
3. Complete first 10 tests in TDD cycle
```

---

## Part 9: Success Criteria

### Final Acceptance Criteria

- ✅ **Backend Coverage**: ≥80% (lines, branches, functions, statements)
- ✅ **Frontend Coverage**: ≥80% (lines, branches, functions, statements)
- ✅ **Integration Coverage**: ≥80% (API endpoints covered)
- ✅ **E2E Pass Rate**: 100% (103/103 tests passing)
- ✅ **CI/CD Pipeline**: All quality gates green
- ✅ **Zero Regressions**: All existing tests still passing
- ✅ **Documentation**: Coverage reports generated and documented
- ✅ **Code Quality**: All tests follow best practices, no duplication

### Metrics Dashboard

**Final Report Should Include:**
- Coverage percentages (before/after)
- Test count (before/after)
- Time invested per module
- Bug discovery rate
- Code quality metrics (complexity, maintainability)

---

## Part 10: Risk Management

### Known Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Docker issues on WSL2 | MEDIUM | HIGH | Document Docker setup, provide alternatives |
| Flaky E2E tests | MEDIUM | HIGH | Implement retry logic, use stable selectors |
| Time overrun | MEDIUM | MEDIUM | Incremental approach, prioritize critical paths |
| Scope creep | LOW | MEDIUM | Strict 80% threshold, avoid gold-plating |

---

## Appendix A: Commands Reference

```bash
# Backend unit tests with coverage
pnpm --filter @money-wise/backend test:unit -- --coverage

# Frontend unit tests with coverage
pnpm --filter @money-wise/web test:unit -- --coverage

# Integration tests
pnpm --filter @money-wise/backend test:integration

# E2E tests (all browsers)
cd apps/web && pnpm test:e2e

# E2E tests (single browser, faster)
cd apps/web && pnpm exec playwright test --project=chromium

# Watch mode (TDD)
pnpm --filter @money-wise/backend test:unit -- --watch

# Coverage report (HTML viewer)
open apps/backend/coverage/lcov-report/index.html
open apps/web/coverage/index.html
```

## Appendix B: Resources

### Documentation
- NestJS Testing: https://docs.nestjs.com/fundamentals/testing
- Playwright Best Practices: https://playwright.dev/docs/best-practices
- Jest Coverage: https://jestjs.io/docs/configuration#collectcoveragefrom-array
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro/

### Tools
- Faker.js: https://fakerjs.dev/ (test data generation)
- Testing Library: https://testing-library.com/
- Playwright: https://playwright.dev/

---

**Document Status:** READY FOR EXECUTION
**Next Step:** Launch Test Specialist Agent for Backend Accounts Module

