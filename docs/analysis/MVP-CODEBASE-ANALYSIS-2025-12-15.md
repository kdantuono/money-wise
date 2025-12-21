# MoneyWise MVP Codebase Analysis Report

> **Generated**: December 15, 2025
> **Purpose**: Comprehensive analysis of codebase status vs planning documents
> **Conclusion**: SIGNIFICANT DISCREPANCY between documented status and actual main branch

---

## Executive Summary

### Critical Finding

**There are TWO divergent branches: `main` and `epic/mvp-completion`**

The `epic/mvp-completion` branch is **+56,512 lines ahead** of `main` with 252 files changed!

| Phase | Main Branch | Epic Branch | Reality |
|-------|-------------|-------------|---------|
| Phase 4: Liabilities | NOT ON MAIN | ✅ Complete | Merged to epic only |
| Phase 5: Scheduled TX | NOT ON MAIN | ✅ Complete | Merged to epic only |
| Phase 6: Calendar | NOT ON MAIN | ✅ Complete | Merged to epic only |
| Phase 7: Settings | PLACEHOLDER | ✅ Complete | Merged to epic only |
| Phase 8: Notifications | NOT IMPLEMENTED | NOT IMPLEMENTED | True gap |

### Branch Status

```
main branch:           c4479df (SaltEdge v6 fix)
epic/mvp-completion:   60264f4 (Phase 1 & 5 docs)
                       +56,512 lines ahead of main
```

**Implication**:
- The `epic/mvp-completion` branch IS ~85-90% complete as claimed
- The `main` branch is only ~55-60% complete
- **Decision needed**: Merge epic → main or continue on epic

---

## Part 1: Phase-by-Phase Reality Check

### Phase -1: Foundation
**Status**: ✅ COMPLETE (Verified)
- Tailwind CSS v4: Confirmed
- Jest 30: Confirmed
- NestJS 11: Confirmed
- pnpm 10.24: Confirmed

### Phase 0: Schema
**Status**: ✅ COMPLETE (Verified)
- Prisma migrations: All applied
- Database schema: Complete

### Phase 1: Categories
**Status**: ✅ COMPLETE (Verified on Main)

**Backend** (`apps/backend/src/categories/`):
- `categories.controller.ts` (214 lines) - Full CRUD
- `categories.module.ts` (15 lines)
- DTOs: 3 files complete

**Endpoints Verified**:
- `POST /api/categories` - Create
- `GET /api/categories` - List with type filter
- `GET /api/categories/:id` - Single category
- `PUT /api/categories/:id` - Update
- `DELETE /api/categories/:id` - Delete (system protection)

**Features Confirmed**:
- Hierarchical parent/child support
- System category protection (`isSystem` flag)
- Family-based multi-tenancy
- Slug/color validation

### Phase 2: Transactions
**Status**: ⚠️ PARTIAL (~75% on Main)

**What's Implemented** (on main):
- Full CRUD operations
- Transaction types (DEBIT/CREDIT)
- Status handling (POSTED/PENDING)
- Source tracking (PLAID/MANUAL/SALTEDGE)
- Positive amount architecture with display amount
- Auto-categorization service (multi-strategy)
- Search and date range filtering

**What's MISSING** (not on main):
| Feature | Type | Priority |
|---------|------|----------|
| `POST /transactions/link-transfer` | Endpoint | HIGH |
| Transfer detection service | Service | HIGH |
| Bulk operations endpoint | Endpoint | MEDIUM |
| TransferLinkModal | Component | HIGH |
| BulkActionBar | Component | MEDIUM |
| FlowType badges | UI | LOW |

### Phase 3: Account Details
**Status**: ✅ COMPLETE (Verified on Main)

- Account list page: Complete
- Banking OAuth flow: Complete
- Account sync: Complete
- Account revocation: Complete

**Note**: Individual account detail page (`/accounts/[id]`) exists in components but route may not be wired.

### Phase 4: Liabilities
**Status**: ❌ NOT ON MAIN BRANCH

**Location**: `remotes/origin/feature/phase-4-liabilities`

**What's Implemented** (on feature branch only):
- `liabilities.controller.ts` (306 lines)
- `liabilities.service.ts` (841 lines)
- 4 DTO files
- CRUD for credit cards, BNPL, loans
- Installment plan management
- BNPL detection from transactions
- 72 unit tests

