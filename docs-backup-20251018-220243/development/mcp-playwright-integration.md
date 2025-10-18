# MCP Playwright Integration Guide

## Overview

This guide documents how to use MCP (Model Context Protocol) Playwright servers for enhanced E2E testing in MoneyWise development. MCP Playwright provides browser automation capabilities without system dependencies.

## Why MCP Playwright?

### Traditional Playwright Issues
- **System Dependencies**: Requires browser binaries and system libraries
- **Environment Setup**: Complex installation across different platforms
- **Dependency Conflicts**: Version mismatches between Vite plugins
- **Resource Management**: Manual browser lifecycle management

### MCP Playwright Benefits
- **Zero Dependencies**: No browser installation required
- **Controlled Environment**: Consistent execution environment
- **Built-in Integration**: Pre-configured with Claude Code
- **Simplified Testing**: Direct browser automation tools

## Available MCP Playwright Tools

### Browser Management
- `mcp__playwright__browser_navigate` - Navigate to URLs
- `mcp__playwright__browser_close` - Close browser instances
- `mcp__playwright__browser_resize` - Resize browser viewport
- `mcp__playwright__browser_tabs` - Manage browser tabs

### Page Interaction
- `mcp__playwright__browser_click` - Click elements
- `mcp__playwright__browser_type` - Type text into inputs
- `mcp__playwright__browser_fill_form` - Fill multiple form fields
- `mcp__playwright__browser_select_option` - Select dropdown options
- `mcp__playwright__browser_hover` - Hover over elements
- `mcp__playwright__browser_drag` - Drag and drop operations

### Content Capture
- `mcp__playwright__browser_take_screenshot` - Capture screenshots
- `mcp__playwright__browser_snapshot` - Accessibility snapshots
- `mcp__playwright__browser_evaluate` - Execute JavaScript
- `mcp__executeautomation-playwright__playwright_get_visible_text` - Extract page text
- `mcp__executeautomation-playwright__playwright_get_visible_html` - Extract page HTML

### Validation & Debugging
- `mcp__playwright__browser_console_messages` - Access console logs
- `mcp__playwright__browser_network_requests` - Monitor network activity
- `mcp__playwright__browser_wait_for` - Wait for conditions
- `mcp__playwright__browser_handle_dialog` - Handle alerts/dialogs

## Integration Workflow

### 1. E2E Test Development

**Traditional Approach:**
```typescript
// Complex setup required
import { test, expect } from '@playwright/test';

test('homepage test', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('MoneyWise');
});
```

**MCP Approach:**
```typescript
// Direct tool usage in Claude Code
// 1. Navigate to page
mcp__playwright__browser_navigate({ url: 'http://localhost:3000' })

// 2. Take snapshot for analysis
mcp__playwright__browser_snapshot()

// 3. Interact with elements
mcp__playwright__browser_click({
  element: "signup button",
  ref: "[data-testid='cta-signup']"
})

// 4. Validate results
mcp__playwright__browser_take_screenshot({ filename: 'signup-flow.png' })
```

### 2. Form Testing Workflow

```typescript
// Fill complex forms efficiently
mcp__playwright__browser_fill_form({
  fields: [
    { name: "email", type: "textbox", ref: "[data-testid='email']", value: "test@example.com" },
    { name: "password", type: "textbox", ref: "[data-testid='password']", value: "password123" },
    { name: "terms", type: "checkbox", ref: "[data-testid='terms']", value: "true" }
  ]
})
```

### 3. Visual Testing Pipeline

```typescript
// Comprehensive visual validation
// 1. Desktop testing
mcp__playwright__browser_resize({ width: 1920, height: 1080 })
mcp__playwright__browser_take_screenshot({ filename: 'desktop-view.png' })

// 2. Mobile testing
mcp__playwright__browser_resize({ width: 375, height: 667 })
mcp__playwright__browser_take_screenshot({ filename: 'mobile-view.png' })
```

