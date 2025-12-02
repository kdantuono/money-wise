# Phase 5 Dependency Upgrade Plan

> **Objective**: Achieve a clean, stable green build with all upgrades properly applied and tested.

## Executive Summary

### Current Situation

The `hotfix/tech-debt-phase4` branch (PR #229) contains **major version upgrades** that are causing E2E test failures:

| Package | Main Branch | Hotfix Branch | Breaking? |
|---------|-------------|---------------|-----------|
| React | 18.3.1 | 19.2.0 | ✅ Major |
| ESLint | 8.x | 9.x | ✅ Major |
| pnpm | 8.15.1 | 10.11.0 | ✅ Major |
| Turbo | 1.11.2 | 2.6.1 | ✅ Major |
| Vitest | 1.0.4 | 4.0.0 | ✅ Major |
| TypeScript | 5.2.2 | 5.9.3 | ⚠️ Minor |
| Playwright | 1.40.0 | 1.57.0 | ⚠️ Minor |

**Root Cause of E2E Failure**: Major version upgrades (React 19, Vitest 4) likely have breaking changes affecting the test infrastructure.

---

## Strategy: Incremental Safe Upgrades

### Principle: "One change at a time, verify at each step"

Instead of massive multi-package upgrades, we'll:
1. Apply safe patch updates first
2. Apply minor updates with verification
3. Handle major updates individually with migration guides
4. Fix E2E tests before continuing

---

## Phase 5.1: Safe Patch Updates (Zero Risk)

These updates contain only bug fixes and security patches:

```bash
# @typescript-eslint/* patches
pnpm add -D -w @typescript-eslint/eslint-plugin@8.48.1 @typescript-eslint/parser@8.48.1

# Vitest patches
pnpm --filter @money-wise/web add -D @vitest/coverage-v8@4.0.15 @vitest/ui@4.0.15

# Sentry patches  
pnpm --filter @money-wise/web add @sentry/browser@10.28.0 @sentry/nextjs@10.28.0 @sentry/react@10.28.0
pnpm --filter @money-wise/backend add @sentry/node@10.28.0

# AWS SDK patches
pnpm --filter @money-wise/backend add @aws-sdk/client-ses@3.943.0
```

**Verification:**
```bash
pnpm typecheck && pnpm lint && pnpm test:unit
```

---

## Phase 5.2: Minor Updates (Low Risk)

These updates add features but maintain backward compatibility:

### Batch 1: Developer Tooling
```bash
# Playwright (1.40 → 1.57)
pnpm --filter @money-wise/web add -D @playwright/test@1.57.0

# Testing Library (14.3 → 16.3) - Minor with React 19 support
pnpm --filter @money-wise/web add -D @testing-library/react@16.3.0 @testing-library/dom@10.0.0
```

### Batch 2: UI Libraries  
```bash
# Lucide icons (0.294 → 0.555)
pnpm --filter @money-wise/ui add lucide-react@0.555.0
pnpm --filter @money-wise/web add lucide-react@0.555.0

# Radix UI updates
pnpm --filter @money-wise/ui add @radix-ui/react-form@0.1.8
```

### Batch 3: Axios upgrade (0.30 → 1.13)
```bash
# Axios major version (but stable API)
pnpm --filter @money-wise/web add axios@1.13.2
pnpm add -D -w axios@1.13.2
```

**Verification after each batch:**
```bash
pnpm typecheck && pnpm lint && pnpm test:unit
```

---

## Phase 5.3: Major Updates (High Risk - Individual Migration)

### Priority 1: Fix E2E Tests FIRST

Before any major updates, we need to fix the current E2E test failure:

1. **Diagnose**: Run E2E tests locally to see actual error messages
2. **Identify**: Check if React 19, Testing Library 16, or Vitest 4 is the culprit
3. **Fix**: Update test code to match new API expectations

### Priority 2: Complete React 19 Migration

React 19 is already in the hotfix branch but may have incomplete migration:

**Changes Required:**
- Update `createRoot` usage (if not already done)
- Fix `act()` warnings in tests
- Update `@testing-library/react` to v16 (React 19 compatible)
- Review deprecated API usage

### Priority 3: Complete ESLint 9 Migration

ESLint 9 is already in the hotfix branch:

**Verify:**
- Check `eslint.config.js` flat config format
- Ensure all plugins support ESLint 9
- Update any custom rules

### Deferred to Phase 6+ (Post-MVP)

These are **NOT needed for MVP** and should be deferred:

| Package | Current | Available | Reason to Defer |
|---------|---------|-----------|-----------------|
| NestJS | 10.x | 11.x | Breaking changes in DI system |
| Prisma | 6.19 | 7.0 | Major ORM changes |
| Next.js | 15.4 | 16.0 | Significant architecture changes |
| Storybook | 7.6 | 10.1 | Complete rewrite |
| Tailwind CSS | 3.4 | 4.1 | Config file format changed |
| Zod | 3.25 | 4.1 | API changes |
| Zustand | 4.5 | 5.0 | Breaking changes |
| date-fns | 2.30 | 4.1 | Major API changes |
| Jest | 29.7 | 30.2 | Testing infrastructure |

### Mobile App (Separate Track)

Mobile dependencies are significantly outdated and should be handled in a dedicated effort:

| Package | Current | Available | Gap |
|---------|---------|-----------|-----|
| expo | 49.0.23 | 54.0.25 | 5 versions |
| react-native | 0.72.6 | 0.82.1 | 10 minor versions |
| nativewind | 2.0.11 | 4.2.1 | 2 major versions |

---

## Phase 5.4: Deprecated Package Remediation

### Remove/Replace Deprecated Packages

```bash
# @storybook/testing-library is deprecated
# Replace with @storybook/test
pnpm --filter @money-wise/ui remove @storybook/testing-library
pnpm --filter @money-wise/ui add -D @storybook/test
```

---

## Immediate Action Plan

### Step 1: Diagnose E2E Failure (Today)

```bash
cd /home/nemesi/dev/money-wise-tech-debt

# Start E2E infrastructure
docker compose -f docker-compose.e2e.yml up -d --build

# Wait for services
docker compose -f docker-compose.e2e.yml ps

# Run E2E tests with verbose output
cd apps/web
pnpm exec playwright test --reporter=list

# Capture screenshots on failure
pnpm exec playwright test --trace on
```

### Step 2: Compare E2E Behavior (Main vs Hotfix)

```bash
# In main worktree (old deps)
cd /home/nemesi/dev/money-wise
docker compose -f docker-compose.e2e.yml up -d --build
cd apps/web && pnpm exec playwright test

# Compare results with hotfix branch
```

### Step 3: Fix E2E Tests

Based on diagnosis:
- If React 19 issue: Update component tests for new API
- If Testing Library issue: Update assertions
- If Vitest issue: Update test config
- If Playwright issue: Update selectors/waits

### Step 4: Verify Green Build

```bash
# Full local verification
pnpm typecheck
pnpm lint  
pnpm test:unit
pnpm test:integration
cd apps/web && pnpm exec playwright test
```

### Step 5: Push and Verify CI

Only after local green:
```bash
git add -A
git commit -m "fix: resolve E2E test failures for React 19 compatibility"
git push
```

---

## Success Criteria

✅ All CI jobs pass (including E2E)  
✅ No hidden `ts-expect-error` or `eslint-disable` comments  
✅ All deprecation warnings addressed  
✅ Clean dependency tree (no conflicts)  
✅ All 1550+ unit tests passing  
✅ All integration tests passing  
✅ All E2E smoke tests passing  

---

## Risk Mitigation

1. **Always work in hotfix branch** - main stays stable
2. **Local verification BEFORE push** - saves CI costs
3. **One package at a time** for major updates
4. **Rollback plan**: git reset if something breaks
5. **Document changes** in commit messages

---

## Timeline Estimate

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| 5.1: Patch updates | 30 mins | None |
| 5.2: Minor updates | 2 hours | 5.1 complete |
| 5.3: E2E fix | 2-4 hours | Diagnosis |
| 5.3: React 19 cleanup | 2 hours | E2E fix |
| 5.4: Deprecated removal | 1 hour | All tests green |

**Total**: 1-2 days for complete Phase 5

---

*Last updated: Phase 4 → Phase 5 Transition Planning*