**Main Branch Status**: Module does NOT exist

### Phase 5: Scheduled Transactions
**Status**: ❌ NOT ON MAIN BRANCH

**Location**: `remotes/origin/feature/phase-5-scheduled`

**What's Implemented** (on feature branch only):
- `scheduled.controller.ts`
- `recurrence.service.ts`
- 3 DTO files
- Recurrence patterns (daily, weekly, monthly, yearly, once)
- Calendar events endpoint
- Auto-generate from liabilities
- Skip and complete functionality
- 73 unit tests + 22 integration tests

**Main Branch Status**: Module does NOT exist

### Phase 6: Calendar
**Status**: ❌ NOT IMPLEMENTED

**Backend**: No calendar-specific endpoints (relies on Phase 5 scheduled module)
**Frontend**: `/dashboard/calendar/` page does NOT exist

**Missing Components**:
- Calendar page
- Calendar components (event display, navigation)
- Click-to-create scheduled transaction
- Days-until-due badges

### Phase 7: Settings
**Status**: ❌ PLACEHOLDER ONLY

**Current State** (`apps/web/app/dashboard/settings/page.tsx`):
- 39 lines
- Shows empty state with disabled "Edit Profile" button
- Marked "Coming soon"
- NO actual functionality

**Missing**:
- Profile management (name, email)
- Regional settings (timezone, currency)
- Appearance preferences (theme)
- Notification preferences
- Account information display
- BFF route for updates

### Phase 8: Notifications
**Status**: ❌ NOT IMPLEMENTED (Correct Assessment)

**Backend**: No `notifications/` module exists
**Frontend**: No notification components

**Missing**:
- Notification service
- Bill reminder triggers
- Notification bell UI
- Notification list/dropdown
- Mark as read/dismiss actions

---

## Part 2: Code Quality Analysis

### KISS Violations (Overly Complex Files)

| File | Lines | Issue | Risk | Recommendation |
|------|-------|-------|------|----------------|
| `banking.service.ts` | 1119 | Monolithic (12+ methods) | HIGH | Extract to 4 services |
| `user.service.ts` | 1047 | God object (21 methods) | HIGH | Extract PasswordService |
| `budget.service.ts` | 1003 | Over-engineered | MEDIUM | Extract Validator |
| `saltedge.provider.ts` | 948 | Complex integration | MEDIUM | Extract mappers |
| `auth-security.service.ts` | 735 | 7 dependencies | MEDIUM | Refactor orchestration |

### SRP Violations (Single Responsibility Principle)

| File | Lines | Responsibilities | Risk |
|------|-------|------------------|------|
| `category.service.ts` | 670 | CRUD + validation + hierarchy + family scoping | HIGH |
| `account.service.ts` | 711 | CRUD + Plaid + ownership validation | HIGH |
| `BudgetForm.tsx` | 388 | State + validation + dates + rendering | HIGH |
| `TransactionList.tsx` | 398 | Filtering + pagination + rendering | MEDIUM |
| `AccountList.tsx` | 347 | Rendering + status + navigation | MEDIUM |

### DRY Violations (Code Duplication)

| Pattern | Occurrences | Impact | Fix Time |
|---------|-------------|--------|----------|
| UUID validation | 6 services | HIGH | 30 min |
| BadRequestException handling | 112+ throws | HIGH | 2-3 hrs |
| Status config objects | 3+ components | MEDIUM | 1 hr |
| Date calculation logic | Multiple | MEDIUM | 1 hr |

### Test Coverage

| Area | Coverage | Files | Assessment |
|------|----------|-------|------------|
| Backend | ~3-5% | 11 spec files | CRITICAL GAP |
| Frontend | ~5% | 5 test files | CRITICAL GAP |

**Untested Critical Services**:
- UserService
- CategoryService
- AccountService
- BudgetService
- BankingService

---

## Part 3: Dependabot PR Assessment

### Merge NOW (Safe, Low Risk)

| PR | Dependency | Type | Notes |
|----|------------|------|-------|
| #306 | turbo 2.6.1 → 2.6.3 | Patch | **SECURITY FIX** |
| #311 | @aws-sdk/client-cloudwatch | Patch | Backend only |
| #310 | msw 2.12.3 → 2.12.4 | Patch | Test tooling |
| #308 | @vitest/coverage-v8 | Patch | Test tooling |

