# Testing Standards and Best Practices

## Overview

This document outlines the testing standards, methodologies, and best practices implemented in the MoneyWise web application. Our testing strategy follows TDD (Test-Driven Development), KISS (Keep It Simple, Stupid), and SRP (Single Responsibility Principle) principles.

## Testing Philosophy

### Core Principles

1. **Test-Driven Development (TDD)**
   - Write tests before implementation (Red-Green-Refactor cycle)
   - Tests serve as living documentation
   - Drives better design and architecture

2. **KISS Principle**
   - Simple, focused tests that are easy to understand
   - Avoid complex test scenarios that test multiple things
   - Clear test names that describe the expected behavior

3. **Single Responsibility Principle (SRP)**
   - Each test should verify one specific behavior
   - Each test file should focus on one component or feature
   - Separate concerns across different test types

## Testing Pyramid

Our testing strategy follows the testing pyramid with the following distribution:

- **70% Unit Tests**: Fast, isolated tests for individual components
- **20% Integration Tests**: Tests for component interactions and data flow
- **10% E2E Tests**: Full user journey tests through the browser

## Test Types and Structure

### 1. Unit Tests (`tests/unit/`)

**Purpose**: Test individual components in isolation

**Framework**: Jest + React Testing Library

**Structure**:
```
tests/unit/
├── ComponentName.test.tsx
└── utils/
    └── render-helpers.tsx
```

**Best Practices**:
- Test component behavior, not implementation details
- Use descriptive test names following the pattern: "should [expected behavior] when [condition]"
- Mock external dependencies
- Focus on user interactions and expected outputs

**Example Test Structure**:
```typescript
describe('ComponentName', () => {
  describe('Feature Group', () => {
    it('should render correctly with default props', () => {
      // Arrange, Act, Assert
    })

    it('should handle user interaction when clicked', () => {
      // Arrange, Act, Assert
    })
  })
})
```

### 2. Integration Tests (`tests/integration/`)

**Purpose**: Test component interactions and data flow

**Framework**: Jest + React Testing Library

**Structure**:
```
tests/integration/
├── FeatureFlow.test.tsx
├── utils/
│   └── render-helpers.tsx
└── __mocks__/
    └── AuthContext.tsx
```

**Best Practices**:
- Test realistic user scenarios
- Use mock providers for external dependencies
- Verify state management between components
- Test error handling and edge cases

### 3. End-to-End Tests (`tests/e2e/`)

**Purpose**: Test complete user journeys through the browser

**Framework**: Playwright

**Structure**:
```
tests/e2e/
├── authentication.spec.ts
├── accessibility.spec.ts
└── visual-regression.spec.ts
```

**Configuration**: `playwright.config.ts`

**Best Practices**:
- Test critical user paths
- Use page object pattern for complex flows
- Include accessibility testing with @axe-core/playwright
- Implement visual regression testing for UI consistency

## Test Organization

### File Naming Conventions

- Unit tests: `ComponentName.test.tsx`
- Integration tests: `FeatureName.test.tsx`
- E2E tests: `feature-name.spec.ts`

### Test Structure (AAA Pattern)

```typescript
it('should do something when condition is met', () => {
  // Arrange: Set up test data and conditions
  const mockFn = jest.fn()
  const props = { onAction: mockFn }

  // Act: Perform the action being tested
  render(<Component {...props} />)
  fireEvent.click(screen.getByRole('button'))

  // Assert: Verify the expected outcome
  expect(mockFn).toHaveBeenCalledTimes(1)
})
```

## Testing Utilities

### Custom Render Helper

Location: `tests/utils/render-helpers.tsx`

Provides configured render function with necessary providers:
- Authentication context
- Theme providers
- Router context (when needed)

### Mock Providers

Location: `tests/integration/__mocks__/`

- `AuthContext.tsx`: Mock authentication provider for testing different auth states

## Accessibility Testing

### Requirements

- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- Color contrast validation
- Focus management

### Tools

- `@axe-core/playwright`: Automated accessibility testing
- Manual testing with keyboard navigation
- Screen reader testing (recommended)

### Test Coverage

- Automated accessibility scans on all pages
- Keyboard navigation tests
- Focus management during loading states
- Color contrast verification
- Screen reader compatibility

## Visual Regression Testing

### Purpose
Catch unintended visual changes and ensure UI consistency

### Implementation
- Playwright screenshots for visual comparisons
- Multiple viewport sizes (mobile, tablet, desktop)
- Dark mode support
- Loading states and interactions

### Best Practices
- Stabilize animations before screenshots
- Test across different viewport sizes
- Include both light and dark themes
- Test interactive states (hover, focus, active)

## CI/CD Integration

### Test Execution
```bash
# Unit and Integration Tests
npm run test

# Unit Tests Only
npm run test:unit

# Integration Tests Only
npm run test:integration

# E2E Tests
npm run test:e2e

# Accessibility Tests
npm run test:accessibility

# All Tests with Coverage
npm run test:coverage
```

### Performance Targets
- Unit tests: < 10 seconds total
- Integration tests: < 30 seconds total
- E2E tests: < 2 minutes total

## Code Coverage

### Targets
- Overall coverage: > 80%
- Critical components: > 90%
- New features: 100% (TDD requirement)

### Exclusions
- Configuration files
- Mock files
- Type definitions

## Best Practices

### Do's ✅

1. **Write tests first** (TDD approach)
2. **Test behavior, not implementation**
3. **Use descriptive test names**
4. **Keep tests simple and focused**
5. **Mock external dependencies**
6. **Test edge cases and error conditions**
7. **Maintain test independence**
8. **Use proper cleanup in tests**
9. **Follow accessibility guidelines**
10. **Regular test maintenance**

### Don'ts ❌

1. **Don't test implementation details**
2. **Don't write flaky tests**
3. **Don't ignore test failures**
4. **Don't test third-party libraries**
5. **Don't create interdependent tests**
6. **Don't use production data in tests**
7. **Don't skip accessibility testing**
8. **Don't forget to test error states**
9. **Don't write overly complex test setups**
10. **Don't ignore test performance**

## Debugging Tests

### Common Issues and Solutions

1. **Test Timeouts**
   - Increase timeout for async operations
   - Use `waitFor` for dynamic content
   - Check for infinite loops or hanging promises

2. **Element Not Found**
   - Verify element is rendered
   - Check for async rendering
   - Use appropriate queries (getBy, findBy, queryBy)

3. **Mock Issues**
   - Ensure mocks are properly reset between tests
   - Verify mock implementations match expected interface
   - Check mock call counts and arguments

### Debugging Tools
- Jest debug mode: `npm run test -- --detectOpenHandles`
- React Testing Library debug: `screen.debug()`
- Playwright debug: `npx playwright test --debug`

## Maintenance

### Regular Tasks
- Review and update test coverage reports
- Refactor tests when components change
- Update snapshots when UI changes are intentional
- Performance monitoring of test suite
- Accessibility audit updates

### When to Update Tests
- Component API changes
- New features added
- Bug fixes implemented
- UI design updates
- Accessibility requirements changes

## Resources

### Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Axe Accessibility Testing](https://github.com/dequelabs/axe-core)

### Internal Resources
- Component documentation in Storybook (when available)
- API documentation
- Design system guidelines
- Accessibility checklist

---

*This document is maintained by the development team and should be updated as testing practices evolve.*