# Phase 4.5+ Major Version Upgrades & Deprecation Resolution

**Status**: 🔄 **IN PROGRESS - Phase 4.8 Next**  
**Risk Level**: 🟡 **MEDIUM-HIGH**  
**Timeline**: December 2025  
**Last Updated**: December 1, 2025

---

## Executive Summary

Phase 4.5+ focuses on major version upgrades and systematic deprecation resolution across the MoneyWise stack. This phase builds on Phase 4's foundation (react-query v5, Vitest 4.x, Vite 6.x) and addresses remaining technical debt through coordinated upgrades with careful dependency tree analysis.

### Strategic Approach

**Sequential Phases with Safety Gates**:
1. ✅ Phase 4.5: ESLint 9 flat config migration (commit 5570288)
2. ✅ Phase 4.6: React 19 migration (commit 57f755a)
3. ✅ Phase 4.7: pnpm 10 upgrade (commit 3c4b8fa)
4. 🔄 Phase 4.8: Turborepo optimization (NEXT)
5. ⏳ Phase 4.9: Final validation & security audit

**Key Principles**:
- ✅ One major change per phase
- ✅ Full test validation between phases
- ✅ Dependency tree impact analysis before each upgrade
- ✅ Rollback checkpoints at each phase
- ✅ Team coordination for breaking changes

---

## Current State Analysis

### Runtime Versions
```json
{
  "node": "v24.11.0",
  "pnpm": "10.11.0",
  "npm": "included in node"
}
```

### Key Dependencies (December 2025)
| Package | Current | Latest | Status |
|---------|---------|--------|--------|
| Next.js | 15.4.7 | 15.4.7 | ✅ Latest |
| React | 19.2.0 | 19.2.0 | ✅ Latest (Phase 4.6) |
| React DOM | 19.2.0 | 19.2.0 | ✅ Latest (Phase 4.6) |
| Turbo | 1.11.2 | 2.x | ⚠️ Major available (Phase 4.8) |
| pnpm | 10.11.0 | 10.x | ✅ Latest (Phase 4.7) |
| Vitest | 4.0.14 | 4.x | ✅ Latest (Phase 4.4) |
| Vite | 6.0.0 | 6.x | ✅ Latest (Phase 4.4) |
| @tanstack/react-query | 5.x | 5.x | ✅ Latest (Phase 4.2) |
| ESLint | 9.x | 9.x | ✅ Latest (Phase 4.5) |

### Deprecation Warnings Inventory

#### Direct Dependencies (5 packages)
```
apps/backend:
  - @types/argon2@0.15.4       → ⚠️ Low priority (types only)
  - @types/uuid@11.0.0          → ⚠️ Replace with built-in types
  - eslint@8.57.1               → ❌ High priority (v9 available)
  - supertest@6.3.4             → ⚠️ Medium priority (testing only)

packages/ui:
  - @storybook/testing-library@0.2.2 → ⚠️ Medium priority
```

#### Subdependencies (34 packages)
**Babel Legacy Plugins** (8 packages):
- `@babel/plugin-proposal-*` → Modern syntax now supported natively
- Impact: Mobile app (react-native), build tooling
- Resolution: React Native upgrade or Metro config

**Build Tools** (6 packages):
- `glob@6.0.4, glob@7.1.6, glob@7.2.3` → Update to glob@10
- `rimraf@2.x, rimraf@3.x` → Update to rimraf@6
- Resolution: Update parent dependencies

**ESLint Legacy** (3 packages):
- `@humanwhocodes/config-array@0.13.0`
- `@humanwhocodes/object-schema@2.0.3`
- Resolution: Upgrade to ESLint 9

**Other Subdependencies** (17 packages):
- XML/DOM parsing, lodash utilities, metro configs
- Resolution: Parent package updates

#### Peer Dependency Warnings
```
react-native@0.72.6
  └── ✕ unmet peer react@18.2.0: found 18.3.1
```
- **Impact**: Mobile app only
- **Risk**: LOW (patch version mismatch)
- **Resolution**: Phase 4.6 - Update react-native or accept warning

---

## Phase 4.5: Deprecation Resolution

**Duration**: 2-3 days  
**Risk**: 🟢 **LOW**  
**Objective**: Eliminate direct dependency deprecation warnings

### 4.5.1: Backend Deprecations

#### Task 1: ESLint 8 → 9 Migration

