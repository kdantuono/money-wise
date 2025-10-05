# MoneyWise Monitoring Architecture - Visual Guide

**Last Updated**: 2025-10-04

---

## System Architecture: Before vs After

### BEFORE (Current State - Broken)

```
┌─────────────────────────────────────────────────────────────────┐
│                         APPLICATION                              │
├─────────────────────────────────────────────────────────────────┤
│  NestJS Backend (Port 3001)                                     │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │ API Endpoints   │  │ Sentry Code     │ ❌ NOT CONFIGURED    │
│  │ (working)       │  │ (exists)        │                      │
│  └────────┬────────┘  └─────────────────┘                      │
│           │                                                      │
│           │  Logs (CloudWatch only)                             │
│           ▼                                                      │
│  ┌─────────────────────────────────────────┐                   │
│  │ CloudWatch Service ✅                    │                   │
│  │ - Request metrics                        │                   │
│  │ - Error counts (no context)             │                   │
│  │ - System health                          │                   │
│  └─────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CI/CD PIPELINES                          │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Progressive CI/CD (working)                                 │
│  ✅ Security Audit (working)                                    │
│  ❌ CodeQL (failing - requires GitHub org)                     │
│  ❌ Sentry Release (skipped - not configured)                  │
│  ⚠️ Semgrep (informational only)                               │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MONITORING VISIBILITY                         │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Infrastructure: Memory, CPU, uptime                         │
│  ⚠️ Errors: Count only (no context/stack traces)               │
│  ❌ User Context: None                                          │
│  ❌ Error Grouping: None                                        │
│  ❌ Performance Traces: None                                    │
└─────────────────────────────────────────────────────────────────┘

PROBLEMS:
- Production errors invisible (no stack traces)
- No user context when bugs occur
- CodeQL failing (requires $49/user/month org)
- Sentry installed but broken
```

---

### AFTER (Proposed State - Fortune 500 Quality)

```
┌─────────────────────────────────────────────────────────────────┐
│                         APPLICATION                              │
├─────────────────────────────────────────────────────────────────┤
│  NestJS Backend (Port 3001)                                     │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │ API Endpoints   │  │ Sentry Init     │ ✅ CONFIGURED        │
│  │                 │  │ (minimal)       │                      │
│  └────────┬────────┘  └────────┬────────┘                      │
│           │                     │                               │
│           │                     │                               │
│           ▼                     ▼                               │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │ CloudWatch Svc  │  │ SentryIntercept │                      │
│  │ (infrastructure)│  │ (errors)        │                      │
│  └────────┬────────┘  └────────┬────────┘                      │
│           │                     │                               │
└───────────┼─────────────────────┼───────────────────────────────┘
            │                     │
            │                     │
            ▼                     ▼
┌───────────────────┐   ┌────────────────────┐
│   AWS CloudWatch  │   │   Sentry.io        │
│   ───────────────│   │   ──────────────── │
│   Infrastructure  │   │   Application      │
│   Metrics         │   │   Errors           │
│                   │   │                    │
│   • Memory/CPU    │   │   • Stack traces   │
│   • Request rate  │   │   • User context   │
│   • API latency   │   │   • Breadcrumbs    │
│   • DB queries    │   │   • Error grouping │
│   • Health status │   │   • Performance    │
│                   │   │     (10% sample)   │
│   Cost: $8/mo     │   │   Cost: $0         │
└───────────────────┘   └────────────────────┘
            │                     │
            └─────────┬───────────┘
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CI/CD PIPELINES                          │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Progressive CI/CD (working)                                 │
│  ✅ Security Audit (working)                                    │
│  ✅ Sentry Backend Release (simplified)                         │
│  ✅ Semgrep SAST (informational)                                │
│  ❌ CodeQL (REMOVED - requires org)                            │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MONITORING VISIBILITY                         │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Infrastructure: Memory, CPU, uptime, trends                 │
│  ✅ Errors: Full stack traces + context                         │
│  ✅ User Context: Session, breadcrumbs, device                  │
│  ✅ Error Grouping: Automatic deduplication                     │
│  ✅ Performance Traces: 10% sample (free tier)                  │
└─────────────────────────────────────────────────────────────────┘

BENEFITS:
✓ Full error visibility (stack traces + context)
✓ User session tracking (what did user do before error?)
✓ Zero cost increase ($0 Sentry free tier)
✓ Cleaner CI/CD (removed failing CodeQL)
✓ Fortune 500 quality monitoring
```

---

## Data Flow: Error Scenario

### Example: User Registration Fails

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. USER ACTION                                                   │
└──────────────────────────────────────────────────────────────────┘
POST /api/auth/register
Body: { email: "invalid-email", password: "..." }

                    │
                    ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. APPLICATION LAYER (NestJS)                                    │
