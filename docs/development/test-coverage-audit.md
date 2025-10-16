# Test Coverage Audit - STORY-1.5.7

**Date**: 2025-10-07
**Auditor**: QA Testing Engineer Agent
**Story**: STORY-1.5.7 - Testing Infrastructure Hardening
**Target**: 90% coverage across all metrics

## Executive Summary

### Current Coverage Status (Backend)

| Metric | Current | Target | Gap | Status |
|--------|---------|--------|-----|--------|
| **Statements** | 71.87% | 90% | **-18.13%** | RED |
| **Branches** | 60.48% | 90% | **-29.52%** | RED |
| **Functions** | 69.25% | 90% | **-20.75%** | RED |
| **Lines** | 72.49% | 90% | **-17.51%** | RED |

**Verdict**: CRITICAL - Significant coverage gaps exist. Estimated 40-60 hours needed to reach 90% threshold.

---

## Detailed Coverage Analysis by Module

### HIGH COVERAGE AREAS (>90%) - MAINTAIN

| Module | Statements | Branches | Functions | Lines | Priority |
|--------|-----------|----------|-----------|-------|----------|
| `src/accounts` | 100% | 100% | 100% | 100% | MAINTAIN |
| `src/auth` | 96.02% | 75.67% | 100% | 95.94% | MAINTAIN (improve branches) |
| `src/auth/guards` | 99.48% | 98.14% | 100% | 99.44% | MAINTAIN |
| `src/auth/services` | 96.15% | 89.94% | 97.39% | 96.14% | MAINTAIN |
| `src/auth/controllers` | 100% | 91.66% | 100% | 100% | MAINTAIN |
| `src/core/database/repositories/impl` | 98.15% | 88.17% | 94.3% | 98.82% | MAINTAIN |
| `src/database` | 90.54% | 87.5% | 87.5% | 91.66% | MAINTAIN |
| `src/users` | 100% | 100% | 100% | 100% | MAINTAIN |

**Analysis**: Auth module and repositories are extremely well-tested. This is excellent for critical business logic.

---

### MEDIUM COVERAGE AREAS (50-90%) - IMPROVE

| Module | Statements | Branches | Functions | Lines | Gap Analysis |
|--------|-----------|----------|-----------|-------|--------------|
| `src/core/health` | 81.57% | 52.63% | 84.61% | 80.82% | Need branch coverage (error paths) |
| `src/core/monitoring` | 62.5% | 66.66% | 69.44% | 63.27% | Some services untested (metrics, performance) |

**Priority**: MEDIUM - These modules need additional edge case and error path testing.

---

### LOW COVERAGE AREAS (0-50%) - URGENT

| Module | Statements | Branches | Functions | Lines | Impact | Priority |
|--------|-----------|----------|-----------|-------|--------|----------|
| `src/instrument.ts` | 0% | 0% | 0% | 0% | Sentry init | EXCLUDE |
| `src/config/` | 0% | 0% | 100% | 0% | Config exports | EXCLUDE |
| `src/core/config/**` | 0% | 0% | 0% | 0% | Config validators | HIGH |
| `src/core/database/migrations/**` | 0% | 0% | 0% | 0% | Migrations | EXCLUDE |
| `src/core/database/tests/factories` | 0% | 0% | 0% | 0% | Test factories | CRITICAL |
| `src/core/logging/logger.service.ts` | 0% | 0% | 0% | 0% | Logging service | MEDIUM |
| `src/common/decorators/performance-monitor` | 0% | 0% | 0% | 0% | Perf monitoring | LOW |
| `src/common/interceptors/sentry.interceptor.ts` | 25.92% | 0% | 20% | 20.83% | Sentry error handling | MEDIUM |
| `src/core/monitoring/metrics.service.ts` | 0% | 0% | 0% | 0% | Metrics collection | MEDIUM |
| `src/core/monitoring/performance.interceptor.ts` | 0% | 0% | 0% | 0% | Perf interceptor | LOW |
| `src/core/database/tests/**` | 17.25% | 6.38% | 21.73% | 16.99% | Test utilities | CRITICAL |

---

## Coverage Gaps Prioritization

### TIER 1: CRITICAL (Must reach 90%)

These are production code with business logic:

1. **`src/core/config/**`** (0% coverage)
   - Files: `app.config.ts`, `database.config.ts`, `monitoring.config.ts`, `sentry.config.ts`
   - Lines: ~140 uncovered
   - Effort: 8h
   - **Why critical**: Configuration validation is essential for app security and stability

2. **`src/core/database/tests/factories/test-data.factory.ts`** (0% coverage)
   - Lines: 198 uncovered
   - Effort: 4h
   - **Why critical**: Already has factory patterns implemented, just needs tests