**Current State**:
```json
// apps/backend/package.json
{
  "devDependencies": {
    "eslint": "^8.57.1"
  }
}
```

**Target State**:
```json
{
  "devDependencies": {
    "eslint": "^9.15.0"
  }
}
```

**Breaking Changes**:
- Flat config format required (no `.eslintrc.js`)
- Plugin resolution changes
- New rule defaults

**Migration Steps**:
```bash
# 1. Update ESLint and plugins
cd apps/backend
pnpm add -D eslint@^9.15.0
pnpm add -D @typescript-eslint/eslint-plugin@^8.15.0
pnpm add -D @typescript-eslint/parser@^8.15.0

# 2. Convert config to flat format
mv .eslintrc.js eslint.config.mjs

# 3. Validate
pnpm lint

# 4. Fix auto-fixable issues
pnpm lint:fix
```

**Flat Config Template**:
```javascript
// apps/backend/eslint.config.mjs
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      // Your existing rules
    },
  },
];
```

**Rollback**:
```bash
git checkout apps/backend/package.json apps/backend/eslint.config.mjs
pnpm install
```

#### Task 2: supertest 6.3.4 → 7.x

**Impact**: Test files only  
**Risk**: 🟢 **LOW**

```bash
cd apps/backend
pnpm add -D supertest@^7.0.0
pnpm test:integration  # Validate
```

**Breaking Changes**: None expected (API compatible)

#### Task 3: @types/* Cleanup

```bash
cd apps/backend

# Remove deprecated @types/uuid (use built-in types)
pnpm remove @types/uuid

# Update @types/argon2 or remove if unnecessary
pnpm add -D @types/argon2@latest
# OR verify if needed: grep -r "import.*argon2" src/
```

### 4.5.2: UI/Storybook Deprecations

```bash
cd packages/ui

# Update @storybook/testing-library
pnpm add -D @storybook/test@latest  # Replacement package

# Update storybook config
# Replace: import { ... } from '@storybook/testing-library'
# With: import { ... } from '@storybook/test'
```

### 4.5.3: Subdependency Resolution Strategy

**Option A: Parent Updates** (Recommended)
- Update packages that depend on deprecated subdependencies
- Safest approach with minimal risk

**Option B: Overrides** (Temporary)
```json
// package.json (root)
{
  "pnpm": {
    "overrides": {
      "glob": "^10.3.10",
      "rimraf": "^6.0.1"
    }
  }
}
```

**Option C: Accept Warnings**
- Document as low-priority for Phase 5
- Focus on direct dependencies first

### Validation Checklist

After Phase 4.5:
- [ ] `pnpm install` shows 0 direct deprecation warnings
- [ ] `pnpm lint` passes all workspaces
- [ ] `pnpm test:unit` passes (backend: 1551+, web: 675+)
- [ ] `pnpm typecheck` passes (0 errors)
- [ ] No new peer dependency warnings
- [ ] ESLint 9 flat config working
- [ ] Document remaining subdependency warnings

---

## Phase 4.6: React 19 Migration

**Duration**: 5-7 days  
**Risk**: 🟡 **MEDIUM**  
**Objective**: Upgrade React 18 → 19 with Next.js 15 compatibility

### Prerequisites

✅ Next.js 15.4.7 already supports React 19  
✅ Phase 4 completed (modern build tooling)  
❌ Await React 19 stable release (currently RC)

### React 19 Breaking Changes

#### 1. Hooks API Changes
- `useFormState` → `useActionState`
- `useOptimistic` → Renamed/deprecated
- Ref cleanup timing changes

#### 2. Server Components
- Enhanced streaming SSR
- Server Actions improvements
- Metadata API changes

#### 3. Removed Features
- Legacy Context API deprecated
- PropTypes warnings in strict mode
- Some synthetic event polyfills removed

### Migration Steps

#### Step 1: Dependency Updates

```bash
cd apps/web

# Update React dependencies
pnpm add react@^19.0.0 react-dom@^19.0.0

# Update React types
pnpm add -D @types/react@^19.0.0 @types/react-dom@^19.0.0

# Update ecosystem packages
pnpm add @tanstack/react-query@latest  # Ensure React 19 compat
pnpm add @testing-library/react@^16.0.0  # React 19 support
```

#### Step 2: Code Audit