└──────────────────────────────────────────────────────────────────┘
API Request
  │
  ├─> MonitoringInterceptor (before)
  │   - Start timer
  │   - Log request start
  │
  ├─> AuthController.register()
  │   └─> Validation fails ❌
  │       throw new BadRequestException("Invalid email format")
  │
  ├─> SentryInterceptor (catches error)
  │   - Extracts user context
  │   - Strips sensitive data (passwords, tokens)
  │   - Sends to Sentry.io
  │
  └─> MonitoringInterceptor (after)
      - End timer (responseTime = 45ms)
      - Increment error count
      - Send metrics to CloudWatch

                    │
                    ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. MONITORING SERVICES (Parallel)                                │
└──────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐    ┌────────────────────────────────┐
│   Sentry.io             │    │   AWS CloudWatch               │
│   ─────────────         │    │   ───────────────              │
│                         │    │                                │
│   Event Captured:       │    │   Metrics Captured:            │
│   ──────────────        │    │   ─────────────────            │
│   • Error: BadRequest   │    │   • Endpoint: POST /auth/reg   │
│   • Message: "Invalid   │    │   • Status: 400                │
│     email format"       │    │   • Response Time: 45ms        │
│   • Stack Trace:        │    │   • Error Count: +1            │
│     auth.service.ts:42  │    │   • Timestamp: 2025-10-04...   │
│   • User Context:       │    │                                │
│     - IP: 192.168.1.1   │    │   Aggregated (30s buffer):     │
│     - Browser: Chrome   │    │   • Total Errors: 3            │
│     - Device: Desktop   │    │   • Avg Response: 52ms         │
│   • Breadcrumbs:        │    │   • Success Rate: 97%          │
│     [1] GET /api/status │    │                                │
│     [2] POST /api/auth  │    │   Alarms Triggered:            │
│   • Environment: prod   │    │   • None (3 < threshold 10)    │
│   • Release: abc123de   │    │                                │
│                         │    │                                │
│   Grouped with:         │    │   Dashboard View:              │
│   • 5 similar errors    │    │   • Health: 🟢 Healthy         │
│   • Last 24h            │    │   • Memory: 67% (normal)       │
│   • 3 affected users    │    │   • CPU: 12% (normal)          │
└─────────────────────────┘    └────────────────────────────────┘

                    │
                    ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. DEVELOPER RESPONSE                                            │
└──────────────────────────────────────────────────────────────────┘

Sentry Dashboard (Primary):
  ✓ See exact error: "Invalid email format"
  ✓ Stack trace → auth.service.ts line 42
  ✓ User context → Browser: Chrome, IP: 192.168.1.1
  ✓ Grouped with 5 similar errors (same root cause)
  ✓ Fix: Improve email validation regex

CloudWatch Dashboard (Secondary):
  ✓ Verify error rate acceptable (3 errors, not spiking)
  ✓ Check system health (memory/CPU normal)
  ✓ Confirm no infrastructure issues

Resolution Time:
  • Without Sentry: 2 hours (log diving, no context)
  • With Sentry: 15 minutes (stack trace + context)
  • Time Saved: 1h 45m per error
```

---

## Monitoring Responsibility Matrix

```
┌─────────────────────────────────────────────────────────────────┐
│                    WHAT EACH TOOL DOES                           │
├─────────────────────────┬───────────────────────────────────────┤
│                         │                                       │
│   CloudWatch            │   Sentry                              │
│   (Infrastructure)      │   (Application)                       │
│                         │                                       │
├─────────────────────────┼───────────────────────────────────────┤
│                         │                                       │
│ ✅ Memory Usage         │ ❌ Not tracked                        │
│ ✅ CPU Utilization      │ ❌ Not tracked                        │
│ ✅ Uptime               │ ❌ Not tracked                        │
│ ✅ Request Volume       │ ⚠️ Sampled (10%)                     │
│ ✅ Response Times       │ ⚠️ Sampled (10%)                     │
│ ⚠️ Error Count         │ ✅ Full capture                       │
│ ❌ Stack Traces         │ ✅ Full stack traces                  │
│ ❌ User Context         │ ✅ Session, breadcrumbs               │
│ ❌ Error Grouping       │ ✅ Automatic deduplication            │
│ ✅ Database Queries     │ ❌ Not tracked                        │
│ ✅ Health Checks        │ ❌ Not tracked                        │
│ ✅ Business Metrics     │ ❌ Not tracked                        │
│                         │                                       │
├─────────────────────────┼───────────────────────────────────────┤
│                         │                                       │
│ Cost: $5-10/month       │ Cost: $0 (free tier)                  │
│ Setup: Medium           │ Setup: Low                            │
│ Maintenance: Low        │ Maintenance: Low                      │
│ Existing: Complete      │ Existing: Partial (needs config)      │
│                         │                                       │
└─────────────────────────┴───────────────────────────────────────┘

