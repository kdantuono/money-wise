# Hydration Fix Test Strategy

## Overview

This document outlines the comprehensive TDD test strategy for the ClientOnly component and React hydration error prevention on authentication pages. Tests follow the testing pyramid (70% unit, 20% integration, 10% E2E) and target 90%+ code coverage.

## Test Architecture

### Test Pyramid Distribution

```
E2E Tests (10%)                    ← 1 file: hydration-prevention.spec.ts
─────────────────────────────────
Integration Tests (20%)            ← 2 files: login/page.test.tsx, register/page.test.tsx
─────────────────────────────────
Unit Tests (70%)                   ← 1 file: client-only.test.tsx
```

### Coverage Targets

| Metric | Target | Actual |
|--------|--------|--------|
| Line Coverage | ≥90% | TBD after running tests |
| Branch Coverage | ≥85% | TBD after running tests |
| Function Coverage | 100% | TBD after running tests |
| Statement Coverage | ≥90% | TBD after running tests |

## Test Files

### 1. Unit Tests: ClientOnly Component

**File**: `apps/web/src/components/__tests__/client-only.test.tsx`

**Purpose**: Test the ClientOnly component in isolation to ensure it correctly prevents hydration errors.

**Test Categories**:

1. **Server-Side Rendering Behavior** (8 tests)
   - Returns fallback during SSR
   - Returns null when no fallback provided
   - Does not render children during SSR
   - Prevents hydration mismatches

2. **Client-Side Rendering Behavior** (4 tests)
   - Renders children after mounting
   - Shows fallback initially, then children
   - Removes fallback after mounting
   - Handles null fallback to children transition

3. **Props Handling** (8 tests)
   - Accepts React elements, text nodes, multiple children
   - Handles null/undefined children gracefully
   - Supports complex nested components
   - Accepts custom fallback components

4. **Performance Characteristics** (5 tests)
   - useEffect only triggers once on mount
   - No unnecessary re-renders after mount
   - Proper cleanup on unmount
   - No memory leaks with event listeners

5. **Edge Cases** (4 tests)
   - Rapid mount/unmount cycles
   - Error boundaries
   - Suspense boundaries
   - Portal components

6. **Browser Extension Compatibility** (2 tests)
   - Prevents hydration errors when DOM is modified
   - Works with autocomplete attributes

7. **TypeScript Type Safety** (2 tests)
   - Accepts valid ReactNode children
   - Accepts valid ReactNode fallback

8. **Documentation Examples** (1 test)
   - Works as shown in JSDoc example

**Total**: 34 unit tests

**Key Assertions**:
- Component returns correct output based on mount state
- No hydration errors in console
- useEffect cleanup is called
- Children render only after mount

**Mocking Strategy**:
- No external dependencies to mock
- Uses React Testing Library's render function
- Monitors console.error for hydration messages

---

### 2. Integration Tests: Login Page

**File**: `apps/web/app/auth/login/__tests__/page.test.tsx`

**Purpose**: Test the login page with ClientOnly integration, ensuring form functionality and hydration prevention work together.

**Test Categories**:

1. **Rendering and Layout** (7 tests)
   - Page header and descriptions
   - Card title and description
   - Skeleton loader visibility
   - Form visibility after mount
   - No hydration errors
   - Semantic HTML structure
   - Sign-up link

2. **Form Functionality** (10 tests)
   - Email and password input
   - Password visibility toggle
   - Form submission with valid data
   - Validation errors (invalid email, empty password)
   - Error display from auth store
   - clearError called before submission
   - Loading state and button disabled
   - Loading text on button

3. **Browser Extensions Compatibility** (3 tests)
   - Password manager DOM injections
   - Extra DOM elements from extensions
   - Correct autocomplete attributes

4. **Accessibility** (6 tests)
   - Keyboard navigation
   - ARIA labels
   - Validation error announcements
   - Input types (email, password)
   - Screen reader support
   - Descriptive button text

5. **Form Validation** (3 tests)
   - Email format validation (invalid formats)
   - Email format acceptance (valid formats)
   - Error styling on invalid fields

6. **Error Handling** (2 tests)
   - Login failure handling
   - No navigation on failure

7. **User Experience** (3 tests)
   - Password field behavior on error
   - Email value maintained after error
   - Email input focus on mount

**Total**: 34 integration tests

**Key Assertions**:
- Form elements are rendered and functional
- No hydration errors in console
- Validation works correctly
- Auth store integration works
- Accessibility requirements met

