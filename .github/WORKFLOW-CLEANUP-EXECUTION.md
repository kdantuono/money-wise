# CI/CD Workflow Cleanup - Execution Guide

## Quick Reference

**Status:** Phase 2 ready for execution
**Effort:** ~30-45 minutes
**Risk Level:** LOW (cleanup only, no active workflow changes)
**Rollback:** Simple - restore from git history

---

## Phase 2: Cleanup Execution

### Step 1: Verify Current State

```bash
# List all workflow files
ls -la /home/nemesi/dev/money-wise/.github/workflows/

# Expected output:
# - 6 .yml files (active)
# - 4 .disabled files (to delete)
```

### Step 2: Delete Disabled Workflow Files

```bash
# Navigate to repository
cd /home/nemesi/dev/money-wise

# Delete disabled files one by one (safer than wildcard)
rm .github/workflows/migrations.yml.disabled
rm .github/workflows/progressive-ci-cd.yml.disabled
rm .github/workflows/security.yml.disabled
rm .github/workflows/sentry-release.yml.disabled

# Verify deletion
ls .github/workflows/*.disabled 2>/dev/null && echo "ERROR: Still found disabled files" || echo "SUCCESS: All .disabled files removed"
```

### Step 3: Delete Archived Workflows Directory

```bash
# Backup reference (optional)
# tar -czf ~/.backup/workflows-archive-$(date +%Y%m%d).tar.gz .github/workflows-archive/

# Delete archived workflows
rm -rf .github/workflows-archive/

# Verify deletion
[ -d .github/workflows-archive ] && echo "ERROR: Directory still exists" || echo "SUCCESS: workflows-archive removed"
```

### Step 4: Delete Backup Workflows Directory

```bash
# Backup reference (optional)
# tar -czf ~/.backup/workflows-backup-$(date +%Y%m%d).tar.gz .github/workflows.backup/

# Delete backup workflows
rm -rf .github/workflows.backup/

# Verify deletion
[ -d .github/workflows.backup ] && echo "ERROR: Directory still exists" || echo "SUCCESS: workflows.backup removed"
```

### Step 5: Verify Final State

```bash
# List remaining workflows
echo "=== ACTIVE WORKFLOWS ==="
ls -1 .github/workflows/*.yml

# Expected (6 files):
# - ci-cd.yml
# - codeql.yml
# - quality-gates.yml
# - quality-gates-lite.yml
# - release.yml
# - specialized-gates.yml

# Check no disabled/archived files remain
echo ""
echo "=== CHECKING FOR OBSOLETE FILES ==="
if [ $(ls -1 .github/workflows/*.disabled 2>/dev/null | wc -l) -eq 0 ]; then
  echo "✓ No .disabled files"
else
  echo "✗ ERROR: Found .disabled files"
fi

if [ ! -d .github/workflows-archive ]; then
  echo "✓ workflows-archive removed"
else
  echo "✗ ERROR: workflows-archive still exists"
fi

if [ ! -d .github/workflows.backup ]; then
  echo "✓ workflows.backup removed"
else
  echo "✗ ERROR: workflows.backup still exists"
fi

echo ""
echo "=== GIT STATUS ==="
git status
```

### Step 6: Commit Changes

```bash
# Stage all changes
git add -A

# Verify changes
git status

# Commit with descriptive message
git commit -m "chore(ci/cd): remove obsolete workflows - disabled, archived, and backup files

- Remove 4 disabled workflow files
- Remove workflows-archive/ directory (7 archived workflows)
- Remove workflows.backup/ directory (5 backup workflows)

These workflows have been superseded by consolidated workflows:
- ci-cd.yml (core pipeline with security + builds)
- quality-gates.yml (comprehensive testing suite)
- release.yml (release automation)

Total files removed: 16
Result: Cleaner repository structure, easier workflow maintenance"

# Verify commit
git log --oneline -2
```

### Step 7: Push Changes

```bash
# Push to current branch
git push origin $(git branch --show-current)

# Wait for GitHub to process and confirm push successful
# gh run list --branch $(git branch --show-current) --limit 1

# Or verify with
git log -1 --oneline
```

---

## Complete Execution Script

For faster execution, use this combined script:

```bash
#!/bin/bash
set -e  # Exit on error

echo "=== MONEYWISE CI/CD WORKFLOW CLEANUP ==="
echo ""

cd /home/nemesi/dev/money-wise

# Step 1: Delete disabled files
echo "Step 1: Deleting disabled workflow files..."
rm -f .github/workflows/*.disabled
echo "✓ Deleted .disabled files"

# Step 2: Delete archived directory
echo "Step 2: Deleting workflows-archive directory..."
rm -rf .github/workflows-archive/
echo "✓ Deleted workflows-archive"

# Step 3: Delete backup directory
echo "Step 3: Deleting workflows.backup directory..."
rm -rf .github/workflows.backup/
echo "✓ Deleted workflows.backup"

# Step 4: Verify
echo ""
echo "Step 4: Verifying cleanup..."
WORKFLOW_COUNT=$(ls -1 .github/workflows/*.yml 2>/dev/null | wc -l)
echo "Active workflows: $WORKFLOW_COUNT (expected: 6)"

# Step 5: Git status
echo ""
echo "Step 5: Git status before commit..."
git status

# Step 6: Commit
echo ""
echo "Step 6: Committing changes..."
git add -A
git commit -m "chore(ci/cd): remove obsolete workflows - disabled, archived, and backup files

- Remove 4 disabled workflow files
- Remove workflows-archive/ directory (7 archived workflows)
- Remove workflows.backup/ directory (5 backup workflows)

Total files removed: 16"

# Step 7: Verify commit
echo ""
echo "Step 7: Commit verification..."
git log --oneline -2

echo ""
echo "=== CLEANUP COMPLETE ==="
echo "Next: Push changes with: git push origin <branch>"
```

---

## Validation Checklist

After cleanup execution:

- [ ] No .disabled files remain in .github/workflows/
- [ ] workflows-archive directory deleted
- [ ] workflows.backup directory deleted
- [ ] 6 active workflow files remain (ls .github/workflows/*.yml shows exactly 6)
- [ ] Git commit created with descriptive message
- [ ] Changes pushed to repository
- [ ] GitHub Actions still available for active workflows
- [ ] No CI/CD pipeline disruptions

---

## Rollback Procedure (If Needed)

If something goes wrong, you can easily revert:

```bash
# View commit history
git log --oneline -5

# Revert the cleanup commit
git revert <commit-hash>

# Or if not yet pushed
git reset --hard HEAD~1
git push origin <branch> --force

# Restore from backup (if created)
# tar -xzf ~/.backup/workflows-archive-*.tar.gz
# tar -xzf ~/.backup/workflows-backup-*.tar.gz
```

---

## Expected Results

**Before:**
```
.github/workflows/
├── ci-cd.yml
├── codeql.yml
├── migrations.yml.disabled
├── progressive-ci-cd.yml.disabled
├── quality-gates.yml
├── quality-gates-lite.yml
├── release.yml
├── security.yml.disabled
├── sentry-release.yml.disabled
├── specialized-gates.yml
├── workflows-archive/
│   ├── build.yml
│   ├── coverage.yml
│   ├── dependency-update.yml
│   ├── monitoring.yml
│   ├── performance.yml
│   ├── pr-checks.yml
│   └── test.yml
└── workflows.backup/
    ├── migrations.yml
    ├── progressive-ci-cd.yml
    ├── release.yml
    ├── security.yml
    └── sentry-release.yml
```

**After:**
```
.github/workflows/
├── ci-cd.yml ✓
├── codeql.yml ✓
├── quality-gates.yml ✓
├── quality-gates-lite.yml ✓
├── release.yml ✓
└── specialized-gates.yml ✓
```

---

## Success Criteria

- [ ] Repository size reduced (fewer workflow files)
- [ ] Workflow maintenance simplified
- [ ] No impact on active CI/CD pipelines
- [ ] All 6 active workflows continue to function
- [ ] GitHub Actions dashboard shows same workflows
- [ ] Next PR/push triggers correct workflows

---

## Next Phase: Consolidation (Future)

After cleanup completion, Phase 3 consolidation can begin:

1. Analyze test duplication in ci-cd.yml vs quality-gates.yml
2. Move test jobs to quality-gates.yml
3. Simplify ci-cd.yml to foundation + build only
4. Update quality-gates.yml with workflow_run trigger
5. Test in non-production branch
6. Merge when ready

---

## Notes

- All changes are Git-tracked and reversible
- No active workflows are modified in this phase
- Total execution time: 15-30 minutes
- Risk: VERY LOW (cleanup only)
- Testing: Not required (no code changes)

---

## Support

If issues occur:
1. Check Git status: `git status`
2. Review recent commits: `git log --oneline -5`
3. Verify workflow files: `ls -la .github/workflows/`
4. Review GitHub Actions status page

---

*This execution guide is part of MoneyWise CI/CD optimization project.*
*Last updated: 2025-10-16*