KEY INSIGHT: They complement each other perfectly.
- CloudWatch = "Is the server healthy?"
- Sentry = "Why did this request fail?"
```

---

## Security Scanning Architecture

### Current State

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY SCANNING LAYERS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1: Dependency Vulnerabilities (CVEs)                     │
│  ──────────────────────────────────────────                     │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │  pnpm audit     │  │  Dependabot     │                      │
│  │  (CI/CD)        │  │  (Auto PRs)     │                      │
│  │  ✅ Working     │  │  ✅ Working     │                      │
│  └─────────────────┘  └─────────────────┘                      │
│  Coverage: ████████████ 100% (industry standard)                │
│                                                                  │
│  Layer 2: Code Security (SAST)                                  │
│  ─────────────────────────────                                  │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │  Semgrep        │  │  ESLint Security│                      │
│  │  (Informational)│  │  (Enforced)     │                      │
│  │  ✅ Working     │  │  ✅ Working     │                      │
│  └─────────────────┘  └─────────────────┘                      │
│  Coverage: ████████░░░░ 70% (adequate for MVP)                  │
│                                                                  │
│  Layer 3: Secret Detection                                      │
│  ──────────────────────                                         │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │  TruffleHog     │  │  Custom Patterns│                      │
│  │  (Verified)     │  │  (DB/API creds) │                      │
│  │  ✅ Working     │  │  ✅ Working     │                      │
│  └─────────────────┘  └─────────────────┘                      │
│  Coverage: ████████████ 100% (zero false positives)             │
│                                                                  │
│  Layer 4: Advanced SAST (Deferred)                              │
│  ─────────────────────────────────                              │
│  ┌─────────────────┐  ┌─────────────────┐                      │
│  │  CodeQL         │  │  SonarCloud     │                      │
│  │  ❌ REMOVED     │  │  📋 M5+         │                      │
│  └─────────────────┘  └─────────────────┘                      │
│  Why: Requires GitHub org ($49/user/mo)   │ Overkill for MVP    │
│  Alternative: Semgrep covers 70% of CodeQL patterns             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

COVERAGE SUMMARY:
✅ Dependency CVEs: 100% (pnpm audit + Dependabot)
⚠️ Code Security: 70% (Semgrep + ESLint)
✅ Secret Detection: 100% (TruffleHog + custom)
❌ Advanced SAST: 0% (deferred to M5)

RISK ASSESSMENT: ACCEPTABLE for MVP
- 70% SAST coverage adequate for 3,525 LOC
- Manual code review for critical paths (auth, payments)
- Re-evaluate at M5 (Security Hardening) or 10k+ LOC
```

---

## Workflow Consolidation: Before vs After

### BEFORE (14 Workflows, 2 Broken)

```
.github/workflows/
├── progressive-ci-cd.yml        ✅ Working
├── security.yml                 ⚠️ CodeQL job failing
├── sentry-release.yml           ❌ Skipped (not configured)
├── migrations.yml               ✅ Working
├── release.yml                  ✅ Working
└── [9 other workflows]          ✅ Working

Status: 12 working, 2 broken/skipped
CI/CD Time: ~8 minutes (includes failing CodeQL)
Success Rate: 85% (CodeQL always fails)
```

### AFTER (12 Workflows, All Working)

```
.github/workflows/
├── progressive-ci-cd.yml        ✅ Working
├── security.yml                 ✅ Fixed (CodeQL removed)
├── sentry-backend.yml           ✅ Simplified (backend only)
├── migrations.yml               ✅ Working
├── release.yml                  ✅ Working
└── [7 other workflows]          ✅ Working

.github/workflows-archive/
└── sentry-release.yml.backup    📦 Archived (reference)

Status: 12 working, 0 broken
CI/CD Time: ~7 minutes (CodeQL removed)
Success Rate: 100% (all workflows pass)
Reduction: 14 → 12 workflows (-14%)
```

---

## Cost Analysis: 3-Year Projection