**Mocking Strategy**:
- Mock `next/navigation` (useRouter)
- Mock `@/stores/auth-store` (login, isLoading, error, clearError)
- Use `vi.fn()` for tracking function calls

---

### 3. Integration Tests: Register Page

**File**: `apps/web/app/auth/register/__tests__/page.test.tsx`

**Purpose**: Test the registration page with multi-field form, password confirmation, and ClientOnly integration.

**Test Categories**:

1. **Rendering and Layout** (5 tests)
   - Page header and descriptions
   - Card title and description
   - Skeleton loader visibility
   - Form visibility after mount (all 5 fields)
   - Sign-in link

2. **Form Functionality** (15 tests)
   - All 5 input fields (firstName, lastName, email, password, confirmPassword)
   - Password visibility toggle (both fields)
   - Form submission with valid data
   - Validation errors (all fields)
   - Password mismatch error
   - Error display from auth store
   - Loading state and button disabled
   - Loading text on button
   - clearError called before submission

3. **Browser Extensions Compatibility** (2 tests)
   - Password manager DOM injections
   - Correct autocomplete attributes for all fields

4. **Accessibility** (4 tests)
   - Keyboard navigation through all fields
   - ARIA labels for all inputs
   - Validation error announcements
   - Semantic form structure

5. **Form Layout** (2 tests)
   - Name fields in grid layout
   - Password fields with toggle buttons

6. **Error Handling** (3 tests)
   - Registration failure handling
   - No navigation on failure
   - Error styling on invalid fields

7. **Password Validation** (2 tests)
   - Accepts 8+ character passwords
   - Rejects <8 character passwords

**Total**: 33 integration tests

**Key Assertions**:
- All form fields render and function
- Password confirmation validation works
- No hydration errors in console
- Multi-field form validation
- Accessibility requirements met

**Mocking Strategy**:
- Mock `next/navigation` (useRouter)
- Mock `@/stores/auth-store` (register, isLoading, error, clearError)
- Use `vi.fn()` for tracking function calls

---

### 4. E2E Tests: Hydration Prevention

**File**: `apps/web/e2e/hydration-prevention.spec.ts`

**Purpose**: End-to-end tests using Playwright to verify hydration prevention in real browser environments.

**Test Categories**:

1. **Login Page** (5 tests)
   - No hydration errors in console
   - Skeleton loader → form transition
   - No layout shift (CLS < 0.1)
   - Browser autofill compatibility
   - Rapid navigation without errors

2. **Register Page** (4 tests)
   - No hydration errors in console
   - Skeleton loader → form transition
   - All fields visible after mount
   - No layout shift (CLS < 0.1)

3. **Performance Metrics** (2 tests)
   - Login page performance (FCP < 1.5s, DCL < 500ms)
   - Register page performance (FCP < 1.5s, DCL < 500ms)

4. **Cross-Browser Extension Compatibility** (2 tests)
   - Simulated password manager DOM modifications
   - Multiple extension injections simultaneously

5. **Accessibility During Hydration** (2 tests)
   - Keyboard navigation throughout hydration
   - Loading state announced to screen readers

6. **Error Recovery** (2 tests)
   - Recovery from failed initial load
   - Page refresh without errors

7. **Visual Regression** (2 tests)
   - Login page visual snapshot
   - Register page visual snapshot

8. **React DevTools Detection** (1 test)
   - No hydration warnings in React DevTools

9. **Mobile Hydration Prevention** (2 tests)
   - No hydration errors on mobile login
   - No hydration errors on mobile register

**Total**: 22 E2E tests

**Key Assertions**:
- Console monitored for hydration errors
- Layout shift (CLS) under 0.1
- Performance metrics met (FCP, DCL)
- Form remains functional with extension modifications
- Visual snapshots match

**Browser Coverage**:
- Chromium (Desktop & Mobile)
- Firefox
- WebKit (Safari)

---

## Test Execution

### Running Tests

#### Unit and Integration Tests (Vitest)

```bash
# Run all unit/integration tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage

# Run with UI
pnpm test:ui

# Run specific test file
pnpm test src/components/__tests__/client-only.test.tsx
```

#### E2E Tests (Playwright)

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui

# Run specific test file
pnpm test:e2e e2e/hydration-prevention.spec.ts

