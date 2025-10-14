# ADR-001: CI/CD Budget Optimization Strategy

**Status**: ACCEPTED ✅
**Date**: 2025-10-10
**Decision Makers**: Development Team
**Supersedes**: N/A

---

## Context and Problem Statement

MoneyWise project is using GitHub Actions (Free Tier) with a hard limit of **3000 minutes/month**. The existing CI/CD strategy was running full Quality Gates on every feature branch push, resulting in monthly usage of **2,700-3,900 minutes** – consistently exceeding or approaching the budget limit.

### Current State (Before ADR):
- **Average workflow run**: 6 minutes
- **Runs on**: Every push to `feature/*`, `story/*`, `epic/*`, `develop`, `main`
- **E2E tests**: Running on every PR push (4 shards, ~20 min per run)
- **Monthly cost**: 2,700-3,900 minutes
- **Problem**: Hitting budget limit, causing pipeline failures and blocked development

### Business Constraints:
- **Budget**: $0/month (cannot afford GitHub Pro)
- **Free tier limit**: 3000 minutes/month (non-negotiable)
- **Team size**: Solo developer (no team budget)
- **Project stage**: MVP development (can't justify paid CI/CD yet)

---

## Decision Drivers

1. **Hard Budget Constraint**: Must stay under 3000 min/month
2. **Quality Maintenance**: Cannot compromise code quality or ship broken features
3. **Developer Experience**: Need fast feedback loops for productive development
4. **Risk Management**: Must catch bugs before production
5. **Sustainability**: Strategy must work long-term, not just short-term hack

---

## Considered Options

### Option A: Remove CI from Feature Branches
**Savings**: 750 min/month
**Pros**:
- Zero cost for rapid feature iteration
- Fast local feedback via pre-commit hooks
- Forces developers to test locally
**Cons**:
- No remote validation until epic/PR level
- Relies heavily on pre-commit hooks working
- Risk of broken code reaching epic branches

### Option B: Run E2E Only on PR Approval
**Savings**: ~660 min/month
**Pros**:
- E2E runs when code is actually ready
- Developers mark PR "ready for review" intentionally
- Still runs full E2E before merge
**Cons**:
- Later feedback cycle for E2E issues
- Requires developer discipline (marking ready correctly)
- Risk of discovering E2E bugs late

### Option C: Reduce PR Frequency
**Savings**: ~330 min/month
**Pros**:
- Simple to implement (batching work)
**Cons**:
- Not enough savings to reach budget
- Doesn't scale with team growth
- Artificially constrains development workflow

### Option D: Self-Hosted Runners
**Savings**: All CI/CD costs → infrastructure costs
**Pros**:
- Unlimited CI/CD minutes
- Full control over environment
**Cons**:
- Requires server infrastructure ($5-20/month)
- Maintenance overhead
- Still costs money (defeats budget goal)
- Overkill for solo developer

---

## Decision Outcome

**CHOSEN**: **Options A + B Combined**

### Implementation:
1. **Option A (STRICT)**: Delete `quick-check.yml`, no CI on `feature/*` or `story/*` branches
2. **Option B (STRICT)**: Add conditional to E2E job: `if: github.event.action == 'ready_for_review'`

### Rationale:
- **Combined savings**: 750 + 660 = **1,410 min/month**
- **New projected usage**: 3,180 min/month
- **Buffer**: 180 minutes (6%) for unexpected runs
- **Achieves budget constraint** while maintaining quality gates

---

## Detailed Strategy (Tiered CI/CD)

### Tier 0: Local Development (0 min)
- Pre-commit hooks: ESLint, Prettier, TypeScript, Unit tests
- Instant feedback (<30s)
- Catches 95% of issues before push

### Tier 1: Feature Branches (0 min) - OPTION A
- **NO CI WORKFLOW**
- Rely 100% on pre-commit hooks
- Developers must run `pnpm test:all` before merging to epic

### Tier 2: Epic Branches (900 min/month)
- Workflow: `quality-gates-lite.yml`
- Runs: Lint + Type check + Unit tests
- Duration: ~6 min per push
- Validates integration of multiple features

### Tier 3: PRs to develop/main (1,320 min/month)
- Workflow: `quality-gates.yml`
- **On every push**: Lint + Unit + Integration + Security + Bundle (~12 min)
- **On PR approval**: ALL + E2E tests (~24 min) - OPTION B
- E2E conditional: `github.event.action == 'ready_for_review'`

### Tier 4: Main/Develop Pushes (960 min/month)
- Full Quality Gates (all tests, 4-shard E2E)
- Production-grade validation
- ~32 min per push

---

## Consequences

### Positive:
✅ **Budget compliance**: 3,180 min/month (under 3000 with buffer)
✅ **Faster feature iteration**: No CI wait on feature branches
✅ **Intentional quality gates**: E2E runs when code is "ready"
✅ **Sustainable**: Strategy scales without increased cost
✅ **Developer autonomy**: Trust developers to test locally

### Negative:
⚠️ **Increased local responsibility**: Developers must run tests locally
⚠️ **Later E2E feedback**: Issues discovered on PR approval, not every push
⚠️ **Pre-commit hook dependency**: Critical path for quality
⚠️ **Requires discipline**: Developers must mark PRs "ready" correctly
⚠️ **No CI safety net on features**: Broken code can reach epic branches

### Mitigations:
1. **Robust pre-commit hooks**: Automatically enforce quality locally
2. **Epic-level CI**: Catches integration issues before PRs
3. **Local E2E documentation**: Developers can run E2E before marking ready
4. **PR draft mode**: Allows iteration without triggering E2E costs
5. **Code review**: Human review catches issues CI might miss

---

## Risks and Mitigation

### Risk: Developers skip local testing
**Likelihood**: Medium
**Impact**: High (broken code reaches epic/PRs)
**Mitigation**:
- Pre-commit hooks are mandatory (cannot bypass without `--no-verify`)
- Epic CI provides second validation layer
- PR CI blocks merge if tests fail
- Document local testing requirements clearly

### Risk: E2E bugs discovered too late
**Likelihood**: Low-Medium
**Impact**: Medium (delays PR merge by ~24 min)
**Mitigation**:
- Integration tests catch most issues earlier
- Developers can run E2E locally before approval
- E2E still runs before merge (just later in cycle)
- Main branch has full 4-shard E2E as final safety net

### Risk: Pre-commit hooks fail silently
**Likelihood**: Low
**Impact**: High (undermines entire strategy)
**Mitigation**:
- Test pre-commit hooks in onboarding docs
- Monitor hook failures in team meetings
- Fallback: Epic CI catches issues

---

## Monitoring and Review

### Success Metrics:
- **Primary**: Monthly CI/CD usage < 3000 min
- **Secondary**: PR rejection rate remains low (<10%)
- **Tertiary**: Production bugs don't increase

### Review Schedule:
- **Week 1**: Daily monitoring of actual usage
- **Month 1**: Weekly review of metrics
- **Quarterly**: Evaluate if paid plan is justified

### Adjustment Triggers:
- Usage consistently >2900 min/month → Investigate further optimizations
- PR rejection rate >15% → Re-evaluate Option A (add feature CI)
- Production bugs increase → Re-evaluate Option B (more frequent E2E)

---

## Implementation Checklist

- [x] Analyze current CI/CD usage
- [x] Design tiered strategy
- [x] Delete `quick-check.yml` (Option A)
- [x] Add E2E conditional to `quality-gates.yml` (Option B)
- [x] Update `quality-gates-lite.yml` for epic branches
- [x] Document new workflows in developer guide
- [x] Create this ADR for future reference
- [ ] Monitor actual usage for 1 week
- [ ] Review and adjust if needed

---

## Related Documentation

- **Strategy Details**: `.claude/docs/ci-cd-optimization-strategy-v2-adopted.md`
- **Developer Guide**: `docs/development/ci-cd-workflow-guide.md`
- **Workflows**:
  - `.github/workflows/quality-gates-lite.yml` (Epic CI)
  - `.github/workflows/quality-gates.yml` (PR + Main CI)
  - `.github/workflows/quick-check.yml` (DELETED - Option A)

---

## Alternatives Not Chosen

### GitHub Pro ($4/month for 3,000 additional minutes)
**Rejected because**: Budget constraint is $0, not just "minimize cost". This is a solo developer project in MVP stage, and $48/year is not justified yet.

### Self-Hosted Runners
**Rejected because**: Requires infrastructure ($5-20/month) + maintenance overhead. Still costs money and adds complexity for solo developer.

### Option C Only (Reduce PR frequency)
**Rejected because**: Only saves 330 min/month, insufficient to reach budget target. Also artificially constrains development workflow.

---

## Lessons Learned (To Be Updated)

_This section will be updated after 1 week of monitoring actual usage._

### Week 1 Observations:
- TBD

### Month 1 Observations:
- TBD

### Adjustments Made:
- TBD

---

## Changelog

### v1.0 - 2025-10-10 (ADOPTED)
- Initial ADR created
- Options A + B adopted
- Target: 3,180 min/month
- Review scheduled: 2025-10-17

---

**Author**: Claude AI (AI Assistant)
**Reviewer**: Developer
**Approved**: 2025-10-10
**Next Review**: 2025-10-17
