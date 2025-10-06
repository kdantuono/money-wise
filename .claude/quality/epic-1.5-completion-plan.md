# EPIC-1.5 Completion Plan

**Date**: 2025-10-06
**Target Completion**: Oct 13, 2025 (7 days)
**Current Progress**: 60% (3/7 stories, ~11/32 points)
**Remaining**: 21 points across 4 stories

---

## 📊 Current State Analysis

### ✅ Completed Stories (3/7 - 43%)
- STORY-1.5.1: Code Quality & Architecture Cleanup (#103) ✅
- STORY-1.5.3: Documentation Consolidation & Architecture (#105) ✅
- STORY-1.5.5: .claude/ Directory Cleanup & Organization (#107) ✅

### 🔄 In Progress Stories (2/7)

#### STORY-1.5.2: Monitoring & Observability Integration (#104) - 75% Complete
**Points**: 5 | **Status**: IN PROGRESS

**Completed**:
- ✅ Next.js Sentry configuration (instrumentation.ts, onRequestError, global-error.tsx)
- ✅ instrumentation-client.ts migration (Turbopack compatible)
- ✅ Removed deprecated instrumentationHook
- ✅ Mobile app configuration fixes (expo-constants)

**Remaining** (25%):
- [ ] Verify Sentry frontend integration (test error capture)
- [ ] Complete NestJS backend Sentry integration (instrument.ts pattern)
- [ ] Configure source maps upload
- [ ] Set up error grouping rules
- [ ] Configure alert rules
- [ ] Create performance dashboards
- [ ] Test end-to-end error tracking

**Estimated Remaining**: 4-6 hours

---

#### STORY-1.5.4: Configuration Management Consolidation (#106) - 95% Complete
**Points**: 3 | **Status**: IN REVIEW

**Completed**:
- ✅ Type-safe configuration schemas (backend, web, mobile)
- ✅ Environment variable centralization
- ✅ Configuration validation on startup
- ✅ Mobile app process.env cleanup

**Remaining** (5%):
- [ ] Audit remaining process.env usage in backend (64 instances found)
- [ ] Create comprehensive .env.example files
- [ ] Document all environment variables
- [ ] Test configuration across environments

**Estimated Remaining**: 2-3 hours

---

### 📋 Backlog Stories (2/7)

#### STORY-1.5.6: Project Structure Optimization (#108) - 0% Complete
**Points**: 5 | **Status**: BACKLOG

**Tasks** (12 total, 38 hours estimated):
1. TASK-1.5.6.1: Audit project structure (4h)
2. TASK-1.5.6.2: Remove unused files (4h)
3. TASK-1.5.6.3: Configure TypeScript path aliases (4h)
4. TASK-1.5.6.4: Enforce import boundaries (4h)
5. TASK-1.5.6.5: Implement barrel exports (4h)
6. TASK-1.5.6.6: Organize apps/ vs packages/ (4h)
7. TASK-1.5.6.7: Update Turborepo configuration (2h)
8. TASK-1.5.6.8: Create package READMEs (2h)
9. TASK-1.5.6.9: Validate monorepo structure (2h)
10. TASK-1.5.6.10: Document project structure (2h)
11. TASK-1.5.6.11: Add structure validation to CI (2h)
12. TASK-1.5.6.12: Structure quality gate (2h) 🔴 CRITICAL

**Estimated**: 1-2 days

---

#### STORY-1.5.7: Testing Infrastructure Hardening (#109) - 0% Complete
**Points**: 8 | **Status**: BACKLOG

**Tasks** (15 total, 80 hours estimated):
1. TASK-1.5.7.1: Audit test coverage (4h) 🔴 CRITICAL
2. TASK-1.5.7.2: Set coverage thresholds to 90% (2h) 🔴 CRITICAL
3. TASK-1.5.7.3: Write unit tests for backend services (16h) 🔴 CRITICAL
4. TASK-1.5.7.4: Write integration tests for API endpoints (16h) 🔴 CRITICAL
5. TASK-1.5.7.5: Implement E2E tests for critical flows (16h)
6. TASK-1.5.7.6: Create test data factories (8h)
7. TASK-1.5.7.7: Establish performance benchmarks (8h)
8. TASK-1.5.7.8: Implement visual regression tests (8h)
9. TASK-1.5.7.9: Add mutation testing (4h)
10. TASK-1.5.7.10: Configure test database isolation (4h)
11. TASK-1.5.7.11: Add test utilities and helpers (4h)
12. TASK-1.5.7.12: Document testing strategy (4h)
13. TASK-1.5.7.13: Add CI quality gates (4h) 🔴 CRITICAL
14. TASK-1.5.7.14: Optimize test performance (4h)
15. TASK-1.5.7.15: Testing quality gate (4h) 🔴 CRITICAL

**Estimated**: 3-4 days (can be parallelized with specialized agents)

---

## 🎯 Completion Strategy

### Priority Order

**Phase 1: Finish In-Progress Stories** (1 day)
1. Complete STORY-1.5.2 (Monitoring) - 25% remaining
2. Complete STORY-1.5.4 (Configuration) - 5% remaining

**Phase 2: Project Structure** (1-2 days)
3. Execute STORY-1.5.6 (Project Structure Optimization)

**Phase 3: Testing Infrastructure** (3-4 days)
4. Execute STORY-1.5.7 (Testing Infrastructure Hardening)

**Total Estimated**: 5-7 days (fits within Oct 13 target)

---

## 🤖 Agent Assignment Strategy

### STORY-1.5.2: Monitoring & Observability (devops-engineer + backend-specialist)

**Agent**: devops-engineer
**Tasks**:
- Configure Sentry backend integration (instrument.ts)
- Set up source maps upload
- Configure error grouping and alerts
- Create dashboards

**Approach**: Use Task tool to launch devops-engineer agent with complete Sentry backend setup instructions

---

### STORY-1.5.4: Configuration Management (devops-engineer)

**Agent**: devops-engineer
**Tasks**:
- Audit remaining process.env usage in backend
- Create comprehensive .env.example files
- Document environment variables
- Validate configuration across environments

**Approach**: Quick cleanup, can be done directly without agent

---

### STORY-1.5.6: Project Structure (architect + general-purpose)

**Agent**: architect
**Tasks**:
- Audit monorepo structure
- Design path alias strategy
- Enforce import boundaries
- Organize apps/ vs packages/

**Agent**: general-purpose
**Tasks**:
- Remove unused files
- Implement barrel exports
- Create package READMEs
- Update Turborepo config

**Approach**: Use Task tool to launch architect for design decisions, then general-purpose for execution

---

### STORY-1.5.7: Testing Infrastructure (qa-testing-engineer + test-specialist)

**Agent**: qa-testing-engineer
**Tasks**:
- Audit test coverage
- Write unit tests for backend services
- Write integration tests for API endpoints
- Implement E2E tests for critical flows
- Create test data factories

**Agent**: test-specialist (or devops-engineer)
**Tasks**:
- Set coverage thresholds
- Configure test database isolation
- Add CI quality gates
- Optimize test performance

**Approach**: Use Task tool to launch qa-testing-engineer for comprehensive test suite implementation

---

## 📋 Detailed Execution Plan

### Day 1 (Oct 6): Finish In-Progress Stories

#### Morning: STORY-1.5.2 (Monitoring) - 4 hours
```bash
# Agent: devops-engineer
# Task: Complete NestJS Sentry integration

1. Create apps/backend/src/instrument.ts (MUST be first import)
2. Update apps/backend/src/main.ts (import './instrument' first line)
3. Configure source maps upload in next.config.mjs
4. Test error capture end-to-end
5. Configure Sentry error grouping rules
6. Set up alert rules for critical errors
7. Create performance dashboard in Sentry UI
8. Verify CI/CD pipeline passes
9. Merge fix/sentry-nextjs-configuration to main
```

#### Afternoon: STORY-1.5.4 (Configuration) - 3 hours
```bash
# Agent: None (direct execution)
# Task: Finish configuration cleanup

1. Audit apps/backend/src for remaining process.env usage (64 instances)
2. Replace with proper config service usage
3. Create comprehensive .env.example files (backend, web, mobile)
4. Document all environment variables in README
5. Test configuration loading in all environments
6. Update issue #106 to DONE
```

**End of Day 1**: STORY-1.5.2 and STORY-1.5.4 complete ✅ (8 points done)

---

### Day 2 (Oct 7): STORY-1.5.6 Part 1 - Structure Audit & Design

#### Morning: Structure Analysis (4 hours)
```bash
# Agent: architect
# Tasks: TASK-1.5.6.1, TASK-1.5.6.3, TASK-1.5.6.4

1. Audit entire monorepo structure
   - List all files in apps/ and packages/
   - Identify unused files/directories
   - Map current import patterns
   - Find circular dependencies

2. Design TypeScript path alias strategy
   - Define @app/* and @pkg/* aliases
   - Configure tsconfig.json paths
   - Document alias conventions

3. Design import boundary rules
   - apps/ can import from packages/
   - packages/ cannot import from apps/
   - Prevent circular dependencies
   - Define allowed import patterns
```

#### Afternoon: File Cleanup (4 hours)
```bash
# Agent: general-purpose
# Task: TASK-1.5.6.2

1. Remove unused files identified in audit
2. Clean up old scripts
3. Remove deprecated configs
4. Clean up .turbo cache
5. Validate build still works
```

**End of Day 2**: STORY-1.5.6 ~40% complete

---

### Day 3 (Oct 8): STORY-1.5.6 Part 2 - Implementation

#### Morning: Barrel Exports & Organization (4 hours)
```bash
# Agent: general-purpose
# Tasks: TASK-1.5.6.5, TASK-1.5.6.6

1. Implement barrel exports for packages
   - packages/types/src/index.ts
   - packages/utils/src/index.ts
   - packages/ui/src/index.ts

2. Organize apps/ vs packages/ clearly
   - Move shared code to packages/
   - Keep app-specific code in apps/
```

#### Afternoon: Documentation & Validation (4 hours)
```bash
# Agent: general-purpose
# Tasks: TASK-1.5.6.7-12

1. Update Turborepo configuration
2. Create package READMEs
3. Validate monorepo structure
4. Document project structure in root README
5. Add structure validation to CI
6. Create structure quality gate
```

**End of Day 3**: STORY-1.5.6 complete ✅ (5 points done)

---

### Days 4-7 (Oct 9-12): STORY-1.5.7 - Testing Infrastructure

#### Day 4: Coverage Audit & Setup (8 hours)
```bash
# Agent: qa-testing-engineer
# Tasks: TASK-1.5.7.1, TASK-1.5.7.2, TASK-1.5.7.10

1. Audit test coverage (4h)
   - Run coverage report for all packages
   - Identify untested code
   - Prioritize critical paths
   - Create coverage improvement plan

2. Set coverage thresholds (2h)
   - Backend: 90% unit, 80% integration
   - Frontend: 85% unit, 70% E2E
   - Configure jest.config.js thresholds
   - Add to CI/CD quality gates

3. Configure test database isolation (2h)
   - Set up test database
   - Configure transactions/rollback
   - Create test data seeding
```

#### Day 5: Backend Unit Tests (16 hours - can parallelize)
```bash
# Agent: qa-testing-engineer
# Task: TASK-1.5.7.3

Focus on critical backend services:
1. Auth service tests (JWT, login, registration)
2. User service tests (CRUD, validation)
3. Account service tests (balance, transactions)
4. Transaction service tests (categorization, search)
5. Category service tests (hierarchy, CRUD)

Target: 90% unit test coverage for backend
```

#### Day 6: API Integration Tests (16 hours - can parallelize)
```bash
# Agent: qa-testing-engineer
# Task: TASK-1.5.7.4

Focus on critical API endpoints:
1. Auth endpoints (/auth/register, /auth/login, /auth/refresh)
2. User endpoints (/users/:id, /users/profile)
3. Account endpoints (/accounts, /accounts/:id)
4. Transaction endpoints (/transactions, /transactions/:id)
5. Category endpoints (/categories, /categories/:id)

Target: 80% integration test coverage
```

#### Day 7: E2E Tests & Quality Gates (16 hours)
```bash
# Agent: qa-testing-engineer
# Tasks: TASK-1.5.7.5, TASK-1.5.7.6, TASK-1.5.7.13

Morning: E2E Tests (8h)
1. User registration flow
2. User login flow
3. Account creation flow
4. Transaction entry flow
5. Dashboard view flow

Afternoon: Test Infrastructure (8h)
1. Create test data factories (4h)
2. Add CI quality gates (4h)
   - Coverage gates
   - Test success gates
   - Performance gates
```

**End of Day 7**: STORY-1.5.7 complete ✅ (8 points done)

---

## 🎯 Success Criteria for EPIC-1.5 Completion

### All Stories Complete
- [x] STORY-1.5.1: Code Quality ✅
- [ ] STORY-1.5.2: Monitoring ✅ (by end of Day 1)
- [x] STORY-1.5.3: Documentation ✅
- [ ] STORY-1.5.4: Configuration ✅ (by end of Day 1)
- [x] STORY-1.5.5: .claude/ Cleanup ✅
- [ ] STORY-1.5.6: Project Structure ✅ (by end of Day 3)
- [ ] STORY-1.5.7: Testing Infrastructure ✅ (by end of Day 7)

### Quality Gates Passing
- [ ] All builds passing (backend, web, mobile)
- [ ] All tests passing (unit, integration, E2E)
- [ ] Coverage thresholds met (≥90% backend, ≥85% frontend)
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors
- [ ] CI/CD pipeline green

### Documentation Updated
- [ ] All environment variables documented
- [ ] Project structure documented
- [ ] Testing strategy documented
- [ ] Sentry integration documented

### Ready for EPIC-2.1
- [ ] EPIC-1.5 marked complete
- [ ] Board updated
- [ ] All PRs merged to main
- [ ] Release notes prepared

---

## 🚀 Immediate Next Actions

### Right Now (Next 2 hours)

**Priority 1**: Complete STORY-1.5.2 (Monitoring)
```bash
# Use Task tool with devops-engineer agent
1. Create backend instrument.ts
2. Configure Sentry backend integration
3. Test end-to-end error tracking
```

**Priority 2**: Quick win - STORY-1.5.4 (Configuration)
```bash
# Direct execution (no agent needed)
1. Create .env.example files
2. Document environment variables
3. Mark story as DONE
```

### Tomorrow (Day 2)

**Priority 3**: Start STORY-1.5.6 (Project Structure)
```bash
# Use Task tool with architect agent
1. Audit monorepo structure
2. Design path alias strategy
3. Plan import boundary enforcement
```

---

## 📊 Risk Assessment

### High Risk Items

**STORY-1.5.7 (Testing)** - 80 hours estimated
- **Risk**: May not achieve 90% coverage in 4 days
- **Mitigation**:
  - Use qa-testing-engineer agent for parallel test writing
  - Focus on critical paths first (auth, transactions)
  - Defer optional tasks (visual regression, mutation testing)
  - Adjust coverage target to 80% if needed

**CI/CD Pipeline**
- **Risk**: New changes may break CI/CD
- **Mitigation**:
  - Test each change in feature branch first
  - Verify CI/CD passes before merging
  - Fix failures immediately

### Medium Risk Items

**Backend Configuration Cleanup** (64 process.env instances)
- **Risk**: May break existing code
- **Mitigation**:
  - Test thoroughly after each change
  - Use proper config service pattern
  - Keep existing .env files for now

### Low Risk Items

**Project Structure** (STORY-1.5.6)
- **Risk**: Low - mostly organizational changes
- **Mitigation**: Validate builds after each change

---

## ✅ Definition of Done for EPIC-1.5

1. ✅ All 7 stories marked DONE on GitHub board
2. ✅ All acceptance criteria met for each story
3. ✅ All CI/CD pipelines green (build, test, lint, typecheck)
4. ✅ Test coverage ≥80% (stretch: 90%)
5. ✅ Zero TypeScript/ESLint errors
6. ✅ Documentation updated (README, env vars, testing)
7. ✅ All PRs merged to main
8. ✅ EPIC-1.5 issue (#102) closed
9. ✅ Board updated showing 7/7 stories complete
10. ✅ Ready to start EPIC-2.1 (Frontend Auth UI)

---

## 📅 Timeline Summary

| Day | Date | Stories | Tasks | Points | Agent |
|-----|------|---------|-------|--------|-------|
| 1 | Oct 6 | 1.5.2, 1.5.4 | Finish monitoring & config | 3 | devops-engineer |
| 2 | Oct 7 | 1.5.6 (40%) | Structure audit & cleanup | 2 | architect + general-purpose |
| 3 | Oct 8 | 1.5.6 (60%) | Barrel exports & docs | 3 | general-purpose |
| 4 | Oct 9 | 1.5.7 (20%) | Coverage audit & setup | 2 | qa-testing-engineer |
| 5 | Oct 10 | 1.5.7 (40%) | Backend unit tests | 3 | qa-testing-engineer |
| 6 | Oct 11 | 1.5.7 (60%) | API integration tests | 3 | qa-testing-engineer |
| 7 | Oct 12 | 1.5.7 (100%) | E2E tests & quality gates | 5 | qa-testing-engineer |
| **TOTAL** | **7 days** | **4 stories** | **All tasks** | **21 pts** | **4 agents** |

**Buffer**: 1 day (Oct 13) for fixes and final validation

---

## 🎯 Immediate Execution

**Now**: Start STORY-1.5.2 completion with devops-engineer agent
**Next**: Quick win STORY-1.5.4 cleanup (manual)
**Then**: Launch architect for STORY-1.5.6 design

**Expected EPIC-1.5 Completion**: Oct 12-13, 2025 ✅
