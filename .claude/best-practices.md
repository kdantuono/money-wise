# MONEYWISE Claude Code Enhanced Best Practices & Auto-Update Guide

## 📍 **FILE DISCOVERY RULE**

**This file is read using the following fallback sequence**:
1. **First try global**: `~/.claude/best-practices.md`
2. **If not found, try project**: `{currentproject}/.claude/best-practices.md`
3. **Current location**: `/home/nemesi/dev/money-wise/.claude/best-practices.md`

**PURPOSE**: Prevents file-not-found errors during session startup and ensures best-practices are always accessible.

# 🚨 **STOP! READ THIS FIRST!** 🚨

## ⛔ MANDATORY Git Workflow - DO NOT SKIP

### CRITICAL: Before writing ANY code, you MUST:

1. **Create a feature branch**: `git checkout -b feature/[name]`
2. **Commit changes FREQUENTLY** (every file/component/logical unit)
3. **NEVER work on main branch directly** ⚠️

```bash
# ❌ If you complete a task without proper Git commits = TASK INCOMPLETE ❌
# ✅ Every change must be tracked with atomic commits
```

## 🔴 A. CRITICAL Git Workflow Requirements

### **IMPORTANT**: You MUST follow this Git workflow for ALL code changes:

#### 1. **ALWAYS create a feature branch BEFORE making changes**

```bash
# For new features
git checkout -b feature/[feature-name]  # e.g., feature/transaction-export

# For bug fixes
git checkout -b fix/[bug-name]  # e.g., fix/auth-token-refresh

# For chores/maintenance
git checkout -b chore/[task-name]  # e.g., chore/upgrade-dependencies
```

#### 2. **Commit changes REGULARLY during development**

Commit frequency requirements:

- ✅ After completing each React component
- ✅ After implementing each API endpoint
- ✅ When switching between frontend/backend
- ✅ Before running `pnpm build` or `pnpm test`
- ✅ After updating configuration files
- ✅ Every 30-45 minutes of active development

```bash
# Atomic commit examples for MoneyWise
git add src/components/TransactionForm.tsx
git commit -m "feat(ui): implement transaction form component with validation"

git add pages/api/transactions/export.ts
git commit -m "feat(api): add CSV export endpoint for transactions"

git add src/utils/currency.ts src/__tests__/currency.test.ts
git commit -m "test(utils): add currency conversion helpers with tests"
```

#### 3. **NEVER work directly on main branch**

```bash
# Verify you're NOT on main before any work
git branch --show-current  # Should NOT show "main"

# If accidentally on main, stash and switch immediately
git stash
git checkout -b feature/recovery-branch
git stash pop
```

#### 4. **Commit message format with semantic versioning**

```bash
# Format: <type>(<scope>): <subject> [optional body] [optional footer]

# Types for MoneyWise:
# feat     - New feature (transaction import, budget alerts)
# fix      - Bug fix (calculation errors, UI glitches)
# perf     - Performance improvement (query optimization, lazy loading)
# refactor - Code restructuring (component splitting, util extraction)
# test     - Test additions/modifications
# docs     - Documentation updates
# style    - Code formatting (no logic changes)
# chore    - Maintenance (deps update, build config)
# security - Security improvements

# Examples with Co-Authoring
git commit -m "feat(transactions): implement real-time balance updates

- Added WebSocket connection for live updates
- Integrated with Redux store for state management
- Added optimistic UI updates for better UX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

## 🔍 A-bis. MANDATORY Post-Commit CI/CD Monitoring

### **CRITICAL**: After EVERY commit/push on ANY branch you MUST:

#### 1. **Immediate GitHub Actions Verification**

```bash
# After every git push, IMMEDIATELY run:
echo "🔍 Verifying GitHub Actions status..."

# Check if current branch has running/recent workflows
gh run list --branch $(git branch --show-current) --limit 3

# If no workflows triggered, check overall status
gh run list --limit 5

# Monitor active workflows (if any)
gh run watch --exit-status || echo "No active workflows to monitor"
```

#### 2. **Failure Response Protocol**

If ANY GitHub Action fails:

```bash
# MANDATORY failure investigation sequence:
echo "🚨 CI/CD FAILURE DETECTED - Initiating response protocol"

# 1. Get detailed failure information
FAILED_RUN_ID=$(gh run list --status failure --limit 1 --json databaseId --jq '.[0].databaseId')
gh run view $FAILED_RUN_ID --log

# 2. Create immediate action plan
echo "📋 Creating failure response plan..."
TODO_FILE="docs/features/$(date +%Y-%m-%d)_ci_cd_failure_response_plan.md"

# 3. Document the failure and planned response
cat > "$TODO_FILE" << EOF
# CI/CD Failure Response Plan

## Date: $(date '+%Y-%m-%d %H:%M')

## Author: Claude Code

## Failure Details
- **Run ID**: $FAILED_RUN_ID
- **Branch**: $(git branch --show-current)
- **Last Commit**: $(git log -1 --oneline)

## Immediate Response Todos
- [ ] Analyze failure logs in detail
- [ ] Identify root cause of failure
- [ ] Create fix plan with specific steps
- [ ] Implement fixes on current branch
- [ ] Verify fixes with local testing
- [ ] Push fixes and re-verify CI/CD

## Next Actions
- [ ] Monitor GitHub Actions after fix push
- [ ] Update documentation with lessons learned
- [ ] Prevent similar failures in the future

## Notes
[Add investigation findings and fix details here]
EOF

echo "📝 Failure response plan created: $TODO_FILE"
echo "⚠️ STOP: Do not continue development until CI/CD passes"
```

#### 3. **Success Verification Checklist**

When GitHub Actions pass:

```bash
# MANDATORY success verification
echo "✅ CI/CD SUCCESS - Verifying completion"

# 1. Confirm all jobs passed
gh run list --branch $(git branch --show-current) --limit 1 --json conclusion --jq '.[0].conclusion'

# 2. Update current feature documentation
CURRENT_DATE=$(date +%Y-%m-%d)
FEATURE_DOC="docs/features/${CURRENT_DATE}_$(git branch --show-current | sed 's/[^a-zA-Z0-9]/_/g')_progress.md"

