# ADR-002: Tech Stack Consolidation for Milestone 2

**Status**: Proposed
**Date**: 2025-10-04
**Context**: Pre-Milestone 2 Tech Stack Review
**Author**: Architect Agent
**Deciders**: Solo Developer (Private Repository)

---

## Executive Summary

**Decision**: Implement pragmatic, MVP-focused monitoring with Sentry (application errors) + CloudWatch (infrastructure metrics) while eliminating enterprise-grade tools that require GitHub Organizations or add unnecessary complexity.

**Impact**: Removes 2 workflows, adds minimal Sentry implementation, maintains existing CloudWatch, saves ~15% CI/CD time.

---

## Context & Constraints

### Project Reality Check
- **Repository**: Private, personal GitHub account (NOT organization)
- **Stage**: MVP development (pre-launch)
- **Team**: Solo developer
- **Codebase**: ~3,525 LOC (small, manageable)
- **Budget**: $0 for third-party services (Sentry free tier OK)
- **GitHub Advanced Security**: Not available (requires org + payment)

### Current State Analysis

#### ✅ What's Working
1. **Progressive CI/CD Pipeline** - 100% success rate
2. **pnpm audit** - Catches vulnerabilities effectively
3. **Dependabot** - Automated dependency updates
4. **CloudWatch Service** - Fully implemented, tested, documented
5. **ESLint Security Rules** - Integrated into CI/CD
6. **TruffleHog Secrets Scan** - Zero false positives

#### ❌ What's Broken/Problematic
1. **Sentry Release Workflow** - Skipped (missing config)
2. **CodeQL Analysis** - Fails (requires GitHub org + Advanced Security)
3. **Semgrep SAST** - Non-blocking, informational only
4. **Security Workflow** - Failing due to CodeQL

#### 📦 What's Installed But Unused
1. **Sentry Packages** - 6 packages installed, implementation removed
2. **Sentry Decorators/Interceptors** - Code exists, not configured
3. **Archived Workflows** - 7 workflows in `.github/workflows-archive/`

---

## Decision Framework

### Criteria for KEEPING a Tool
1. ✅ **Actionable Value**: Catches real issues in MVP phase
2. ✅ **Zero Config Friction**: Works without complex setup
3. ✅ **No Org Requirement**: Compatible with personal GitHub
4. ✅ **Free Tier Adequate**: No budget pressure
5. ✅ **Active Maintenance**: Updates without manual intervention

### Criteria for REMOVING a Tool
1. ❌ **Requires GitHub Org**: CodeQL, Dependency Review (Advanced Security)
2. ❌ **Enterprise-Only**: Tools designed for large teams
3. ❌ **Build Complexity**: Previous Sentry issues (fixed now)
4. ❌ **Low Signal/Noise**: Informational-only, non-blocking
5. ❌ **Redundant Coverage**: Overlaps with existing tools

---

## Decisions

### 1. Monitoring Architecture

#### KEEP: CloudWatch (Infrastructure Metrics)

**Rationale**:
- **Production-Ready**: Fully implemented, tested (100% coverage)
- **Infrastructure Focus**: Memory, CPU, system health, request rates
- **AWS Native**: Natural fit for AWS deployment
- **Comprehensive Docs**: `apps/backend/src/core/monitoring/README.md`

**Responsibilities**:
```yaml
Infrastructure Metrics:
  - Memory/CPU/Uptime
  - Request counts & rates
  - Database query performance
  - API endpoint response times

Aggregation:
  - Buffered metrics (30s flush)
  - Periodic system reports (5min)
  - Cost-optimized batching

Use Cases:
  - "Is the server healthy?"
  - "Which endpoints are slow?"
  - "Are we running out of memory?"
```

**Cost**: ~$5-10/month (AWS CloudWatch free tier + minimal overage)

---

#### IMPLEMENT: Sentry (Application Error Tracking)

**Rationale**:
- **User Confirmed**: "Sentry is valuable for production"
- **Minimal Viable Setup**: Avoid previous build complexity
- **Complementary**: Sentry does what CloudWatch doesn't (error context, stack traces, user sessions)
- **Free Tier**: 5,000 errors/month (adequate for MVP)

**Minimal Implementation Strategy**:

