# Phase 4.7: pnpm 10 Upgrade

## Status: ✅ COMPLETE

**Completed**: December 1, 2025  
**Branch**: hotfix/tech-debt-phase4

## Overview

Upgraded pnpm from version 8.15.1 to 10.11.0, including lockfile migration to v9 format and configuration of lifecycle script allowlisting.

## Changes Made

### Version Upgrade

| Component | Before | After |
|-----------|--------|-------|
| pnpm | 8.15.1 | 10.11.0 |
| Lockfile version | v6/v7 | v9.0 |

### package.json Updates

1. **packageManager**: Updated from `pnpm@8.15.1` to `pnpm@10.11.0`
2. **engines.pnpm**: Updated from `>=8.0.0` to `>=10.0.0`
3. **pnpm.onlyBuiltDependencies**: Added allowlist for packages with lifecycle scripts:
   - `@prisma/client`
   - `@prisma/engines`
   - `@sentry/cli`
   - `argon2`
   - `cpu-features`
   - `esbuild`
   - `prisma`
   - `protobufjs`
   - `sharp`
   - `ssh2`
   - `turbo`

### pnpm 10 Breaking Changes Handled

1. **Lifecycle Scripts**: pnpm 10 blocks lifecycle scripts by default for security
   - Added `onlyBuiltDependencies` to allowlist trusted packages
   - Packages without needed scripts ignored: `@nestjs/core`, `@sentry-internal/node-cpu-profiler`, `msw`, `unrs-resolver`

2. **Lockfile Format**: Automatically migrated to v9.0 format
   - Smaller lockfile size
   - Better deduplication
   - Improved integrity checks

3. **Peer Dependencies**: `autoInstallPeers: true` preserved from settings

## Verification

- ✅ pnpm 10.11.0 installed globally
- ✅ Lockfile v9.0 generated
- ✅ 675 web tests pass
- ✅ 1551 backend tests pass  
- ✅ 93 E2E tests pass (React 19 verified)
- ✅ TypeScript compilation passes
- ✅ Production build succeeds

## Team Upgrade Instructions

All team members must upgrade to pnpm 10:

```bash
# 1. Install pnpm 10
npm install -g pnpm@10.11.0 --force

# 2. Verify version
pnpm --version  # Should show 10.11.0

# 3. Pull latest changes
git pull origin main

# 4. Clean install (regenerates node_modules with new lockfile)
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install

# 5. Verify everything works
pnpm test:unit
pnpm build
```

## Rollback Procedure

If issues arise:

```bash
# 1. Revert to pnpm 8
npm install -g pnpm@8.15.1 --force

# 2. Checkout previous package.json and lockfile
git checkout HEAD~1 -- package.json pnpm-lock.yaml

# 3. Clean reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules
pnpm install
```

## Notes

- pnpm 10 provides better security with lifecycle script blocking
- Lockfile v9 is more efficient and has better integrity checks
- No breaking changes to workspace functionality
- All existing pnpm overrides preserved and working