# 3. Log successful milestone
echo "## ✅ CI/CD Success Checkpoint - $(date '+%Y-%m-%d %H:%M')" >> "$FEATURE_DOC"
echo "- **Branch**: $(git branch --show-current)" >> "$FEATURE_DOC"
echo "- **Last Commit**: $(git log -1 --oneline)" >> "$FEATURE_DOC"
echo "- **GitHub Actions**: All passing" >> "$FEATURE_DOC"
echo "" >> "$FEATURE_DOC"

echo "📝 Success logged in: $FEATURE_DOC"
```

#### 4. **Documentation Integration Requirements**

**MANDATORY**: Every feature branch MUST maintain ongoing documentation:

```markdown
<!-- docs/features/YYYY-MM-DD_[branch-name]_progress.md -->

# Feature Progress: [Branch Name]

## Current Todos & Status
- [ ] Todo item 1 (status: pending/in_progress/completed)
- [ ] Todo item 2 (status: pending/in_progress/completed)

## CI/CD Status History
- ✅ 2025-09-21 10:30 - All checks passing
- ❌ 2025-09-21 09:15 - Build failure (fixed in commit abc123)

## Decision Log
- **Decision 1**: Chose approach X because Y
- **Decision 2**: Modified Z due to constraint A

## Next Session Resumption
- **Current Focus**: Implementing feature X
- **Blocker**: None / Issue with Y
- **Next Steps**: Continue with component Z
```

### **Implementation Notes**

- **Automation**: Add these commands to git hooks for automatic execution
- **Failure Tolerance**: ZERO tolerance for continued development with failing CI/CD
- **Documentation**: Every branch gets its own progress tracking document
- **Recovery**: All failures must be documented with root cause analysis

---

## 📋 B. Pre-Session Initialization Protocol

### Execute this initialization sequence EVERY session:

```bash
#!/bin/bash
# Save as: .claude/init-session.sh

echo "🚀 Initializing MoneyWise development session..."

# 1. Verify Git state
git status --short
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️ WARNING: Uncommitted changes detected!"
    git status
fi

# 2. Verify current branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" = "main" ]; then
    echo "❌ ERROR: On main branch! Create feature branch first!"
    exit 1
fi
echo "✅ Current branch: $CURRENT_BRANCH"

# 3. Sync with remote
git fetch origin --prune
git pull origin main --rebase

# 4. Verify environment
node --version | grep -q "v18\|v20" || echo "⚠️ Node version issue"
pnpm --version || npm --version || echo "❌ Package manager not found"

# 5. Check dependencies
pnpm install --frozen-lockfile || pnpm install

# 6. Verify claude.md exists
if [ ! -f "claude.md" ]; then
    echo "❌ claude.md missing! Creating template..."
    cp .claude/templates/claude.md.template claude.md
fi

# 7. Run initial tests
pnpm test:unit --run || echo "⚠️ Some tests failing"

# 8. Check TypeScript
pnpm tsc --noEmit || echo "⚠️ TypeScript errors present"

echo "✅ Session initialized. Ready for development!"
```

## 🏗️ C. Development Environment Setup

### Build & Development Commands for MoneyWise

```bash
# Development server with hot reload
pnpm dev
# Expected output: Next.js server on http://localhost:3000

# Production build
pnpm build
# Validates: TypeScript compilation, Next.js optimization, API routes

# Clean build (remove all caches)
rm -rf .next node_modules/.cache
pnpm build

# Type checking
pnpm tsc --noEmit --incremental --tsBuildInfoFile .tsbuildinfo

# Lint checking with auto-fix
pnpm lint --fix

# Check for build errors
pnpm build 2>&1 | grep -E "(ERROR|WARN|Failed|TypeError|ReferenceError)"

# Bundle analysis
ANALYZE=true pnpm build
# Opens bundle analyzer on http://localhost:8888
```

### Database & Backend Commands

```bash
# Database migrations (Prisma)
pnpm prisma migrate dev --name [migration-name]

# Generate Prisma client
pnpm prisma generate

# Database studio for debugging
pnpm prisma studio

# Seed database with test data
pnpm prisma db seed

# Reset database (CAUTION: destroys all data)
pnpm prisma migrate reset
```

## 🧪 D. Testing & Debugging Protocol

### Testing Hierarchy for MoneyWise

#### 1. **Unit Testing Requirements**

```typescript
// Every new component must have tests
// src/__tests__/components/TransactionForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionForm } from '@/components/TransactionForm';

describe('TransactionForm', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
  });

  it('validates required fields before submission', async () => {
    // Test implementation
  });

  it('handles API errors gracefully', async () => {
    // Test error scenarios
  });

  it('updates balance optimistically', async () => {
    // Test real-time updates
  });
});
```

#### 2. **Integration Testing**

```typescript
// Test API endpoints with real database
// src/__tests__/api/transactions.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/transactions';
import { prismaMock } from '@/test/prisma-mock';