```bash
# Find potential issues
grep -r "useFormState" apps/web/src/
grep -r "useOptimistic" apps/web/src/
grep -r "React.PropTypes" apps/web/src/
grep -r "createContext" apps/web/src/

# Check for synthetic event patterns
grep -r "\.persist()" apps/web/src/
```

#### Step 3: Test Suite Updates

```javascript
// apps/web/tests/setup.ts
// Update test environment for React 19
import '@testing-library/jest-dom';

// Configure React 19 test features
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
```

#### Step 4: Next.js App Router Validation

```bash
# Test all routes with React 19
pnpm dev:web

# Validate:
# - SSR hydration (no warnings)
# - Server Components rendering
# - Client Components interactivity
# - Form actions
# - Metadata generation
```

### React Native Impact

**Mobile App**: Delayed to Phase 5
- react-native@0.72.6 not compatible with React 19
- Requires react-native@0.76+ (major upgrade)
- **Decision**: Isolate mobile from web React version

```json
// apps/mobile/package.json - Keep React 18
{
  "dependencies": {
    "react": "18.2.0",  // Pinned for RN 0.72
    "react-native": "0.72.6"
  }
}
```

### Validation Checklist

- [ ] All web unit tests pass (675+)
- [ ] E2E tests pass (93+)
- [ ] No hydration warnings in dev console
- [ ] SSR rendering correct
- [ ] Client-side navigation works
- [ ] Forms and Server Actions functional
- [ ] No React 19 deprecation warnings
- [ ] TypeScript compilation clean
- [ ] Mobile app unaffected (separate React 18)

---

## Phase 4.7: pnpm 10 Upgrade

**Duration**: 3-4 days  
**Risk**: 🟡 **MEDIUM-HIGH**  
**Objective**: Upgrade pnpm 8.15.1 → 10.20.0

### Reference Document
See existing plan: `/docs/development/PNPM_10_UPGRADE_PLAN.md`

### Key Additions to Existing Plan

#### Pre-Upgrade: Dependency Tree Analysis

```bash
# Audit lifecycle scripts (Phase 4.7 requirement)
cd /home/nemesi/dev/money-wise-tech-debt
find node_modules -name package.json -exec grep -l "postinstall\|preinstall" {} \; | \
  grep -v node_modules/node_modules | \
  sed 's|node_modules/||' | sort -u > /tmp/lifecycle-deps.txt

# Review output
cat /tmp/lifecycle-deps.txt
```

**Expected Lifecycle Dependencies**:
- `@prisma/engines` (downloads query engine)
- `argon2` (native password hashing)
- `esbuild` (downloads binary)
- `turbo` (downloads binary)
- `fsevents` (macOS file watching)
- Others from Babel, React Native, etc.

#### Configuration Updates

```json
// package.json (root) - Add before upgrade
{
  "packageManager": "pnpm@10.20.0",  // Update from 8.15.1
  "pnpm": {
    "onlyBuiltDependencies": [
      "@prisma/engines",
      "@prisma/client",
      "argon2",
      "esbuild",
      "turbo",
      "fsevents",
      "core-js",
      "swc"
      // Add others from lifecycle audit
    ],
    "overrides": {
      "ip": "npm:@webpod/ip@^0.6.1",  // Keep existing
      "vite": "^6.0.0"  // Keep from Phase 4.4
    }
  }
}
```

#### Workspace Linking Decision

**Option A: Enable old behavior** (Recommended for Phase 4.7)
```bash
# .npmrc
link-workspace-packages=true
```

**Option B: Use workspace protocol** (Phase 5 - better practice)
```json
// package.json - Each workspace
{
  "dependencies": {
    "@money-wise/types": "workspace:*",
    "@money-wise/ui": "workspace:*",
    "@money-wise/utils": "workspace:*"
  }
}
```

**Decision**: Use Option A for Phase 4.7, migrate to Option B in Phase 5

### Team Coordination Plan

**Week Before Upgrade**:
1. Send team announcement with upgrade date
2. Ensure all branches merged/clean
3. Schedule upgrade for low-activity day
4. Prepare rollback procedure

**Upgrade Day**:
```bash
# ALL TEAM MEMBERS simultaneously:

# 1. Install pnpm 10
npm install -g pnpm@10.20.0

# 2. Verify version
pnpm --version  # Must show 10.20.0

# 3. Pull latest (includes config updates)
cd /home/nemesi/dev/money-wise
git pull origin main

# 4. Clean install (regenerates lockfile v9)
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install

# 5. Verify functionality
pnpm dev:backend  # Check port 3002
pnpm dev:web      # Check port 3000
pnpm test:unit    # All tests pass
```

