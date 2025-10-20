# CI/CD Validation Warnings - Action Plan

## Executive Summary

Your CI/CD validation script has **2 real issues** to fix and **1 documentation recommendation**:

| Issue | Level | Severity | Status | Fix Time |
|-------|-------|----------|--------|----------|
| Missing timeout-minutes | 6 | HIGH | 25 jobs need it | 10 mins |
| Path filter mismatch | 7 | MEDIUM | 2 patterns wrong | 5 mins |
| Missing SECRETS.md | 5 | LOW | Documentation | 5 mins |

---

## Issue #1: Missing `timeout-minutes` (Level 6)

### Current State
```
25 jobs in: ci-cd.yml (13 jobs)
           release.yml (9 jobs)
           specialized-gates.yml (3 jobs)
```

❌ **Problem**: These jobs have NO timeout set
- GitHub Actions default: 360 minutes (6 hours!)
- If a job hangs, it wastes resources for 6 hours
- Costs money on Actions billing

✅ **Solution**: Add `timeout-minutes: 15` to each job

### Which Jobs Need It?
```
ci-cd.yml:
  - foundation
  - security-enhanced
  - security-comprehensive
  - security-lightweight
  - dependency-security
  - development
  - deploy-preview
  - bundle-size
  - testing
  - build
  - e2e-tests
  - quality-report
  - summary

release.yml:
  - build-backend
  - build-web
  - release-backend
  - release-web
  - post-release

specialized-gates.yml:
  - database-schema-check
  - migration-audit
  - security-gate
```

### How to Fix

Edit `.github/workflows/ci-cd.yml` and add this to EACH job:

```yaml
jobs:
  foundation:                    # ← Your job name
    runs-on: ubuntu-latest
    timeout-minutes: 15          # ← ADD THIS LINE
    steps:
      - uses: actions/checkout@v4
      ...
```

**Recommended timeouts by job type**:
- Foundation/health checks: `timeout-minutes: 5`
- Build jobs: `timeout-minutes: 20`
- Test jobs: `timeout-minutes: 30`
- E2E tests: `timeout-minutes: 45`
- Deployment: `timeout-minutes: 15`

---

## Issue #2: Path Filter Mismatch (Level 7)

### Current State - What the workflow says:
```yaml
# In specialized-gates.yml
paths:
  - 'apps/backend/src/database/migrations/**'
  - 'apps/backend/src/**/*.entity.ts'
```

### Actual Directory Structure:
```
✅ apps/backend/src/core/database/migrations/   ← REAL PATH
❌ apps/backend/src/database/migrations/        ← PATH IN WORKFLOW (WRONG!)

✅ apps/backend/src/**/*.entity.ts              ← Correct (glob pattern works)
```

### The Issue
- Your workflow **looks for** `apps/backend/src/database/migrations/`
- But the actual path is `apps/backend/src/core/database/migrations/`
- **Result**: When you change migrations, this trigger doesn't fire!

### How to Fix

Edit `.github/workflows/specialized-gates.yml`:

**Change from:**
```yaml
paths:
  - 'apps/backend/src/database/migrations/**'
  - 'apps/backend/src/**/*.entity.ts'
```

**Change to:**
```yaml
paths:
  - 'apps/backend/src/core/database/migrations/**'
  - 'apps/backend/src/**/*.entity.ts'
```

---

## Issue #3: Missing SECRETS.md (Level 5) - Documentation

### Current State
✅ Secrets are configured correctly
⚠️ But there's no documentation file

### What's needed
Create `.github/SECRETS.md`:

```markdown
# GitHub Secrets Configuration

This document describes all required secrets for CI/CD workflows.

## Production Secrets (REQUIRED)

### GITHUB_TOKEN
- **Auto-provided by GitHub Actions**
- **Scope**: Repository access for build artifacts
- **Configured**: Yes ✅

### CODECOV_TOKEN
- **For**: Code coverage reporting
- **Source**: https://codecov.io
- **Used in**: ci-cd.yml
- **Setup**: Create account at codecov.io and add token to GitHub Secrets

### SEMGREP_APP_TOKEN
- **For**: Security code scanning
- **Source**: https://semgrep.dev
- **Used in**: ci-cd.yml
- **Setup**: Create account at semgrep.dev and add token to GitHub Secrets

## Release Secrets (REQUIRED for production releases)

### SENTRY_AUTH_TOKEN
- **For**: Sentry error tracking
- **Source**: https://sentry.io
- **Used in**: release.yml
- **Setup**: Create Sentry account and generate auth token

### SENTRY_ORG
- **Value**: Your Sentry organization name
- **Used in**: release.yml

### SENTRY_PROJECT_BACKEND
- **Value**: Your Sentry backend project identifier
- **Used in**: release.yml

### SENTRY_PROJECT_WEB
- **Value**: Your Sentry web project identifier
- **Used in**: release.yml

### SENTRY_PROJECT_MOBILE
- **Value**: Your Sentry mobile project identifier
- **Used in**: release.yml

## Setup Instructions

1. Go to your repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret with the corresponding value
4. No value needed for GITHUB_TOKEN (auto-provided)

## Security Note

⚠️ Never commit secrets to the repository
- Secrets are encrypted
- Only available to Actions workflows
- Not visible in logs
- Rotated regularly (best practice: every 90 days)
```

---

## Action Plan (Step by Step)

### Step 1: Fix Path Filters (5 minutes)
```bash
# 1. Open the file
nano .github/workflows/specialized-gates.yml

# 2. Find the 'paths:' section
# 3. Change 'apps/backend/src/database/migrations/**'
#    to 'apps/backend/src/core/database/migrations/**'

# 4. Save (Ctrl+O, Enter, Ctrl+X)

# 5. Verify
grep -A2 "paths:" .github/workflows/specialized-gates.yml
```

### Step 2: Add Timeouts (10 minutes)
```bash
# 1. Edit ci-cd.yml
nano .github/workflows/ci-cd.yml

# 2. For EACH job, add after 'runs-on:' line:
#    timeout-minutes: [appropriate value]

# 3. Edit release.yml
nano .github/workflows/release.yml

# 4. Add timeouts to all jobs

# 5. Edit specialized-gates.yml
nano .github/workflows/specialized-gates.yml

# 6. Add timeouts to all jobs

# 7. Verify
grep -c "timeout-minutes:" .github/workflows/*.yml
# Should show more timeouts than before
```

### Step 3: Create SECRETS.md (5 minutes)
```bash
# Copy the template above into:
# .github/SECRETS.md
```

### Step 4: Validate Again (2 minutes)
```bash
export PATH="./bin:$PATH" && ./.claude/scripts/validate-ci.sh 10
```

---

## Verification

After making changes, run validation:

```bash
export PATH="./bin:$PATH" && ./.claude/scripts/validate-ci.sh 10
```

**Expected result**:
```
✅ LEVEL 6 PASSED: All jobs have timeout-minutes
✅ LEVEL 7 PASSED: All path filters reference existing paths
✅ LEVEL 5 PASSED: Secrets documentation present
```

---

## Impact of NOT Fixing These

### Path Filter Issue
- ⚠️ Workflow won't trigger on database migration changes
- Result: You might push breaking changes without triggering schema validation
- Severity: MEDIUM

### Missing Timeouts
- 🔴 Hanging jobs run for 6 hours instead of 15 minutes
- Result: GitHub Actions billing goes up significantly
- Severity: HIGH (cost impact)

### Missing SECRETS.md
- 📝 Team members don't know which secrets to set up
- Result: CI/CD breaks for new team members
- Severity: LOW (documentation only)

---

## Files to Modify

1. `.github/workflows/ci-cd.yml` - Add timeouts to 13 jobs
2. `.github/workflows/release.yml` - Add timeouts to 9 jobs
3. `.github/workflows/specialized-gates.yml` - Fix paths + add timeouts to 3 jobs
4. `.github/SECRETS.md` - Create new file

**Total time to fix**: ~20 minutes
**Complexity**: LOW (text edits only)