describe('/api/transactions', () => {
  it('returns paginated results with correct filters', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { page: '1', limit: '10', category: 'food' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toHaveProperty('transactions');
  });
});
```

#### 3. **E2E Testing with Playwright**

```typescript
// e2e/transactions.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Transaction Management', () => {
  test('complete transaction flow', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'testpass');
    await page.click('button[type="submit"]');

    // Add transaction
    await page.goto('/transactions/new');
    await page.fill('[name="amount"]', '50.00');
    await page.selectOption('[name="category"]', 'groceries');
    await page.click('button:has-text("Save")');

    // Verify
    await expect(page).toHaveURL('/transactions');
    await expect(page.locator('.balance')).toContainText('50.00');
  });
});
```

### Debugging Strategies

#### 1. **State Reset Procedures**

```bash
# Reset local storage & session
# Add to src/utils/debug.ts
export const resetAppState = () => {
  if (process.env.NODE_ENV === 'development') {
    localStorage.clear();
    sessionStorage.clear();
    // Clear IndexedDB
    indexedDB.databases().then(dbs => {
      dbs.forEach(db => indexedDB.deleteDatabase(db.name));
    });
    // Clear cookies
    document.cookie.split(";").forEach(c => {
      document.cookie = c.replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString());
    });
    window.location.reload();
  }
};
```

#### 2. **Debug Mode Implementation**

```typescript
// src/components/DebugPanel.tsx
export const DebugPanel = () => {
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded">
      <button onClick={() => resetAppState()}>Reset State</button>
      <button onClick={() => console.log(store.getState())}>Log Redux</button>
      <button onClick={() => localStorage.setItem('debug', 'true')}>Enable Debug</button>
    </div>
  );
};
```

## 📊 E. Analytics & Monitoring Implementation

### Analytics Event Architecture for MoneyWise

#### Event Planning Requirements

```typescript
// src/analytics/events.ts
export const AnalyticsEvents = {
  // User Journey Events
  USER_SIGNUP: 'user_signup',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',

  // Transaction Events (specific, not generic)
  TRANSACTION_CREATED: 'transaction_created',
  TRANSACTION_EDITED: 'transaction_edited',
  TRANSACTION_DELETED: 'transaction_deleted',
  TRANSACTION_CATEGORIZED: 'transaction_categorized',

  // Feature Usage Events
  BUDGET_CREATED: 'budget_created',
  BUDGET_EXCEEDED: 'budget_exceeded',
  REPORT_GENERATED: 'report_generated',
  EXPORT_INITIATED: 'export_initiated',

  // Error Events
  API_ERROR: 'api_error',
  VALIDATION_ERROR: 'validation_error',
  PAYMENT_FAILED: 'payment_failed',
} as const;

// Event payload types
interface TransactionEventPayload {
  transactionId: string;
  amount: number;
  category: string;
  method: 'manual' | 'import' | 'recurring';
  timestamp: number;
}
```

#### Implementation Pattern

```typescript
// src/hooks/useAnalytics.ts
export const useAnalytics = () => {
  const track = useCallback((event: keyof typeof AnalyticsEvents, properties?: Record<string, any>) => {
    // Development: Console logging
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Event:', event, properties);
    }

    // Production: Send to analytics service
    if (window.gtag) {
      window.gtag('event', event, properties);
    }

    // Also send to internal monitoring
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({ event, properties, timestamp: Date.now() }),
    });
  }, []);

  return { track };
};
```

### Testing Analytics Events

```bash
# Development testing script
# .claude/test-analytics.sh
#!/bin/bash

echo "Testing MoneyWise Analytics Events..."

# 1. Start dev server with analytics debug mode
NEXT_PUBLIC_ANALYTICS_DEBUG=true pnpm dev &
DEV_PID=$!

# 2. Wait for server
sleep 5

# 3. Run analytics test suite
pnpm test:e2e --grep "analytics"

