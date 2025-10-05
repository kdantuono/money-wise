# M1.5 Sprint 1 - Execution Plan

**Sprint Duration**: Week 1 of 3 (2025-10-05 to 2025-10-11)
**Status**: ✅ **ACTIVE**
**Team**: Multi-agent orchestration (devops, backend, frontend specialists)

---

## 🎯 Sprint Goals

1. ✅ Complete Sentry integration verification (STORY-1.5.2 Phase 1)
2. 🔄 Begin configuration management consolidation (STORY-1.5.4)
3. 🔄 Start code quality improvements (STORY-1.5.1)
4. 📋 Plan subsequent sprint work

---

## ✅ Completed Tasks (2025-10-05)

### STORY-1.5.2: Monitoring & Observability Integration

#### ✅ TASK-1.5.2.1: Complete Sentry backend integration
**Status**: ✅ **VERIFIED WORKING**
**Completion**: 2025-10-05

**Verification Results**:
- ✅ `instrument.ts` pattern correctly implemented (first import in main.ts)
- ✅ `@sentry/profiling-node` installed and configured
- ✅ `nodeProfilingIntegration()` active
- ✅ Sentry initialization confirmed in logs: `[Sentry] Initialized for environment: development`
- ✅ Error capture verified - test error sent to Sentry with full stack trace
- ✅ Correct DSN configured: `...210775632` (moneywise-backend project)
- ✅ OpenTelemetry integration active (`SentryContextManager` in traces)

**Configuration Validated**:
```bash
SENTRY_DSN=https://4dd53c1f5030d1779c80e2974475733b@o4510013294903296.ingest.de.sentry.io/4510133210775632
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=moneywise@0.4.7
```

**Files Verified**:
- `apps/backend/src/instrument.ts` - Standalone Sentry init (CORRECT PATTERN)
- `apps/backend/src/main.ts:3` - `import './instrument'` FIRST
- `apps/backend/package.json` - All Sentry deps installed
- `apps/backend/.env` - Correct backend DSN

#### ✅ Issue #104 Updated
**Enhancement**: Added comprehensive technical specifications from monorepo Sentry guide
- Next.js 14 App Router integration patterns
- NestJS instrument.ts critical pattern documentation
- Monorepo-specific configuration requirements
- 6 new tasks added (TASK-1.5.2.11 through TASK-1.5.2.18)
- Story points increased: 5 → 8 (reflects expanded scope)
- Estimated hours increased: 40 → 52

---

## 🔄 In Progress Tasks

### STORY-1.5.2: Monitoring & Observability Integration (Phase 2-7)

**Next Priority Tasks**:

#### 🔴 CRITICAL: TASK-1.5.2.12 (3h) - Week 1
**Status**: ✅ **VERIFIED COMPLETE**
**Title**: Refactor backend to use instrument.ts pattern
**Validation**:
- Pattern already correctly implemented
- No refactoring needed
- Mark as complete in next board update

#### 🟡 HIGH: TASK-1.5.2.2 (2h) - Week 1
**Status**: 🔄 **READY TO START**
**Title**: Configure Sentry environments (dev/staging/prod)
**Actions**:
1. Create separate Sentry projects for staging
2. Configure environment-specific DSNs
3. Set up release tracking per environment
4. Document environment switching procedure

#### 🟡 HIGH: TASK-1.5.2.11 (4h) - Week 1
**Status**: 📋 **PENDING**
**Title**: Implement Next.js 14 App Router integration
**Actions**:
1. Create `apps/web/instrumentation.ts` coordination file
2. Create `apps/web/instrumentation-client.ts` (browser runtime)
3. Create `apps/web/sentry.server.config.ts` (Node.js runtime)
4. Create `apps/web/sentry.edge.config.ts` (Edge runtime)
5. Configure `withSentryConfig` in `next.config.js`
6. Add source map upload configuration

### STORY-1.5.4: Configuration Management Consolidation

#### 🔴 CRITICAL: TASK-1.5.4.1 (4h) - Week 1
**Status**: 📋 **READY TO START**
**Title**: Audit all configuration files across codebase
**Current State**: 7 .env files scattered across monorepo
**Goal**: Identify consolidation opportunities

**Known .env files**:
1. `apps/backend/.env` (21 vars) ✅ **ACTIVE**
2. `apps/web/.env` (unknown) 📋 **NEEDS AUDIT**
3. Root `.env` (6 vars) ⚠️ **DEPRECATED PATTERN**
4. Others: TBD

**Actions**:
1. List all .env files: `find . -name ".env*" -type f`
2. Analyze variable overlap and conflicts
3. Document current configuration architecture
4. Propose consolidation strategy
5. Identify migration path

### STORY-1.5.1: Code Quality & Architecture Cleanup

#### 🟡 HIGH: TASK-1.5.1.2 (8h) - Week 1-2
**Status**: 📋 **READY TO START**
**Title**: Eliminate direct process.env accesses (67 violations)
**Scope**: Replace all `process.env.X` with `ConfigService` dependency injection

**Strategy**:
1. Audit current violations: `grep -r "process\.env\." apps/backend/src`
2. Categorize by module (auth, database, monitoring, etc.)
3. Create ConfigService configurations for each module
4. Refactor module by module
5. Add tests to prevent regression

---

## 📊 Sprint Metrics

