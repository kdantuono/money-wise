# pnpm 10 Upgrade Plan
## From 8.15.1 → 10.20.0

**Status**: ⏸️ **POSTPONED - Post-MVP**
**Risk Level**: 🟡 **MEDIUM-HIGH**
**Last Updated**: October 29, 2025

---

## ⚠️ Why We're Waiting

### Timing Issues
- ✅ Just completed Prisma 6.18.0 update (October 29, 2025)
- ℹ️ Node.js 22.21.1 update pending
- 🎯 MVP development in progress
- ⚠️ pnpm 10 requires team coordination + extensive testing

### Risk Factors
1. **Major version jump** (8 → 10, skipping 9)
2. **Multiple breaking changes** affecting workspaces
3. **Lockfile incompatibility** (all devs must upgrade simultaneously)
4. **CI/CD updates required** (GitHub Actions)
5. **Hard rollback** (lockfile v9 incompatible with pnpm 8)

---

## 🚨 Breaking Changes Summary

### pnpm 9.0.0 Breaking Changes (from 8.x)

#### 1. Node.js Version Support
- **Dropped**: Node.js v16, v17
- **MoneyWise Status**: ✅ No issue (using Node.js 22.21.1)

#### 2. Lockfile Format v9
- **Change**: Lockfile v6 → v9 (complete regeneration)
- **Impact**:
  - Cannot use pnpm 8 with v9 lockfile
  - All developers must upgrade together
  - Git merge conflicts likely during transition
  - CI/CD must update pnpm version
- **Rollback**: Requires full revert + lockfile regeneration

#### 3. packageManager Field Enforcement
```json
// package.json line 98 - BLOCKS UPGRADE
"packageManager": "pnpm@8.15.1"
```

- **Change**: pnpm **refuses to run** if version doesn't match
- **Impact**: **BLOCKING** - Must update this field to `"pnpm@10.20.0"` first
- **Workaround**: Set `package-manager-strict=false` in `.npmrc` (not recommended)

#### 4. Workspace Linking Disabled
- **Change**: `link-workspace-packages` is **false** by default
- **Impact**: Monorepo packages won't auto-link
- **Current Behavior**: Workspace packages (`apps/*`, `packages/*`) auto-link
- **After Upgrade**: Must use `workspace:*` protocol or enable in `.npmrc`

**Fix Options**:
```bash
# Option A: Restore old behavior (easiest)
echo "link-workspace-packages=true" >> .npmrc

# Option B: Update all workspace deps to use workspace: protocol
# package.json dependencies:
"@money-wise/types": "workspace:*",
"@money-wise/ui": "workspace:*",
"@money-wise/utils": "workspace:*"
```

#### 5. State Files Directory (macOS)
- **Change**: Uses `~/.local/state/pnpm` (Linux convention)
- **Impact**: Minimal (state files relocated)

#### 6. Peer Dependency Resolution
- **Change**: Improved peer dependency resolution
- **Impact**: May install different versions of peer deps
- **Risk**: Could expose hidden dependency issues

---

### pnpm 10.0.0 Breaking Changes (from 9.x)

#### 1. Lifecycle Scripts Blocked (CRITICAL)
- **Change**: `postinstall`, `preinstall` scripts **blocked by default**
- **Security**: Prevents malicious scripts in dependencies
- **Impact**: Native modules may fail to build

**Dependencies Likely Affected**:
- `@prisma/engines` (downloads query engine)
- `argon2` (native password hashing)
- `bcrypt` (if used)
- `fsevents` (macOS file watching)
- `esbuild` (downloads binary)
- `turbo` (downloads binary)

**Fix Required**:
```json
{
  "pnpm": {
    "onlyBuiltDependencies": [
      "@prisma/engines",
      "argon2",
      "fsevents",
      "esbuild",
      "turbo"
    ]
  }
}
```