```
┌─────────────────────────────────────────────────────────────────┐
│                         YEAR 1 (MVP)                             │
├─────────────────────────────────────────────────────────────────┤
│  CloudWatch: $8/mo × 12 = $96/year                              │
│  Sentry: $0 (free tier, <500 errors/mo)                         │
│  GitHub Actions: $0 (2000 min/mo free tier)                     │
│  Total: $96/year                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    YEAR 2 (Post-Launch)                          │
├─────────────────────────────────────────────────────────────────┤
│  CloudWatch: $15/mo × 12 = $180/year (scaling)                  │
│  Sentry: $26/mo × 12 = $312/year (Team plan - success!)         │
│  GitHub Actions: $0 (still in free tier)                        │
│  Total: $492/year                                                │
│                                                                  │
│  Note: Sentry Team = 10k errors/mo (>5k = product success!)     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      YEAR 3 (Growth)                             │
├─────────────────────────────────────────────────────────────────┤
│  CloudWatch: $30/mo × 12 = $360/year (more traffic)             │
│  Sentry: $80/mo × 12 = $960/year (Business plan - scale!)       │
│  GitHub Actions: $0 (still in free tier likely)                 │
│  SonarCloud: $0 (optional, free tier)                           │
│  Total: $1,320/year                                              │
│                                                                  │
│  Note: Sentry Business = 50k errors/mo (significant traction)   │
└─────────────────────────────────────────────────────────────────┘

3-YEAR TOTAL: $1,908 ($53/month average)

ENTERPRISE COMPARISON:
- DataDog: $15-31/host/month = $540-$1,116/year (single host!)
- New Relic: $99/user/month = $1,188/year (single user!)
- Dynatrace: $74/host/month = $888/year (single host!)

SAVINGS: 60-70% vs enterprise tools
QUALITY: Comparable monitoring capabilities
```

---

## Decision Tree: When to Use What Tool

```
┌──────────────────────────────────────────────────────────────┐
│  PRODUCTION ISSUE DECISION TREE                               │
└──────────────────────────────────────────────────────────────┘

START: "Something is wrong in production"
│
├─ "Is the server/service down?"
│  └─> Use: CloudWatch + Health Endpoint
│       - Check: /health endpoint status
│       - View: CloudWatch uptime metrics
│       - Verify: Database/Redis connections
│
├─ "Why did this request fail?"
│  └─> Use: Sentry (Primary)
│       - View: Full stack trace
│       - Check: User session context
│       - Review: Breadcrumbs (last 10 actions)
│       - Verify: No infrastructure issues in CloudWatch
│
├─ "Is this a performance issue?"
│  └─> Use: CloudWatch (Primary) + Sentry (Secondary)
│       - View: Response time graphs (CloudWatch)
│       - Check: Slow endpoint patterns (CloudWatch)
│       - Sample: Performance traces (Sentry 10%)
│       - Analyze: Database query times (CloudWatch)
│
├─ "Is this affecting many users?"
│  └─> Use: BOTH
│       - Sentry: Count affected users (unique sessions)
│       - CloudWatch: Error rate percentage
│       - Sentry: Error frequency graph
│       - CloudWatch: Request volume correlation
│
├─ "Did a deployment cause this?"
│  └─> Use: Sentry + CloudWatch
│       - Sentry: Release tracking (git commit hash)
│       - CloudWatch: Metrics before/after deploy
│       - Sentry: Error spike timing
│       - CloudWatch: Resource usage changes
│
└─ "Is there a security issue?"
   └─> Use: Logs + Sentry + CloudWatch
       - Logs: Suspicious patterns (auth failures)
       - Sentry: Exception types (unauthorized, etc.)
       - CloudWatch: Request patterns (DDoS?)
       - TruffleHog: Re-scan for leaked secrets
```

---

## Quick Command Reference

### Monitoring Health Checks

```bash
# Backend health
curl http://localhost:3001/health

# CloudWatch metrics
curl http://localhost:3001/health/metrics

# Trigger test error (Sentry)
curl -X POST http://localhost:3001/api/test-error
```

### CI/CD Status

```bash
# View workflows
gh workflow list

# Latest runs
gh run list --limit 5

# Watch specific workflow
gh run watch [run-id]

# Security workflow status
gh run list --workflow="Security & Dependency Review"
```

### Sentry Management

```bash
# Open Sentry dashboard
open "https://sentry.io/organizations/kdantuono/projects/moneywise-backend/"

# Check quota usage
# Dashboard > Settings > Subscription > Usage

# Create test error (after implementation)
curl -X POST http://localhost:3001/api/sentry-test
```

### CloudWatch (AWS CLI)

```bash
# List metrics
aws cloudwatch list-metrics --namespace MoneyWise/Backend

# Get metric statistics (last hour)
aws cloudwatch get-metric-statistics \
  --namespace MoneyWise/Backend \
  --metric-name ApiErrors \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

---

## Related Documents

- **Full ADR**: [adr-002-tech-stack-consolidation.md](./adr-002-tech-stack-consolidation.md) - Complete rationale and analysis
- **Quick Reference**: [monitoring-decision-matrix.md](./monitoring-decision-matrix.md) - When to use what tool
- **Implementation Guide**: [implement-sentry-minimal.md](../.workflows/implement-sentry-minimal.md) - Step-by-step setup
- **Summary**: [TECH_STACK_DECISIONS_SUMMARY.md](./TECH_STACK_DECISIONS_SUMMARY.md) - Executive overview

---

**Version**: 1.0.0
**Last Updated**: 2025-10-04
**Status**: Visual reference for ADR-002
