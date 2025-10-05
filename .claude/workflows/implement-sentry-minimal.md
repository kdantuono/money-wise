# Minimal Sentry Implementation Guide

**Goal**: Add production error tracking in <2 hours with zero cost increase
**Approach**: Backend-only, minimal configuration, leverage existing code

---

## Prerequisites

- [ ] Sentry account created (free tier): https://sentry.io/signup/
- [ ] New project: "moneywise-backend" (Node.js/NestJS)
- [ ] Copy DSN from project settings

---

## Phase 1: Remove Broken Workflows (15 minutes)

### Step 1: Remove CodeQL

```bash
git checkout -b refactor/remove-codeql

# Edit .github/workflows/security.yml
# Delete lines 278-310 (entire codeql job)
# Keep jobs: dependency-review, security-audit, sast-scan, secrets-scan
```

**Verification**:
```bash
# Ensure workflow is valid YAML
cat .github/workflows/security.yml | grep -A 5 "codeql:"
# Should return nothing
```

### Step 2: Archive Broken Sentry Workflow

```bash
# Move to archive (don't delete - we'll reference it)
git mv .github/workflows/sentry-release.yml \
       .github/workflows-archive/sentry-release.yml.backup
```

### Step 3: Commit Changes

```bash
git add .github/workflows/
git commit -m "refactor(ci): remove CodeQL (requires GitHub org) and archive over-engineered Sentry workflow"
git push origin refactor/remove-codeql
```

---

## Phase 2: Configure Sentry Backend (30 minutes)

### Step 1: Add GitHub Secrets

```bash
# Navigate to: https://github.com/[your-username]/money-wise/settings/secrets/actions

# Add these secrets:
SENTRY_ORG=kdantuono                  # Your Sentry org name
SENTRY_PROJECT_BACKEND=moneywise-backend
SENTRY_AUTH_TOKEN=[from Sentry settings]  # Settings > Auth Tokens > Create Token
```

### Step 2: Add Sentry DSN to Production Environment

```bash
# Create/update .env.production (DO NOT COMMIT)
echo "SENTRY_DSN=https://[your-key]@o[org-id].ingest.sentry.io/[project-id]" >> apps/backend/.env.production
echo "SENTRY_RELEASE=auto" >> apps/backend/.env.production
```

**Important**: Add `.env.production` to `.gitignore` if not already there.

### Step 3: Enable Sentry in Application

```typescript
// apps/backend/src/main.ts
// Add after existing imports
import * as Sentry from '@sentry/nestjs';

// Add BEFORE app.listen() in bootstrap()
async function bootstrap() {
  // Initialize Sentry (production only)
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      release: process.env.SENTRY_RELEASE || 'development',

      // Performance monitoring (10% sample = free tier friendly)
      tracesSampleRate: 0.1,

      // Disable profiling (not needed for MVP)
      profilesSampleRate: 0,

      // Strip sensitive data
      beforeSend(event) {
        // Remove cookies and auth headers
        if (event.request) {
          delete event.request.cookies;
          delete event.request.headers?.['authorization'];
        }
        return event;
      },
    });

    console.log('✅ Sentry initialized for production');
  }

  // ... rest of existing bootstrap code
}
```

### Step 4: Enable SentryInterceptor

```typescript
// apps/backend/src/app.module.ts
// Add import
import { SentryInterceptor } from './common/interceptors/sentry.interceptor';

// In AppModule configure method or main.ts bootstrap
// Add AFTER app initialization
app.useGlobalInterceptors(new SentryInterceptor());
```

**Note**: `SentryInterceptor` already exists! No need to create it.

---

## Phase 3: Create Simplified Workflow (20 minutes)

### Step 1: Create Minimal Sentry Workflow

