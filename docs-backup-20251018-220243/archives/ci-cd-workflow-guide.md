# CI/CD Workflow Guide
## Developer Best Practices for Budget-Optimized CI/CD

**Last Updated**: 2025-10-10
**Monthly Budget**: 3000 minutes GitHub Actions (Free Tier)
**Strategy**: Tiered CI/CD with local-first development

---

## 🎯 Quick Reference

| Your Branch | What Runs | Duration | When |
|-------------|-----------|----------|------|
| `feature/*`, `story/*` | Lint + Type Check only | ~2-3 min | Every push |
| `epic/*` | Lint + Type Check + Unit Tests | ~5-7 min | Every push |
| PR → `develop` | **Full Quality Gates** | ~20-25 min | PR open/update |
| `main`, `develop` | **Full Quality Gates** | ~30-35 min | Push to branch |

---

## 💻 Local Development Workflow

### Before Every Commit (Automatic)
Pre-commit hooks will automatically run:
```bash
✓ ESLint --fix
✓ Prettier format
✓ TypeScript type check
✓ Unit tests (affected files only)
```

**If pre-commit fails**, fix the issues before pushing:
```bash
pnpm lint          # Check what's wrong
pnpm format        # Auto-fix formatting
pnpm typecheck     # Check type errors
pnpm test:unit     # Run unit tests
```

### Before Opening a PR (Manual)
Run comprehensive local validation:
```bash
# Full validation
pnpm test:all

# Or step by step:
pnpm lint && pnpm typecheck      # Syntax/style
pnpm test:unit                   # Fast unit tests
pnpm test:integration            # Database integration
pnpm test:e2e                    # Full E2E (optional)
```

---

## 🔄 CI/CD Workflow by Branch Type

### Tier 1: Feature/Story Branches
**Pattern**: `feature/*`, `story/*`
**CI Jobs**: Lint + Type Check only
**Why**: Fast feedback for syntax issues; rely on pre-commit hooks

```bash
# What runs in CI
✓ ESLint
✓ TypeScript type check

# What doesn't run
✗ Unit tests (use pre-commit hooks)
✗ Integration tests (run on epic merge)
✗ E2E tests (run on PR)
```

**Best Practice**:
- Push frequently for fast feedback
- Trust your pre-commit hooks
- Run local tests before merging to epic

### Tier 2: Epic Branches
**Pattern**: `epic/*`
**CI Jobs**: Lint + Type Check + Unit Tests
**Why**: Integration validation without expensive E2E tests

```bash
# What runs in CI
✓ ESLint
✓ TypeScript type check
✓ Unit tests (backend + web in parallel)

# What doesn't run
✗ Integration tests (run on PR)
✗ E2E tests (run on PR)
```

**Best Practice**:
- Merge features to epic frequently
- Epic CI validates integration quality
- Run integration tests locally before PR

### Tier 3: Pull Requests to `develop`
**Pattern**: PR from any branch → `develop`
**CI Jobs**: **Full Quality Gates** (optimized)
**Why**: Comprehensive validation before merge

```bash
# What runs in CI
✓ ESLint + Type check
✓ Unit tests (backend + web)
✓ Integration tests
✓ E2E tests (2 shards) ⚡ Optimized
✓ Security scan
✓ Bundle size check
```

**Optimizations**:
- E2E tests run in 2 shards (instead of 4) = 40% faster
- Aggressive caching (pnpm store, Playwright browsers)
- Concurrency groups cancel outdated runs

**Best Practice**:
- Open PR only when ready for review
- Ensure local tests pass first
- CI failures block merge (by design)

### Tier 4: Main/Develop Branch
**Pattern**: Push to `main` or `develop`
**CI Jobs**: **Full Quality Gates** (complete)
**Why**: Production-ready validation

```bash
# What runs in CI
✓ All Tier 3 jobs
✓ E2E tests (4 shards) - Full coverage
✓ Performance tests
✓ Production deployment
```

---

## 🚀 Optimized Development Workflow

### Starting a New Feature
```bash
# 1. Create feature branch
git checkout -b feature/user-profile-edit

# 2. Develop with fast local feedback
#    Pre-commit hooks run automatically on each commit

# 3. Merge to epic when feature complete
git checkout epic/user-management
git merge feature/user-profile-edit
git push  # Triggers epic CI (lint + unit tests)

# 4. Open PR when epic is ready
gh pr create --base develop --title "Epic: User Management"
# Full Quality Gates run on PR
```