### Merge Soon (Review First)

| PR | Dependency | Type | Notes |
|----|------------|------|-------|
| #304 | baseline-browser-mapping | Minor | Dev tooling |
| #302 | @testing-library/react 14 → 16 | Major | Verify if needed |

### DEFER Post-MVP (High Risk)

| PR | Dependency | Type | Risk Factor |
|----|------------|------|-------------|
| #305 | Next.js 15 → 16 | Major | Core framework, major breaking changes |
| #303 | Zod 3 → 4 | Major | All DTO validation affected |
| #307 | date-fns 2 → 4 | Major | Date handling throughout app |
| #309 | husky 8 → 9 | Major | Git hooks, dev tooling |

### Skip (Mobile - Not MVP)

PRs #297-301: All mobile app updates - defer to Phase 3

---

## Part 4: Corrected Phase Completion Matrix

### Main Branch Status (December 15, 2025)

| Phase | Name | Backend | Frontend | Tests | Overall | On Main? |
|-------|------|---------|----------|-------|---------|----------|
| -1 | Foundation | 100% | 100% | N/A | **100%** ✅ | Yes |
| 0 | Schema | 100% | N/A | N/A | **100%** ✅ | Yes |
| 1 | Categories | 100% | 100% | 80% | **95%** ✅ | Yes |
| 2 | Transactions | 75% | 80% | 60% | **~75%** ⚠️ | Partial |
| 3 | Account Details | 100% | 90% | TBD | **~95%** ✅ | Yes |
| 4 | Liabilities | 0% | 0% | 0% | **0%** ❌ | **NO** |
| 5 | Scheduled TX | 0% | 0% | 0% | **0%** ❌ | **NO** |
| 6 | Calendar | 0% | 0% | 0% | **0%** ❌ | **NO** |
| 7 | Settings | 0% | 5% | 0% | **~5%** ❌ | Placeholder |
| 8 | Notifications | 0% | 0% | 0% | **0%** ❌ | **NO** |

**Main Branch MVP Completion: ~55-60%**

### Epic Branch Status (December 15, 2025)

| Phase | Name | Backend | Frontend | Tests | Overall | On Epic? |
|-------|------|---------|----------|-------|---------|----------|
| -1 | Foundation | 100% | 100% | N/A | **100%** ✅ | Yes |
| 0 | Schema | 100% | N/A | N/A | **100%** ✅ | Yes |
| 1 | Categories | 100% | 100% | 95% | **98%** ✅ | Yes |
| 2 | Transactions | 90% | 95% | 75% | **~90%** ⚠️ | Yes |
| 3 | Account Details | 100% | 100% | TBD | **100%** ✅ | Yes |
| 4 | Liabilities | 100% | 100% | 80% | **~95%** ✅ | Yes |
| 5 | Scheduled TX | 100% | 100% | 90% | **~97%** ✅ | Yes |
| 6 | Calendar | 100% | 100% | TBD | **~95%** ✅ | Yes |
| 7 | Settings | 100% | 100% | TBD | **~95%** ✅ | Yes |
| 8 | Notifications | 0% | 0% | 0% | **0%** ❌ | **NO** |

**Epic Branch MVP Completion: ~85-90%**

### Branch Divergence Summary

```
epic/mvp-completion is 252 files, +56,512 lines ahead of main

Key PRs merged to epic (not main):
- PR #280: Phase 6 Calendar UI + Settings (merged Dec 14)
- PR #278: Phase 1 Categories Enhanced
- PR #240: Phase 5 Scheduled Transactions
- PR #239: Phase 4 Liabilities
- PR #238: Phase 2 Transactions Complete
```

---

## Part 5: Feature Branch Inventory

### Branches with Completed Work (Not on Main)

```
remotes/origin/feature/phase-4-liabilities
  - Liabilities backend complete
  - 72 unit tests
  - Status: Ready for merge

remotes/origin/feature/phase-5-scheduled
  - Scheduled TX backend complete
  - Recurrence service complete
  - 73 unit + 22 integration tests
  - Status: Ready for merge

remotes/origin/feature/phase-6-calendar-nav-improvements (PR #280 MERGED)
  - Calendar UI improvements
  - Settings page implementation
  - Status: MERGED but verify on main
```

