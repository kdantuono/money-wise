# MoneyWise Monitoring Architecture - Quick Reference

**Last Updated**: 2025-10-04
**Related**: [ADR-002: Tech Stack Consolidation](./adr-002-tech-stack-consolidation.md)

---

## TL;DR: What Should I Use?

```
┌─────────────────────────────────────────────────────────────────┐
│                    MONITORING DECISION TREE                      │
└─────────────────────────────────────────────────────────────────┘

Question: "Something is broken in production"
│
├─> "WHY did it break?" (stack trace, user context)
│   └─> Use: SENTRY
│       - Error details, stack traces
│       - User session, breadcrumbs
│       - Affected users count
│
├─> "WHEN did it break?" (trends, patterns)
│   └─> Use: CLOUDWATCH
│       - Request rate graphs
│       - Error rate over time
│       - System health at that time
│
└─> "HOW MANY users affected?"
    └─> Use: BOTH
        - Sentry: Unique users, sessions
        - CloudWatch: Request volume, error rate %
```

---

## Tools Matrix

| Tool | Status | Purpose | Cost | Setup Complexity | Production Ready |
|------|--------|---------|------|------------------|------------------|
| **Sentry** | ⚡ IMPLEMENT | Application errors | $0 | 🟢 Low | ✅ Yes (minimal) |
| **CloudWatch** | ✅ KEEP | Infrastructure metrics | ~$8/mo | 🟡 Medium | ✅ Yes (complete) |
| **Semgrep** | ✅ KEEP | SAST security scan | $0 | 🟢 Low | ✅ Yes (informational) |
| **pnpm audit** | ✅ KEEP | Dependency CVEs | $0 | 🟢 None | ✅ Yes |
| **Dependabot** | ✅ KEEP | Auto dependency updates | $0 | 🟢 None | ✅ Yes |
| **TruffleHog** | ✅ KEEP | Secret scanning | $0 | 🟢 Low | ✅ Yes |
| **CodeQL** | ❌ REMOVE | Advanced SAST | N/A | 🔴 Impossible* | ❌ No |
| **Frontend Sentry** | 📋 DEFER | React error tracking | $0 | 🟡 Medium | ⏳ M3+ |
| **SonarCloud** | 📋 DEFER | Advanced SAST | $0† | 🟡 Medium | ⏳ M5+ |

\* Requires GitHub Organization ($49/user/month minimum)
† Free tier: 100k LOC limit

---

## Sentry vs CloudWatch: When to Use What

### Scenario 1: "API endpoint returning 500 errors"

```yaml
Primary: Sentry
  ✓ Full stack trace
  ✓ Request body/params
  ✓ User who triggered it
  ✓ Browser/device info

Secondary: CloudWatch
  ✓ How many requests failed?
  ✓ Which endpoints affected?
  ✓ Error rate trend (last hour/day)

Action: Fix code based on Sentry trace, monitor recovery in CloudWatch
```

### Scenario 2: "Server memory climbing slowly"

```yaml
Primary: CloudWatch
  ✓ Memory usage graph (last 7 days)
  ✓ Correlation with request volume
  ✓ CPU usage patterns

Secondary: Sentry
  ✓ Check for "out of memory" errors
  ✓ Memory leak patterns in traces

Action: Investigate via CloudWatch metrics, confirm errors in Sentry
```

### Scenario 3: "User reports 'something broke'"

```yaml
Primary: Sentry
  ✓ User session timeline
  ✓ Breadcrumbs (last 10 actions)
  ✓ Exact error message + stack

Secondary: CloudWatch
  ✓ System health at that timestamp
  ✓ Was there a deploy? Traffic spike?

Action: Reproduce via Sentry context, verify system state in CloudWatch
```

### Scenario 4: "Database queries slow"

```yaml
Primary: CloudWatch
  ✓ Query duration metrics
  ✓ Database connection health
  ✓ Slow query patterns

Secondary: Application Logs
  ✓ Specific SQL queries
  ✓ Query parameters

Action: Identify slow queries in CloudWatch, optimize via logs
```

