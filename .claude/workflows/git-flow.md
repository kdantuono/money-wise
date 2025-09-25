# Git Flow Workflow - MoneyWise

## 🔴 CRITICAL RULES (NEVER OVERRIDE)

1. **NEVER work directly on main branch**
2. **ALWAYS create feature branches**
3. **COMMIT atomically** (one logical change per commit)
4. **TEST before merge** (no exceptions)
5. **USE conventional commits** format

## Branch Hierarchy

```
main (protected, production-ready)
 └── dev (integration branch)
      └── epic/[epic-name]
           └── story/[story-id]
                └── task/[task-id]
```

## Branch Naming Convention

- **Epic**: `epic/user-authentication`
- **Story**: `story/auth-user-registration`
- **Task**: `task/auth-create-schema`
- **Feature**: `feature/transaction-export`
- **Bugfix**: `fix/issue-123`
- **Hotfix**: `hotfix/critical-security-patch`

## Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (no code change)
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

### Examples
```bash
git commit -m "feat(api): add transaction export endpoint"
git commit -m "fix(auth): resolve JWT expiration issue"
git commit -m "test(frontend): add dashboard component tests"
```

## Workflow Steps

### 1. Starting New Work
```bash
# Update main
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/my-feature

# Or for epic work
git checkout -b epic/epic-name
```

### 2. During Development
```bash
# Commit frequently
git add src/components/NewComponent.tsx
git commit -m "feat(ui): create NewComponent"

# Keep branch updated
git fetch origin
git rebase origin/dev  # or merge if preferred
```

### 3. Before Merge
```bash
# Run all tests
npm test
npm run lint
npm run build

# Update from target branch
git rebase origin/dev

# Push for review
git push -u origin feature/my-feature
```

### 4. Progressive Merge Pattern

#### Task → Story
```bash
# Automatic via orchestrator
.claude/scripts/merge-progressive.sh task/task-id story/story-id epic-name

# Manual
git checkout story/story-id
git merge --no-ff task/task-id
npm test
git branch -d task/task-id
```

#### Story → Epic
```bash
# When all tasks complete
git checkout epic/epic-name
git merge --no-ff story/story-id
npm run test:integration
```

#### Epic → Dev
```bash
# When all stories complete
git checkout dev
git merge --no-ff epic/epic-name
npm run test:e2e
```

#### Dev → Main
```bash
# After full validation
git checkout main
git merge --no-ff dev
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin main --tags
```

## Merge Conflict Resolution

### Automated Resolution
- Package-lock.json: Delete and regenerate
- Generated files: Regenerate from source
- Formatting: Run formatter and accept

### Manual Resolution Required
- Business logic changes
- Database migrations
- API contract changes

### Conflict Process
```bash
# If conflict occurs
git status  # See conflicted files

# Resolve conflicts manually
code conflicted-file.ts

# After resolution
git add .
git commit -m "fix: resolve merge conflicts"

# Verify resolution
npm test
```

## Rollback Procedures

### Rollback Commit
```bash
git revert <commit-hash>
git push
```

### Rollback Merge
```bash
git revert -m 1 <merge-commit-hash>
git push
```

### Emergency Reset
```bash
# Save current state
git tag emergency-backup

# Reset to last known good
git reset --hard <good-commit>
git push --force-with-lease
```

## Protection Rules

### Main Branch
- Require pull request reviews (2 approvers)
- Require status checks to pass
- Require branches to be up to date
- Include administrators in restrictions

### Dev Branch
- Require pull request reviews (1 approver)
- Require status checks to pass
- Dismiss stale PR approvals

## CI/CD Integration

All branches trigger:
- Linting
- Type checking
- Unit tests

Additionally:
- **story/** branches: Integration tests
- **epic/** branches: E2E tests
- **dev**: Full test suite + security scan
- **main**: Deploy to production

## Best Practices

1. **Keep branches short-lived** (max 3 days)
2. **Rebase feature branches** (keep history clean)
3. **Squash commits** when merging minor fixes
4. **Preserve commits** when merging features
5. **Tag releases** with semantic versioning
6. **Document breaking changes** in commit messages