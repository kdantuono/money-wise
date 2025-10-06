# Task: Testing Infrastructure Hardening

**Issue**: #109
**Domain**: testing/qa
**Assigned To**: qa-testing-engineer
**Branch**: feat/test-infrastructure
**Base Branch**: epic/1.5-infrastructure
**Status**: assigned
**Dependencies**: Soft dependency on STORY-1.5.1 (can start with existing code)

## Full Context (Self-Contained)

### Objective
Harden the testing infrastructure to achieve 80% code coverage, implement comprehensive integration testing, establish E2E test framework with Playwright, and add performance testing capabilities.

### Requirements
1. Increase code coverage from current ~45% to minimum 80%
2. Implement integration test suite for all API endpoints
3. Set up E2E testing with Playwright for critical user journeys
4. Create reusable test data fixtures and factories
5. Add performance testing for API endpoints (response time < 200ms)

### Technical Specifications

#### Current Testing State
```json
{
  "coverage": {
    "backend": {
      "statements": "42%",
      "branches": "38%",
      "functions": "45%",
      "lines": "41%"
    },
    "frontend": {
      "statements": "35%",
      "branches": "30%",
      "functions": "33%",
      "lines": "34%"
    }
  },
  "test_types": {
    "unit": "partial",
    "integration": "minimal",
    "e2e": "none",
    "performance": "none"
  }
}
```

#### Target Testing Architecture

##### Backend Testing Structure
```
apps/backend/
├── src/
│   └── [modules]/
│       ├── *.spec.ts           # Unit tests (colocated)
│       └── *.controller.ts
├── test/
│   ├── integration/
│   │   ├── auth.integration.spec.ts
│   │   ├── accounts.integration.spec.ts
│   │   └── transactions.integration.spec.ts
│   ├── fixtures/
│   │   ├── users.fixture.ts
│   │   ├── accounts.fixture.ts
│   │   └── database.fixture.ts
│   ├── factories/
│   │   ├── user.factory.ts
│   │   └── transaction.factory.ts
│   └── performance/
│       └── api.performance.spec.ts
```

##### Frontend Testing Structure
```
apps/web/
├── src/
│   └── components/
│       ├── *.test.tsx          # Component tests
│       └── *.tsx
├── tests/
│   ├── e2e/
│   │   ├── auth.spec.ts        # Playwright tests
│   │   ├── dashboard.spec.ts
│   │   └── transactions.spec.ts
│   └── fixtures/
│       └── test-data.ts
├── playwright.config.ts
```

### Files to Create/Modify

#### Test Configuration Files
- `/home/nemesi/dev/money-wise/apps/backend/test/jest-integration.config.js`
```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '../',
  testEnvironment: 'node',
  testRegex: '.integration.spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: '../coverage/integration',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};
```

- `/home/nemesi/dev/money-wise/apps/web/playwright.config.ts`
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### Test Fixtures & Factories
- `/home/nemesi/dev/money-wise/apps/backend/test/factories/user.factory.ts`
```typescript
import { faker } from '@faker-js/faker';
import { User } from '@app/users/entities/user.entity';

export class UserFactory {
  static build(overrides?: Partial<User>): User {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      password: faker.internet.password({ length: 12 }),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static buildMany(count: number, overrides?: Partial<User>): User[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }
}
```

#### Integration Tests
- `/home/nemesi/dev/money-wise/apps/backend/test/integration/auth.integration.spec.ts`
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { UserFactory } from '../factories/user.factory';

describe('AuthController (Integration)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', async () => {
      const user = UserFactory.build();

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: user.email,
          password: user.password,
          firstName: user.firstName,
          lastName: user.lastName,
        })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user.email).toBe(user.email);
    });

    it('should fail with duplicate email', async () => {
      const user = UserFactory.build();

      // First registration
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(user)
        .expect(201);

      // Duplicate registration
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(user)
        .expect(409);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should authenticate user and return JWT', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!@#',
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      authToken = response.body.access_token;
    });
  });
});
```

#### E2E Tests with Playwright
- `/home/nemesi/dev/money-wise/apps/web/tests/e2e/auth.spec.ts`
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Sign In');
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should login successfully', async ({ page }) => {
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');

    await page.waitForURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpass');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toContainText('Invalid credentials');
  });

  test('should register new user', async ({ page }) => {
    await page.click('a[href="/register"]');

    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.fill('input[name="confirmPassword"]', 'Test123!@#');

    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome, John');
  });
});
```

#### Performance Tests
- `/home/nemesi/dev/money-wise/apps/backend/test/performance/api.performance.spec.ts`
```typescript
import autocannon from 'autocannon';

describe('API Performance', () => {
  const BASE_URL = 'http://localhost:3001';

  it('should handle 1000 requests/sec on health endpoint', async () => {
    const result = await autocannon({
      url: `${BASE_URL}/health`,
      connections: 10,
      duration: 10,
      pipelining: 1,
    });

    expect(result.requests.average).toBeGreaterThan(1000);
    expect(result.latency.p99).toBeLessThan(200);
  });

  it('should handle concurrent authentication requests', async () => {
    const result = await autocannon({
      url: `${BASE_URL}/auth/login`,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'Test123!@#',
      }),
      connections: 50,
      duration: 10,
    });

    expect(result.errors).toBe(0);
    expect(result.latency.p95).toBeLessThan(500);
  });
});
```

### Code Coverage Requirements

Target coverage thresholds in `jest.config.js`:
```javascript
{
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/core/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
}
```

### Dependencies Completed
None - can start immediately with existing codebase

### Definition of Done
- [ ] Backend code coverage >= 80% (all metrics)
- [ ] Frontend code coverage >= 70%
- [ ] All API endpoints have integration tests
- [ ] 5 critical E2E user journeys tested with Playwright
- [ ] Test data fixtures and factories implemented
- [ ] Performance tests pass (p95 < 200ms for APIs)
- [ ] CI/CD pipeline includes all test suites
- [ ] Test reports generated in HTML format
- [ ] Documentation for writing new tests created

### Integration Notes
- Work can begin immediately on existing codebase
- Will benefit from STORY-1.5.1 cleanup but not blocked
- Performance tests should run in isolated environment
- E2E tests require full stack running

## Commands for Agent
```bash
# Create branch
git checkout epic/1.5-infrastructure
git pull origin epic/1.5-infrastructure
git checkout -b feat/test-infrastructure

# Install testing dependencies
pnpm add -D @playwright/test @faker-js/faker autocannon
pnpm add -D @testing-library/react @testing-library/jest-dom

# Set up Playwright
cd apps/web
pnpm exec playwright install

# Run tests with coverage
pnpm test:cov
pnpm test:integration
pnpm test:e2e

# Generate coverage report
pnpm test:cov --coverageReporters=html

# Commit changes
git add .
git commit -m "test(infrastructure): increase coverage to 80% and add E2E tests"
git push origin feat/test-infrastructure

# Create PR
gh pr create --title "[STORY-1.5.7] Testing Infrastructure Hardening" \
  --body "Closes #109\n\nAchieved 80% code coverage with comprehensive test suite" \
  --base epic/1.5-infrastructure \
  --head feat/test-infrastructure
```