### Scenario 5: "Is production healthy right now?"

```yaml
Primary: CloudWatch
  ✓ /health endpoint status
  ✓ Uptime percentage
  ✓ Request success rate

Secondary: None needed

Action: Check CloudWatch dashboard, investigate if unhealthy
```

---

## Minimal Sentry Implementation (Backend Only)

### Configuration

```typescript
// apps/backend/src/main.ts
import * as Sentry from '@sentry/nestjs';

if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,

    // Performance Monitoring (10% sample to stay in free tier)
    tracesSampleRate: 0.1,

    // Disable profiling (not needed for MVP)
    profilesSampleRate: 0,

    // Strip sensitive data
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.['authorization'];
      }
      return event;
    },
  });
}
```

### Environment Variables

```bash
# .env.production (add to existing)
SENTRY_DSN=https://...@sentry.io/...
SENTRY_RELEASE=auto
```

### Enable in Application

```typescript
// apps/backend/src/app.module.ts
import { SentryInterceptor } from './common/interceptors/sentry.interceptor';

// In AppModule bootstrap or main.ts
app.useGlobalInterceptors(new SentryInterceptor());
```

**Note**: `SentryInterceptor` already exists in codebase, just needs activation!

---

## CloudWatch Current State

### Already Implemented ✅

```yaml
Services:
  - MonitoringService: Core metrics collection
  - CloudWatchService: AWS integration
  - MonitoringInterceptor: Automatic API tracking
  - HealthController: /health endpoints

Metrics Tracked:
  - API request counts (by endpoint)
  - Response times (average, p95, p99)
  - Error rates (by status code)
  - Memory/CPU usage
  - Database query performance
  - Business metrics (users, transactions)

Documentation:
  - apps/backend/src/core/monitoring/README.md (comprehensive)
  - Test coverage: 100%
```

### No Changes Needed ✅

CloudWatch implementation is **production-ready** and should remain unchanged.

---

## Security Scanning Strategy

### Keep

```yaml
✅ pnpm audit:
  - Industry standard
  - Catches real CVEs
  - Zero config
  - Part of CI/CD

✅ Dependabot:
  - Automated PR creation
  - Weekly scans
  - Trusted by GitHub

✅ Semgrep (SAST):
  - Free tier adequate
  - Non-blocking (informational)
  - Security + JavaScript/TypeScript rules

✅ TruffleHog:
  - Secret detection
  - Zero false positives
  - Pre-commit + CI/CD
```

### Remove

```yaml
❌ CodeQL:
  - Requires: GitHub Organization
  - Cost: $49/user/month minimum
  - Status: Failing in CI/CD
  - Replacement: Semgrep (70% coverage)
```

### Defer

```yaml
📋 SonarCloud (SAST):
  - When: M5 (Security Hardening)
  - Why: Overkill for 3,525 LOC
  - Free tier: 100k LOC limit

📋 Snyk Code:
  - When: M5 or 10k+ LOC
  - Why: Better dependency management than SAST
```

---

## Cost Breakdown

### Current (Pre-Sentry)

```
AWS CloudWatch:         $5-10/month
GitHub Actions:         $0 (2000 min free)
Semgrep:                $0 (free tier)
Dependabot:             $0 (included)
pnpm audit:             $0
TruffleHog:             $0
───────────────────────────────────
Total:                  $5-10/month
```

### Proposed (With Sentry)

```
AWS CloudWatch:         $5-10/month (unchanged)
Sentry:                 $0 (5k errors/month free)
GitHub Actions:         $0 (unchanged)
Semgrep:                $0 (unchanged)
Dependabot:             $0 (unchanged)
pnpm audit:             $0 (unchanged)
TruffleHog:             $0 (unchanged)
───────────────────────────────────
Total:                  $5-10/month (SAME)

Expected Error Volume:  <500/month (MVP)
Free Tier Headroom:     90% (4,500 errors available)
```