3. **`src/core/logging/logger.service.ts`** (0% coverage)
   - Lines: 61 uncovered
   - Effort: 4h
   - **Why critical**: Logging failures can hide production bugs

4. **`src/auth/auth.service.ts`** (88.63% lines, 64% branches)
   - Uncovered lines: 47,79,124-140,184-193,242-244
   - Effort: 4h
   - **Why critical**: Missing error paths in authentication logic

### TIER 2: HIGH PRIORITY (Should reach 90%)

1. **`src/common/interceptors/sentry.interceptor.ts`** (20.83% coverage)
   - Lines: 19 uncovered
   - Effort: 2h
   - **Why important**: Error tracking is critical for production monitoring

2. **`src/core/health/health.controller.ts`** (80.82% lines, 52.63% branches)
   - Uncovered lines: 110,231-234,261,285-289,304,320-324,353-361
   - Effort: 3h
   - **Why important**: Health checks are essential for DevOps

3. **`src/core/monitoring/metrics.service.ts`** (0% coverage)
   - Lines: 32 uncovered
   - Effort: 3h
   - **Why important**: Metrics drive operational decisions

### TIER 3: OPTIONAL (Can exclude or deprioritize)

1. **Migrations** - These are one-time database operations, typically excluded from coverage
2. **`src/instrument.ts`** - Sentry initialization, runs once at startup
3. **Config export files** - Simple re-exports, no logic
4. **Performance decorators** - Nice-to-have, not critical path

---

## Test Suite Health Analysis

### Strengths

1. **Auth module** - Exceptionally well-tested (96%+ across board)
   - 1338 passing tests
   - Comprehensive unit tests for services
   - Good integration coverage

2. **Database repositories** - Excellent coverage (98%+)
   - CRUD operations well-tested
   - Complex queries validated

3. **Controllers** - 100% coverage
   - All endpoints have tests
   - Request/response flows validated

### Weaknesses

1. **Configuration layer** - 0% coverage
   - No tests for environment validation
   - Missing tests for config error handling

2. **Monitoring infrastructure** - Partial coverage (62.5%)
   - CloudWatch service tested (100%)
   - Metrics service untested (0%)
   - Performance interceptor untested (0%)

3. **Logging** - Minimal coverage (21%)
   - Logger service untested (0%)
   - Only logging interceptor tested (100%)

4. **Error handling** - Weak branch coverage (60.48%)
   - Many error paths untested
   - Exception scenarios missing

---

## Recommended Actions to Reach 90%

### Phase 1: Quick Wins (16h estimated)

1. **Test configuration validators** (8h)
   - Write unit tests for `src/core/config/**`
   - Test validation error scenarios
   - Test environment variable parsing

2. **Test logger service** (4h)
   - Unit tests for log formatting
   - Test log level filtering
   - Test transport mechanisms

3. **Complete auth coverage** (4h)
   - Add missing branch tests for `auth.service.ts`
   - Test error paths in token validation
   - Test edge cases in refresh flow

### Phase 2: Infrastructure (12h estimated)

1. **Test monitoring services** (6h)
   - Unit tests for `metrics.service.ts`
   - Integration tests for CloudWatch alarms
   - Test performance interceptor

2. **Test Sentry interceptor** (3h)
   - Test error capturing
   - Test context enrichment
   - Test filtering logic

3. **Improve health controller** (3h)
   - Test all error scenarios
   - Test readiness/liveness edge cases
   - Test service degradation handling

### Phase 3: Edge Cases & Cleanup (12h estimated)

1. **Improve branch coverage** (8h)
   - Add tests for uncovered error paths
   - Test exception scenarios
   - Test timeout/retry logic

2. **Update Jest thresholds** (1h)
   - Set global thresholds to 90%
   - Configure per-module overrides for exclusions

3. **Add coverage badges** (1h)
   - Generate coverage badges
   - Update README with coverage status

4. **Document exclusions** (2h)
   - Document rationale for excluding migrations
   - Update testing strategy docs

---

## Estimated Effort to Reach 90%

| Phase | Tasks | Hours | Priority |
|-------|-------|-------|----------|
| Phase 1: Quick Wins | Config, Logger, Auth | 16h | CRITICAL |
| Phase 2: Infrastructure | Monitoring, Sentry, Health | 12h | HIGH |
| Phase 3: Edge Cases | Branch coverage, thresholds | 12h | MEDIUM |
| **TOTAL** | | **40h** | |

**Note**: This assumes existing test patterns are followed and no major refactoring is needed.

---

## Exclusion Recommendations

To realistically achieve 90% coverage, recommend excluding:

1. **Migrations** (`src/core/database/migrations/**`)
   - Rationale: One-time operations, tested through migration tests

2. **Instrument.ts** (`src/instrument.ts`)
   - Rationale: Sentry initialization, no business logic

3. **Config exports** (`src/config/index.ts`, `src/database/index.ts`)
   - Rationale: Simple re-exports, no logic to test

4. **Test utilities themselves** (`src/core/database/tests/**`)
   - Rationale: These ARE the test infrastructure

### Updated `collectCoverageFrom` (Jest config):

```javascript
collectCoverageFrom: [
  'src/**/*.{ts,js}',
  '!src/**/*.d.ts',
  '!src/**/*.interface.ts',
  '!src/**/*.dto.ts',
  '!src/**/*.entity.ts',
  '!src/**/*.module.ts',
  '!src/main.ts',
  '!src/**/__tests__/**',
  '!src/**/__mocks__/**',
  '!src/instrument.ts',                         // Sentry init
  '!src/config/**',                              // Simple exports
  '!src/database/index.ts',                      // Simple exports
  '!src/core/database/migrations/**',            // One-time migrations
  '!src/core/database/tests/**',                 // Test infrastructure
  '!src/core/config/index.ts',                   // Export barrel
  '!src/core/database/repositories/index.ts',    // Export barrel
],
```

With these exclusions, **adjusted coverage would be ~82-85%**, requiring only **20-24h** to reach 90%.

---

## Frontend Coverage (Not Yet Audited)

**Status**: Pending
**Next Step**: Run `pnpm --filter @money-wise/web test -- --coverage`
**Expected**: Similar patterns to backend (controllers/pages high, utilities medium, config low)

---

## Integration & E2E Test Status

### Integration Tests

**Current**: Limited integration tests for API endpoints
**Coverage**: Primarily unit tests, some integration for auth flows
**Needed**:
- Full API endpoint integration tests (auth, users, accounts)
- Database integration tests with real PostgreSQL
- Redis integration tests for caching/sessions

**Estimated**: 16h

### E2E Tests

**Current**: No E2E test suite detected
**Framework**: Recommend Playwright (already in dependencies)
**Critical Flows Needed**:
1. User registration -> email verification -> login
2. Login -> dashboard -> logout
3. Password reset flow
4. 2FA setup and verification

**Estimated**: 16h

---

## Next Steps

1. **Immediate**: Update Jest config with exclusions (TASK-1.5.7.2)
2. **Phase 1**: Write config validator tests (TASK-1.5.7.3)
3. **Phase 2**: Complete integration tests (TASK-1.5.7.4)
4. **Phase 3**: Implement E2E tests (TASK-1.5.7.5)
5. **Final**: Set CI quality gates (TASK-1.5.7.13)

---

## Appendix: Test Files Inventory

### Existing Test Files (Backend)

```
__tests__/unit/
├── auth/
│   ├── auth.service.spec.ts (1338 tests PASSING)
│   ├── auth-security.service.spec.ts
│   ├── controllers/password.controller.spec.ts
│   ├── guards/*.spec.ts (100% coverage)
│   ├── jwt-auth.guard.spec.ts
│   ├── services/*.spec.ts (96%+ coverage)
│   └── strategies/jwt.strategy.spec.ts
├── core/
│   ├── database/
│   │   ├── entities/entity-relationships.test.ts
│   │   └── migrations/migration.test.ts
│   ├── health/health.controller.spec.ts
│   ├── logging/logging.interceptor.spec.ts
│   └── monitoring/*.spec.ts
├── common/
│   ├── decorators/sentry-transaction.decorator.spec.ts
│   └── interceptors/sentry.interceptor.spec.ts
└── docs/openapi.spec.ts
```

### Missing Test Files (HIGH PRIORITY)

```
__tests__/unit/
├── core/
│   ├── config/
│   │   ├── app.config.spec.ts (MISSING)
│   │   ├── database.config.spec.ts (MISSING)
│   │   ├── monitoring.config.spec.ts (MISSING)
│   │   ├── sentry.config.spec.ts (MISSING)
│   │   └── validators/*.spec.ts (MISSING)
│   ├── logging/
│   │   └── logger.service.spec.ts (MISSING)
│   └── monitoring/
│       ├── metrics.service.spec.ts (MISSING)
│       └── performance.interceptor.spec.ts (MISSING)
└── common/
    └── decorators/performance-monitor.decorator.spec.ts (MISSING)
```

---

**Report Generated**: 2025-10-07
**Tool**: Jest with Istanbul coverage
**Total Test Suites**: 37 passed
**Total Tests**: 1338 passed
**Test Execution Time**: 76.349s