### Validation Checklist

- [ ] All developers upgraded to pnpm 10.20.0
- [ ] `pnpm-lock.yaml` shows `lockfileVersion: '9.0'`
- [ ] `pnpm install` completes without errors
- [ ] All lifecycle scripts execute (Prisma, esbuild, etc.)
- [ ] Workspace linking functional
- [ ] TypeScript compilation clean
- [ ] All tests pass (backend: 1551+, web: 675+, e2e: 93+)
- [ ] Dev servers start correctly
- [ ] CI/CD pipeline updated and passing

---

## Phase 4.8: Turborepo Optimization

**Duration**: 2-3 days  
**Risk**: 🟢 **LOW-MEDIUM**  
**Objective**: Upgrade Turbo 1.13.4 → 2.x and optimize caching

### Turbo 2.x Breaking Changes

#### 1. Configuration Format
- `turbo.json` schema updates
- Pipeline changes → `tasks` format
- Cache key computation changes

#### 2. Performance Improvements
- Better task scheduling
- Enhanced remote caching
- Improved dependency graph

#### 3. CLI Changes
- Some flags renamed
- New daemon behavior
- Watch mode improvements

### Migration Steps

#### Step 1: Update Turbo

```bash
# Root workspace
pnpm add -D turbo@^2.0.0

# Verify version
pnpm turbo --version
```

#### Step 2: Update Configuration

```json
// turbo.json - Before (v1.x)
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "cache": false
    }
  }
}
```

```json
// turbo.json - After (v2.x)
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      "cache": true
    },
    "test": {
      "cache": false,
      "dependsOn": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

#### Step 3: Optimize Cache Strategy

```json
// turbo.json - Enhanced caching
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [
        "dist/**",
        ".next/**",
        "!.next/cache/**"  // Exclude Next.js cache
      ],
      "inputs": [
        "src/**",
        "package.json",
        "tsconfig.json"
      ],
      "cache": true
    },
    "test:unit": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "cache": true,
      "inputs": [
        "src/**",
        "tests/**",
        "vitest.config.*",
        "jest.config.*"
      ]
    },
    "lint": {
      "cache": true,
      "inputs": [
        "src/**",
        "eslint.config.*",
        ".eslintrc.*"
      ]
    }
  },
  "globalDependencies": [
    "package.json",
    "pnpm-lock.yaml",
    "turbo.json"
  ]
}
```

#### Step 4: Validate Performance

```bash
# Clear cache
pnpm turbo run build --force

# First run (cold cache)
time pnpm turbo run build

# Second run (warm cache)
time pnpm turbo run build

# Expected: 80%+ faster on cache hit
```

### Validation Checklist

- [ ] Turbo v2.x installed
- [ ] `turbo.json` migrated to `tasks` format
- [ ] All scripts run successfully
- [ ] Cache hits working (verify with `--summarize`)
- [ ] Build times improved on cache hit
- [ ] Parallel execution correct
- [ ] CI/CD pipeline updated
- [ ] No task execution errors

---

## Phase 4.9: Node.js 22.x Completion

**Duration**: 1-2 days  
**Risk**: 🟢 **LOW**  
**Objective**: Complete Node.js 22.21.1+ upgrade

### Current Status
- ✅ Node.js v24.11.0 installed (exceeds target)
- ✅ Baseline tests established (see `/apps/backend/docs/PRE_UPDATE_TEST_BASELINE_REPORT.md`)
- ⏳ Final validation pending

### Validation Only (Already Upgraded)

```bash
# Verify Node version
node --version  # Should show v24.11.0

# Validate compatibility
cd apps/backend
pnpm test:unit        # 1551+ tests
pnpm test:integration # 190+ tests

cd apps/web
pnpm test:unit        # 675+ tests
pnpm test:e2e         # 93+ tests

# Check for Node.js deprecation warnings
node --trace-warnings apps/backend/src/main.ts