# 4. Check analytics logs
grep "Analytics Event:" .next/server/logs/*.log | tail -20

# 5. Cleanup
kill $DEV_PID
```

### Common Analytics Mistakes to Avoid

#### ❌ **DON'T DO THIS**:

```typescript
// Generic, meaningless events
onClick={() => track('button_clicked')}  // NO!
onClick={() => track('user_action')}     // NO!

// Missing critical context
track('transaction_added');  // Missing amount, category, etc.

// Forgetting to track errors
catch (error) {
  console.error(error);  // Missing analytics!
}

// Modifying features without updating events
// Changed transaction flow but kept old event names
```

#### ✅ **DO THIS INSTEAD**:

```typescript
// Specific, actionable events
onClick={() => track('TRANSACTION_QUICK_ADD_INITIATED', {
  source: 'navbar',
  userSegment: isPremium ? 'premium' : 'free'
})}

// Complete context
track('TRANSACTION_CREATED', {
  transactionId: tx.id,
  amount: tx.amount,
  category: tx.category,
  isRecurring: tx.recurring,
  inputMethod: 'manual',
  timeTaken: Date.now() - startTime
});

// Always track errors
catch (error) {
  track('API_ERROR', {
    endpoint: '/api/transactions',
    errorCode: error.code,
    errorMessage: error.message,
    userId: currentUser.id
  });
  handleError(error);
}
```

## 📝 F. Documentation Practice & Standards

### Feature Development Documentation Workflow

#### 1. **BEFORE Implementation**: Create Planning Document

```markdown
<!-- docs/features/YYYY-MM-DD_transaction_import_plan.md -->

# Feature: Transaction Import from Bank CSV

## Date: 2025-01-20

## Author: Claude Code + [Developer Name]

### Requirements

- [ ] Parse CSV files from major banks (Chase, BoA, Wells Fargo)
- [ ] Validate transaction data format
- [ ] Auto-categorize based on merchant names
- [ ] Handle duplicate detection
- [ ] Show import preview before confirmation

### Technical Approach

1. **Frontend**:
   - Drag-drop file upload component
   - CSV parser using Papaparse
   - Preview table with edit capabilities

2. **Backend**:
   - API endpoint: POST /api/transactions/import
   - Validation middleware
   - Batch insertion with Prisma transactions

3. **Database**:
   - Add import_id column to transactions table
   - Create imports audit table

### Success Criteria

- [ ] Import 1000+ transactions in < 3 seconds
- [ ] 95% accuracy in auto-categorization
- [ ] Zero data loss during import
- [ ] Rollback capability for failed imports

### Risk Mitigation

- Memory limits: Stream large files
- Rate limiting: Implement queue system
- Data validation: Multi-stage validation pipeline
```

#### 2. **AFTER Implementation**: Create Update Report

```markdown
<!-- docs/features/YYYY-MM-DD_transaction_import_completed.md -->

# Implementation Update: Transaction Import

## Completed: 2025-01-21

## Author: Claude Code

### Files Created/Modified

**Frontend:**

- ✅ `src/components/TransactionImport/index.tsx` (new)
- ✅ `src/components/TransactionImport/CSVParser.tsx` (new)
- ✅ `src/components/TransactionImport/PreviewTable.tsx` (new)
- ✅ `src/hooks/useCSVImport.ts` (new)

**Backend:**

- ✅ `pages/api/transactions/import.ts` (new)
- ✅ `src/services/bankParsers/index.ts` (new)
- ✅ `src/utils/categoryMatcher.ts` (new)

**Database:**

- ✅ Migration: `20250121_add_import_tracking.sql`
- ✅ Updated Prisma schema

### Test Coverage

- Unit tests: 18 passing (92% coverage)
- Integration tests: 5 passing
- E2E tests: 3 passing

### Performance Metrics

- 1000 transactions: 2.3s import time ✅
- 10000 transactions: 18s import time
- Memory usage: Max 145MB

### Known Issues

- ⚠️ Wells Fargo date format needs special handling
- ⚠️ Category matching accuracy at 89% (below target)

### Next Steps

- [ ] Optimize category matching algorithm
- [ ] Add progress indicator for large imports
- [ ] Implement background job for 10k+ transactions
```

#### 3. **ONGOING**: Maintain Current State Documentation

```markdown
<!-- docs/current/app_functionality.md -->

# MoneyWise Current Functionality

## Last Updated: 2025-01-21

### Core Features

#### 💰 Transaction Management

- ✅ Manual transaction entry
- ✅ CSV import (Chase, BoA supported)
- ✅ Auto-categorization (89% accuracy)
- ✅ Bulk editing
- ✅ Search and filters
- ⏳ Wells Fargo CSV support (in progress)
- ❌ PDF statement import (planned)

#### 📊 Analytics & Reports

- ✅ Monthly spending breakdown
- ✅ Category analysis
- ✅ Trend visualization
- ⏳ Custom date ranges (in progress)
- ❌ Predictive analytics (planned)

#### 🎯 Budget Management

- ✅ Category budgets
- ✅ Alert notifications
- ⏳ Recurring budgets (in progress)
- ❌ Goal tracking (planned)

### API Endpoints

| Endpoint                 | Method              | Status         | Rate Limit |
| ------------------------ | ------------------- | -------------- | ---------- |
| /api/transactions        | GET/POST/PUT/DELETE | ✅ Stable      | 100/min    |
| /api/transactions/import | POST                | ✅ Beta        | 10/min     |
| /api/budgets             | GET/POST/PUT        | ✅ Stable      | 50/min     |
| /api/analytics           | GET                 | ⏳ Development | 20/min     |

### Performance Benchmarks

- Initial load: < 1.5s
- Transaction list (100 items): < 200ms
- CSV import (1000 rows): < 3s
- Dashboard analytics: < 500ms
```

## 🔄 G. Auto-Update claude.md Workflow

### Automatic claude.md Update Triggers

```typescript
// .claude/auto-update.ts
import fs from 'fs';
import path from 'path';

interface ClaudeUpdate {
  date: string;
  category: 'architecture' | 'dependency' | 'pattern' | 'api' | 'security';
  description: string;
  files: string[];
  impact: 'high' | 'medium' | 'low';
}

export class ClaudeMemoryUpdater {
  private claudeMdPath = './claude.md';

  async updateMemory(update: ClaudeUpdate) {
    const timestamp = new Date().toISOString();
    const entry = `
## Update: ${timestamp}
### Category: ${update.category}
### Description: ${update.description}
### Files Modified:
${update.files.map(f => `- ${f}`).join('\n')}
### Impact Level: ${update.impact}
---
`;

    // Append to claude.md
    await fs.promises.appendFile(this.claudeMdPath, entry);

    // Create git commit
    await this.commitUpdate(update);
  }

  private async commitUpdate(update: ClaudeUpdate) {
    const { execSync } = require('child_process');
    execSync('git add claude.md');
    execSync(`git commit -m "chore(memory): ${update.category} - ${update.description}"`);
  }
}

// Usage in development
const updater = new ClaudeMemoryUpdater();
await updater.updateMemory({
  date: '2025-01-21',
  category: 'architecture',
  description: 'Added Redis caching layer for transactions',
  files: ['src/lib/redis.ts', 'docker-compose.yml'],
  impact: 'high',
});
```

### Git Hooks for Automatic Updates

```bash
#!/bin/bash
# .git/hooks/post-commit
# Auto-update claude.md on structural changes

CHANGED_FILES=$(git diff --name-only HEAD HEAD~1)

# Check for structural changes
if echo "$CHANGED_FILES" | grep -E "(package\.json|tsconfig|\.env\.example|prisma/schema)"; then
  echo "Structural change detected, updating claude.md..."

  # Extract change type
  if echo "$CHANGED_FILES" | grep "package.json"; then
    CHANGE_TYPE="dependency"
  elif echo "$CHANGED_FILES" | grep "prisma/schema"; then
    CHANGE_TYPE="database"
  else
    CHANGE_TYPE="configuration"
  fi

  # Append to claude.md
  cat >> claude.md << EOF

## Auto-Update: $(date '+%Y-%m-%d %H:%M')
- Change Type: $CHANGE_TYPE
- Files: $CHANGED_FILES
- Commit: $(git rev-parse HEAD)
---
EOF

  git add claude.md
  git commit --amend --no-edit
fi
```

## 🎯 H. Quality Gates & CI Integration

### Pre-Commit Quality Checks

```bash
#!/bin/bash
# .claude/quality-check.sh
# MUST PASS before ANY commit

echo "🔍 Running MoneyWise Quality Gates..."

# 1. TypeScript Check
echo "📘 TypeScript validation..."
pnpm tsc --noEmit || {
  echo "❌ TypeScript errors found!"
  exit 1
}

# 2. Linting
echo "🧹 ESLint validation..."
pnpm lint || {
  echo "❌ Linting errors found!"
  exit 1
}

# 3. Formatting
echo "💅 Prettier check..."
pnpm prettier --check "src/**/*.{ts,tsx,js,jsx}" || {
  echo "❌ Formatting issues found! Run: pnpm prettier --write"
  exit 1
}

# 4. Unit Tests
echo "🧪 Running unit tests..."
pnpm test:unit --run || {
  echo "❌ Unit tests failed!"
  exit 1
}

# 5. Build Test
echo "🏗️ Build validation..."
pnpm build || {
  echo "❌ Build failed!"
  exit 1
}

