# MoneyWise Testing Standards & Best Practices

> **Maintained by**: Senior Tester Architect
> **Version**: 2.0.0
> **Last Updated**: 2025-01-19

## 🎯 Testing Philosophy

Our testing strategy follows the **Testing Pyramid** principle with a focus on **Test-Driven Development (TDD)**, **Behavior-Driven Development (BDD)**, and **Shift-Left Testing** to ensure quality is built into every line of code.

### Core Principles

1. **Test Early, Test Often**: Catch bugs before they reach production
2. **Fast Feedback**: Tests should provide immediate feedback to developers
3. **Maintainable Tests**: Tests should be as clean and maintainable as production code
4. **Realistic Testing**: Tests should simulate real-world usage patterns
5. **Comprehensive Coverage**: Test all critical paths and edge cases

## 📊 Testing Pyramid

```
        /\     E2E Tests (10%)
       /  \    - Complete user journeys
      /____\   - Critical business flows
     /      \
    /        \  Integration Tests (20%)
   /          \ - API interactions
  /____________\ - Component integration
 /              \
/________________\ Unit Tests (70%)
                   - Component logic
                   - Business functions
                   - Pure functions
```

### Distribution Guidelines

| Test Type | Coverage | Purpose | Speed | Maintenance |
|-----------|----------|---------|-------|-------------|
| Unit | 70% | Component isolation | Fast | Low |
| Integration | 20% | Component interaction | Medium | Medium |
| E2E | 10% | User workflows | Slow | High |

## 🧪 Unit Testing Standards

### Frontend Unit Tests (Jest + React Testing Library)

**File Structure**:
```
tests/
├── unit/
│   ├── components/
│   │   ├── LoginForm.test.tsx
│   │   ├── Dashboard.test.tsx
│   │   └── TransactionList.test.tsx
│   ├── hooks/
│   │   ├── useAuthentication.test.ts
│   │   └── useTransactions.test.ts
│   ├── utils/
│   │   ├── formatCurrency.test.ts
│   │   └── validation.test.ts
│   └── services/
│       ├── api.test.ts
│       └── storage.test.ts
```

**Naming Conventions**:
- Test files: `ComponentName.test.tsx` or `functionName.test.ts`
- Test suites: `describe('ComponentName', () => { ... })`
- Test cases: `it('should do something when condition', () => { ... })`

**Best Practices**:

```typescript
// ✅ Good: Descriptive test names
describe('LoginForm', () => {
  it('should disable submit button when email is invalid', () => {
    // Test implementation
  })

  it('should show loading state during authentication', () => {
    // Test implementation
  })

  it('should clear form after successful login', () => {
    // Test implementation
  })
})

// ✅ Good: AAA Pattern (Arrange, Act, Assert)
it('should calculate total with tax correctly', () => {
  // Arrange
  const subtotal = 100
  const taxRate = 0.08

  // Act
  const result = calculateTotal(subtotal, taxRate)

  // Assert
  expect(result).toBe(108)
})

// ❌ Bad: Testing implementation details
it('should call setState with user data', () => {
  // Don't test internal implementation
})

// ✅ Good: Testing behavior
it('should display user name after login', () => {
  // Test what users see/experience
})
```

### Backend Unit Tests (Jest + NestJS Testing)

**File Structure**:
```
tests/
├── unit/
│   ├── controllers/
│   │   ├── auth.controller.spec.ts
│   │   └── transactions.controller.spec.ts
│   ├── services/
│   │   ├── auth.service.spec.ts
│   │   └── transactions.service.spec.ts
│   ├── guards/
│   │   └── jwt.guard.spec.ts
│   └── utils/
│       ├── encryption.spec.ts
│       └── validation.spec.ts
```

**Testing Patterns**:

```typescript
// ✅ Good: Service testing with mocked dependencies
describe('TransactionService', () => {
  let service: TransactionService
  let mockRepository: jest.Mocked<Repository<Transaction>>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: createMockRepository()
        }
      ]
    }).compile()

    service = module.get<TransactionService>(TransactionService)
    mockRepository = module.get(getRepositoryToken(Transaction))
  })

  it('should create transaction with valid data', async () => {
    // Arrange
    const transactionData = createValidTransactionData()
    mockRepository.save.mockResolvedValue(transactionData)

    // Act
    const result = await service.createTransaction(transactionData)

    // Assert
    expect(result).toEqual(transactionData)
    expect(mockRepository.save).toHaveBeenCalledWith(transactionData)
  })
})
```

## 🔗 Integration Testing Standards

### Frontend Integration Tests

**Purpose**: Test component interactions, form workflows, and API integration

