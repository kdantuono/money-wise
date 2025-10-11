# CI/CD Build Fix - NODE_ENV Handling

## Problem
Next.js 15.2.4+ fails during build if NODE_ENV is set to a non-production value:
```
Error: <Html> should not be imported outside of pages/_document
⚠ You are using a non-standard "NODE_ENV" value
```

## Solution Applied

### 1. Build Wrapper Script
Created `scripts/build-clean.sh` that:
- Explicitly unsets NODE_ENV before building
- Executes `env -u NODE_ENV pnpm turbo run build`
- Allows Next.js/NestJS to manage NODE_ENV automatically

### 2. Updated package.json
All build scripts now use the wrapper:
```json
{
  "build": "./scripts/build-clean.sh",
  "build:backend": "./scripts/build-clean.sh --filter=@money-wise/backend",
  "build:web": "./scripts/build-clean.sh --filter=@money-wise/web"
}
```

### 3. CI/CD Compatibility
**ALL existing CI/CD workflows work without changes** because they call:
- `pnpm build` → uses wrapper script
- `pnpm build:web` → uses wrapper script
- `pnpm build:backend` → uses wrapper script

## Usage

### Local Development
```bash
# All these commands now work correctly:
pnpm build              # Build all with clean NODE_ENV
pnpm build:web          # Build web with clean NODE_ENV
pnpm build:backend      # Build backend with clean NODE_ENV
```

### CI/CD
No changes needed! Workflows use `pnpm build*` commands which automatically use the wrapper.

### Direct Turbo (Not Recommended)
If you need to bypass the wrapper:
```bash
env -u NODE_ENV pnpm turbo run build --filter=@money-wise/web
```

## Why This Works

1. **pnpm scripts are executable**: When you run `pnpm build`, it executes the script defined in package.json
2. **Wrapper handles environment**: The shell script unsets NODE_ENV before calling turbo
3. **Frameworks take control**: Next.js and NestJS automatically set NODE_ENV based on the command:
   - `next build` → NODE_ENV=production
   - `next dev` → NODE_ENV=development

## Testing
```bash
# Verify the wrapper works:
pnpm build:web

# Should output:
# ✓ Compiled successfully
# ✓ Generating static pages (8/8)
# (No NODE_ENV warnings)
```

## References
- Next.js docs: https://nextjs.org/docs/messages/non-standard-node-env
- Root cause: `apps/web/.env.build-fix-note.md`
- Wrapper script: `scripts/build-clean.sh`