**Cost Increase**: $0 ✅

---

## Implementation Checklist

### Week 1: Remove Blockers

- [ ] Remove CodeQL job from `.github/workflows/security.yml`
- [ ] Archive broken `sentry-release.yml` workflow
- [ ] Test security workflow (should pass now)
- [ ] Commit: `refactor(ci): remove CodeQL (requires GitHub org)`

### Week 2: Minimal Sentry

- [ ] Add `SENTRY_DSN` to GitHub Secrets
- [ ] Create simplified `.github/workflows/sentry-backend.yml`
- [ ] Enable `SentryInterceptor` in `apps/backend/src/app.module.ts`
- [ ] Test production build locally
- [ ] Trigger test error, verify Sentry dashboard
- [ ] Commit: `feat(monitoring): add minimal Sentry backend integration`

### Week 3: Documentation

- [ ] Update `apps/backend/README.md` (Sentry section)
- [ ] Update `apps/backend/src/core/monitoring/README.md`
- [ ] Create `docs/architecture/monitoring-strategy.md`
- [ ] Update `CHANGELOG.md` (v0.5.0)

---

## Success Metrics (3 months post-implementation)

```yaml
Sentry:
  - Error capture rate: >95% of 5xx errors
  - False positive rate: <5%
  - Resolution time: <24h critical, <72h major
  - Free tier usage: <80% quota

CloudWatch:
  - Uptime visibility: 100%
  - Alert accuracy: >90% (low false alarms)
  - Cost: <$15/month
  - Query insights: 100% coverage

Overall:
  - MTTD (Mean Time to Detection): <5 minutes
  - MTTR (Mean Time to Resolution): <2 hours production
  - Zero invisible production incidents
```

---

## Common Pitfalls to Avoid

### ❌ Don't: Add Sentry to Frontend Yet

**Why**: Frontend not in production, adds build complexity
**When**: Milestone 3+ (after PWA implementation)

### ❌ Don't: Enable Sentry Source Maps Initially

**Why**: Adds CI/CD time, complex configuration
**When**: Milestone 3+ (if stack traces unclear)

### ❌ Don't: Track Every Error in Sentry

**Why**: Will exhaust free tier quickly
**When**: Only track 4xx/5xx HTTP errors + unhandled exceptions

### ❌ Don't: Disable CloudWatch Because Sentry Exists

**Why**: They serve different purposes (application vs infrastructure)
**When**: Never (both needed)

### ✅ Do: Start with Backend-Only Sentry

**Why**: Minimizes complexity, proves value first
**When**: Now (Milestone 2)

### ✅ Do: Review Sentry Dashboard Weekly

**Why**: Catch patterns, adjust sampling if needed
**When**: Every Monday morning

### ✅ Do: Set AWS Billing Alerts

**Why**: Prevent CloudWatch cost surprises
**When**: $15/month threshold

---

## Quick Commands

### Check Monitoring Status

```bash
# CloudWatch health
curl http://localhost:3001/health
curl http://localhost:3001/health/metrics

# Sentry test (production only)
# Will send test error to Sentry
curl -X POST http://localhost:3001/api/test-error
```

### View Recent Metrics

```bash
# CloudWatch (AWS CLI)
aws cloudwatch list-metrics --namespace MoneyWise/Backend

# Sentry (web dashboard)
open https://sentry.io/organizations/kdantuono/projects/moneywise-backend/
```

### Trigger Test Error

```typescript
// For testing Sentry integration
throw new Error('Test error for Sentry - ignore');
```

---

## Related Documents

- **Full Decision**: [ADR-002: Tech Stack Consolidation](./adr-002-tech-stack-consolidation.md)
- **CloudWatch Docs**: `apps/backend/src/core/monitoring/README.md`
- **Critical Path**: `docs/planning/critical-path.md`

---

**Version**: 1.0.0
**Status**: Approved (pending user confirmation)
**Next Review**: Post-Milestone 2 (after production deployment)