```typescript
// ✅ Good: Testing complete user workflows
describe('Authentication Flow', () => {
  it('should complete login workflow successfully', async () => {
    // Mock API responses
    server.use(
      rest.post('/api/auth/login', (req, res, ctx) => {
        return res(ctx.json({ token: 'mock-token', user: mockUser }))
      })
    )

    render(<App />)

    // Navigate to login
    await userEvent.click(screen.getByRole('link', { name: /login/i }))

    // Fill login form
    await userEvent.type(screen.getByLabelText(/email/i), 'user@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'password123')

    // Submit form
    await userEvent.click(screen.getByRole('button', { name: /login/i }))

    // Verify navigation to dashboard
    await waitFor(() => {
      expect(screen.getByText(/welcome back/i)).toBeInTheDocument()
    })
  })
})
```

### Backend Integration Tests

**Purpose**: Test API endpoints, database interactions, and service integration

```typescript
// ✅ Good: E2E API testing
describe('Authentication API (e2e)', () => {
  let app: INestApplication
  let authService: AuthService

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(DatabaseService)
      .useValue(mockDatabaseService)
      .compile()

    app = moduleFixture.createNestApplication()
    authService = moduleFixture.get<AuthService>(AuthService)
    await app.init()
  })

  it('/auth/login (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(200)
      .expect((res) => {
        expect(res.body.token).toBeDefined()
        expect(res.body.user.email).toBe('test@example.com')
      })
  })
})
```

## 🎭 End-to-End Testing Standards

### Playwright E2E Tests

**Test Structure**:
```
tests/
├── e2e/
│   ├── authentication.spec.ts
│   ├── dashboard.spec.ts
│   ├── transactions.spec.ts
│   ├── accessibility.spec.ts
│   ├── performance.spec.ts
│   └── visual-regression.spec.ts
```

**Page Object Model**:

```typescript
// ✅ Good: Page Object Model for maintainability
export class LoginPage {
  constructor(private page: Page) {}

  async navigate() {
    await this.page.goto('/login')
  }

  async login(email: string, password: string) {
    await this.page.fill('[data-testid="email-input"]', email)
    await this.page.fill('[data-testid="password-input"]', password)
    await this.page.click('[data-testid="login-button"]')
  }

  async expectLoginError(message: string) {
    await expect(this.page.locator('[data-testid="error-message"]')).toContainText(message)
  }
}

// Usage in tests
test('should show error for invalid credentials', async ({ page }) => {
  const loginPage = new LoginPage(page)

  await loginPage.navigate()
  await loginPage.login('invalid@email.com', 'wrongpassword')
  await loginPage.expectLoginError('Invalid credentials')
})
```

**Test Data Management**:

```typescript
// ✅ Good: Test data factories
export const createTestUser = (overrides: Partial<User> = {}): User => ({
  id: uuid(),
  email: 'test@example.com',
  name: 'Test User',
  role: 'user',
  createdAt: new Date(),
  ...overrides
})

export const createTestTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: uuid(),
  amount: 100,
  description: 'Test Transaction',
  category: 'Food',
  date: new Date(),
  ...overrides
})
```

## ♿ Accessibility Testing Standards

### Automated Accessibility Testing

```typescript
// ✅ Comprehensive accessibility testing
import { injectAxe, checkA11y } from 'axe-playwright'

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await injectAxe(page)
  })

  test('should pass WCAG 2.1 AA compliance', async ({ page }) => {
    await page.goto('/')

    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
    })
  })

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/')

    // Test tab navigation
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(['INPUT', 'BUTTON', 'A'].includes(focused || '')).toBe(true)
  })
})
```

### Manual Accessibility Checklist

- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are clearly visible
- [ ] Color contrast meets WCAG AA standards (4.5:1)
- [ ] All images have descriptive alt text
- [ ] Form inputs have associated labels
- [ ] Error messages are clearly announced
- [ ] Page structure uses semantic HTML
- [ ] Content is readable at 200% zoom

## ⚡ Performance Testing Standards

### Core Web Vitals Testing

```typescript
test('should meet Core Web Vitals thresholds', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0]
        const paint = performance.getEntriesByType('paint')

        resolve({
          fcp: paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
          lcp: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime || 0,
          totalTime: navigation.loadEventEnd - navigation.navigationStart
        })
      }, 3000)
    })
  })

  // Assert performance budgets
  expect(metrics.fcp).toBeLessThan(2000) // First Contentful Paint < 2s
  expect(metrics.lcp).toBeLessThan(2500) // Largest Contentful Paint < 2.5s
  expect(metrics.totalTime).toBeLessThan(3000) // Total load time < 3s
})
```

### Performance Budget

