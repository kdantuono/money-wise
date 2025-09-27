# MCP Playwright Testing Workflow

## Overview
This workflow demonstrates how to use MCP Playwright tools for E2E testing in MoneyWise development, providing an alternative to traditional Playwright setup.

## When to Use This Workflow

### ✅ Use MCP Playwright for:
- **Quick validation tests** during development
- **Visual regression testing** with screenshots
- **CI/CD environments** without complex setup
- **Form testing** with multiple fields
- **Mobile responsiveness** testing
- **Component isolation** testing

### ⚠️ Use Traditional Playwright for:
- **Complex debugging** requiring step-through
- **Performance profiling** with detailed metrics
- **Advanced network interception**
- **Custom browser configurations**

## Basic Testing Workflow

### 1. Setup Phase
```bash
# Ensure dev server is running
pnpm dev

# Or start specific services
docker compose -f docker-compose.dev.yml up -d
```

### 2. Navigation Testing
```typescript
// Navigate to homepage
mcp__playwright__browser_navigate({ url: 'http://localhost:3000' })

// Take snapshot for structure validation
mcp__playwright__browser_snapshot()

// Capture screenshot for visual validation
mcp__playwright__browser_take_screenshot({
  filename: 'homepage-validation.png',
  fullPage: true
})
```

### 3. Responsive Design Testing
```typescript
// Test desktop view
mcp__playwright__browser_resize({ width: 1920, height: 1080 })
mcp__playwright__browser_take_screenshot({ filename: 'desktop-view.png' })

// Test tablet view
mcp__playwright__browser_resize({ width: 768, height: 1024 })
mcp__playwright__browser_take_screenshot({ filename: 'tablet-view.png' })

// Test mobile view
mcp__playwright__browser_resize({ width: 375, height: 667 })
mcp__playwright__browser_take_screenshot({ filename: 'mobile-view.png' })
```

### 4. Form Testing Workflow
```typescript
// Navigate to form page
mcp__playwright__browser_navigate({ url: 'http://localhost:3000/auth/register' })

// Fill registration form
mcp__playwright__browser_fill_form({
  fields: [
    { name: "firstName", type: "textbox", ref: "[data-testid='first-name']", value: "John" },
    { name: "lastName", type: "textbox", ref: "[data-testid='last-name']", value: "Doe" },
    { name: "email", type: "textbox", ref: "[data-testid='email']", value: "john.doe@example.com" },
    { name: "password", type: "textbox", ref: "[data-testid='password']", value: "SecurePass123!" },
    { name: "terms", type: "checkbox", ref: "[data-testid='terms-checkbox']", value: "true" }
  ]
})

// Submit form
mcp__playwright__browser_click({
  element: "registration submit button",
  ref: "[data-testid='submit-registration']"
})

// Validate success
mcp__playwright__browser_take_screenshot({ filename: 'registration-success.png' })
```

### 5. User Flow Testing
```typescript
// Complete login flow
mcp__playwright__browser_navigate({ url: 'http://localhost:3000/auth/login' })

mcp__playwright__browser_fill_form({
  fields: [
    { name: "email", type: "textbox", ref: "[data-testid='login-email']", value: "test@example.com" },
    { name: "password", type: "textbox", ref: "[data-testid='login-password']", value: "password123" }
  ]
})

mcp__playwright__browser_click({
  element: "login button",
  ref: "[data-testid='login-submit']"
})

// Wait for redirect
mcp__playwright__browser_wait_for({ time: 2 })

// Validate dashboard loads
mcp__playwright__browser_snapshot()
```

## Advanced Testing Patterns

### 1. Component Isolation Testing
```typescript
// Test specific component in isolation
mcp__playwright__browser_navigate({
  url: 'http://localhost:3000/components/button-demo'
})

// Test all button variants
const variants = ['default', 'primary', 'secondary', 'destructive'];
for (const variant of variants) {
  mcp__playwright__browser_click({
    element: `${variant} button demo`,
    ref: `[data-testid='button-${variant}']`
  })

  mcp__playwright__browser_take_screenshot({
    filename: `button-${variant}.png`,
    element: `${variant} button`,
    ref: `[data-testid='button-${variant}']`
  })
}
```

### 2. Error State Testing
```typescript
// Test form validation
mcp__playwright__browser_fill_form({
  fields: [
    { name: "email", type: "textbox", ref: "[data-testid='email']", value: "invalid-email" }
  ]
})

mcp__playwright__browser_click({
  element: "submit button",
  ref: "[data-testid='submit']"
})

// Capture error states
mcp__playwright__browser_take_screenshot({ filename: 'validation-errors.png' })

// Get console errors
mcp__playwright__browser_console_messages()
```

### 3. Performance Testing
```typescript
// Monitor network requests
mcp__playwright__browser_navigate({ url: 'http://localhost:3000/dashboard' })

// Let page fully load
mcp__playwright__browser_wait_for({ time: 3 })

// Check network activity
mcp__playwright__browser_network_requests()

// Check for JavaScript errors
mcp__playwright__browser_console_messages()
```

## Integration with Development Workflow

### 1. Feature Development Cycle
```bash
# 1. Develop new feature
git checkout -b feature/new-component

# 2. Test with MCP Playwright
# Use MCP tools to validate component

# 3. Create traditional E2E tests if needed
pnpm test:e2e:basic

# 4. Commit and push
git add . && git commit -m "feat: add new component with E2E tests"
```

### 2. Bug Fix Validation
```bash
# 1. Reproduce bug with MCP Playwright
# Navigate to problematic area and capture evidence

# 2. Fix the issue
# Make code changes

# 3. Validate fix
# Re-run MCP Playwright tests to confirm resolution

# 4. Document fix
# Include screenshots in PR/issue comments
```

### 3. Pre-Release Testing
```typescript
// Comprehensive smoke test before release
const criticalPaths = [
  'http://localhost:3000',
  'http://localhost:3000/auth/login',
  'http://localhost:3000/dashboard',
  'http://localhost:3000/transactions'
];

for (const path of criticalPaths) {
  mcp__playwright__browser_navigate({ url: path })
  mcp__playwright__browser_take_screenshot({
    filename: `pre-release-${path.split('/').pop() || 'home'}.png`
  })
}
```

## Best Practices

### 1. Naming Conventions
- **Screenshots**: `{page}-{action}-{timestamp}.png`
- **Test Files**: `{component}-mcp-test.md`
- **Documentation**: Include MCP commands in issue descriptions

### 2. Error Handling
```typescript
// Always check for errors after navigation
mcp__playwright__browser_console_messages()

// Take screenshots on unexpected states
mcp__playwright__browser_take_screenshot({ filename: 'error-state.png' })
```

### 3. Performance
- Use `browser_resize` to test multiple viewports efficiently
- Use `browser_snapshot` for quick structure validation
- Use `browser_take_screenshot` for visual validation

### 4. Documentation
- Include MCP Playwright commands in PR descriptions
- Document test scenarios in markdown files
- Share screenshots in team communication

## Troubleshooting

### Common Issues
1. **Page not loading**: Check dev server status
2. **Elements not found**: Verify data-testid attributes exist
3. **Screenshots empty**: Ensure page has loaded completely

### Debug Commands
```typescript
// Get current page content
mcp__playwright__browser_get_visible_text()

// Check element structure
mcp__playwright__browser_snapshot()

// Monitor console for errors
mcp__playwright__browser_console_messages()
```

---

*This workflow should be used alongside traditional Playwright tests for comprehensive E2E coverage.*