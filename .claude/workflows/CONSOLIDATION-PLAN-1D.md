# PHASE 1.D: CI/CD Workflow Consolidation Plan

**Status**: In Progress
**Branch**: `refactor/consolidate-workflows`
**Timeline**: 3-4 hours implementation + 1 week validation

## 📊 Current State Analysis

### **ci-cd.yml Structure**
- ✅ Foundation job (health check)
- ✅ Development job (lint + typecheck)
- ✅ 3-tier security jobs (lightweight → enhanced → comprehensive)
- ✅ Testing job (unit, integration, performance)
- ✅ Build job (backend/web/mobile matrix)
- ✅ Summary job

**Triggers**: `push: [main, develop]`, `pull_request: [main, develop]`

### **quality-gates.yml Structure**
- ❌ DUPLICATE: lint-and-typecheck job
- ❌ DUPLICATE: unit-tests job
- ❌ DUPLICATE: integration-tests job
- ✅ UNIQUE: e2e-tests job (sharded 2-4 shards)
- ✅ UNIQUE: performance-tests job (more detailed)
- ✅ UNIQUE: security-scan job (Trivy + npm audit)
- ✅ UNIQUE: bundle-size job (PR-only)
- ✅ UNIQUE: quality-report job (summary)
- ✅ UNIQUE: deploy-preview job (PR-only)

**Triggers**: `push: [main, develop]`, `pull_request: [main, develop]`

### **quality-gates-lite.yml Structure**
- ❌ DUPLICATE: lint-and-typecheck job
- ❌ DUPLICATE: unit-tests job

**Triggers**: `push: [epic/*]`

---

## 🎯 Consolidation Strategy

### **Phase 1.D.1: Merge quality-gates.yml into ci-cd.yml**

**Steps**:
1. Add E2E tests job (with sharding logic)
2. Enhance performance-tests with detailed metrics
3. Add Trivy security scanning to comprehensive-security job
4. Add bundle-size job (PR-only conditional)
5. Add quality-report job (summary dependencies)
6. Add deploy-preview job (PR-only conditional)
7. Extend triggers to include `epic/*` branches

**Jobs to ADD to ci-cd.yml**:
```yaml
# After build job, add:
e2e-tests:          # Lines 804-902
performance-tests:  # Enhanced
security-scan:      # Trivy job
bundle-size:        # PR-only
quality-report:     # Enhanced summary
deploy-preview:     # PR-only
```

### **Phase 1.D.2: Branch-Based Tier Detection**

Add tier detection logic to foundation job:
```yaml
foundation:
  outputs:
    tier: ${{ steps.detect-tier.outputs.tier }}
  steps:
    - id: detect-tier
      run: |
        if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
          echo "tier=3" >> $GITHUB_OUTPUT  # Comprehensive
        elif [[ "${{ github.ref }}" == "refs/heads/develop" || "${{ github.base_ref }}" == "main" ]]; then
          echo "tier=2" >> $GITHUB_OUTPUT  # Enhanced
        else
          echo "tier=1" >> $GITHUB_OUTPUT  # Lightweight
        fi
```

### **Phase 1.D.3: Delete Redundant Workflows**

```bash
rm .github/workflows/quality-gates.yml
rm .github/workflows/quality-gates-lite.yml
```

---

## 🔧 Implementation Details

### **E2E Tests Job (Unique from quality-gates.yml)**

Location in quality-gates.yml: Lines 265-408

```yaml
e2e-tests:
  name: 🧪 E2E Tests
  runs-on: ubuntu-latest
  timeout-minutes: 50
  if: |
    github.event_name == 'push' ||
    (github.event_name == 'pull_request' && github.event.action == 'ready_for_review')
  strategy:
    matrix:
      shard: ${{ github.event_name == 'pull_request' && fromJSON('[1, 2]') || fromJSON('[1, 2, 3, 4]') }}
  services:
    postgres: ...
    redis: ...
```

**Key Differences from ci-cd.yml**:
- Uses Playwright with browser caching (performance optimization)
- Smart sharding: 2 shards for PRs, 4 for main
- Separate E2E testing (not part of testing job)
- Test result artifacts upload

### **Bundle Size Job (PR-only)**

Location in quality-gates.yml: Lines 554-629

Conditional execution:
```yaml
if: github.event_name == 'pull_request'
```

### **Security Scan Job (Consolidate Trivy)**

Location in quality-gates.yml: Lines 527-552

**Consolidation approach**:
- Move Trivy scanning to `security-comprehensive` job
- Keep npm audit in enhanced/comprehensive
- Single consolidated Trivy scan instead of 6 separate runs

### **Quality Report Job (Enhanced)**

Location in quality-gates.yml: Lines 631-662

**Dependencies**: `[lint-and-typecheck, unit-tests, integration-tests, e2e-tests]`

### **Deploy Preview Job (PR-only)**

Location in quality-gates.yml: Lines 664-688

Conditional execution:
```yaml
if: github.event_name == 'pull_request'
```