# Verify native modules
pnpm list argon2
pnpm list @prisma/engines
```

### Validation Checklist

- [ ] Node.js v24.11.0 confirmed
- [ ] All tests pass
- [ ] No native module compilation errors
- [ ] Prisma client generates successfully
- [ ] argon2 password hashing works
- [ ] Dev servers start correctly
- [ ] Production build succeeds
- [ ] No Node.js deprecation warnings

---

## Timeline Coordination

### Gantt Overview

```
Phase 4.5: Deprecations     [████████] 2-3 days
                                      ↓
Phase 4.6: React 19         [████████████████] 5-7 days
                                              ↓
Phase 4.7: pnpm 10          [████████████] 3-4 days (team coordination)
                                          ↓
Phase 4.8: Turborepo        [████████] 2-3 days
                                      ↓
Phase 4.9: Node validation  [████] 1-2 days
                                  ↓
Final validation & PR       [████] 1-2 days

Total Duration: 14-21 days (3-4 weeks)
```

### Dependency Flow

```
Phase 4.5 (Deprecations)
    ↓
Phase 4.9 (Node validation) ← Can run in parallel
    ↓
Phase 4.6 (React 19) ← Requires clean dependency tree
    ↓
Phase 4.7 (pnpm 10) ← Requires team coordination
    ↓
Phase 4.8 (Turborepo) ← Benefits from pnpm 10 performance
```

### Recommended Execution Order

1. **Week 1**: Phase 4.5 + 4.9 (parallel)
2. **Week 2-3**: Phase 4.6 (React 19 - allow time for testing)
3. **Week 3**: Phase 4.7 (pnpm 10 - coordinate with team)
4. **Week 4**: Phase 4.8 (Turborepo) + Final validation

---

## Risk Assessment Matrix

| Phase | Risk Level | Rollback Difficulty | Test Coverage | Team Impact |
|-------|------------|---------------------|---------------|-------------|
| 4.5 Deprecations | 🟢 LOW | Easy | High | Low |
| 4.6 React 19 | 🟡 MEDIUM | Moderate | High | Medium |
| 4.7 pnpm 10 | 🟡 MEDIUM-HIGH | Hard | High | **HIGH** |
| 4.8 Turborepo | 🟢 LOW-MEDIUM | Easy | Medium | Low |
| 4.9 Node.js | 🟢 LOW | N/A (validated) | High | None |

### Critical Success Factors

1. **Phase 4.5**: Clean deprecation warnings before major upgrades
2. **Phase 4.6**: React 19 stable release + thorough testing
3. **Phase 4.7**: Team synchronization for pnpm 10 (lockfile incompatibility)
4. **Phase 4.8**: Proper cache invalidation strategy
5. **Overall**: Test validation at each phase boundary

---

## Rollback Procedures

### Per-Phase Rollback

```bash
# Phase 4.5 Rollback (ESLint, types)
git checkout apps/backend/package.json apps/backend/eslint.config.mjs
pnpm install

# Phase 4.6 Rollback (React 19)
git checkout apps/web/package.json
pnpm install
# Note: May need to regenerate lockfile

# Phase 4.7 Rollback (pnpm 10) - TEAM COORDINATION REQUIRED
npm install -g pnpm@8.15.1
git checkout package.json .npmrc pnpm-lock.yaml
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install

# Phase 4.8 Rollback (Turbo)
git checkout turbo.json package.json
pnpm install
```

### Emergency Full Rollback

```bash
# Revert all Phase 4.5+ changes
git revert <commit-range>
git push origin main