# 6. Security Audit
echo "🔒 Security audit..."
pnpm audit --audit-level=high || {
  echo "⚠️ Security vulnerabilities found!"
  # Don't exit, just warn
}

# 7. Bundle Size Check
echo "📦 Bundle size check..."
BUNDLE_SIZE=$(du -sh .next | cut -f1)
echo "Bundle size: $BUNDLE_SIZE"

# 8. Database Schema Validation
echo "🗄️ Database schema check..."
pnpm prisma validate || {
  echo "❌ Prisma schema invalid!"
  exit 1
}

echo "✅ All quality gates passed!"
```

### GitHub Actions Integration

```yaml
# .github/workflows/quality.yml
name: MoneyWise Quality Gates

on:
  pull_request:
    branches: [main]
  push:
    branches-ignore: [main]

jobs:
  quality-check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run quality gates
        run: .claude/quality-check.sh

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## 🚨 I. Emergency Procedures & Recovery

### Critical Failure Recovery

#### 1. **Git Disaster Recovery**

```bash
#!/bin/bash
# .claude/emergency-recovery.sh

echo "🚨 EMERGENCY RECOVERY INITIATED 🚨"

# 1. Save current work
git stash push -m "emergency-stash-$(date +%s)"

# 2. Find last known good commit
LAST_GOOD=$(git log --format="%H %s" -20 | grep "✅" | head -1 | cut -d' ' -f1)
echo "Last known good commit: $LAST_GOOD"

# 3. Create recovery branch
git checkout -b recovery/emergency-$(date +%Y%m%d-%H%M%S) $LAST_GOOD

# 4. Cherry-pick safe commits
git log --oneline $LAST_GOOD..HEAD | while read commit; do
  echo "Evaluating: $commit"
  # Test if commit is safe
  git cherry-pick --no-commit $commit
  if pnpm test:unit --run; then
    git commit -m "Recovered: $commit"
  else
    git reset --hard
    echo "Skipped problematic commit: $commit"
  fi
done

echo "Recovery complete. Review and test thoroughly."
```

#### 2. **Database Rollback Procedure**

```typescript
// scripts/db-rollback.ts
import { PrismaClient } from '@prisma/client';

async function rollbackDatabase(migrationName: string) {
  const prisma = new PrismaClient();

  try {
    // 1. Create backup
    await prisma.$executeRaw`
      CREATE TABLE transactions_backup AS 
      SELECT * FROM transactions;
    `;

    // 2. Rollback migration
    const { execSync } = require('child_process');
    execSync(`pnpm prisma migrate resolve --rolled-back ${migrationName}`);

    // 3. Verify data integrity
    const count = await prisma.transaction.count();
    console.log(`Rolled back. ${count} transactions remain.`);
  } catch (error) {
    console.error('Rollback failed:', error);
    // Restore from backup
    await prisma.$executeRaw`
      DROP TABLE transactions;
      ALTER TABLE transactions_backup RENAME TO transactions;
    `;
  }
}
```

## ✅ J. Session Completion Checklist

### MANDATORY Before Ending Session

```bash
#!/bin/bash
# .claude/session-complete.sh

echo "📋 Session Completion Checklist"

# 1. Git Status
echo "1. Checking Git status..."
UNCOMMITTED=$(git status --porcelain | wc -l)
if [ "$UNCOMMITTED" -gt 0 ]; then
  echo "❌ Uncommitted changes detected!"
  git status --short
  exit 1
fi
echo "✅ All changes committed"

# 2. Tests
echo "2. Running tests..."
pnpm test:unit --run || exit 1
echo "✅ Tests passing"

# 3. Build
echo "3. Verifying build..."
pnpm build || exit 1
echo "✅ Build successful"

# 4. Documentation
echo "4. Checking documentation..."
if [ -z "$(find docs/features -name "*$(date +%Y-%m-%d)*" -print -quit)" ]; then
  echo "⚠️ No documentation created today"
fi

# 5. Claude.md Update
echo "5. Verifying claude.md..."
CLAUDE_UPDATED=$(git log --since="6 hours ago" --grep="claude.md" | wc -l)
if [ "$CLAUDE_UPDATED" -eq 0 ]; then
  echo "⚠️ claude.md not updated in this session"
fi

# 6. Push to remote
echo "6. Pushing to remote..."
git push origin $(git branch --show-current)
echo "✅ Pushed to remote"

# 7. Create session summary
cat > docs/sessions/$(date +%Y-%m-%d-%H%M).md << EOF
# Session Summary: $(date)
## Branch: $(git branch --show-current)
## Commits: $(git log --oneline --since="6 hours ago" | wc -l)
## Files Changed: $(git diff --stat HEAD~5..HEAD 2>/dev/null | tail -1)

### Completed Tasks:
$(git log --oneline --since="6 hours ago" | head -5)

### Tests Status:
- Unit: $(pnpm test:unit --run 2>&1 | grep "passed" | tail -1)
- Build: Success

### Next Session Priority:
- [ ] Review PR feedback
- [ ] Continue feature implementation
- [ ] Update documentation
EOF

echo "✅ Session completed successfully!"
echo "📄 Summary saved to docs/sessions/"
```

## 🎓 K. Continuous Improvement Protocol

### Code Review Checklist for MoneyWise

```markdown
<!-- .github/pull_request_template.md -->

## PR Checklist

### Code Quality

- [ ] TypeScript strict mode passes
- [ ] No `any` types without justification
- [ ] All functions have proper return types
- [ ] Error boundaries implemented for React components
- [ ] Loading states handled properly

### Performance

- [ ] No N+1 queries in API routes
- [ ] Images optimized with next/image
- [ ] Lazy loading implemented where appropriate
- [ ] Bundle size impact documented

### Security

- [ ] Input validation on all endpoints
- [ ] SQL injection prevention verified
- [ ] XSS protection implemented
- [ ] Authentication/authorization checked
- [ ] No secrets in code

### Testing

- [ ] Unit tests for new functions
- [ ] Integration tests for API routes
- [ ] E2E tests for critical paths
- [ ] Edge cases covered
- [ ] Error scenarios tested

### Documentation

- [ ] JSDoc comments for public APIs
- [ ] README updated if needed
- [ ] claude.md updated for architectural changes
- [ ] Migration guide if breaking changes

### Analytics

- [ ] Events added for new features
- [ ] Error tracking implemented
- [ ] Performance metrics captured
```