```yaml
# .github/workflows/sentry-backend.yml
name: Sentry Backend Release

on:
  push:
    branches: [main]
    tags: ['v*']

env:
  SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
  SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT_BACKEND }}
  SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}

jobs:
  sentry-release:
    name: Create Sentry Release
    runs-on: ubuntu-latest
    if: github.event_name == 'push'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate release version
        id: version
        run: |
          if [[ $GITHUB_REF == refs/tags/* ]]; then
            VERSION=${GITHUB_REF#refs/tags/}
          else
            VERSION="${GITHUB_SHA:0:8}"
          fi
          echo "version=$VERSION" >> $GITHUB_OUTPUT

      - name: Install Sentry CLI
        run: curl -sL https://sentry.io/get-cli/ | bash

      - name: Create Sentry release
        run: |
          sentry-cli releases new -p $SENTRY_PROJECT ${{ steps.version.outputs.version }}
          sentry-cli releases set-commits --auto ${{ steps.version.outputs.version }}
          sentry-cli releases finalize -p $SENTRY_PROJECT ${{ steps.version.outputs.version }}

      - name: Create deployment
        run: |
          ENVIRONMENT="production"
          sentry-cli releases deploys ${{ steps.version.outputs.version }} new -e $ENVIRONMENT -p $SENTRY_PROJECT
```

**Note**: No source maps, no multiple projects, no mobile - just backend releases.

---

## Phase 4: Test Locally (15 minutes)

### Step 1: Build Production Backend

```bash
cd apps/backend

# Load production environment
export $(cat .env.production | xargs)

# Build
pnpm build

# Start production build
NODE_ENV=production node dist/main.js
```

### Step 2: Trigger Test Error

```bash
# In another terminal, trigger a test error
curl -X POST http://localhost:3001/api/test-error

# Or create a test endpoint in a controller:
@Get('/sentry-test')
testSentry() {
  throw new Error('Sentry test error - please ignore');
}
```

### Step 3: Verify in Sentry Dashboard

1. Open: https://sentry.io/organizations/[your-org]/projects/moneywise-backend/
2. Check "Issues" tab for your test error
3. Verify stack trace, context, environment

**Success Criteria**:
- ✅ Error appears in Sentry within 30 seconds
- ✅ Stack trace shows correct file/line
- ✅ Environment = "production"
- ✅ No sensitive data (auth headers removed)

---

## Phase 5: Update Documentation (20 minutes)

### Step 1: Update Backend README

```bash
# Edit: apps/backend/README.md
# Add section after existing monitoring docs
```

```markdown
## Monitoring & Error Tracking

### Sentry (Production Errors)
Sentry captures application errors, exceptions, and performance issues in production.

**Setup**:
1. Set `SENTRY_DSN` environment variable
2. Errors automatically tracked via `SentryInterceptor`
3. Dashboard: https://sentry.io/organizations/kdantuono/projects/moneywise-backend/

**Free Tier Limits**: 5,000 errors/month

### CloudWatch (Infrastructure Metrics)
See: `src/core/monitoring/README.md`
```

### Step 2: Update CHANGELOG

```bash
# Edit: CHANGELOG.md
```

```markdown
## [0.5.0] - 2025-10-04

### Added
- **Sentry Integration**: Production error tracking (backend only)
  - Automatic exception capture via SentryInterceptor
  - Performance monitoring (10% sample rate)
  - Sensitive data filtering (auth headers, cookies)

### Changed
- **Monitoring Architecture**: Sentry (errors) + CloudWatch (infrastructure)
- **CI/CD**: Removed CodeQL (requires GitHub org), added simplified Sentry workflow

### Removed
- **CodeQL Analysis**: Requires GitHub organization (not available for personal repos)
- **Over-engineered Sentry Workflow**: Replaced with minimal backend-only version
```

### Step 3: Create Monitoring Strategy Doc

```bash
# Copy from knowledge base
cp .claude/knowledge/monitoring-decision-matrix.md \
   docs/architecture/monitoring-strategy.md
```

---

## Phase 6: Deploy & Monitor (10 minutes)

### Step 1: Merge to Main

```bash
git checkout main
git merge refactor/remove-codeql
git push origin main
```

### Step 2: Monitor CI/CD

