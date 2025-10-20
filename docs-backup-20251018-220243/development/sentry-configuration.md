# Sentry Configuration Guide

## Overview

MoneyWise uses Sentry for error tracking and performance monitoring across all environments. This guide covers environment-specific configuration for development, staging, and production.

## Sentry Project Structure

### Recommended Setup

Create **separate Sentry projects** for each environment to maintain isolation and appropriate monitoring levels:

```
Organization: money-wise (or your-org)
├── Project: moneywise-development
│   ├── Platform: Node.js (backend)
│   └── Platform: Next.js (web)
├── Project: moneywise-staging
│   ├── Platform: Node.js (backend)
│   └── Platform: Next.js (web)
└── Project: moneywise-production
    ├── Platform: Node.js (backend)
    └── Platform: Next.js (web)
```

**Rationale**:
- **Separate projects** = isolated alerts, quotas, and release tracking
- **Clearer triage**: Production errors don't mix with staging experiments
- **Cost management**: Apply different sampling rates per environment
- **Team coordination**: Different teams can manage staging vs production

## Environment-Specific Configuration

### 1. Development Environment

**Purpose**: Local debugging with full visibility

**Backend Configuration** (`apps/backend/.env`):
```bash
# Development Sentry Configuration
NODE_ENV=development
SENTRY_DSN=https://<key>@o<org-id>.ingest.sentry.io/<project-id-dev>
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=dev-local

# Development Sampling (100% for full debugging)
# Note: Configured in apps/backend/src/instrument.ts
# tracesSampleRate: 1.0
# profilesSampleRate: 0 (profiling disabled in dev)
```

**Web Configuration** (`apps/web/.env.local`):
```bash
# Development Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://<key>@o<org-id>.ingest.sentry.io/<project-id-dev>
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=moneywise-development
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=dev-local

# Development features
NEXT_PUBLIC_SENTRY_DEBUG=true
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=1.0
```

**Characteristics**:
- ✅ **100% sampling** for traces (catch every request)
- ✅ **Full error capture** (no filtering)
- ✅ **Debug logging** enabled
- ⚠️ **Profiling disabled** (avoid performance overhead)
- 📊 **Low quota impact** (single developer)

---

### 2. Staging Environment

**Purpose**: Pre-production testing with realistic monitoring

**Backend Configuration** (`apps/backend/.env.staging`):
```bash
# Staging Sentry Configuration
NODE_ENV=staging
SENTRY_DSN=https://<key>@o<org-id>.ingest.sentry.io/<project-id-staging>
SENTRY_ENVIRONMENT=staging
SENTRY_RELEASE=moneywise@$(git rev-parse --short HEAD)

# Staging Sampling (50% - balance coverage vs quota)
# Note: Override in instrument.ts for staging-specific rates
# tracesSampleRate: 0.5
# profilesSampleRate: 0.2
```

**Web Configuration** (`apps/web/.env.staging`):
```bash
# Staging Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://<key>@o<org-id>.ingest.sentry.io/<project-id-staging>
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=moneywise-staging
SENTRY_ENVIRONMENT=staging
SENTRY_RELEASE=moneywise@$(git rev-parse --short HEAD)

# Staging features
NEXT_PUBLIC_SENTRY_DEBUG=false
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.5
```

**Characteristics**:
- ✅ **50% trace sampling** (representative coverage)
- ✅ **20% profiling** (performance insights without quota strain)
- ✅ **Release tracking** via git commit SHA
- ✅ **Realistic error rates** (QA testing load)
- 📊 **Moderate quota usage**

---

### 3. Production Environment

**Purpose**: Live user monitoring with optimized quota usage

**Backend Configuration** (`apps/backend/.env.production`):
```bash
# Production Sentry Configuration
NODE_ENV=production
SENTRY_DSN=https://<key>@o<org-id>.ingest.sentry.io/<project-id-prod>
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=moneywise@0.4.7  # Use actual version from package.json

# Production Sampling (10% - conserve quota, MVP free tier)
# Note: Configured in apps/backend/src/instrument.ts
# tracesSampleRate: 0.1
# profilesSampleRate: 0.1
```

**Web Configuration** (`apps/web/.env.production`):
```bash
# Production Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://<key>@o<org-id>.ingest.sentry.io/<project-id-prod>
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=moneywise-production
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=moneywise@0.4.7  # Match package.json version

# Production features (minimal overhead)
NEXT_PUBLIC_SENTRY_DEBUG=false
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
```