### Learning from Failures

```typescript
// .claude/incident-tracker.ts
interface Incident {
  date: string;
  severity: 'critical' | 'major' | 'minor';
  category: string;
  description: string;
  rootCause: string;
  fix: string;
  prevention: string;
}

export class IncidentTracker {
  async logIncident(incident: Incident) {
    const report = `
# Incident Report: ${incident.date}

## Severity: ${incident.severity}
## Category: ${incident.category}

### What Happened
${incident.description}

### Root Cause
${incident.rootCause}

### Fix Applied
${incident.fix}

### Prevention Measures
${incident.prevention}

### Lessons Learned
- Update testing to cover this scenario
- Add monitoring for early detection
- Document in team knowledge base
`;

    await fs.promises.writeFile(`docs/incidents/${incident.date}-${incident.category}.md`, report);

    // Update claude.md with prevention measures
    await this.updateClaudeMemory(incident.prevention);
  }
}
```

## 🚀 I. Post-Feature Workflow Protocol

### MANDATORY Complete Feature Lifecycle

**This workflow is MANDATORY for ALL features, fixes, and enhancements. No exceptions.**

#### Phase 0: Documentation Maintenance (MANDATORY)

**BEFORE pushing to remote, ensure project health documentation is current:**

```bash
# 1. Verify README.md reflects current project state
# - Check project description and features
# - Validate setup instructions and requirements
# - Update status indicators and badges if applicable

# 2. Update CHANGELOG.md with all branch changes
# - Add entries for new features, fixes, improvements
# - Include version information and dates
# - Follow semantic versioning and changelog standards

# 3. Validate SETUP.md procedures are accurate
# - Test setup instructions on clean environment if possible
# - Update dependency versions and requirements
# - Add new setup steps for infrastructure changes

# 4. Commit documentation updates atomically
git add README.md CHANGELOG.md SETUP.md
git commit -m "docs(maintenance): update project health documentation

- Updated README.md: [specific changes]
- Updated CHANGELOG.md: [version and changes]
- Updated SETUP.md: [setup procedure changes]

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Documentation Update Requirements**:
- ✅ **README.md**: Must accurately describe current project state and capabilities
- ✅ **CHANGELOG.md**: Must include all significant changes from this branch
- ✅ **SETUP.md**: Must contain functional, tested setup procedures
- ✅ **Quality Check**: Documentation must enable newcomer project understanding
- ❌ **STOP HERE** if documentation doesn't reflect current project reality

**See [Section K: Branch Documentation Maintenance Standards](#section-k-branch-documentation-maintenance-standards) for detailed requirements.**

#### Phase 1: Push and Initial CI/CD Verification

```bash
# 1. Push feature branch to remote
git push origin feature/[feature-name]

# 2. Monitor CI/CD pipeline status
gh run list --branch feature/[feature-name] --limit 1

# 3. Wait for CI/CD completion and verify success
gh run watch [RUN_ID]  # Monitor until completion
```

**Requirements**:
- ✅ All CI/CD checks must pass (security, lint, tests, build)
- ✅ No failures or warnings in critical checks
- ❌ **STOP HERE** if any CI/CD checks fail - fix issues before proceeding

#### Phase 2: Merge to Main

```bash
# 4. Switch to main branch
git checkout main

# 5. Pull latest changes (if any)
git pull origin main

# 6. Merge feature branch (fast-forward preferred)
git merge feature/[feature-name]

# 7. Push merged changes to main
git push origin main
```

#### Phase 3: Main Branch CI/CD Verification

```bash
# 8. Monitor main branch CI/CD pipeline
gh run list --branch main --limit 1

# 9. Verify main branch CI/CD success
gh run watch [MAIN_RUN_ID]
```

**Critical Checkpoint**:
- ✅ Main branch CI/CD must pass completely
- ❌ **IMMEDIATE ACTION REQUIRED** if main CI/CD fails:
  - Create hotfix branch immediately
  - Investigate and fix issues
  - Open GitHub issue for tracking

#### Phase 4: Branch Cleanup and Return

```bash
# 10. Delete local feature branch
git branch -D feature/[feature-name]

# 11. Delete remote feature branch
git push origin --delete feature/[feature-name]