**Audit Command**:
```bash
# Find all deps with lifecycle scripts
find node_modules -name package.json -exec grep -l "postinstall\|preinstall" {} \; | \
  grep -v node_modules/node_modules | \
  xargs -I {} dirname {} | \
  sed 's|node_modules/||'
```

#### 2. pnpm test Behavior
- **Change**: Passes all parameters after `test` keyword directly
- **Impact**: May affect custom test scripts
- **Example**: `pnpm test --watch` now passes `--watch` to test script

#### 3. pnpm link Changes
- **Change**: Adds overrides to `package.json`
- **Impact**: Links are now persistent in package.json
- **Workspace**: Override added to workspace root

#### 4. Long Path Hashing
- **Change**: SHA256 instead of MD5 for long paths in `node_modules/.pnpm`
- **Impact**: `node_modules` structure changes (no functional impact)

#### 5. URL Redirects in Lockfile
- **Change**: Captures final resolved URL after redirects
- **Impact**: Lockfile may show different URLs for same dependency

#### 6. pnpm deploy Restrictions
- **Change**: Only works with `inject-workspace-packages=true`
- **Impact**: Deployment scripts may need update

#### 7. public-hoist-pattern Changes
- **Change**: No longer hoists eslint/prettier by default
- **Impact**: IDE integrations may need adjustment

---

## 📋 Pre-Upgrade Checklist

### Phase 1: Preparation (Dev Branch)

```bash
# 1. Create upgrade branch
git checkout -b chore/pnpm-10-upgrade
git push -u origin chore/pnpm-10-upgrade

# 2. Audit lifecycle scripts
cd /home/nemesi/dev/money-wise
find node_modules -name package.json -exec grep -l "postinstall\|preinstall" {} \; > /tmp/lifecycle-deps.txt

# 3. Review workspace dependencies
grep -r "workspace:" */package.json

# 4. Check packageManager field
grep packageManager package.json

# 5. Backup current lockfile
cp pnpm-lock.yaml pnpm-lock.yaml.backup-v6
```

### Phase 2: Configuration Updates

```json
// 1. Update package.json line 98
{
  "packageManager": "pnpm@10.20.0"
}

// 2. Add lifecycle scripts whitelist
{
  "pnpm": {
    "onlyBuiltDependencies": [
      "@prisma/engines",
      "argon2",
      "esbuild",
      "fsevents",
      "turbo"
      // Add others from audit
    ],
    "overrides": {
      // Keep existing overrides
    }
  }
}

// 3. Create/update .npmrc
// Choose ONE option:
//   A) link-workspace-packages=true (restore old behavior)
//   B) Update all deps to workspace:* protocol
```

### Phase 3: Testing Strategy

```bash
# 1. Install pnpm 10
npm install -g pnpm@10.20.0

# 2. Verify version
pnpm --version  # Should show: 10.20.0

# 3. Clean install (regenerates lockfile v9)
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install

# 4. Type checking
pnpm typecheck

# 5. Build all packages
pnpm build

# 6. Run all tests
pnpm test:unit
pnpm test:integration
pnpm test:e2e

# 7. Test development servers
pnpm dev:backend  # Port 3001
pnpm dev:web      # Port 3000
pnpm dev:mobile   # Expo

# 8. Test authentication flows
# - User registration
# - User login
# - Password reset
# - Email verification

# 9. Verify Prisma operations
cd apps/backend
pnpm prisma generate
pnpm prisma migrate status
```

---

## 🔄 Migration Steps

### Step 1: Update CI/CD First

