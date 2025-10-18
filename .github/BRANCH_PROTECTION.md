# Branch Protection Rules - MoneyWise

**Date Applied:** 2025-10-18
**Status:** ✅ Active & Enforced
**Applied Via:** GitHub API (`gh api` CLI)

---

## Protected Branches

### main
- **Purpose:** Production-ready release branch
- **Protection Level:** MAXIMUM
- **Protections Applied:**
  - ✅ Require pull request reviews before merging
  - ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - ✅ Require code review from Code Owners
  - ✅ Dismiss stale PR approvals when new commits are pushed
  - ✅ Restrict who can push to matching branches (only admins)
  - ✅ Include administrators in restrictions

### develop
- **Purpose:** Integration branch for feature development
- **Protection Level:** HIGH
- **Protections Applied:**
  - ✅ Require pull request reviews before merging
  - ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - ✅ Dismiss stale PR approvals when new commits are pushed

### gh-pages
- **Purpose:** GitHub Pages deployment branch
- **Protection Level:** HIGH
- **Protections Applied:**
  - ✅ Require pull request reviews before merging
  - ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging

### safety/*
- **Purpose:** Critical security and hotfix branches
- **Protection Level:** HIGH
- **Protections Applied:**
  - ✅ Require pull request reviews before merging
  - ✅ Require status checks to pass before merging
  - ✅ Require branches to be up to date before merging
  - ✅ Restrict who can push to matching branches (only admins)

---

## Status Checks Required

Before any branch can be merged, ALL of the following must PASS:

### CI/CD Pipeline (GitHub Actions)
- ✅ **ci-cd** - Main continuous integration workflow
  - Linting (ESLint, TypeScript)
  - Type checking
  - Unit tests
  - Integration tests
  - Build verification

- ✅ **specialized-gates** - Quality gates workflow
  - Additional validation rules
  - Custom health checks

- ✅ **codeql** - Security scanning
  - CodeQL analysis for vulnerabilities
  - SARIF report generation

- ✅ **release** - Release workflow (main branch only)
  - Automated release generation
  - Changelog creation
  - Docker image builds

---

## Code Review Requirements

### For main branch
- **Minimum Reviews:** 1 (in addition to Code Owners)
- **Dismissal Rules:** Auto-dismiss stale approvals on new commits
- **Code Owners:** Required approval (via `.github/CODEOWNERS`)

### For develop, gh-pages, safety/* branches
- **Minimum Reviews:** 1
- **Dismissal Rules:** Auto-dismiss stale approvals on new commits

---

## Enforcement Rules

### 1. No Direct Pushes
- All changes require pull request review
- Direct commits to protected branches are **REJECTED**
- Emergency hotfixes use `safety/` branches (still require PR)

### 2. ZERO TOLERANCE CI/CD
- **EVERY** pull request must pass:
  - Levels 1-8: Local pre-push validation (linting, types, tests)
  - Levels 9-10: Local workflow simulation (act)
  - All GitHub Actions workflows must pass
- Failing status checks block merging
- Green status checks are NOT optional

### 3. Branch Currency
- Branches must be up to date with protected branch before merging
- Automatic merge is NOT allowed without current status

### 4. Stale Approvals
- Pull request approvals become invalid when new commits are pushed
- Reviewers must re-approve after code changes
- Prevents outdated approvals from slipping through

---

## Enforcement Setup

### How to Apply (via CLI)
```bash
# Main branch - maximum protection
gh api repos/kdantuono/money-wise/branches/main/protection \
  -X PUT -F require_pull_request_reviews.required_approving_review_count=1 \
  -F require_pull_request_reviews.dismiss_stale_reviews=true \
  -F require_status_checks=true \
  -F restrict_who_can_push.teams=[] \
  -F restrict_who_can_push.users=[]

# For all protected branches - enable status checks
gh api repos/kdantuono/money-wise/branches/{branch}/protection \
  -X PUT -F required_status_checks.strict=true
```

### How to Verify
```bash
# Check a specific branch protection
gh api repos/kdantuono/money-wise/branches/main/protection

# List all protected branches
gh api repos/kdantuono/money-wise/branches --jq '.[] | select(.protected == true) | .name'
```

---

## Emergency Override

### Situation: Critical Production Hotfix
When immediate deployment is required:

1. **Create hotfix branch** from main:
   ```bash
   git checkout -b safety/critical-hotfix main
   ```

2. **Make minimal fix** (test locally with ZERO TOLERANCE levels 1-10)

3. **Create pull request** with:
   - Clear description of emergency
   - Link to incident
   - Minimal scope (only necessary changes)

4. **Get expedited review** (same PR review requirements still apply)

5. **Merge to main** with all status checks passing

6. **Deploy immediately** via release workflow

**Note:** `safety/` branches are protected like production branches. Even hotfixes require PR review and passing status checks. Emergency is NOT an excuse to bypass validation.

---

## CODEOWNERS

Path: `.github/CODEOWNERS`

Active code owners review all changes to their respective areas:
- Backend: NestJS API, database migrations
- Frontend: React components, Next.js pages
- Shared: Types, utilities, shared libraries
- CI/CD: GitHub Actions workflows, validation scripts

---

## Local Pre-Push Validation

### MANDATORY Before Any Push

All developers must run ZERO TOLERANCE validation before pushing:

```bash
# Automatic: git push will run this pre-push hook
# Manual: for testing/validation
./.claude/scripts/validate-ci.sh 10
```

**Levels 1-10 Status:**
- Levels 1-8: Blocking (pre-push)
- Levels 9-10: Blocking (comprehensive - NEW)
- Requirements:
  - act installed (for workflow simulation)
  - Docker running (for act execution)

---

## Branch Management Workflow

### Creating a Feature Branch
```bash
# Always branch from develop (not main)
git checkout -b feature/your-feature develop
```

### Before Pushing
```bash
# Run ZERO TOLERANCE validation (levels 1-10)
./.claude/scripts/validate-ci.sh 10

# If all levels pass, safe to push
git push origin feature/your-feature
```

### GitHub PR Checklist
- ✅ All ZERO TOLERANCE levels passed locally
- ✅ All status checks pass on GitHub
- ✅ Code review approved by 1+ reviewers
- ✅ Branch is up to date with main/develop
- ✅ All conversations resolved

### Merging to main
1. Feature → PR on develop (gets reviewed)
2. develop → PR on main (gets reviewed)
3. PR on main is merged → automatic release workflow triggers

---

## Communication

### For Questions
- **CI/CD Issues:** See `.claude/MANDATORY_LOCAL_VALIDATION.md`
- **Status Check Failures:** See `.github/workflows/` directory
- **Branch Protection Questions:** Ask team lead
- **Emergency Situations:** Escalate to security team immediately

### For Documentation Updates
- Update this file when rules change
- Keep `.claude/MANDATORY_LOCAL_VALIDATION.md` in sync
- Document any exceptions to rules

---

## Timeline

- **2025-10-18:** Branch protection rules applied via GitHub API
- **2025-10-18:** ZERO TOLERANCE validation system enforced
- **2025-10-18:** Levels 9-10 made mandatory for pre-push

---

**Status:** ✅ COMPLETE & ENFORCED

All branches are now protected with comprehensive rule enforcement. ZERO TOLERANCE CI/CD validation ensures code quality before it reaches GitHub.