### Working on Epic Branches
```bash
# Epic branch workflow
git checkout epic/user-management

# Develop multiple features in parallel
git checkout -b feature/user-avatar
# ... develop feature ...
git checkout epic/user-management
git merge feature/user-avatar
git push  # CI: lint + unit tests (~6 min)

# Before opening PR, run full local validation
pnpm test:all

# Open PR when ready
gh pr create --base develop
# CI: Full Quality Gates (~22 min)
```

### Hotfix Workflow
```bash
# Hotfixes go directly to main (after review)
git checkout -b hotfix/critical-bug
# ... fix bug ...
pnpm test:all  # Local validation first

gh pr create --base main --title "Hotfix: Critical Bug"
# CI: Full Quality Gates with 4-shard E2E (~32 min)
```

---

## ⚡ Performance Tips

### Maximize Cache Hits
- Don't modify `pnpm-lock.yaml` unless necessary
- Don't modify `apps/web/package.json` (Playwright cache) unless necessary
- Cache hit = 30-40% faster CI

### Cancel Outdated Runs
- Force-push triggers automatic cancellation
- Saves CI minutes on rapid iteration

### Batch Your Work
- Avoid pushing every tiny commit
- Batch related changes into meaningful commits
- Use `git commit --amend` for small fixes

### Use Local Testing
```bash
# Fast local iteration
pnpm test:unit --watch          # Watch mode
pnpm test:unit --bail           # Stop on first failure
pnpm test:unit --onlyChanged    # Test changed files only
```

---

## 📊 CI/CD Budget Tracking

### Monthly Budget Breakdown
| Tier | Branch Pattern | Est. Usage |
|------|---------------|------------|
| 1 | `feature/*`, `story/*` | 750 min |
| 2 | `epic/*` | 900 min |
| 3 | PR → `develop` | 1,320 min |
| 4 | `main`, `develop` pushes | 960 min |
| **Total** | | **~3,930 min** |

**Current Status**: Slightly over budget (930 min/month)

### Optimization Strategies
1. ✅ **Implemented**: Reduced E2E shards on PRs (2 vs 4)
2. ✅ **Implemented**: Aggressive caching (pnpm + Playwright)
3. ✅ **Implemented**: Concurrency groups (cancel outdated runs)
4. 🔄 **Consider**: Skip CI on feature branches entirely (save 750 min)
5. 🔄 **Consider**: Run E2E only on PR approval (not every push)

---

## 🛠️ Troubleshooting

### "CI is taking too long"
- **Check cache hit rate**: Look for "Cache hit: true" in logs
- **Run tests locally first**: Catch issues before CI
- **Use concurrency cancellation**: Force-push to cancel old runs

### "Pre-commit hook is slow"
```bash
# Skip pre-commit for minor changes (use sparingly)
git commit --no-verify -m "docs: update README"

# Or optimize hook by limiting test scope
# Edit .husky/pre-commit to skip heavy tests
```

### "I need to test E2E locally"
```bash
# Start services
docker compose up -d

# Run E2E tests
cd apps/web
pnpm test:e2e

# Or run specific test
pnpm test:e2e tests/auth.spec.ts
```

### "GitHub Actions quota exceeded"
**Short-term**:
- Reduce feature branch pushes
- Run more tests locally
- Batch commits

**Long-term**:
- Consider GitHub Pro ($4/month for 3,000 additional minutes)
- Implement self-hosted runners (requires infrastructure)

---

## 📚 Additional Resources

- **CI/CD Strategy Doc**: `.claude/docs/ci-cd-optimization-strategy.md`
- **Workflow Files**:
  - `.github/workflows/quick-check.yml` (Tier 1)
  - `.github/workflows/quality-gates-lite.yml` (Tier 2)
  - `.github/workflows/quality-gates.yml` (Tier 3 & 4)
- **Pre-commit Hooks**: `.husky/pre-commit`

---

## ✅ Quick Checklist

Before pushing code:
- [ ] Pre-commit hooks passed
- [ ] Local unit tests pass
- [ ] TypeScript compiles without errors
- [ ] ESLint shows no warnings

Before opening PR:
- [ ] Full local test suite passes (`pnpm test:all`)
- [ ] Integration tests verified locally
- [ ] E2E tests run (at least critical paths)
- [ ] Code reviewed by yourself first

Before merging to `main`:
- [ ] PR approved by reviewer
- [ ] CI Quality Gates are green
- [ ] No merge conflicts
- [ ] Changelog updated (if applicable)

---

**Remember**: Local testing is faster, cheaper, and gives instant feedback. Use CI/CD for validation, not exploration.