## Best Practices

### 1. Test Organization
```
tests/
├── mcp-e2e/
│   ├── user-flows/     # Complete user journeys
│   ├── components/     # Individual component tests
│   ├── visual/         # Visual regression tests
│   └── integration/    # API + UI integration tests
```

### 2. Page Object Pattern with MCP
```typescript
class LoginPageMCP {
  async navigate() {
    return mcp__playwright__browser_navigate({
      url: 'http://localhost:3000/login'
    });
  }

  async login(email: string, password: string) {
    return mcp__playwright__browser_fill_form({
      fields: [
        { name: "email", type: "textbox", ref: "[data-testid='email']", value: email },
        { name: "password", type: "textbox", ref: "[data-testid='password']", value: password }
      ]
    });
  }
}
```

### 3. Data-Driven Testing
```typescript
const testUsers = [
  { email: 'admin@example.com', role: 'admin' },
  { email: 'user@example.com', role: 'user' }
];

for (const user of testUsers) {
  // Test each user role with MCP tools
  await mcp__playwright__browser_fill_form({
    fields: [{ name: "email", type: "textbox", ref: "[data-testid='email']", value: user.email }]
  });
}
```

## Implementation Recommendations

### 1. Hybrid Approach
- **Traditional Playwright**: Development environment, detailed debugging
- **MCP Playwright**: CI/CD pipelines, quick validation, visual testing

### 2. Test Categories

#### Quick Smoke Tests (MCP)
```typescript
// Fast validation of core functionality
mcp__playwright__browser_navigate({ url: '/dashboard' })
mcp__playwright__browser_snapshot() // Validate page loads
```

#### Detailed Functional Tests (Traditional)
```typescript
// Complex user flows requiring debugging
test('complete checkout flow', async ({ page }) => {
  // Detailed step-by-step validation
});
```

### 3. CI/CD Integration

```yaml
# .github/workflows/e2e-tests.yml
- name: MCP E2E Tests
  run: |
    # Use MCP Playwright for fast CI validation
    claude-code test:e2e:mcp

- name: Full E2E Tests
  run: |
    # Traditional Playwright for comprehensive testing
    pnpm test:e2e
```

## Migration Strategy

### Phase 1: Parallel Implementation
- Keep existing traditional Playwright setup
- Add MCP Playwright for new test cases
- Compare coverage and reliability

### Phase 2: Strategic Adoption
- Use MCP for visual regression testing
- Use MCP for quick smoke tests
- Use traditional for complex debugging

### Phase 3: Optimization
- Consolidate based on team preferences
- Optimize for CI/CD performance
- Establish testing standards

## Future Enhancements

### 1. Test Generation
```typescript
// Auto-generate MCP test cases from user flows
mcp__executeautomation-playwright__start_codegen_session({
  options: {
    outputPath: '/home/nemesi/dev/money-wise/tests/mcp-e2e',
    testNamePrefix: 'MCPGenerated',
    includeComments: true
  }
})
```

### 2. Visual Diff Pipeline
```typescript
// Automated visual regression detection
mcp__playwright__browser_take_screenshot({ filename: 'baseline.png' })
// ... make changes ...
mcp__playwright__browser_take_screenshot({ filename: 'current.png' })
// Compare screenshots programmatically
```

### 3. Performance Monitoring
```typescript
// Monitor page performance with MCP
mcp__playwright__browser_network_requests() // Track API calls
mcp__playwright__browser_console_messages() // Monitor errors
```

## Getting Started

1. **Review Available Tools**: Check MCP Playwright tools list
2. **Start Small**: Begin with simple navigation and screenshot tests
3. **Build Patterns**: Develop reusable MCP test patterns
4. **Integrate Gradually**: Add MCP tests alongside existing Playwright tests
5. **Optimize**: Refine based on team feedback and CI performance

---

*This guide will be updated as MCP Playwright capabilities expand and team experience grows.*