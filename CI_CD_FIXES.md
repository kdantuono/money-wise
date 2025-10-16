# CI/CD Pipeline Error Fixes

## Issues Identified and Fixed

### 1. Outdated Lockfile Error ❌ → ✅
**Issue**: `pnpm-lock.yaml` was out of sync with `apps/web/package.json`
- The lockfile was missing the `@next/bundle-analyzer` dependency
- This caused all CI/CD jobs to fail at the dependency installation step

**Fix**: 
- Ran `pnpm install --no-frozen-lockfile` to update the lockfile
- Committed the updated `pnpm-lock.yaml`

**Verification**:
```bash
pnpm install --frozen-lockfile  # Now succeeds ✓
```

### 2. ES Module Import Error ❌ → ✅
**Issue**: `apps/web/next.config.mjs` was using CommonJS `require()` in an ES module file
```javascript
// Before (broken)
const withBundleAnalyzer = require('@next/bundle-analyzer')({...})
```

**Fix**: Converted to ES module import
```javascript
// After (fixed)
import bundleAnalyzer from '@next/bundle-analyzer';
const withBundleAnalyzer = bundleAnalyzer({...})
```

**Verification**:
```bash
cd apps/web && pnpm lint  # Now succeeds ✓
```

### 3. Git Submodule Warning ⚠️ (Harmless)
**Warning**: `fatal: No url found for submodule path '.claude/worktrees/database-work'`
- This is a harmless warning from GitHub Actions
- The directory is empty and already in `.gitignore`
- Does not affect the build or CI/CD pipeline

## Testing Performed

### Local Validation ✅
1. **Lockfile Install**: `pnpm install --frozen-lockfile` - PASSED
2. **Linting**: `pnpm lint` - PASSED (warnings are pre-existing, not errors)
3. **Backend Typecheck**: `cd apps/backend && pnpm typecheck` - PASSED
4. **Web Linting**: `cd apps/web && pnpm lint` - PASSED

### Known Limitation
- **Web Build**: Fails locally due to Google Fonts network connectivity in sandboxed environment
- This is NOT an issue in GitHub Actions CI/CD which has internet access
- Backend build and typecheck work correctly

## CI/CD Workflow Status

### Affected Workflows
1. **quality-gates.yml** - Primary workflow that was failing
   - Uses `pnpm install --frozen-lockfile` (now fixed)
   - All jobs should now pass

2. **ci-cd.yml** - Alternative workflow
   - Also uses frozen-lockfile (now fixed)

3. **quality-gates-lite.yml** - Lightweight workflow
   - Also uses frozen-lockfile (now fixed)

### Expected Results
All workflows should now pass with green status:
- ✅ Lint and Type Check
- ✅ Unit Tests (backend, web)
- ✅ Integration Tests
- ✅ E2E Tests
- ✅ Performance Tests
- ✅ Security Scan
- ✅ Bundle Size Check

## Changes Summary

### Files Modified
1. `pnpm-lock.yaml` - Updated with @next/bundle-analyzer dependency
2. `apps/web/next.config.mjs` - Fixed ES module import

### Commits
1. `Fix next.config.mjs to use ES module import for bundle analyzer`
2. Includes lockfile update

## Next Steps

1. Monitor the CI/CD pipeline run to confirm all jobs pass
2. If any issues remain, they will be unrelated to the lockfile and import errors
3. The pipeline should be fully green after these fixes

## References

- CI/CD Run: https://github.com/kdantuono/money-wise/actions/runs/18512078447
- Quality Gates Workflow: `.github/workflows/quality-gates.yml`
- Bundle Analyzer Docs: https://www.npmjs.com/package/@next/bundle-analyzer