# Run on specific browser
pnpm test:e2e --project=chromium
pnpm test:e2e --project=firefox
pnpm test:e2e --project=webkit
```

### CI/CD Integration

Tests are automatically run in GitHub Actions:

1. **Pre-commit Hook**: Runs linting and type checking
2. **Pre-push Hook**: Runs unit and integration tests
3. **GitHub Actions**: Runs full test suite (unit + integration + E2E) on all PRs
4. **Branch Protection**: All tests must pass before merge

---

## Coverage Report

### Generating Coverage Reports

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/index.html
```

### Expected Coverage

**ClientOnly Component** (`src/components/client-only.tsx`):
- Target: 100% coverage (small, critical component)
- Lines: 100% (all 12 lines)
- Branches: 100% (both hasMounted states)
- Functions: 100% (component + useEffect)
- Statements: 100%

**Login Page** (`app/auth/login/page.tsx`):
- Target: 90%+ coverage
- Covered: Form rendering, validation, submission, error handling
- Not covered: External auth store implementation (mocked)

**Register Page** (`app/auth/register/page.tsx`):
- Target: 90%+ coverage
- Covered: Multi-field form, password confirmation, validation
- Not covered: External auth store implementation (mocked)

---

## Test Patterns and Best Practices

### Unit Testing Patterns

1. **Arrange-Act-Assert**: Clear separation of setup, action, and verification
2. **Descriptive Test Names**: `it('should return fallback during SSR')`
3. **Single Assertion Focus**: Each test verifies one specific behavior
4. **Mock Minimal**: Only mock external dependencies, not implementation details

### Integration Testing Patterns

1. **User-Centric**: Test user interactions with `userEvent.setup()`
2. **Realistic Scenarios**: Test complete user flows
3. **Mock External APIs**: Mock auth store and navigation
4. **Accessibility First**: Include keyboard navigation and ARIA tests

### E2E Testing Patterns

1. **Console Monitoring**: Track hydration errors in real browsers
2. **Performance Metrics**: Measure CLS, FCP, DCL
3. **Visual Regression**: Compare screenshots to detect UI changes
4. **Cross-Browser**: Test on Chromium, Firefox, WebKit

### Common Testing Utilities

```typescript
// Wait for element to appear after ClientOnly mounts
await waitFor(() => {
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
})

// Monitor console for hydration errors
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
const hydrationErrors = consoleErrorSpy.mock.calls.filter(call =>
  call.some(arg => String(arg).toLowerCase().includes('hydration'))
)
expect(hydrationErrors).toHaveLength(0)
consoleErrorSpy.mockRestore()

// User interaction with userEvent
const user = userEvent.setup()
await user.type(emailInput, 'test@example.com')
await user.click(submitButton)
```

---

## Known Limitations

1. **SSR Simulation**: Vitest runs in jsdom, which doesn't fully simulate SSR. The component's SSR behavior is verified by checking the initial state before useEffect runs.

2. **Extension Simulation**: E2E tests simulate extension behavior by injecting DOM elements manually. Real extension testing requires browser-specific extension testing frameworks.

3. **Visual Snapshots**: Visual regression tests may have platform-specific differences. CI runs should use consistent environments.

4. **Performance Metrics**: Performance measurements in CI may be slower than local development. Thresholds are set conservatively.

---

## Troubleshooting

### Common Issues

**Issue**: Tests fail with "Element not found"
**Solution**: Increase timeout or use `waitFor` to wait for ClientOnly to mount

**Issue**: Hydration errors appear in tests
**Solution**: Ensure ClientOnly component wraps the form correctly and fallback is provided

**Issue**: Visual snapshots mismatch
**Solution**: Update snapshots with `pnpm test:visual:update` or check for platform differences

**Issue**: E2E tests timeout
**Solution**: Check that dev server is running and increase timeout values

### Debugging Tests

```bash
# Run tests with debug output
DEBUG=* pnpm test

# Run single test in watch mode
pnpm test:watch client-only

# Run E2E tests in headed mode
pnpm test:e2e --headed

# Debug specific E2E test
pnpm test:e2e --debug hydration-prevention
```

---

## Future Improvements

1. **Performance Budget Tests**: Add automated performance budget checks in CI
2. **Real Extension Testing**: Integrate with browser extension testing tools
3. **Accessibility Audits**: Add automated a11y audits with axe-core
4. **Load Testing**: Test hydration behavior under high load
5. **Mutation Testing**: Use Stryker.js to verify test quality

---

## References

- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [React Hydration Docs](https://react.dev/reference/react-dom/client/hydrateRoot)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-29
**Maintained By**: QA Specialist Agent