# 12. Verify clean main branch status
git status  # Should show "working tree clean"
git branch  # Should show only main (and other non-feature branches)
```

### Post-Feature Workflow Verification Checklist

**Before marking feature as complete, verify**:
- [ ] Feature branch CI/CD: ✅ SUCCESS
- [ ] Merged to main successfully
- [ ] Main branch CI/CD: ✅ SUCCESS
- [ ] Local feature branch deleted
- [ ] Remote feature branch deleted
- [ ] Currently on main branch
- [ ] Working tree clean
- [ ] F3 documentation completed (if using Appendix F)

### Emergency Procedures

**If Main Branch CI/CD Fails**:
1. **Immediate Response**: Create hotfix branch from last known good commit
2. **Investigation**: Identify root cause of failure
3. **Documentation**: Create GitHub issue with failure details
4. **Resolution**: Fix issues and follow hotfix workflow
5. **Prevention**: Update CI/CD or pre-merge checks to prevent recurrence

## 📚 J. Documentation Consistency Standards

### Comprehensive Newcomer Onboarding Documentation

**Every piece of documentation must serve as a complete reference for someone new to the codebase.**

#### Required Documentation Elements

**For ALL Documentation Types (Application/Feature/Fix)**:

1. **Purpose & Overview**
   ```markdown
   ## What This Does
   Clear, concise explanation of functionality/purpose

   ## Why It Exists
   Business/technical rationale and problem being solved
   ```

2. **Goals & Success Criteria**
   ```markdown
   ## Final Goals
   - [ ] Specific, measurable objectives
   - [ ] Success criteria and acceptance tests
   - [ ] Performance targets (if applicable)
   ```

3. **Requirements Documentation**
   ```markdown
   ## Requirements
   ### Functional Requirements
   - User stories and behavior specifications

   ### Technical Requirements
   - System constraints and dependencies
   - Performance and scalability needs

   ### Non-Functional Requirements
   - Security, maintainability, usability standards
   ```

4. **Architecture & Design**
   ```markdown
   ## Architecture
   ### System Components
   - Component diagram and relationships
   - Data flow and communication patterns

   ### Technology Stack
   - Languages, frameworks, libraries used
   - Infrastructure and deployment considerations

   ### Design Decisions
   - Major architectural choices and rationale
   - Trade-offs and alternatives considered
   ```

5. **Evolutionary Development Tracking**
   ```markdown
   ## Development Evolution
   ### Phase 1: [Name]
   **Status**: ✅ Completed | 🔄 In Progress | ⏸️ Paused | ❌ Failed
   - Stage-by-stage implementation details
   - Key milestones and deliverables
   - Issues encountered and resolutions

   ### Phase 2: [Name]
   **Status**: [Status]
   - [Continue pattern for all phases]
   ```

6. **Todo Task Lists with Evolution**
   ```markdown
   ## Task Progression
   ### Current Sprint/Phase
   - [x] Completed task with outcome summary
   - [ ] In-progress task with current status
   - [ ] Pending task with dependencies

   ### Historical Tasks (Previous Phases)
   - [Archive format showing progression over time]
   ```

#### Documentation Types and Specific Requirements

**Application-Level Documentation** (`docs/architecture/`):
- System overview and purpose
- High-level architecture and technology decisions
- Integration patterns and external dependencies
- Deployment and operational procedures

**Feature-Level Documentation** (`docs/features/`):
- Feature purpose and user value
- Implementation approach and architecture
- Integration points with existing system
- Testing strategy and quality assurance

**Fix-Level Documentation** (`docs/fixes/` or inline in features):
- Problem description and impact
- Root cause analysis
- Solution approach and implementation
- Prevention measures and monitoring

#### Documentation Update Protocol

**When Documentation Must Be Updated**:
- ✅ **Every feature/fix completion** (F3 documentation)
- ✅ **Architecture changes** (system design modifications)
- ✅ **Requirements changes** (scope or goal modifications)
- ✅ **Technology updates** (framework upgrades, new tools)
- ✅ **Process improvements** (workflow or methodology changes)

**Documentation Review Requirements**:
- **Monthly Review**: Audit documentation for accuracy and completeness
- **Pre-Release Review**: Verify all feature documentation is current
- **Newcomer Test**: Regularly test documentation with fresh perspective
- **Continuous Improvement**: Update based on feedback and pain points

#### Documentation Quality Standards

**Every document must enable a newcomer to**:
- ✅ Understand what the system/feature/fix accomplishes
- ✅ Comprehend the final goals and success criteria
- ✅ Follow the evolutionary development process
- ✅ Locate and understand architectural decisions
- ✅ Identify current status and next steps
- ✅ Contribute effectively to ongoing development

## 📋 K. Branch Documentation Maintenance Standards

### Project Health Documentation Requirements

**MANDATORY**: Every branch development MUST maintain current project health documentation to ensure codebase accessibility and functional setup procedures.

#### Core Documentation Files (Mandatory Updates)

**1. README.md - Project Overview and Status**
```markdown
Required Sections:
- Project title and description
- Current status and version
- Key features and capabilities
- Quick start guide
- Technology stack overview
- Development status indicators
- License and contribution info
```

**Update Triggers for README.md**:
- ✅ New major features implemented
- ✅ Technology stack changes (frameworks, major deps)
- ✅ Architecture or approach modifications
- ✅ Setup procedure changes
- ✅ Project status or phase changes
- ✅ API or interface modifications

**2. CHANGELOG.md - Change Tracking**
```markdown
Required Format (Semantic Versioning):
## [Unreleased]
### Added
- New features and capabilities

### Changed
- Modifications to existing functionality

### Fixed
- Bug fixes and corrections

### Removed
- Deprecated or removed features

## [Version X.Y.Z] - YYYY-MM-DD
[Previous versions...]
```

**Update Triggers for CHANGELOG.md**:
- ✅ **EVERY branch development** (mandatory)
- ✅ Feature additions or significant modifications
- ✅ Bug fixes and corrections
- ✅ Infrastructure or dependency changes
- ✅ Breaking changes or API modifications
- ✅ Performance improvements or optimizations

**3. SETUP.md - Installation and Environment**
```markdown
Required Sections:
- Prerequisites and system requirements
- Installation steps (tested and verified)
- Environment configuration
- Development environment setup
- Service dependencies (Docker, databases)
- Troubleshooting common issues
- Verification procedures
```

**Update Triggers for SETUP.md**:
- ✅ Dependency version changes
- ✅ New service requirements (Docker, Redis, etc.)
- ✅ Environment variable additions
- ✅ Installation procedure modifications
- ✅ New development tools or requirements
- ✅ Configuration file changes

#### Documentation Quality Standards

**Newcomer Accessibility Requirements**:
- **README.md**: Must enable understanding of project purpose and current state
- **CHANGELOG.md**: Must provide clear history of changes and evolution
- **SETUP.md**: Must result in successful project setup from clean environment

**Functional Verification**:
```bash
# README.md Verification
- [ ] Project description accurate and current
- [ ] Feature list matches actual implementation
- [ ] Status indicators reflect reality
- [ ] Links and references functional

# CHANGELOG.md Verification
- [ ] All branch changes documented
- [ ] Semantic versioning followed
- [ ] Dates and versions accurate
- [ ] Categories (Added/Changed/Fixed) used correctly

