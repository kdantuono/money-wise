# ADR-004: Strategic Migration from TypeORM to Prisma

**Status**: Accepted
**Date**: 2025-10-11
**Decision Makers**: Architecture Team
**Epic**: EPIC-1.5-PRISMA (#120)

---

## Context

MoneyWise is a personal finance application built with NestJS backend and Next.js frontend. During Epic 1.5 (Infrastructure Hardening), we completed an extensive audit of the codebase and identified significant technical debt and architectural concerns with our current TypeORM implementation.

### Current State (TypeORM)

**Technology Stack**:
- TypeORM 0.3.17
- NestJS 10.0.0
- PostgreSQL 16 + TimescaleDB
- 7 core entities (Family, User, Account, Transaction, Category, Budget, Achievement)
- ~1,551 tests (1,304 backend + 247 frontend)

**Identified Issues**:

1. **Type Safety Concerns**:
   - TypeORM provides only partial type-safety
   - Entity definitions separate from queries (drift risk)
   - Manual type casting required in complex queries
   - No compile-time validation of query correctness

2. **Test Quality Issues**:
   - Tests disabled or moved to `tests-disabled/` to appear passing
   - Integration tests oversimplified to bypass real database checks
   - Coverage thresholds artificially lowered (90% → 86% → 83%)
   - Zero-tolerance policy violated multiple times

3. **Migration Fragility**:
   - Manual migration file maintenance error-prone
   - Schema drift between entities and database
   - No single source of truth for data model
   - Migration rollback procedures unreliable

4. **Developer Experience**:
   - Verbose query syntax requiring extensive boilerplate
   - Multiple places to maintain schema (entities, migrations, types)
   - Complex relationship management
   - Steep learning curve for new developers

5. **Performance Concerns**:
   - N+1 query problems in transaction listings
   - No built-in query optimization guidance
   - Suboptimal query patterns scattered throughout codebase

### Architectural Requirements

For a **personal finance application**, we require:

1. **100% Type-Safety**: Financial calculations must be type-safe at compile time
2. **Data Integrity**: Transactions, accounts, and balances must be consistent
3. **Audit Trail**: Complete history of all financial operations
4. **Performance**: Sub-100ms response times for dashboard queries
5. **Maintainability**: Clear, understandable code for long-term maintenance

---

## Decision

**We will migrate from TypeORM to Prisma as our ORM layer.**

This migration will be executed as Epic 1.5 (EPIC-1.5-PRISMA) with the following scope:

### In Scope

✅ **Replace**: TypeORM entities, repositories, migrations, queries
✅ **Migrate**: All 7 core entities to Prisma schema
✅ **Rewrite**: All database access patterns using Prisma Client
✅ **Re-enable**: All disabled tests with proper Prisma integration
✅ **Restore**: 90%+ test coverage thresholds
✅ **Update**: Docker environment for Prisma CLI
✅ **Document**: Complete migration guide and Prisma usage patterns

### Out of Scope

❌ **Keep**: NestJS framework (correct choice for API)
❌ **Keep**: Authentication system (JWT, sessions working correctly)
❌ **Keep**: Configuration management (centralized, environment-aware)
❌ **Keep**: Sentry monitoring (properly integrated)
❌ **Keep**: Next.js frontend (no changes required)
❌ **Keep**: CI/CD workflows (already optimized in previous stories)

---

## Rationale

### Why Prisma Over TypeORM?

#### 1. Type Safety (Critical for Finance App)

**Prisma**:
```typescript
// ✅ Fully type-safe at compile time
const transactions = await prisma.transaction.findMany({
  where: { accountId: 123 },
  include: { account: true, category: true }
});
// transactions is typed as: Transaction & { account: Account, category: Category }[]
```

**TypeORM**:
```typescript
// ⚠️ Partial type-safety, requires manual casting
const transactions = await transactionRepo.find({
  where: { accountId: 123 },
  relations: ['account', 'category']
});
// transactions is typed as: Transaction[] (relations not typed)
```

**Impact**: Compile-time errors for invalid queries prevent runtime financial calculation bugs.

#### 2. Single Source of Truth

**Prisma**:
- Schema defined in `schema.prisma`
- TypeScript types auto-generated
- Database migrations auto-generated
- Zero drift between code and database

**TypeORM**:
- Entities defined in TypeScript
- Migrations written manually
- Types inferred from entities
- Drift possible between entities and database state

**Impact**: Reduced maintenance burden, fewer schema-related bugs.

#### 3. Developer Experience

**Prisma**:
- Declarative schema language
- Auto-completion for all queries
- Built-in query optimization
- Excellent documentation and error messages

**TypeORM**:
- Verbose decorator syntax
- Manual query optimization
- Complex relationship management
- Steep learning curve

**Impact**: Faster onboarding, fewer developer errors, higher productivity.

#### 4. Performance

**Prisma**:
- Optimized query engine written in Rust
- Automatic query batching
- DataLoader pattern built-in
- Query performance insights

**TypeORM**:
- JavaScript-based query builder
- Manual batching required
- N+1 problems common
- Limited performance tooling

**Impact**: Better application performance, especially for dashboard queries.

#### 5. Ecosystem & Support

**Prisma**:
- Active development, frequent releases
- Excellent TypeScript integration
- Growing ecosystem of tools
- Enterprise support available

**TypeORM**:
- Slower development pace
- More legacy patterns
- Smaller ecosystem
- Community support only

**Impact**: Future-proof technology choice with long-term support.

---

## Comparison Analysis

### Feature Matrix

| Feature | TypeORM | Prisma | Winner | Importance |
|---------|---------|--------|--------|------------|
| Type Safety | Partial | Complete | **Prisma** | 🔴 Critical |
| Migration Safety | Manual | Auto | **Prisma** | 🔴 Critical |
| Query Performance | Good | Excellent | **Prisma** | 🟡 High |
| Developer Experience | Complex | Simple | **Prisma** | 🟡 High |
| NestJS Integration | Native | Good | TypeORM | 🟢 Medium |
| Community Size | Large | Growing | TypeORM | 🟢 Medium |
| Learning Curve | Steep | Gentle | **Prisma** | 🟡 High |
| Financial App Fit | Good | Excellent | **Prisma** | 🔴 Critical |

**Prisma wins on all critical and high-importance factors.**

### Cost-Benefit Analysis

#### TypeORM Consolidation Path (Original Plan)

- **Duration**: 21 days (109 hours)
- **Risk**: High (same architectural issues remain)
- **Outcome**: Cleaner TypeORM code, but fundamental issues persist
- **Technical Debt**: Unchanged (partial type-safety remains)
- **Future Maintenance**: High (verbose patterns, manual migrations)

#### Prisma Migration Path (Chosen)

- **Duration**: 14 days (94 hours)
- **Risk**: Medium (new technology, but well-documented)
- **Outcome**: Superior architecture, 100% type-safety
- **Technical Debt**: Eliminated (modern patterns, auto-migrations)
- **Future Maintenance**: Low (simple patterns, auto-generated code)

**Prisma migration is FASTER (14 vs 21 days) AND yields better architecture.**

---

## Consequences

### Positive

✅ **Type Safety**: 100% compile-time type safety for all database operations
✅ **Maintainability**: Single schema source of truth, auto-generated types
✅ **Performance**: Rust-based query engine, automatic optimizations
✅ **Developer Experience**: Simpler API, better error messages, faster onboarding
✅ **Test Quality**: Re-enabled tests with proper integration, restored thresholds
✅ **Migration Safety**: Auto-generated migrations with rollback support
✅ **Documentation**: Auto-generated database docs from schema
✅ **Future-Proof**: Active development, modern patterns, growing ecosystem

### Negative

⚠️ **Learning Curve**: Team must learn new ORM (mitigated: excellent docs, simpler than TypeORM)
⚠️ **Migration Effort**: 14 days of focused work required (mitigated: well-structured plan)
⚠️ **NestJS Integration**: Not native (mitigated: official Prisma NestJS docs available)
⚠️ **Community Size**: Smaller than TypeORM (mitigated: growing rapidly, excellent support)

### Neutral

🔵 **No Impact on Frontend**: Next.js application unchanged
🔵 **No Impact on Auth**: JWT and session management unchanged
🔵 **No Impact on CI/CD**: Already optimized in previous stories

---

## Implementation Plan

### Timeline

**Total Duration**: 14 days (94 hours)
**Phases**: 6 + 1 setup phase
**Tasks**: 48 micro-tasks with verification criteria
**Approach**: TDD, sequential execution, checkpoint system

### Phase Breakdown

| Phase | Name | Duration | Tasks | Key Deliverables |
|-------|------|----------|-------|------------------|
| 0 | Setup & Planning | 6h | 4 | Tracking, ADR, Roadmap |
| 1 | Prisma Foundation | 10h | 5 | Schema, Models, Migration |
| 2 | Core Entities | 24h | 12 | Family, User, Account |
| 3 | Auth & Services | 18h | 6 | Transaction, Category, Budget, Auth |
| 4 | Integration Testing | 12h | 6 | Docker, E2E, Local Testing |
| 5 | Cleanup | 12h | 8 | Remove TypeORM, Docs |
| 6 | Final Validation | 6h | 4 | Tests, Benchmark, Merge |

**Total**: 88h across 6 phases (+ 6h setup)

### Tracking System

**4-Level Tracking** (ensures absolute traceability):

1. **GitHub Board** (source of truth): EPIC #120, 7 stories (#121-#127)
2. **Project Tracker**: `.prisma-migration-tracker.json`
3. **User Tracker**: `~/.claude/projects/money-wise/prisma-migration-state.json`
4. **Runtime Tracker**: TodoWrite tool during execution

### Quality Gates

Each task must pass:
- ✅ All tests passing (no disabled tests)
- ✅ Coverage >= 90% (enforced, not lowered)
- ✅ Verification criteria met (documented per task)
- ✅ Checkpoint created (git commit with rollback instructions)
- ✅ Documentation updated (inline comments, guides)

### Risk Mitigation

1. **Rollback Safety**: Checkpoint after every task (48 safe rollback points)
2. **Test-First**: TDD approach (write tests before implementation)
3. **Sequential Execution**: No parallelization (reduced complexity)
4. **Local Validation**: All testing done locally (no CI/CD dependency)
5. **Documentation**: Complete migration guide for future reference

---

## Alternatives Considered

### Alternative 1: Continue with TypeORM

**Description**: Consolidate and improve existing TypeORM implementation without changing ORM.

**Pros**:
- No migration effort
- Team already familiar with TypeORM
- Native NestJS integration

**Cons**:
- Fundamental type-safety issues remain
- Migration fragility unchanged
- Test quality problems persist
- 21 days to consolidate (slower than Prisma migration)
- Technical debt unchanged

**Verdict**: ❌ **Rejected** - Fixes surface issues but doesn't address root causes. Longer timeline with inferior outcome.

### Alternative 2: Restore Tagged Version

**Description**: Rollback to a previous tagged version (e.g., v0.4.0) and restart.

**Pros**:
- Quick reset to known-good state
- Avoid dealing with accumulated technical debt

**Cons**:
- Loses all Epic 1.5 work (CI/CD optimization, testing improvements, Sentry integration)
- Doesn't address fundamental ORM issues
- Would need to restart Epic 1.5 from scratch
- No guarantee previous version is better

**Verdict**: ❌ **Rejected** - Throws away valuable completed work. Doesn't solve ORM issues.

### Alternative 3: Prisma Migration (CHOSEN)

**Description**: Strategic pivot to Prisma while preserving all completed Epic 1.5 work.

**Pros**:
- Addresses root causes (type-safety, migration fragility)
- Faster than TypeORM consolidation (14 vs 21 days)
- Superior architecture for finance application
- Preserves valuable work (Auth, Config, Monitoring)
- Future-proof technology choice

**Cons**:
- Learning curve for team
- Not native NestJS integration

**Verdict**: ✅ **ACCEPTED** - Best balance of timeline, risk, and outcome.

---

## References

### Documentation

- **Epic Issue**: https://github.com/kdantuono/money-wise/issues/120
- **Migration Plan**: `docs/development/PRISMA-MIGRATION-PLAN.md`
- **Progress Log**: `docs/development/PRISMA-PROGRESS.md`
- **Checkpoints**: `docs/development/PRISMA-CHECKPOINTS.md`
- **Board Setup**: `docs/development/GITHUB-BOARD-SETUP.md`

### Related ADRs

- **ADR-001**: CI/CD Budget Optimization (completed)
- **ADR-002**: Sentry Error Tracking Integration (completed)
- **ADR-003**: Configuration Centralization (completed)

### External Resources

- **Prisma Docs**: https://www.prisma.io/docs
- **Prisma + NestJS**: https://docs.nestjs.com/recipes/prisma
- **TypeORM Docs**: https://typeorm.io
- **Financial App Best Practices**: Internal `docs/planning/app-overview.md`

---

## Decision Log

| Date | Event | Outcome |
|------|-------|---------|
| 2025-10-10 | Epic 1.5 branch consistency audit | Identified TypeORM issues |
| 2025-10-11 | Architecture review meeting | Questioned ORM choice |
| 2025-10-11 | TypeORM vs Prisma analysis | Prisma recommended |
| 2025-10-11 | Cost-benefit analysis | Prisma 14d vs TypeORM 21d |
| 2025-10-11 | ADR-004 drafted | Decision documented |
| 2025-10-11 | User approval received | Migration authorized |
| 2025-10-11 | GitHub Board created | EPIC #120, 7 stories |

---

## Success Metrics

### Quantitative

- [ ] All 1,551+ tests passing (no disabled tests)
- [ ] Coverage >= 90% across all modules
- [ ] API response times <= 100ms (p95)
- [ ] Zero TypeORM dependencies remaining
- [ ] Migration completed within 14 days
- [ ] Zero schema drift between code and database

### Qualitative

- [ ] Simpler, more maintainable codebase
- [ ] Better developer experience reported by team
- [ ] Easier onboarding for new developers
- [ ] Increased confidence in data integrity
- [ ] Clear migration path documented for future ORMs

---

**Status**: ✅ **Accepted**
**Implementation**: In Progress (Phase 0 - Setup)
**Review Date**: 2025-10-25 (after completion)
**Next ADR**: ADR-005 (TBD based on Epic 1.6 scope)
