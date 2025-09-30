# MoneyWise Testing Guide

## Overview

This guide covers the comprehensive testing infrastructure implemented for the MoneyWise application. Our testing strategy includes unit testing, integration testing, E2E testing, contract testing, and visual regression testing.

## Testing Stack

### Frontend Testing
- **Unit/Integration Tests**: Vitest + React Testing Library
- **E2E Tests**: Playwright
- **Visual Regression**: Playwright Screenshots
- **API Mocking**: Mock Service Worker (MSW)

### Backend Testing
- **Unit/Integration Tests**: Jest + Supertest
- **Contract Testing**: OpenAPI + jest-openapi
- **Database Testing**: In-memory SQLite (for tests)

## Test Types and Structure

### 1. Unit Testing

#### Frontend (Vitest)
```bash
# Run unit tests
pnpm --filter @money-wise/web test:unit

# Watch mode
pnpm --filter @money-wise/web test:watch

# Coverage
pnpm --filter @money-wise/web test:coverage

# UI mode
pnpm --filter @money-wise/web test:ui
```

**Location**: `apps/web/src/**/*.test.{ts,tsx}`

**Example Test**:
```typescript
import { render, screen } from '@testing-library/react'
import { Button } from './Button'

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button')).toHaveTextContent('Click me')
  })
})
```

#### Backend (Jest)
```bash
# Run backend tests
pnpm --filter @money-wise/backend test

# Watch mode
pnpm --filter @money-wise/backend test:watch

# Coverage
pnpm --filter @money-wise/backend test:coverage
```

**Location**: `apps/backend/__tests__/**/*.{test,spec}.ts`

**Test Structure** (Milestone 1 compliant):
```
apps/backend/__tests__/
├── unit/              # Unit tests (mirror src/ structure)
│   ├── auth/
│   ├── core/
│   └── common/
├── integration/       # Integration tests
├── e2e/              # End-to-end tests
├── contracts/        # API contract tests
└── performance/      # Performance tests
```

### 2. End-to-End Testing (Playwright)

#### Basic E2E Tests
```bash
# Run all E2E tests
pnpm --filter @money-wise/web test:e2e

# Run basic E2E tests (faster subset)
pnpm --filter @money-wise/web test:e2e:basic

# Run with UI mode
pnpm --filter @money-wise/web test:e2e:ui
```

**Location**: `apps/web/e2e/**/*.spec.ts`

#### Page Object Pattern
We use the Page Object Pattern for maintainable E2E tests:

**Base Page** (`e2e/pages/base.page.ts`):
```typescript
export class BasePage {
  protected page: Page

  constructor(page: Page) {
    this.page = page
  }

  async waitForElement(selector: string, timeout: number = 10000): Promise<Locator> {
    const element = this.page.locator(selector)
    await expect(element).toBeVisible({ timeout })
    return element
  }
}
```

**Login Page** (`e2e/pages/login.page.ts`):
```typescript
export class LoginPage extends BasePage {
  async loginWithValidCredentials(email = 'test@example.com', password = 'password'): Promise<void> {
    await this.login(email, password)
    await this.waitForUrl(/dashboard|home/, 15000)
  }
}
```

### 3. API Mocking (MSW)

Mock Service Worker provides realistic API mocking for frontend tests.

**Setup** (`apps/web/__mocks__/server.ts`):
```typescript
import { setupServer } from 'msw/node'
import { handlers } from './api/handlers'

export const server = setupServer(...handlers)
```

**Handlers** (`apps/web/__mocks__/api/handlers.ts`):
```typescript
export const handlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as LoginRequest
    if (body.email === 'test@example.com' && body.password === 'password') {
      return HttpResponse.json({ user: mockUser, token: 'mock-jwt-token' })
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }),
  // ... more handlers
]
```

**Usage in Tests**:
```typescript
import { server } from '../__mocks__/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### 4. Contract Testing

Contract tests ensure API implementation matches OpenAPI specification.

```bash
# Run contract tests
pnpm --filter @money-wise/backend test src/__tests__/contracts/api-contracts.test.ts
```

**OpenAPI Spec** (`apps/backend/src/docs/openapi.spec.ts`):
```typescript
const spec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'MoneyWise API', version: '1.0.0' },
    components: {
      schemas: {
        User: { /* schema definition */ },
        Account: { /* schema definition */ },
        // ... more schemas
      }
    }
  }
})
```

**Contract Tests** (`apps/backend/src/__tests__/contracts/api-contracts.test.ts`):
```typescript
import jestOpenAPI from 'jest-openapi'
import { spec } from '../../docs/openapi.spec'

jestOpenAPI(spec)

describe('API Contract Tests', () => {
  it('should validate login response schema', async () => {
    const response = { user: mockUser, token: 'jwt-token' }
    expect(response).toSatisfySchemaInApiSpec('AuthResponse')
  })
})
```

### 5. Visual Regression Testing

Visual tests capture screenshots and detect UI changes.

```bash
# Run visual regression tests
pnpm --filter @money-wise/web test:visual