# SETUP.md Verification
- [ ] Prerequisites complete and current
- [ ] Installation steps tested and functional
- [ ] Environment setup procedures work
- [ ] Troubleshooting section updated
```

#### Integration with Development Workflow

**Phase 0 Integration** (Before Push):
1. **Review Current State**: Compare documentation against actual project state
2. **Identify Changes**: Document all modifications made during branch development
3. **Update Files**: Make necessary updates to README.md, CHANGELOG.md, SETUP.md
4. **Verify Quality**: Ensure newcomer accessibility and functional procedures
5. **Commit Atomically**: Single commit for all documentation maintenance

**Quality Gate Integration**:
- Documentation updates MUST be committed before Phase 1 (Push to remote)
- CI/CD should validate documentation exists and follows standards
- Post-merge verification should include documentation accuracy checks

#### Branch Documentation Maintenance Checklist

**Before Every Push to Remote**:
- [ ] **README.md**: Reflects current project state and capabilities
- [ ] **CHANGELOG.md**: Documents all branch changes and improvements
- [ ] **SETUP.md**: Contains accurate, tested setup procedures
- [ ] **Consistency Check**: All documentation tells the same story
- [ ] **Newcomer Test**: Documentation enables project understanding
- [ ] **Functional Test**: Setup procedures actually work

**Documentation Commit Requirements**:
```bash
# Standard commit message format
git commit -m "docs(maintenance): update project health documentation

- Updated README.md: [specific changes made]
- Updated CHANGELOG.md: [version and new changes]
- Updated SETUP.md: [setup procedure modifications]

Co-Authored-By: Claude <noreply@anthropic.com>"
```

#### Emergency Documentation Procedures

**If Documentation Is Significantly Outdated**:
1. **Immediate Update**: Stop development to bring documentation current
2. **Comprehensive Review**: Audit all three files for accuracy
3. **Testing Required**: Verify setup procedures on clean environment
4. **Issue Creation**: Document technical debt for process improvements
5. **Prevention**: Implement stricter documentation maintenance discipline

**Documentation Debt Management**:
- **Weekly Review**: Audit documentation accuracy during development
- **Release Preparation**: Comprehensive documentation verification
- **Newcomer Feedback**: Regular testing with fresh perspectives
- **Continuous Improvement**: Update maintenance procedures based on pain points

#### Success Metrics

**Documentation Health Indicators**:
- ✅ Setup procedures result in successful environment setup
- ✅ README.md enables project understanding without additional context
- ✅ CHANGELOG.md provides clear development evolution narrative
- ✅ Documentation maintained throughout branch development (not just at end)
- ✅ Newcomer onboarding time minimized through clear documentation

**Enforcement Standards**:
- **Phase 0 Compliance**: Documentation updates mandatory before every push
- **Quality Gates**: CI/CD validation of documentation standards
- **Review Requirements**: Documentation accuracy verified in code reviews
- **Process Integration**: Documentation maintenance embedded in development workflow

# Section L: Board-First Execution Pattern & Micro-Iteration Methodology

## **CRITICAL**: Traceability-First Development Workflow

### **MANDATORY WORKFLOW** for all user stories/tasks:

#### 1. **Tracciabilità First** (BEFORE any code changes)
```bash
# Update GitHub Projects board status FIRST
gh project item-edit [PROJECT_ID] --id [ITEM_ID] --field-id [STATUS_FIELD] --single-select-option-id [IN_PROGRESS_ID]
```

#### 2. **Micro-Iteration Pattern** (During execution)
```
FOR each micro-task in user story:
  Execute micro-task → Commit → Verify (test/CLI) → Document → Repeat
```

#### 3. **Completion Workflow** (After user story implementation)
```bash
# CRITICAL: Follow COMPLETE post-feature workflow before marking "Done"
# See CLAUDE.md Phase 1-4 workflow (push → CI/CD → merge → cleanup → board update)
# Board status changes to "Done" ONLY after successful completion of entire workflow
```

### **Principle**: Documentation & Traceability → Execution

**Before**: Code → Document → Board Update
**After**: Board Update → Document → Code → Verify → Iterate

### **Micro-Task Pattern**:
1. **Define**: Break user story into atomic micro-tasks
2. **Track**: Update board status before starting
3. **Execute**: Implement micro-task
4. **Commit**: Atomic commit with clear message
5. **Verify**: Test/CLI verification of success
6. **Document**: Update progress and decisions
7. **Iterate**: Repeat until story complete

### **GitHub CLI Commands for Board Management**:
```bash
# Get project item ID for user story
gh project item-list [PROJECT_NUMBER] --owner [OWNER] --format json

# Get field options
gh project field-list [PROJECT_NUMBER] --owner [OWNER] --format json

# Update status to In Progress (use correct option ID)
gh project item-edit --project-id [PROJECT_ID] --id [ITEM_ID] --field-id [STATUS_FIELD] --single-select-option-id [OPTION_ID]
```

### **Benefits**:
- **Real-time Traceability**: Board always reflects current work state
- **Agile Transparency**: Team/stakeholders see live progress
- **Methodology Consistency**: Practice what we preach in agile implementation
- **Quality Assurance**: Verification built into every iteration

### **AGILE DEFINITION OF DONE (DoD)**:

**❌ WRONG - Incomplete DoD**:
- Code implemented locally ≠ Done
- Tests passing locally ≠ Done
- Working on main branch ≠ Done
- Board marked "Done" without workflow ≠ Done

**✅ CORRECT - Complete DoD**:
1. ✅ Feature branch created and used
2. ✅ Code implemented with atomic commits
3. ✅ Documentation updated (docs/, README, CHANGELOG)
4. ✅ Feature branch pushed to remote
5. ✅ CI/CD pipeline green on feature branch
6. ✅ Pull request created and approved
7. ✅ Merged to main with --no-ff
8. ✅ CI/CD pipeline green on main branch
9. ✅ Feature branch deleted (local + remote)
10. ✅ Board status updated to "Done"

**🚨 CRITICAL**: Steps 1-10 must be completed in sequence. No shortcuts allowed.

### **Enforcement**:
This refinement is **MANDATORY** and applies to all future user story execution. Working on main branch or marking stories "Done" without completing the full workflow is a **CRITICAL METHODOLOGY VIOLATION**.

---

**Last Updated**: 2025-09-21 **Version**: 2.4.0
**Maintainer**: MONEYWISE Team & Claude Code

**Remember**: Every commit counts. Every test matters. Every line of documentation helps. **Traceability first.** Build with excellence, ship
with confidence. 🚀