# OR create hotfix branch
git checkout -b hotfix/revert-phase-4.5
git revert <commit-range>
git push origin hotfix/revert-phase-4.5
```

---

## Acceptance Criteria (Phase 4.5+)

### Phase 4.5 Complete When:
- [ ] 0 direct deprecation warnings on `pnpm install`
- [ ] ESLint 9 migrated with flat config
- [ ] All tests passing
- [ ] Subdependency warnings documented

### Phase 4.6 Complete When:
- [ ] React 19.x installed in web app
- [ ] 0 React deprecation warnings
- [ ] All tests passing (web: 675+, e2e: 93+)
- [ ] No hydration errors
- [ ] Mobile app isolated on React 18

### Phase 4.7 Complete When:
- [ ] pnpm 10.20.0 installed (all team members)
- [ ] Lockfile v9 generated
- [ ] All lifecycle scripts working
- [ ] Workspace linking functional
- [ ] All tests passing across monorepo

### Phase 4.8 Complete When:
- [ ] Turbo 2.x installed
- [ ] `turbo.json` migrated to v2 format
- [ ] Cache hit rate >80% on repeated builds
- [ ] All tasks execute successfully

### Phase 4.9 Complete When:
- [ ] Node.js v24.11.0 validated
- [ ] All native modules working
- [ ] No Node deprecation warnings
- [ ] Baseline tests confirmed

### Overall Phase 4.5+ Complete When:
- [ ] All 5 phases validated
- [ ] Security audit clean
- [ ] Documentation updated
- [ ] PR merged to main
- [ ] Post-merge validation passed

---

## Deliverables

### Documentation
1. ✅ This plan: `phase4.5-major-version-upgrades.md`
2. ✅ Phase 4.5 ESLint 9 completion: `phase4.5-eslint9-upgrade.md` (in development/)
3. ✅ Phase 4.6 React 19 migration: `phase4.6-react-19-upgrade.md` (in development/)
4. ✅ Phase 4.7 pnpm 10 upgrade: `phase4.7-pnpm-10-upgrade.md` (in development/)
5. ⏳ Phase 4.8 Turborepo optimization report
6. ⏳ Final Phase 4+ summary

### Code Changes
1. ESLint 9 flat config
2. Updated package.json across workspaces
3. New pnpm-lock.yaml (v9)
4. Updated turbo.json (v2 schema)
5. Test suite updates for React 19

### Validation Artifacts
1. Test coverage reports (per phase)
2. Dependency tree analysis
3. Performance benchmarks (Turbo cache)
4. Security audit results

---

## References

### Internal Documentation
- `/docs/development/PNPM_10_UPGRADE_PLAN.md` - Detailed pnpm 10 strategy
- `/apps/backend/docs/PRE_UPDATE_TEST_BASELINE_REPORT.md` - Node.js baseline
- `/docs/development/DEPENDENCY_UPDATE_2025-10-29.md` - Previous updates
- `/docs/planning/phase4-dependency-migration-plan.md` - Phase 4.1-4.4

### External Resources
- **React 19 Release Notes**: https://react.dev/blog/2024/12/05/react-19
- **Next.js 15 + React 19**: https://nextjs.org/blog/next-15#react-19
- **pnpm 10 Release**: https://github.com/pnpm/pnpm/releases/tag/v10.0.0
- **Turborepo v2 Migration**: https://turbo.build/repo/docs/upgrading
- **ESLint 9 Flat Config**: https://eslint.org/docs/latest/use/configure/configuration-files

---

## Decision Log

**Date**: December 1, 2025  
**Decision**: Create Phase 4.5+ for major upgrades post-Phase 4  
**Rationale**:
- Phase 4 (4.1-4.4) successfully completed foundation work
- Deprecation warnings need systematic resolution
- Major version upgrades require careful coordination
- React 19 stable release imminent (Q1 2026)
- pnpm 10 requires team-wide synchronization

**Approval**: Development Team  
**Start Date**: December 1, 2025  
**Review Date**: After Phase 4.9 completion

---

## Phase 5 Backlog (Deferred Items)

Items identified during Phase 4.5+ that are deferred to Phase 5:

### 5.1 Webpack Cache Serialization Optimization

**Issue Identified**: December 1, 2025 (during Phase 4.7 build)
```
[webpack.cache.PackFileCacheStrategy] Serializing big strings (186kiB) impacts deserialization performance
[webpack.cache.PackFileCacheStrategy] Serializing big strings (139kiB) impacts deserialization performance
```

**Analysis**:
- **Impact**: Build-time only (~100-500ms cold build overhead)
- **Runtime Impact**: None
- **User-visible**: No
- **Root Cause**: Large string literals being cached (inline SVGs, bundled JSON, large constants)

**Potential Solutions** (for Phase 5):
1. **Audit large strings**: Find sources with `webpack-bundle-analyzer`
2. **Externalize large assets**: Move inline SVGs to files
3. **Code splitting**: Lazy load large JSON/locale data
4. **Configure cache strategy**: Use `cache.compression: false` or tune serialization

**Decision**: Defer to Phase 5 - build-time optimization only, doesn't affect users

**Estimated Effort**: 1-2 days  
**Priority**: Low

---

**Status**: 🔄 Phase 4.8 (Turborepo) Next  
**Next Action**: Complete Phase 4.8 Turborepo optimization