# Update baseline screenshots
pnpm --filter @money-wise/web test:visual:update

# Run with UI mode
pnpm --filter @money-wise/web test:visual:ui
```

**Configuration** (`playwright.config.ts`):
```typescript
expect: {
  toHaveScreenshot: {
    threshold: 0.2,
    animations: 'disabled',
    mode: 'css',
  },
}
```

**Visual Tests** (`e2e/visual/visual-regression.spec.ts`):
```typescript
test('Login page visual snapshot', async ({ page }) => {
  await page.goto('/auth/login')
  await page.waitForLoadState('networkidle')
  await expect(page).toHaveScreenshot('login-page.png')
})
```

## Test Environment Setup

### Database Configuration
- **Development**: PostgreSQL + Redis
- **Testing**: In-memory SQLite (unit tests) + Test PostgreSQL (E2E)
- **CI/CD**: Docker containers with test databases

### Environment Variables
```bash
# Test environment
NODE_ENV=test
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=moneywise_test
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=test-access-secret
JWT_REFRESH_SECRET=test-refresh-secret
```

## CI/CD Integration

### GitHub Actions
Tests run automatically on:
- Pull requests
- Pushes to `develop` and `main` branches
- Manual workflow dispatch

### Test Pipeline
1. **Setup**: Install dependencies, start services
2. **Lint**: ESLint + Prettier checks
3. **Type Check**: TypeScript compilation
4. **Unit Tests**: Frontend and backend unit tests
5. **Contract Tests**: API contract validation
6. **E2E Tests**: Playwright end-to-end tests
7. **Visual Tests**: Screenshot comparison (on staging)

## Best Practices

### 1. Test Organization
```
apps/
├── web/
│   ├── src/
│   │   └── **/*.test.{ts,tsx}     # Unit tests
│   ├── e2e/
│   │   ├── pages/                 # Page objects
│   │   ├── visual/                # Visual regression tests
│   │   └── **/*.spec.ts           # E2E test specs
│   └── __mocks__/                 # MSW handlers
└── backend/
    └── src/
        ├── **/*.test.ts           # Unit tests
        └── __tests__/
            └── contracts/         # Contract tests
```

### 2. Naming Conventions
- **Unit tests**: `*.test.{ts,tsx}`
- **E2E tests**: `*.spec.ts`
- **Page objects**: `*.page.ts`
- **Mocks**: `*.mock.ts`

### 3. Test Data Management
- Use factories for consistent test data
- Seed test database with predictable data
- Reset state between tests

### 4. Performance Guidelines
- Run unit tests in parallel
- Use MSW for fast API mocking
- Optimize E2E tests with page objects
- Use visual regression sparingly (expensive)

## Debugging Tests

### 1. Frontend Tests
```bash
# Debug mode
pnpm --filter @money-wise/web test:ui

# Verbose output
pnpm --filter @money-wise/web test -- --reporter=verbose
```

### 2. E2E Tests
```bash
# Debug mode with browser
pnpm --filter @money-wise/web test:e2e:ui

# Headed mode
npx playwright test --headed

# Debug specific test
npx playwright test --debug login.spec.ts
```

### 3. Visual Tests
```bash
# Show diff on failure
npx playwright show-report

# Update specific screenshot
npx playwright test --update-snapshots login-page-visual
```

## Coverage Requirements

### Minimum Coverage Targets
- **Unit Tests**: 80% line coverage
- **Integration Tests**: 70% feature coverage
- **E2E Tests**: 100% critical user journeys
- **Contract Tests**: 100% API endpoints

### Coverage Reports
```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/index.html
```

## Troubleshooting

### Common Issues

1. **Database Connection Failures**
   - Ensure test database is running
   - Check environment variables
   - Verify database permissions

2. **Playwright Timeouts**
   - Increase timeout values
   - Check network conditions
   - Verify selectors exist

3. **MSW Handler Conflicts**
   - Reset handlers between tests
   - Check handler order
   - Verify request matching

4. **Visual Test Failures**
   - Update baseline screenshots
   - Check for animations
   - Verify viewport consistency

### Getting Help
- Check test logs for specific errors
- Use debug mode for step-by-step execution
- Review CI/CD pipeline outputs
- Consult team documentation

## Contributing to Tests

### Adding New Tests
1. Follow existing patterns and conventions
2. Use appropriate test type for functionality
3. Include both positive and negative test cases
4. Update documentation if adding new patterns

### Test Review Checklist
- [ ] Tests cover new functionality
- [ ] Tests follow naming conventions
- [ ] Tests are deterministic and reliable
- [ ] Test data is properly managed
- [ ] Documentation is updated

---

**Last Updated**: September 29, 2025
**Version**: 1.0.0
**Maintainers**: MoneyWise Development Team