```json
{
  "budget": {
    "timings": {
      "firstContentfulPaint": 2000,
      "largestContentfulPaint": 2500,
      "firstInputDelay": 100,
      "cumulativeLayoutShift": 0.1
    },
    "resourceSize": {
      "total": 2048000,
      "javascript": 512000,
      "css": 102400,
      "images": 1024000
    }
  }
}
```

## 🔍 Test Data Management

### Test Fixtures

```typescript
// ✅ Good: Centralized test fixtures
export const fixtures = {
  users: {
    validUser: {
      email: 'user@example.com',
      password: 'Password123!',
      name: 'John Doe'
    },
    adminUser: {
      email: 'admin@example.com',
      password: 'AdminPass123!',
      name: 'Admin User',
      role: 'admin'
    }
  },
  transactions: {
    income: {
      amount: 1000,
      type: 'income',
      category: 'Salary',
      description: 'Monthly salary'
    },
    expense: {
      amount: -50,
      type: 'expense',
      category: 'Food',
      description: 'Lunch'
    }
  }
}
```

### Database Seeding

```typescript
// ✅ Good: Consistent test data setup
export class TestDataSeeder {
  static async seedTestData() {
    // Clear existing data
    await this.clearTestData()

    // Seed users
    const users = await this.seedUsers()

    // Seed transactions
    await this.seedTransactions(users)

    return { users }
  }

  static async clearTestData() {
    await TransactionRepository.delete({})
    await UserRepository.delete({})
  }
}
```

## 📊 Coverage Requirements

### Minimum Coverage Thresholds

```json
{
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 80,
      "lines": 80,
      "statements": 80
    },
    "src/components/": {
      "branches": 85,
      "functions": 85,
      "lines": 85,
      "statements": 85
    },
    "src/services/": {
      "branches": 90,
      "functions": 90,
      "lines": 90,
      "statements": 90
    }
  }
}
```

### Coverage Reporting

- **Unit Tests**: 80% minimum coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: User journeys documented and tested
- **Accessibility**: 100% WCAG 2.1 AA compliance
- **Performance**: All pages meet Core Web Vitals

## 🛠️ Testing Tools & Configuration

### Required Dependencies

```json
{
  "devDependencies": {
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^14.4.3",
    "@playwright/test": "^1.40.0",
    "@axe-core/playwright": "^4.8.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0",
    "msw": "^2.0.0"
  }
}
```

### Configuration Files

| File | Purpose |
|------|---------|
| `jest.config.js` | Jest configuration |
| `playwright.config.ts` | Playwright configuration |
| `tests/setup.ts` | Global test setup |
| `tests/__mocks__/` | Mock implementations |

## 🚨 Testing Anti-Patterns

### ❌ What NOT to Do

```typescript
// ❌ Bad: Testing implementation details
expect(component.setState).toHaveBeenCalled()

// ✅ Good: Testing behavior
expect(screen.getByText('Success!')).toBeInTheDocument()

// ❌ Bad: Brittle selectors
page.click('.css-1a2b3c4')

// ✅ Good: Semantic selectors
page.click('[data-testid="submit-button"]')

// ❌ Bad: Hard-coded waits
await page.waitForTimeout(5000)

// ✅ Good: Wait for specific conditions
await page.waitForSelector('[data-testid="result"]')

// ❌ Bad: Testing multiple things in one test
it('should handle user registration and login and dashboard', () => {
  // Too much in one test
})

// ✅ Good: Single responsibility
it('should register new user successfully', () => {
  // One clear purpose
})
```

## 📋 Testing Checklist

### Pre-Commit Checklist

- [ ] All unit tests pass
- [ ] Coverage thresholds met
- [ ] No lint errors
- [ ] TypeScript compilation successful
- [ ] Accessibility tests pass

### Pre-Deployment Checklist

- [ ] All test suites pass
- [ ] E2E tests on staging environment pass
- [ ] Performance budgets met
- [ ] Security scans clean
- [ ] Accessibility compliance verified

### Post-Deployment Checklist

- [ ] Smoke tests pass in production
- [ ] Monitoring alerts configured
- [ ] Error tracking active
- [ ] Performance metrics collected

## 📚 Resources & Training

### Internal Documentation

- [CI/CD Architecture](./CI_CD_ARCHITECTURE.md)
- [Performance Testing Guide](./PERFORMANCE_TESTING.md)
- [Accessibility Testing Guide](./ACCESSIBILITY_TESTING.md)

### External Resources

- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
- [Playwright Documentation](https://playwright.dev/)
- [Jest Documentation](https://jestjs.io/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Training Requirements

All team members must complete:
- [ ] Testing fundamentals workshop
- [ ] TDD/BDD methodology training
- [ ] Accessibility testing certification
- [ ] Performance testing basics

---

**Maintained by**: Senior Tester Architect & CI/CD Engineer
**Review Cycle**: Quarterly
**Next Review**: April 2025