**Characteristics**:
- ⚡ **10% trace sampling** (conserve free tier quota)
- ⚡ **10% profiling** (targeted performance monitoring)
- ✅ **All errors captured** (regardless of sampling)
- ✅ **Release tracking** via semantic version
- 🔒 **Expected error filtering** (NotFoundException, UnauthorizedException)
- 📊 **Optimized for free tier limits**

---

## Obtaining Sentry DSNs

### Step 1: Create Projects

1. Visit [sentry.io](https://sentry.io)
2. Navigate to **Settings** → **Projects**
3. Click **Create Project**
4. Select platform:
   - **Node.js** for backend
   - **Next.js** for web
5. Name project: `moneywise-{environment}`
6. Repeat for each environment

### Step 2: Retrieve DSNs

For each project:

1. Go to **Settings** → **Projects** → `[project-name]`
2. Click **Client Keys (DSN)**
3. Copy the **DSN** value (format: `https://<key>@o<org>.ingest.sentry.io/<project>`)
4. Add to corresponding `.env` file

**Security Note**: DSNs are **public** (safe for client-side code). They authenticate your app to Sentry but cannot access Sentry data.

---

## Environment Switching Procedure

### Quick Reference Table

| Environment | Backend DSN Var | Web DSN Var | Sampling | Use Case |
|-------------|----------------|-------------|----------|----------|
| **Development** | `SENTRY_DSN` | `NEXT_PUBLIC_SENTRY_DSN` | 100% | Local debugging |
| **Staging** | `SENTRY_DSN` | `NEXT_PUBLIC_SENTRY_DSN` | 50% | Pre-prod testing |
| **Production** | `SENTRY_DSN` | `NEXT_PUBLIC_SENTRY_DSN` | 10% | Live monitoring |

### Switching Environments

#### Method 1: Environment-Specific Files (Recommended)

Maintain separate `.env` files:

```bash
# Development (default)
apps/backend/.env
apps/web/.env.local

# Staging
apps/backend/.env.staging
apps/web/.env.staging

# Production
apps/backend/.env.production
apps/web/.env.production
```

**Deployment**:
```bash
# Staging deploy
cp apps/backend/.env.staging apps/backend/.env
cp apps/web/.env.staging apps/web/.env.local
pnpm build

# Production deploy
cp apps/backend/.env.production apps/backend/.env
cp apps/web/.env.production apps/web/.env.local
pnpm build
```

#### Method 2: CI/CD Environment Variables (Production)

In GitHub Actions, Vercel, or AWS:

```yaml
# .github/workflows/deploy-production.yml
env:
  SENTRY_DSN: ${{ secrets.SENTRY_DSN_PRODUCTION }}
  SENTRY_ENVIRONMENT: production
  SENTRY_RELEASE: ${{ github.sha }}
```

**Advantages**:
- ✅ No secrets in repository
- ✅ Automatic environment isolation
- ✅ Release tracking via CI/CD

---

## Release Tracking

### Backend Release Tracking

**Local/Dev**:
```bash
SENTRY_RELEASE=dev-local
```

**Staging** (git commit SHA):
```bash
SENTRY_RELEASE=moneywise@$(git rev-parse --short HEAD)
# Example: moneywise@a1b2c3d
```

**Production** (semantic version):
```bash
SENTRY_RELEASE=moneywise@0.4.7
# Match version in package.json
```

### Web Release Tracking

Next.js automatically handles release tracking when `SENTRY_RELEASE` is set during build.

**Build-time injection**:
```bash
# In CI/CD
SENTRY_RELEASE=moneywise@${npm_package_version} pnpm build
```

### Creating Sentry Releases

Use `sentry-cli` to create releases and upload source maps:

```bash
# Install sentry-cli
pnpm add -D @sentry/cli

# Create release
sentry-cli releases new moneywise@0.4.7

# Upload source maps (backend)
sentry-cli releases files moneywise@0.4.7 upload-sourcemaps ./apps/backend/dist

# Upload source maps (web - Next.js auto-uploads)
# Next.js Sentry plugin handles this automatically

# Finalize release
sentry-cli releases finalize moneywise@0.4.7

# Associate commits (optional)
sentry-cli releases set-commits moneywise@0.4.7 --auto
```

---

## Sampling Rate Configuration

### Current Implementation (apps/backend/src/instrument.ts)

```typescript
// Performance Monitoring (adaptive sampling based on environment)
tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,

// Profiling (MVP free tier: limit production samples, full dev sampling)
profilesSampleRate: NODE_ENV === 'production' ? 0.1 : 0,
```

### Proposed Enhancement for Staging

**Update** `apps/backend/src/instrument.ts`:

```typescript
// Enhanced environment-aware sampling
const getSamplingRates = () => {
  const environment = process.env.SENTRY_ENVIRONMENT || NODE_ENV;

  switch (environment) {
    case 'production':
      return { traces: 0.1, profiles: 0.1 };
    case 'staging':
      return { traces: 0.5, profiles: 0.2 };
    case 'development':
    default:
      return { traces: 1.0, profiles: 0 };
  }
};

const { traces, profiles } = getSamplingRates();

Sentry.init({
  // ... other config
  tracesSampleRate: traces,
  profilesSampleRate: profiles,
});
```

---

## Verification Steps

### 1. Test Local Development

```bash
# Start backend
cd apps/backend
pnpm dev

# Trigger test error (in another terminal)
curl http://localhost:3001/api/health/error

# Check Sentry dashboard:
# https://sentry.io/organizations/[org]/issues/?project=[dev-project-id]
```

### 2. Test Staging

```bash
# Deploy to staging environment
cp .env.staging .env
pnpm build
pnpm start

# Generate test traffic
# Check Sentry dashboard for staging project
```

### 3. Test Production

```bash
# Deploy to production (via CI/CD)
# Monitor Sentry dashboard for production project
# Verify 10% sampling (9 out of 10 requests not captured in traces)
```

---

## Troubleshooting

### Issue: "DSN not provided - error tracking disabled"

**Cause**: `SENTRY_DSN` environment variable missing or empty

**Solution**:
1. Verify `.env` file exists: `ls -la apps/backend/.env`
2. Check DSN value: `grep SENTRY_DSN apps/backend/.env`
3. Ensure DSN starts with `https://`
4. Restart development server

### Issue: Events not appearing in Sentry dashboard

**Debugging steps**:

1. **Check initialization logs**:
   ```
   [Sentry] Initialized for environment: development
   ```

2. **Verify DSN project ID matches dashboard**:
   ```bash
   # Extract project ID from DSN
   echo $SENTRY_DSN | grep -oP '(?<=ingest.sentry.io/)\d+'
   ```

3. **Test with forced error**:
   ```typescript
   // apps/backend/src/main.ts (temporarily)
   import * as Sentry from '@sentry/nestjs';
   Sentry.captureException(new Error('Test error from backend'));
   ```

4. **Check Sentry project filters**:
   - Go to **Settings** → **Inbound Filters**
   - Ensure no filters blocking events

### Issue: Too many events (quota exceeded)

**Solution**:

1. **Lower sampling rates** (production):
   ```typescript
   tracesSampleRate: 0.05,  // Reduce from 0.1 to 0.05 (50% reduction)
   ```

2. **Add error filters**:
   ```typescript
   ignoreErrors: [
     'NotFoundException',
     'UnauthorizedException',
     'ValidationError',  // Add common expected errors
   ],
   ```

3. **Upgrade Sentry plan** (if necessary)

---

## Best Practices

### ✅ DO

- ✅ Use **separate projects** for dev/staging/production
- ✅ Set `SENTRY_ENVIRONMENT` explicitly (don't rely on `NODE_ENV` fallback)
- ✅ Track releases with semantic versions in production
- ✅ Test Sentry integration in development before deploying
- ✅ Monitor quota usage in Sentry dashboard
- ✅ Use environment variables for all Sentry configuration (never hardcode DSNs)

### ❌ DON'T

- ❌ Use same DSN across all environments (loses isolation)
- ❌ Set 100% sampling in production (wastes quota)
- ❌ Commit `.env` files with real DSNs (use `.env.example`)
- ❌ Ignore `ignoreErrors` configuration (pollutes error reports)
- ❌ Forget to upload source maps in production (obfuscated stack traces)

---

## Related Documentation

- [Sentry Official Docs - NestJS](https://docs.sentry.io/platforms/javascript/guides/nestjs/)
- [Sentry Official Docs - Next.js](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [MoneyWise Development Setup](./setup.md)
- [EPIC-1.5 M1.5 Sprint Plan](../planning/milestones/M1.5-development-infrastructure-quality.md)

---

**Last Updated**: 2025-10-05
**EPIC**: EPIC-1.5 M1.5 - Development Infrastructure & Quality
**Task**: TASK-1.5.2.2 - Configure Sentry environments
