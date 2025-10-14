# CI/CD Optimization Strategy
## Staying Under 3000 Minutes/Month GitHub Actions Budget

**Last Updated**: 2025-10-10
**Status**: Proposed
**Monthly Budget**: 3000 minutes (GitHub Free Tier)

---

## 📊 Current State Analysis

### Cost Breakdown
- **Average workflow duration**: 6 minutes
- **Quality Gates runs**: 33 of last 50 runs (66%)
- **Current usage pattern**: Full CI/CD on EVERY feature branch push
- **Estimated monthly cost**:
  - 15 pushes/day × 6 min × 30 days = **2,700 minutes/month**
  - Currently at budget limit with frequent overages

### Current Workflow Jobs (Quality Gates)
1. **Lint and Type Check** (~3 min)
2. **Unit Tests** - Backend + Web (~4 min total)
3. **Integration Tests** (~2 min)
4. **E2E Tests** - 4 shards (~20 min total) ⚠️ **Most Expensive**
5. **Security Scan** (~1 min)
6. **Bundle Size Check** (~2 min)
7. **Performance Tests** (~3 min)

**Total per run**: ~35 minutes (with parallel execution: ~6-7 min wall time)

---

## 🎯 Optimization Strategy: Tiered CI/CD Approach

### Tier 0: Local Development (0 CI minutes) ✅
**Pre-commit hooks catch issues before push**
- ✅ Lint
- ✅ Type check
- ✅ Unit tests for affected files only
- ✅ Format check

**Benefits**:
- Zero CI cost
- Instant feedback (<30s)
- Prevents broken code from reaching CI

### Tier 1: Feature Branches (`feature/*`, `story/*`) - MINIMAL CI
**Target**: 2-3 minutes per push
**Frequency**: 10 pushes/day
**Monthly Cost**: 10 × 2.5 × 30 = **750 minutes**

```yaml
on:
  push:
    branches: ['feature/*', 'story/*']

jobs:
  quick-check:
    - Lint (2 min)
    - Type check (included in lint)
    - Skip all tests (rely on pre-commit)
```

**Rationale**:
- Features are work-in-progress
- Pre-commit hooks provide local safety
- Fast feedback loop for syntax/style issues

### Tier 2: Epic Branches (`epic/*`) - MODERATE CI
**Target**: 5-7 minutes per push
**Frequency**: 5 pushes/day
**Monthly Cost**: 5 × 6 × 30 = **900 minutes**

```yaml
on:
  push:
    branches: ['epic/*']

jobs:
  lint-typecheck:      # 3 min
  unit-tests:          # 4 min (backend + web in parallel)
  # Skip: integration, E2E, security, bundle
```

**Rationale**:
- Epics integrate multiple features
- Unit tests ensure component integrity
- Still avoid expensive E2E/integration tests

### Tier 3: Pull Requests to `develop` - COMPREHENSIVE CI
**Target**: 20-25 minutes per PR
**Frequency**: 2 PRs/day
**Monthly Cost**: 2 × 22 × 30 = **1,320 minutes**

```yaml
on:
  pull_request:
    branches: ['develop']

jobs:
  lint-typecheck:      # 3 min
  unit-tests:          # 4 min (backend + web)
  integration-tests:   # 2 min
  e2e-tests:          # 12 min (2 shards instead of 4) ⚡ OPTIMIZED
  security-scan:       # 1 min
  bundle-size:         # 2 min
```

**Optimizations**:
- ✅ Reduce E2E shards: 4 → 2 (saves 40% E2E time)
- ✅ Skip performance tests on PRs
- ✅ Aggressive caching (pnpm, Playwright)

### Tier 4: `develop` → `main` Merges - PRODUCTION GATES
**Target**: 30-35 minutes per merge
**Frequency**: 1 merge/day
**Monthly Cost**: 1 × 32 × 30 = **960 minutes**

```yaml
on:
  push:
    branches: ['main']
  pull_request:
    branches: ['main']

jobs:
  # ALL Quality Gates jobs
  lint-typecheck:
  unit-tests:
  integration-tests:
  e2e-tests:          # 4 shards (full coverage)
  security-scan:
  performance-tests:
  bundle-size:
  deploy-production:
```

**Rationale**:
- Main branch = production-ready code
- Full validation required
- Infrequent runs (1/day) = affordable

---

## 📈 Monthly Budget Projection

| Tier | Branch Pattern | Runs/Day | Min/Run | Days | Total |
|------|---------------|----------|---------|------|-------|
| 0 | Local | ∞ | 0 | 30 | **0 min** |
| 1 | `feature/*`, `story/*` | 10 | 2.5 | 30 | **750 min** |
| 2 | `epic/*` | 5 | 6 | 30 | **900 min** |
| 3 | PR → `develop` | 2 | 22 | 30 | **1,320 min** |
| 4 | `develop` → `main` | 1 | 32 | 30 | **960 min** |
| **TOTAL** | | | | | **3,930 min** ⚠️ |