### Stashed Work

```
stash@{0}: WIP on main: ci(testing) changes
stash@{1}: WIP on main: Goals navigation fix
stash@{2}: WIP on e2e-infrastructure
stash@{3}: Unrelated changes from previous sessions
stash@{4}: WIP on dependabot-oct-2025
```

---

## Part 6: Priority Actions for MVP Completion

### Immediate (Today)

1. **Merge Dependabot Security PR**
   ```bash
   gh pr merge 306 --squash
   ```

2. **Verify PR #280 Changes on Main**
   - Check if Calendar and Settings pages actually exist after merge

3. **Merge Liabilities Feature Branch**
   ```bash
   git merge origin/feature/phase-4-liabilities
   ```

4. **Merge Scheduled TX Feature Branch**
   ```bash
   git merge origin/feature/phase-5-scheduled
   ```

### This Week

5. **Implement Calendar Frontend**
   - Create `/dashboard/calendar/` page
   - Wire to scheduled transactions backend

6. **Implement Settings Page**
   - Profile management
   - Regional settings
   - Theme preferences

7. **Complete Phase 2 Missing Features**
   - Transfer linking endpoint
   - Transfer detection service
   - TransferLinkModal component

### Before MVP Release

8. **Implement Basic Notifications**
   - Notification service
   - Bill reminder triggers
   - Notification bell UI

9. **Add Critical Tests**
   - Core service integration tests
   - E2E for main user flows

---

## Part 7: Risk Assessment

### HIGH RISK Items

| Item | Risk | Mitigation |
|------|------|------------|
| Feature branches not merged | Code divergence | Merge immediately |
| Low test coverage (~5%) | Regression risk | Add integration tests |
| Banking service complexity | Maintenance burden | Post-MVP refactor |
| Settings page incomplete | User experience | Implement before launch |

### MEDIUM RISK Items

| Item | Risk | Mitigation |
|------|------|------------|
| UUID validation duplication | Bug propagation | Extract common validator |
| Notifications missing | User engagement | MVP-lite version first |
| Dependabot major versions | Breaking changes | Defer post-MVP |

### LOW RISK Items

| Item | Risk | Mitigation |
|------|------|------------|
| Code quality issues | Long-term debt | Post-MVP refactor sprint |
| Icon duplication | Minor bloat | Low priority cleanup |

---

## Part 8: Recommended MVP Definition

### MVP Core (Must Have)

- [x] Authentication (complete)
- [x] Dashboard with stats (complete)
- [x] Categories CRUD (complete)
- [x] Bank account linking (complete)
- [x] Transaction viewing (complete)
- [ ] Transaction management (75% - needs transfer linking)
- [ ] Liabilities tracking (backend ready, needs merge + frontend)
- [ ] Scheduled transactions (backend ready, needs merge + frontend)
- [ ] Calendar view (needs implementation)
- [ ] Basic settings (needs implementation)

### MVP Nice-to-Have

- [ ] Bulk transaction operations
- [ ] Transfer detection automation
- [ ] Basic notifications

### Post-MVP

- [ ] Full notification system
- [ ] Goals tracking
- [ ] Investment tracking
- [ ] Mobile app

---

## Appendix: File Locations Reference

### Backend Modules (Main Branch)
```
apps/backend/src/
├── analytics/         ✅ Complete
├── auth/              ✅ Complete
├── banking/           ✅ Complete
├── budgets/           ✅ Complete
├── categories/        ✅ Complete
├── transactions/      ⚠️ Partial
├── liabilities/       ❌ Missing (on feature branch)
├── scheduled/         ❌ Missing (on feature branch)
└── notifications/     ❌ Missing
```

### Frontend Pages (Main Branch)
```
apps/web/app/dashboard/
├── page.tsx           ✅ Dashboard home
├── accounts/          ✅ Complete
├── transactions/      ✅ Complete
├── budgets/           ✅ Complete
├── goals/             ❌ Placeholder
├── investments/       ❌ Placeholder
├── settings/          ❌ Placeholder
├── calendar/          ❌ Missing
├── liabilities/       ❌ Missing
└── scheduled/         ❌ Missing
```

---

## Document Maintenance

**Next Review**: After feature branch merges
**Owner**: Development Team
**Version**: 1.0.0

---

*This analysis supersedes previous planning document assessments until verified.*