---

## ✅ Execution Matrix (Post-Consolidation)

| Branch | Tier | Jobs Executed | Duration | Cost/Month |
|--------|------|---------------|----------|------------|
| `feature/*` | 1 | Lint + Unit | 5-7 min | ~900 min |
| `epic/*` | 1 | Lint + Unit | 5-7 min | ~900 min |
| `develop` PR | 2 | + Integration + E2E 2-shard | 15-20 min | ~1,200 min |
| `develop` push | 2 | + Integration + E2E 2-shard | 15-20 min | ~1,200 min |
| `main` PR | 3 | + E2E 4-shard + Bundle | 25-30 min | ~1,500 min |
| `main` push | 3 | + E2E 4-shard + Performance | 30-35 min | ~1,000 min |

**Total**: 4,600 min/month (vs current 6,500 = 29% savings)

---

## 🧪 Testing Checklist

### **Validation Tests** (Before committing)

- [ ] **Tier 1 (Feature Branch)**:
  - Push to feature/test-ci → Verify: foundation + development + security-lightweight only
  - Should complete in ~5-7 minutes

- [ ] **Tier 1 (Epic Branch)**:
  - Push to epic/test-ci → Verify: foundation + development + security-lightweight only
  - Should complete in ~5-7 minutes

- [ ] **Tier 2 (Develop PR)**:
  - Create PR to develop → Verify: + security-enhanced + testing + e2e-tests (2 shards)
  - Should complete in ~15-20 minutes

- [ ] **Tier 2 (Develop Push)**:
  - Push to develop → Same as Tier 2 PR

- [ ] **Tier 3 (Main PR)**:
  - Create PR to main → Verify: + security-comprehensive + e2e-tests (4 shards) + bundle-size
  - Should complete in ~25-30 minutes

- [ ] **Tier 3 (Main Push)**:
  - Push to main → Verify: + performance-tests
  - Should complete in ~30-35 minutes

### **Dependency Tests**

- [ ] `summary` job waits for all jobs correctly
- [ ] `quality-report` job aggregates results
- [ ] E2E sharding logic correctly switches 2 ↔ 4 shards

### **Output Validation**

- [ ] Lint errors detected and reported
- [ ] Type errors detected and reported
- [ ] Unit test failures block pipeline
- [ ] E2E failures reported with shard info
- [ ] Bundle size warnings for PRs
- [ ] Security scans produce SARIF reports

---

## 🚨 Risk Mitigation

### **High-Risk Items**

1. **E2E Sharding Logic**: Complex conditional shard assignment
   - Mitigation: Test on feature branch first
   - Verify: 2 shards for PR, 4 for push

2. **Job Dependencies**: Multiple job dependencies in quality-report
   - Mitigation: Use `needs: [job1, job2, ...]` syntax
   - Verify: Summary waits for all

3. **Conditional Execution**: Complex tier-based conditionals
   - Mitigation: Test each tier independently
   - Verify: No jobs run outside tier scope

### **Rollback Plan**

If consolidation fails:
1. Keep backup of original workflows in `_archive/` folder
2. Restore from git history: `git checkout HEAD -- .github/workflows/`
3. Re-add quality-gates.yml and quality-gates-lite.yml
4. Revert feature branch

---

## 📝 Commit Strategy

### **Commit 1**: Add unique jobs to ci-cd.yml
```
feat(ci-cd): add e2e, bundle-size, and deploy-preview jobs

- Add E2E tests with smart sharding (2 PRs, 4 main)
- Add bundle size checking for PRs
- Add quality report aggregation
- Add deploy preview for PRs
- Preserve progressive security model
```

### **Commit 2**: Delete redundant workflows
```
refactor(ci-cd): consolidate workflows - delete redundant files

- Delete quality-gates.yml (merged into ci-cd.yml)
- Delete quality-gates-lite.yml (functionality in Tier 1)
- Update references in scripts and documentation
```

### **Commit 3**: Documentation updates
```
docs(ci-cd): update CI/CD documentation for consolidated workflow

- Document new job structure
- Update execution matrix
- Add tier detection explanation
- Update pinning guidelines for 4 workflows
```

---

## 📌 Next Steps

1. [ ] Verify this plan with specialist agents
2. [ ] Create feature branch: `refactor/consolidate-workflows`
3. [ ] Execute Phase 1.D.1: Merge jobs into ci-cd.yml
4. [ ] Execute Phase 1.D.2: Add tier detection
5. [ ] Execute Phase 1.D.3: Delete redundant files
6. [ ] Run comprehensive testing on all tiers
7. [ ] Create PR with all changes
8. [ ] Verify CI/CD passes on PR
9. [ ] Merge to main
10. [ ] Delete feature branch
11. [ ] Pin 4 workflows in GitHub Actions settings

---

**Created**: 2025-10-17
**Phase**: 1.D (Critical Path)
**Complexity**: High (Multiple workflows, complex conditionals)
**Estimated Time**: 3-4 hours + 1 week validation