**Adjustment Required**: Still 930 minutes over budget!

---

## 🔧 Additional Optimizations to Reach Budget

### Option A: Reduce Feature Branch CI Further
**Change**: Run CI only on PR open/update, not every push
- Skip Tier 1 entirely = **-750 min**
- **New Total**: 3,180 minutes ✅ (within buffer)

### Option B: Reduce PR Frequency
**Change**: Batch feature work, reduce PRs to 1.5/day
- PR minutes: 1.5 × 22 × 30 = 990 min
- **New Total**: 3,600 minutes ⚠️ (still over)

### Option C: Optimize E2E Tests on PRs
**Change**: Run E2E only on final PR approval (not every push)
```yaml
on:
  pull_request:
    types: [opened, ready_for_review]  # Not synchronize
```
- Reduce PR runs: 2 → 1 per day
- PR minutes: 1 × 22 × 30 = 660 min
- **New Total**: 2,610 minutes ✅

### ✅ Recommended: Hybrid Approach (Option A + C)
1. **No CI on feature branch pushes** (use pre-commit hooks)
2. **Lite CI on epic branches** (lint + unit tests only)
3. **Full CI on PR open/approval** (not every push)
4. **Complete CI on main merges**

**Projected Total**: **~2,600 minutes/month** ✅

---

## 🛠️ Implementation Plan

### Phase 1: Aggressive Caching (Immediate)
```yaml
- name: Cache pnpm store
  uses: actions/cache@v4
  with:
    path: ~/.local/share/pnpm/store
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-

- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: ${{ runner.os }}-playwright-${{ hashFiles('**/pnpm-lock.yaml') }}
```

**Estimated Savings**: 30-40% reduction in install time

### Phase 2: Conditional Job Execution (Week 1)
```yaml
jobs:
  unit-tests:
    if: |
      github.event_name == 'pull_request' ||
      startsWith(github.ref, 'refs/heads/epic/') ||
      startsWith(github.ref, 'refs/heads/main')
```

### Phase 3: Workflow Splitting (Week 1)
Create separate workflows:
- `quick-check.yml` - Feature branches (lint only)
- `quality-gates-lite.yml` - Epic branches (lint + unit)
- `quality-gates-full.yml` - PRs and main (full suite)

### Phase 4: Pre-commit Enhancement (Week 1)
Strengthen local hooks to catch more issues:
```bash
# .husky/pre-commit
pnpm lint-staged
pnpm typecheck
pnpm test:unit --affected --passWithNoTests
```

### Phase 5: Concurrency Groups (Week 2)
Cancel outdated workflow runs:
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**Estimated Savings**: 15-20% from cancelled redundant runs

---

## 📋 Risk Mitigation

### Risk: Missing bugs without CI on feature branches
**Mitigation**:
- ✅ Robust pre-commit hooks
- ✅ Full CI on epic branches
- ✅ Comprehensive PR validation
- ✅ Local E2E test documentation

### Risk: Long feedback cycle for developers
**Mitigation**:
- ✅ Pre-commit hooks provide instant feedback (<30s)
- ✅ Epic branch CI gives integration validation
- ✅ Document local testing procedures

### Risk: Bad code reaches develop
**Mitigation**:
- ✅ Full Quality Gates on PR to develop
- ✅ Branch protection rules
- ✅ Required code reviews

---

## 📊 Success Metrics

Track monthly:
- ✅ CI/CD minutes consumed (<3000)
- ✅ Pre-commit hook failure rate (should be high = working)
- ✅ PR rejection rate (should be low = quality maintained)
- ✅ Production bugs (should remain constant or decrease)

---

## 🔄 Review Schedule

- **Weekly**: Check actual usage vs. projections
- **Monthly**: Adjust strategy based on actual consumption
- **Quarterly**: Evaluate if paid GitHub plan is justified

---

## 🎓 Developer Guidelines

### When to run what:

| Action | Where | Why |
|--------|-------|-----|
| Code changes | Pre-commit hook | Instant local feedback |
| Feature development | Local only | Fast iteration |
| Epic integration | Epic branch CI | Integration validation |
| Ready for review | Open PR | Full quality check |
| Production merge | Main branch CI | Final validation |

### Local Testing Commands:
```bash
# Quick checks (pre-commit will run these)
pnpm lint
pnpm typecheck
pnpm test:unit

# Integration testing (run before PR)
pnpm test:integration

# E2E testing (run before final PR approval)
pnpm test:e2e

# Full local validation (before PR)
pnpm test:all
```

---

## ✅ Next Steps

1. [ ] Review and approve this strategy
2. [ ] Implement Phase 1 (caching)
3. [ ] Create split workflows
4. [ ] Update pre-commit hooks
5. [ ] Document developer workflow
6. [ ] Monitor usage for 1 week
7. [ ] Adjust based on actual consumption