### Velocity Tracking

**Story Points Completed**: 0 / 12 (Sprint 1 target)
**Tasks Completed**: 1 / 15 (Sprint 1 target)
**Hours Burned**: ~4h / 40h (Sprint 1 allocation)

**Burn Rate**: On track (Day 1)

### Quality Gates

- ✅ **Sentry Integration**: Backend verified, frontend pending
- 📋 **Configuration Audit**: Not started
- 📋 **Code Quality**: Not started
- 📋 **Test Coverage**: Baseline not established

---

## 🚀 Sprint 1 Week Breakdown

### Week 1: Days 1-3 (Mon-Wed) - Monitoring & Config Foundation
**Focus**: STORY-1.5.2 (Phases 2-3) + STORY-1.5.4 (Phase 1)

**Target Tasks**:
1. ✅ TASK-1.5.2.12: Verify instrument.ts pattern (DONE)
2. 🔄 TASK-1.5.2.2: Configure Sentry environments (2h)
3. 🔄 TASK-1.5.2.11: Next.js App Router integration (4h)
4. 🔄 TASK-1.5.4.1: Configuration file audit (4h)

**Daily Goals**:
- **Day 1 (Mon)**: ✅ Sentry verification + environment setup start
- **Day 2 (Tue)**: Frontend Sentry integration
- **Day 3 (Wed)**: Configuration audit completion

### Week 1: Days 4-5 (Thu-Fri) - Code Quality Start
**Focus**: STORY-1.5.1 (Phase 1) + STORY-1.5.2 (Phase 4)

**Target Tasks**:
1. 🔄 TASK-1.5.1.2: Start process.env elimination (4h initial)
2. 🔄 TASK-1.5.2.3: Error grouping rules (2h)
3. 🔄 TASK-1.5.2.4: Alert rules setup (2h)

**Daily Goals**:
- **Day 4 (Thu)**: ConfigService setup + process.env audit
- **Day 5 (Fri)**: Sentry alerting configuration + week review

---

## 🎯 Success Criteria (Sprint 1)

### Must Have (P0 - Critical)
- ✅ Backend Sentry verified and working
- 🔄 Frontend Sentry integrated (Next.js 14 App Router)
- 🔄 Configuration audit completed with migration plan
- 🔄 Environment-specific Sentry projects configured

### Should Have (P1 - High)
- 🔄 Process.env violations reduced by 50% (67 → 33)
- 🔄 Sentry error grouping and alerts configured
- 🔄 Source maps uploading for both apps

### Nice to Have (P2 - Medium)
- 🔄 Performance monitoring dashboards created
- 🔄 Session replay configured
- 🔄 ConfigService migration guide documented

---

## 🚧 Blockers & Risks

### Active Blockers
**None** ✅

### Identified Risks
1. **Configuration Migration Complexity** (MEDIUM)
   - Risk: Scattered .env files may have hidden dependencies
   - Mitigation: Thorough audit before changes (TASK-1.5.4.1)

2. **Process.env Refactoring Scope** (MEDIUM)
   - Risk: 67 violations may take longer than estimated 8h
   - Mitigation: Prioritize critical paths first (auth, database)

3. **Sentry Quota Management** (LOW)
   - Risk: Development sampling at 100% may hit quota
   - Mitigation: Monitor usage, adjust sampling if needed

---

## 📝 Notes & Learnings

### Technical Discoveries (2025-10-05)

1. **Sentry Integration Pattern Validated**:
   - `instrument.ts` MUST be first import (already correct)
   - OpenTelemetry integration working out-of-box
   - `nodeProfilingIntegration()` provides CPU profiling

2. **Environment Variable Isolation**:
   - Backend: `apps/backend/.env` (21 vars)
   - Root: `.env` (6 vars) - deprecated pattern
   - Need to audit frontend `.env` files

3. **Monorepo Best Practices**:
   - Separate DSNs for separate apps confirmed critical
   - Release tagging pattern: `api@<version>` vs `web@<version>`

---

## 🔗 Related Documents

- **Epic Plan**: `.claude/orchestration/epic-1.5-detailed-plan.md`
- **Board Structure**: `.claude/orchestration/board-structure.md`
- **GitHub Issues**:
  - [EPIC-1.5] #102 - Technical Debt & Infrastructure Consolidation
  - [STORY-1.5.2] #104 - Monitoring & Observability Integration
  - [STORY-1.5.4] #106 - Configuration Management Consolidation
  - [STORY-1.5.1] #103 - Code Quality & Architecture Cleanup

---

## 🤖 Next Actions (2025-10-06)

**Immediate Priority** (Start of Day):
1. Start TASK-1.5.2.2: Configure Sentry staging environment
2. Start TASK-1.5.4.1: Configuration file audit
3. Update GitHub board with completed tasks

**Mid-Day**:
1. Begin TASK-1.5.2.11: Next.js App Router Sentry integration
2. Document configuration audit findings

**End of Day**:
1. Review Sprint 1 progress
2. Adjust priorities based on blockers
3. Update sprint plan if needed

---

**Created**: 2025-10-05
**Last Updated**: 2025-10-05
**Sprint Review**: Scheduled for 2025-10-11
**Next Sprint Planning**: 2025-10-12

🤖 Generated with [Claude Code](https://claude.com/claude-code)