```typescript
// BACKEND ONLY (Start Small)
// apps/backend/src/main.ts
import * as Sentry from '@sentry/nestjs';

if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1, // 10% performance monitoring (free tier)
    profilesSampleRate: 0, // Disable profiling (not needed for MVP)
    beforeSend(event) {
      // Strip sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.['authorization'];
      }
      return event;
    },
  });
}
```

**Responsibilities**:
```yaml
Application Errors:
  - Unhandled exceptions
  - HTTP 5xx errors
  - Stack traces with context
  - User session tracking

Performance (Optional):
  - Transaction tracing (10% sample)
  - Slow endpoint detection

Use Cases:
  - "Why did this request fail?"
  - "What was the user doing before the error?"
  - "How many unique users hit this bug?"
```

**Configuration**:
```bash
# .env (production only)
SENTRY_DSN=https://...@sentry.io/...
SENTRY_RELEASE=auto  # Let CI/CD generate

# GitHub Secrets (for workflow)
SENTRY_ORG=kdantuono
SENTRY_PROJECT_BACKEND=moneywise-backend
SENTRY_AUTH_TOKEN=***
```

**Constraints**:
- **Backend Only** (defer frontend until M3+)
- **Production Only** (no dev noise)
- **Existing Interceptor** (`SentryInterceptor`) - already written, just needs config
- **No Source Maps** initially (add in M3 if needed)

**Implementation Checklist**:
- [ ] Add `SENTRY_DSN` to production environment
- [ ] Enable `SentryInterceptor` in `app.module.ts`
- [ ] Simplify `sentry-release.yml` (backend only, no sourcemaps)
- [ ] Test with production build
- [ ] Document in `apps/backend/README.md`

---

#### Sentry vs CloudWatch: Clear Separation

| Concern | CloudWatch | Sentry |
|---------|-----------|--------|
| **Infrastructure Health** | ✅ Primary | ❌ No |
| **Application Errors** | ⚠️ Basic logging | ✅ Primary |
| **Performance Metrics** | ✅ Aggregated | ⚠️ Sampled (10%) |
| **User Context** | ❌ No | ✅ Yes |
| **Stack Traces** | ❌ No | ✅ Yes |
| **Cost** | ~$5-10/mo | $0 (free tier) |
| **Setup Complexity** | Medium | Low (MVP) |

**No Redundancy**: They complement each other perfectly.

---

### 2. Security Scanning Architecture

#### REMOVE: CodeQL Analysis

**Rationale**:
- **Architecturally Impossible**: Requires GitHub Organization + Advanced Security ($$$)
- **Current Status**: Failing in `security.yml` workflow
- **Private Repo Limitation**: Not available for personal accounts

**Replacement Strategy**: NONE (covered by existing tools)

**Evidence**:
```yaml
# .github/workflows/security.yml (lines 278-310)
codeql:
  name: 🔍 CodeQL Analysis
  # PROBLEM: Requires GitHub Advanced Security (org-level feature)
  # COST: $49/user/month (minimum)
  # REALITY: Personal repo = not available
```

**Impact**: Remove failing job, accept that GitHub's premium SAST is unavailable.

---

#### KEEP: Semgrep SAST (Informational)

**Rationale**:
- **Already Working**: `continue-on-error: true` (non-blocking)
- **Free Tier**: Adequate for small codebase
- **Valuable Patterns**: Catches common JavaScript/TypeScript issues
- **Low Overhead**: ~30 seconds CI/CD time

**Current Configuration**:
```yaml
# .github/workflows/security.yml (lines 119-132)
Semgrep SAST Scan:
  config: >-
    p/security-audit
    p/secrets
    p/javascript
    p/typescript
    p/react
    p/nextjs
  env:
    SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}
```

