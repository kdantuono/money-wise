# ADR-002: Turborepo Telemetry Opt-Out

**Status:** Accepted
**Date:** 2025-10-10
**Story:** STORY-1.5.8 (CI/CD Budget Optimization)
**Related:** ADR-001-ci-cd-budget-optimization.md

## Context and Problem Statement

Turborepo collects anonymous telemetry data by default to help Vercel improve the product. While this data is anonymous and doesn't include sensitive information, we need to decide whether to participate in telemetry collection given:

1. **CI/CD Budget Constraints**: Every millisecond counts when working within GitHub Actions free tier (3000 min/month)
2. **Privacy Philosophy**: MoneyWise handles financial data; users expect maximum privacy
3. **Open Source Best Practices**: Telemetry should be opt-in or explicitly documented

### What Telemetry Collects

According to [Turborepo documentation](https://turborepo.com/docs/telemetry):

**Collected Data:**
- Command invocations (e.g., `turbo run build`)
- Turborepo version
- General machine information (OS, architecture)
- Application size and structure

**NOT Collected:**
- Task names or package names
- Arguments passed to commands
- Environment variables
- File paths or contents
- Source code
- Logs or error messages
- Personally identifiable information

## Decision Drivers

### Performance Impact
- **Telemetry overhead**: ~10-50ms per turbo invocation (network request to Vercel)
- **CI/CD impact**: With 50+ turbo invocations per pipeline run:
  - 50 × 50ms = 2.5 seconds per run
  - 60 runs/month × 2.5s = 150 seconds = **2.5 minutes/month saved**
- **Cumulative savings**: Every second matters when working within 3000 min/month budget

### Privacy & Control
- Financial application requires maximum privacy stance
- Telemetry opt-out demonstrates privacy-first philosophy
- Aligns with GDPR/privacy-by-design principles

### Developer Experience
- No impact on local development workflow
- No impact on turbo functionality
- Telemetry is purely for Vercel's product improvement

## Considered Options

### Option A: Keep Telemetry Enabled (Default)
**Pros:**
- Supports Turborepo development
- No configuration needed
- Vercel can improve product based on usage patterns

**Cons:**
- Additional network latency in CI/CD (~2.5 min/month)
- Telemetry data sent to external servers
- Not aligned with privacy-first philosophy

### Option B: Opt-Out Locally and CI/CD (Chosen)
**Pros:**
- Eliminates telemetry overhead in CI/CD pipeline
- Demonstrates privacy-first commitment
- Simple implementation via environment variable
- No functional impact on turbo features

**Cons:**
- MoneyWise usage won't contribute to Turborepo improvements
- Requires manual configuration

## Decision Outcome

**Chosen: Option B - Complete Telemetry Opt-Out**

We will disable Turborepo telemetry in both local development and CI/CD environments.

### Implementation

#### 1. Local Development
```bash
npx turbo telemetry disable
# Verification: npx turbo telemetry status → "Status: Disabled"
```

Creates `~/.turbo/config.json`:
```json
{
  "telemetry_enabled": false
}
```

#### 2. CI/CD Environment
Add to all GitHub Actions workflows that use turbo (via pnpm scripts):

```yaml
env:
  TURBO_TELEMETRY_DISABLED: '1'  # Opt-out of anonymous telemetry
```

**Updated workflows:**
- `.github/workflows/quality-gates.yml` ✅
- `.github/workflows/quality-gates-lite.yml` ✅
- `.github/workflows/ci-cd.yml` ✅
- `.github/workflows/specialized-gates.yml` ✅
- `.github/workflows/release.yml` ✅

### Verification

#### Local
```bash
npx turbo telemetry status
# Expected output: "Status: Disabled"
```

#### CI/CD
Check workflow environment variables in Actions runs:
```bash
echo $TURBO_TELEMETRY_DISABLED
# Expected output: 1
```

## Consequences

### Positive Consequences

1. **Performance Improvement**
   - Eliminates 2.5 min/month from CI/CD budget
   - Reduces network requests in pipelines
   - Faster turbo command execution

2. **Privacy Enhancement**
   - No data sent to external servers (even anonymous)
   - Aligns with financial app privacy standards
   - Demonstrates privacy-first commitment

3. **Predictability**
   - Removes external dependency from CI/CD
   - Eliminates potential network timeout issues
   - Consistent behavior across environments

### Negative Consequences

1. **Community Contribution**
   - MoneyWise won't contribute to Turborepo usage data
   - Vercel can't use our patterns to improve product

2. **Maintenance**
   - Requires documentation for new team members
   - Must remember to disable telemetry on new machines

### Risk Mitigation

**Risk:** New developers enable telemetry accidentally
- **Mitigation:** Document in setup guide and onboarding checklist
- **Detection:** CI/CD env var provides consistent behavior

**Risk:** Telemetry opt-out causes issues with turbo features
- **Mitigation:** Telemetry is separate from core functionality
- **Verification:** All turbo features tested with telemetry disabled

## Related Decisions

- **ADR-001**: CI/CD Budget Optimization (parent decision)
- All optimizations contribute to 3000 min/month goal

## References

- [Turborepo Telemetry Documentation](https://turborepo.com/docs/telemetry)
- [GitHub Actions Usage Limits](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions)
- MoneyWise CI/CD Optimization Strategy v2.0

## Notes

- **Reversible Decision**: Can be re-enabled anytime via `npx turbo telemetry enable`
- **Alternative Method**: `DO_NOT_TRACK=1` env var also disables telemetry (universal opt-out)
- **Testing**: Verified turbo commands work correctly with telemetry disabled
- **Future Review**: Revisit if Turborepo offers opt-in telemetry or enhanced privacy controls