**.github/workflows/*.yml**:
```yaml
# Before
- uses: pnpm/action-setup@v2
  with:
    version: 8.15.1

# After
- uses: pnpm/action-setup@v2
  with:
    version: 10.20.0
```

**Commit and merge CI changes separately** before upgrading locally.

### Step 2: Coordinate Team Upgrade

**Send to Team**:
```
🚨 pnpm 10 Upgrade - Action Required

Timeline: [Date TBD - Post-MVP]

What you need to do:
1. Pull latest from main
2. Install pnpm 10: npm install -g pnpm@10.20.0
3. Delete node_modules: rm -rf node_modules
4. Install dependencies: pnpm install
5. Verify: pnpm dev (should start successfully)

⚠️ Do NOT run `pnpm install` with old version after upgrade!

Questions? See: docs/development/PNPM_10_UPGRADE_PLAN.md
```

### Step 3: Execute Upgrade

```bash
# On upgrade day (all developers simultaneously):

# 1. Everyone: Install pnpm 10
npm install -g pnpm@10.20.0

# 2. Everyone: Pull latest (includes config updates)
git pull origin main

# 3. Everyone: Clean install
rm -rf node_modules
pnpm install

# 4. Everyone: Verify
pnpm dev
pnpm test

# 5. Commit new lockfile (only one person)
git add pnpm-lock.yaml
git commit -m "chore: upgrade to pnpm 10.20.0 (lockfile v9)"
git push
```

---

## 🔙 Rollback Plan

### If Upgrade Fails

```bash
# 1. Everyone: Revert to pnpm 8
npm install -g pnpm@8.15.1

# 2. Revert package.json changes
git checkout HEAD -- package.json

# 3. Restore old lockfile
git checkout HEAD -- pnpm-lock.yaml

# 4. Clean install
rm -rf node_modules
pnpm install

# 5. Verify
pnpm dev
```

**Note**: Lockfile v9 is incompatible with pnpm 8. Full revert required.

---

## 📊 Validation Checklist

### Post-Upgrade Verification

- [ ] `pnpm --version` shows 10.20.0
- [ ] `package.json` has `"packageManager": "pnpm@10.20.0"`
- [ ] `pnpm-lock.yaml` shows `lockfileVersion: '9.0'`
- [ ] `pnpm install` succeeds (no errors)
- [ ] `pnpm typecheck` passes (0 errors)
- [ ] `pnpm build` succeeds (all packages)
- [ ] `pnpm test:unit` passes (1311+ tests)
- [ ] `pnpm test:integration` passes (190+ tests)
- [ ] `pnpm dev:backend` starts (port 3001)
- [ ] `pnpm dev:web` starts (port 3000)
- [ ] `pnpm dev:mobile` starts (Expo)
- [ ] Authentication flows work (registration, login)
- [ ] Prisma operations work (generate, migrate)
- [ ] CI/CD pipeline passes (GitHub Actions)
- [ ] All developers upgraded successfully
- [ ] No blockers reported

---

## 🎯 Timeline

### Recommended Approach

1. **Now (October 2025)**: Document breaking changes ✅
2. **MVP Launch**: Focus on core features
3. **Post-MVP (Nov/Dec 2025)**:
   - Create upgrade branch
   - Update CI/CD
   - Test thoroughly
   - Coordinate team upgrade
4. **Monitoring**: First week after upgrade, watch for issues

---

## 📚 Resources

- **pnpm 9 Release Notes**: https://github.com/pnpm/pnpm/releases/tag/v9.0.0
- **pnpm 10 Release Notes**: https://github.com/pnpm/pnpm/releases/tag/v10.0.0
- **pnpm Documentation**: https://pnpm.io/
- **Migration Guide**: https://pnpm.io/migration
- **Breaking Changes Discussion**: https://github.com/orgs/pnpm/discussions/8945

---

## ✅ Decision Log

**Date**: October 29, 2025
**Decision**: Postpone pnpm 10 upgrade until post-MVP
**Rationale**:
- Just completed Prisma update (validated)
- MVP development in progress (avoid disruption)
- Breaking changes require team coordination
- Lockfile incompatibility creates hard rollback
- Security benefits don't outweigh migration risk now

**Approver**: Development Team
**Revisit**: After MVP launch (Nov/Dec 2025)

---

**Next Action**: Resume after MVP launch. Follow Phase 1-3 checklist above.