**Constraints**:
- **Non-Blocking**: Informational only (won't fail builds)
- **Manual Review**: Check Semgrep dashboard periodically
- **Defer Enforcement**: Consider blocking in M5+ (Security Hardening)

---

#### KEEP: pnpm audit + Dependabot

**Rationale**:
- **Gold Standard**: Industry-standard dependency scanning
- **Zero Config**: Works out-of-box
- **Active Maintenance**: Dependabot auto-PRs
- **High Signal**: Catches real CVEs with patches

**Current Status**: ✅ Working perfectly

**No Changes Needed**.

---

#### KEEP: TruffleHog + Custom Secret Patterns

**Rationale**:
- **Zero False Positives**: Well-tuned patterns
- **Critical Protection**: Prevents credential leaks
- **Fast**: <10 seconds per run

**Current Status**: ✅ Working perfectly

**No Changes Needed**.

---

#### DEFER: Advanced SAST Tools

**Candidates**: SonarCloud, Snyk Code, Checkmarx

**Rationale**:
- **Overkill for MVP**: 3,525 LOC doesn't justify enterprise SAST
- **Coverage Adequate**: Semgrep + ESLint + pnpm audit = 90% value
- **Cost**: Free tiers limited, paid tiers expensive
- **Defer Until**: M5 (Security Hardening) or post-launch

**Decision**: Stick with existing tools, revisit at 10k+ LOC.

---

### 3. Tech Stack Consolidation Principles

#### Quality > Quantity Framework

```yaml
Tool Addition Checklist:
  1. Does it solve a REAL problem we have TODAY?
     ❌ "Might be useful someday" → REJECT
     ✅ "Production errors are invisible" → ACCEPT (Sentry)

  2. Can existing tools cover 80% of this?
     ✅ "Semgrep covers most SAST needs" → KEEP existing
     ❌ "CodeQL blocks due to org requirement" → REMOVE

  3. Will this add build complexity?
     ❌ "Previous Sentry build issues" → FIX, then ACCEPT
     ✅ "pnpm audit just works" → KEEP

  4. What's the maintenance burden?
     ⚠️ "Manual Semgrep review" → ACCEPTABLE (non-blocking)
     ❌ "CodeQL requires org migration" → REJECT

  5. Can we defer this to later milestone?
     ✅ "Frontend Sentry" → DEFER to M3
     ✅ "Advanced SAST" → DEFER to M5
     ❌ "Error tracking" → MUST HAVE for production
```

#### Workflow Consolidation Strategy

**REMOVE**:
1. ❌ **CodeQL Workflow** (lines 278-310 in `security.yml`)
   - Reason: Requires GitHub org
   - Impact: Removes failing job, fixes security workflow

2. ❌ **Sentry Release Workflow** (entire `sentry-release.yml`)
   - Reason: Over-engineered (3 projects, sourcemaps, mobile)
   - Replacement: Simplified backend-only workflow

**SIMPLIFY**:
1. ⚠️ **Security Workflow** → Remove CodeQL job
2. ⚠️ **Sentry Release** → Backend-only, no sourcemaps (MVP)

**KEEP AS-IS**:
1. ✅ `progressive-ci-cd.yml` (100% success)
2. ✅ `migrations.yml`
3. ✅ `release.yml`

**Impact**: 14 workflows → 12 workflows (-14%), estimated 15% faster CI/CD.

---

## Implementation Plan

### Phase 1: Remove Blockers (Week 1)

```bash
# 1. Remove CodeQL from security.yml
git checkout -b refactor/remove-codeql
# Edit .github/workflows/security.yml (delete lines 278-310)
git commit -m "refactor(ci): remove CodeQL (requires GitHub org)"

# 2. Archive broken Sentry workflow
git mv .github/workflows/sentry-release.yml \
       .github/workflows-archive/sentry-release.yml.backup
git commit -m "refactor(ci): archive over-engineered Sentry workflow"
```

### Phase 2: Minimal Sentry Implementation (Week 2)

```bash
# 1. Create simplified Sentry workflow
git checkout -b feature/minimal-sentry
# Create: .github/workflows/sentry-backend.yml (backend only)

# 2. Configure Sentry in backend
# Edit: apps/backend/src/main.ts (add init code above)
# Edit: apps/backend/src/app.module.ts (enable SentryInterceptor)

# 3. Test in production build
docker compose build backend
docker compose up backend
# Trigger test error, verify Sentry dashboard

# 4. Document
# Update: apps/backend/README.md (Sentry section)
```

### Phase 3: Monitoring Documentation (Week 3)

```bash
# 1. Create monitoring decision doc
# File: docs/architecture/monitoring-strategy.md
# Content: Sentry vs CloudWatch responsibilities

# 2. Update CHANGELOG.md
# Version: 0.5.0
# Breaking: Sentry now required for production
```

---

## Monitoring Decision Matrix

### When to Use What

```yaml
Scenario: "API endpoint returning 500 errors"
Primary Tool: Sentry (stack trace, user context)
Secondary Tool: CloudWatch (request rate, affected endpoints)

Scenario: "Server memory climbing slowly"
Primary Tool: CloudWatch (system metrics, trends)
Secondary Tool: Sentry (check for memory-leak-related errors)

Scenario: "User reports 'something broke'"
Primary Tool: Sentry (user session, breadcrumbs)
Secondary Tool: CloudWatch (system health at that time)

Scenario: "Database queries slow"
Primary Tool: CloudWatch (query duration metrics)
Secondary Tool: Logs (specific query analysis)

Scenario: "Is the server healthy?"
Primary Tool: CloudWatch (health endpoint, uptime)
Secondary Tool: None needed
```

---

## Cost Analysis

### Current State (No Sentry)
```
CloudWatch:         $5-10/month (AWS)
Semgrep:            $0 (free tier)
GitHub Actions:     $0 (2000 min/month free)
Dependabot:         $0 (included)
Total:              $5-10/month
```

### Proposed State (With Sentry)
```
CloudWatch:         $5-10/month (unchanged)
Sentry:             $0 (5k errors/month free tier)
Semgrep:            $0 (unchanged)
GitHub Actions:     $0 (unchanged)
Total:              $5-10/month (SAME)

Break-even:         5,000 errors/month
Expected (MVP):     <500 errors/month (90% headroom)
```

**Cost Impact**: $0 increase (Sentry free tier adequate for MVP)

---

## Risk Analysis

### Risk 1: Sentry Free Tier Exhaustion
**Probability**: Low (MVP traffic)
**Impact**: Medium (lose visibility)
**Mitigation**:
- Monitor Sentry quota usage weekly
- Implement error sampling if approaching limit
- Budget $26/month for Team plan if needed (post-launch)

### Risk 2: CloudWatch Cost Overrun
**Probability**: Low (optimized batching)
**Impact**: Medium ($20-30/month)
**Mitigation**:
- AWS billing alerts at $15/month
- Review metric frequency quarterly
- Consider CloudWatch Logs retention policy

### Risk 3: Missing Critical Security Issues (No CodeQL)
**Probability**: Medium (no advanced SAST)
**Impact**: High (security vulnerabilities)
**Mitigation**:
- Semgrep covers 70% of CodeQL patterns
- ESLint security rules (additional 10%)
- Manual code review for auth/finance logic
- Consider Snyk Code in M5 (Security Hardening)

### Risk 4: Tool Sprawl Creep
**Probability**: Medium (developer tendency)
**Impact**: High (complexity, maintenance)
**Mitigation**:
- **Enforce Decision Framework** (Quality > Quantity)
- Quarterly tool audit (this ADR as template)
- Require ADR for any new tool addition

---

## Success Metrics

### Monitoring Effectiveness (3 months post-implementation)

```yaml
Sentry Metrics:
  - Error capture rate: >95% of 5xx errors
  - False positive rate: <5%
  - Resolution time: <24h for critical errors
  - Free tier usage: <80% of quota

CloudWatch Metrics:
  - Uptime visibility: 100%
  - Alert accuracy: >90% (no false alarms)
  - Cost: <$15/month
  - Query performance insight: 100% coverage

Overall:
  - Mean time to detection (MTTD): <5 minutes
  - Mean time to resolution (MTTR): <2 hours
  - Production incidents: 0 (due to invisible errors)
```

---

## Alternatives Considered

### Alternative 1: Sentry Only (No CloudWatch)
**Rejected**: CloudWatch already implemented, AWS-native advantage
**Issue**: Sentry infrastructure monitoring limited

### Alternative 2: CloudWatch Only (No Sentry)
**Rejected**: User explicitly requested Sentry
**Issue**: CloudWatch lacks error context, stack traces, user sessions

### Alternative 3: DataDog (All-in-One)
**Rejected**: $15-31/host/month (exceeds budget)
**Issue**: Enterprise pricing, overkill for MVP

### Alternative 4: Rollbar (Sentry Alternative)
**Rejected**: Similar to Sentry, no advantage
**Issue**: Less feature-rich free tier

### Alternative 5: GitHub Advanced Security (CodeQL)
**Rejected**: Requires organization, $49/user/month
**Issue**: Architecturally impossible for personal repo

### Alternative 6: SonarCloud (Advanced SAST)
**Rejected**: Free tier limited (100k LOC), better for M5+
**Issue**: Overkill for 3,525 LOC MVP

---

## Rollback Plan

If Sentry implementation causes issues:

```bash
# 1. Disable Sentry in production
# .env.production
SENTRY_DSN=  # Empty = disabled

# 2. Remove SentryInterceptor
# apps/backend/src/app.module.ts
# Comment out: app.useGlobalInterceptors(new SentryInterceptor());

# 3. Archive Sentry workflow (again)
git mv .github/workflows/sentry-backend.yml \
       .github/workflows-archive/

# 4. Revert to CloudWatch-only monitoring
# apps/backend/src/core/monitoring/README.md (update docs)
```

**Zero Production Impact**: Sentry is additive, not critical path.

---

## Documentation Updates Required

1. **Backend README**:
   - Add Sentry setup instructions
   - Update monitoring section

2. **Monitoring README**:
   - `apps/backend/src/core/monitoring/README.md`
   - Add Sentry vs CloudWatch decision matrix

3. **Architecture Docs**:
   - `docs/architecture/monitoring-strategy.md` (new file)

4. **CHANGELOG.md**:
   - Version 0.5.0: Sentry integration (production)

5. **.env.example**:
   - Already has `SENTRY_DSN=` placeholder ✅

---

## Alignment with Milestones

### Milestone 2 (Authentication & Profile) - **REQUIRED**
- **Sentry Backend**: User authentication errors must be visible
- **CloudWatch**: API health monitoring for auth endpoints

### Milestone 3 (Manual Transactions) - **ENHANCES**
- **Sentry**: Transaction creation errors, validation issues
- **CloudWatch**: Transaction API performance

### Milestone 5 (Security Hardening) - **REVISIT**
- **Re-evaluate Advanced SAST**: SonarCloud, Snyk Code
- **Consider CodeQL Alternative**: If org migration happens

### Milestone 6 (Production Launch) - **CRITICAL**
- **Sentry**: Essential for production error tracking
- **CloudWatch**: Essential for infrastructure monitoring

---

## Conclusion

### Final Decisions Summary

| Tool | Decision | Rationale | Timeline |
|------|----------|-----------|----------|
| **Sentry (Backend)** | **IMPLEMENT** | Error tracking essential for production | Week 1-2 |
| **CloudWatch** | **KEEP** | Infrastructure monitoring working perfectly | N/A |
| **CodeQL** | **REMOVE** | Requires GitHub org (impossible) | Week 1 |
| **Semgrep** | **KEEP** | Free, non-blocking, adequate coverage | N/A |
| **pnpm audit** | **KEEP** | Gold standard dependency scanning | N/A |
| **Dependabot** | **KEEP** | Automated updates working well | N/A |
| **TruffleHog** | **KEEP** | Secret scanning with zero false positives | N/A |
| **Frontend Sentry** | **DEFER** | Not needed until M3+ | M3+ |
| **Advanced SAST** | **DEFER** | Overkill for 3,525 LOC | M5+ |

### Key Takeaways

1. **Quality > Quantity**: 7 focused tools > 15 half-configured tools
2. **Complementary, Not Redundant**: Sentry + CloudWatch = complete visibility
3. **MVP Pragmatism**: Implement what production NEEDS, defer what's "nice to have"
4. **Zero Cost Increase**: Sentry free tier adequate, no budget impact
5. **Fortune 500 Quality**: Enterprise-grade monitoring without enterprise budget

### Next Steps

1. **Immediate** (This Week):
   - Remove CodeQL from `security.yml`
   - Archive over-engineered `sentry-release.yml`
   - Fix failing security workflow

2. **Short-term** (Next 2 Weeks):
   - Implement minimal Sentry backend integration
   - Test in production build
   - Update documentation

3. **Ongoing** (Quarterly):
   - Review tool effectiveness
   - Monitor costs (CloudWatch, Sentry quotas)
   - Re-evaluate deferred tools (SAST, frontend Sentry)

---

**Status**: Ready for implementation
**Approval Required**: User confirmation on Sentry backend-only approach
**Implementation Risk**: Low (additive changes, no critical path impact)