```bash
# Watch workflows
gh run list --limit 5
gh run watch [latest-run-id]

# Verify:
# ✅ Security workflow passes (CodeQL removed)
# ✅ Sentry workflow creates release
# ✅ Progressive CI/CD succeeds
```

### Step 3: Check Production Deployment

```bash
# After deploy to production
# 1. Check Sentry dashboard for "moneywise-backend" activity
# 2. Verify release created with git commit hash
# 3. Monitor for any unexpected errors

# Set up Sentry alerts (optional)
# Sentry Dashboard > Alerts > Create Alert Rule
# - Alert when: Error count > 10 per hour
# - Notify: Email
```

---

## Rollback Plan (If Issues Arise)

### Quick Disable

```bash
# Remove SENTRY_DSN from production environment
# Application will skip Sentry initialization
unset SENTRY_DSN

# Restart application
pm2 restart moneywise-backend  # or your process manager
```

### Full Rollback

```bash
git revert [commit-hash]  # Revert Sentry changes
git push origin main

# Disable workflow
# GitHub > Actions > Sentry Backend Release > Disable workflow
```

---

## Success Checklist

After implementation, verify:

- [ ] ✅ CodeQL removed from security workflow
- [ ] ✅ Security workflow passing in CI/CD
- [ ] ✅ Sentry workflow created and passing
- [ ] ✅ Test error visible in Sentry dashboard
- [ ] ✅ Stack traces show correct files/lines
- [ ] ✅ No sensitive data in Sentry events (auth headers removed)
- [ ] ✅ CloudWatch still working (no conflicts)
- [ ] ✅ Production build successful
- [ ] ✅ Documentation updated (README, CHANGELOG, architecture)
- [ ] ✅ Free tier usage <20% (check Sentry dashboard)

---

## Common Issues & Solutions

### Issue 1: "Sentry not capturing errors"

**Check**:
```bash
# 1. Verify DSN is set
echo $SENTRY_DSN  # Should output Sentry URL

# 2. Check environment
echo $NODE_ENV  # Should be "production"

# 3. Verify initialization
# Look for "✅ Sentry initialized for production" in logs
```

**Solution**: Ensure both `SENTRY_DSN` and `NODE_ENV=production` are set.

---

### Issue 2: "Too many errors sent to Sentry"

**Check Sentry dashboard quota**: Settings > Subscription > Usage

**Solution**: Adjust sample rate or add error filtering
```typescript
// In Sentry.init()
beforeSend(event, hint) {
  // Ignore known errors
  if (event.exception?.values?.[0]?.value?.includes('IgnoreThis')) {
    return null;  // Don't send to Sentry
  }
  return event;
}
```

---

### Issue 3: "Sentry workflow failing"

**Common causes**:
- Missing GitHub secrets (`SENTRY_AUTH_TOKEN`, etc.)
- Invalid Sentry auth token
- Project name mismatch

**Solution**: Verify GitHub secrets, regenerate Sentry auth token.

---

## Monitoring Best Practices

### Daily (First Week)

1. Check Sentry dashboard for errors
2. Verify CloudWatch metrics still publishing
3. Monitor free tier usage (should be <10%)

### Weekly (Ongoing)

1. Review Sentry error trends
2. Check CloudWatch costs (AWS billing)
3. Triage any new error patterns

### Monthly

1. Review monitoring effectiveness (ADR metrics)
2. Optimize error filtering if needed
3. Consider upgrading Sentry if approaching limits

---

## Next Steps (Future Milestones)

### Milestone 3 (Manual Transactions)
- [ ] Add frontend Sentry (web app)
- [ ] Track transaction-specific errors

### Milestone 5 (Security Hardening)
- [ ] Re-evaluate advanced SAST (SonarCloud, Snyk Code)
- [ ] Consider Sentry source maps (better stack traces)

### Post-Launch
- [ ] Upgrade Sentry to Team plan if free tier insufficient ($26/month)
- [ ] Add custom error alerts (Slack, email)

---

**Total Implementation Time**: ~2 hours
**Cost**: $0 (free tier)
**Production Impact**: Zero (additive feature)
**Rollback Time**: <5 minutes
