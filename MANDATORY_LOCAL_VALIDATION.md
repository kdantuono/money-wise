# 🚨 MANDATORY: Local CI/CD Validation Before Push

## The Rule

**NEVER push code without running local CI/CD validation first.**

This is now enforced by Git hooks and is BLOCKING for all commits.

---

## Quick Start

```bash
# Run pre-push validation (all levels 1-8)
./.claude/scripts/validate-ci.sh

# If you want to push anyway (emergencies only)
git push --no-verify
```

---

## What Gets Validated

| Level | Check | Time | Blocking |
|-------|-------|------|----------|
| 1 | YAML Syntax | 5s | ✅ YES |
| 2 | GitHub Actions Syntax | 10s | ✅ YES |
| 3 | Workflow Permissions | 5s | ✅ YES |
| 4-8 | Job Dependencies, Secrets, Timeouts, Paths | 30s | ✅ YES |
| 9 | Act Dry-Run (optional) | 30s | ⚠️ INFO |
| 10 | Full Act Test (manual) | 5-10min | ⚡ MANUAL |

**Total pre-push time: ~45 seconds**

---

## Why This Matters

### Cost Impact
- Each failed GitHub Actions run: **5-10 minutes wasted**
- Each failed run: **$0.01-$0.50 in GitHub Actions minutes**
- Multiple failed runs on one branch: **50+ minutes lost**

### Your Workflow
```
OLD (❌ Bad):
  code → push → CI fails → analyze → fix → push → CI fails again

NEW (✅ Good):
  code → validate locally (45s) → push → CI passes immediately
```

### Team Impact
- Faster PR reviews (no failing CI to debug)
- Reduced GitHub Actions quota usage
- More time for actual development
- Respect for shared infrastructure

---

## What Happens When You Push

### 1. Git Hook Triggers Automatically
```
$ git push
🚨 ZERO TOLERANCE: Running local CI/CD validation before push...

🔍 LEVEL 1: YAML Syntax Validation
✅ LEVEL 1 PASSED

🔍 LEVEL 2: GitHub Actions Syntax Validation
✅ LEVEL 2 PASSED

... (levels 3-8)

✅ ALL VALIDATIONS PASSED - Proceeding with push
```

### 2. If Validation Fails
```
$ git push
❌ LEVEL 1 FAILED: Fix YAML syntax errors
❌ PUSH BLOCKED - Fix errors before pushing
```

**Action**: Fix the error shown, then try pushing again.

---

## Manual Validation

If you want to run validation before committing:

```bash
# Quick validation (levels 1-3, ~20 sec)
./.claude/scripts/validate-ci.sh 3

# Full pre-push validation (levels 1-8, ~45 sec)
./.claude/scripts/validate-ci.sh 8

# Comprehensive (levels 1-10, ~15 min, requires Docker)
./.claude/scripts/validate-ci.sh 10
```

---

## Emergency Bypass

⚠️ **ONLY for true emergencies** - Bypasses all validation

```bash
git push --no-verify
```

**When to use**: Critical hotfix, production emergency
**NEVER use for**: Regular development, feature branches

---

## Troubleshooting

### "yamllint not found"
```bash
pip install yamllint
```

### "Validation failed but I don't understand why"
```bash
# Run with verbose output
bash ./.claude/scripts/ci-validation/level-1-yaml-syntax.sh
```

### "I need to disable git hooks"
```bash
# Temporarily uninstall hooks
./.claude/scripts/setup-git-hooks.sh uninstall

# Re-enable later
./.claude/scripts/setup-git-hooks.sh install
```

---

## Standards

This ZERO TOLERANCE validation system enforces:

- ✅ **All YAML must be valid** - Prevents config errors
- ✅ **All permissions must be correct** - Prevents "access denied" errors
- ✅ **All job dependencies must exist** - Prevents "job not found" errors
- ✅ **All secrets must be documented** - For team reference
- ✅ **All jobs must have timeouts** - Prevents runaway jobs

---

## Questions?

- **Setup issues**: See `.claude/scripts/setup-git-hooks.sh`
- **Validation issues**: See `.claude/scripts/ci-validation/`
- **How it works**: See CLAUDE.md (ZERO TOLERANCE section)

---

**Status**: ✅ ACTIVE
**Introduced**: 2025-01-18
**Target**: 90%+ first-push success rate
