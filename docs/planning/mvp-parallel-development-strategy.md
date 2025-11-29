# MVP Parallel Development Strategy with Git Worktrees

## Executive Summary

Parallelized development of 3 MVP features using git worktrees to maximize velocity while avoiding merge conflicts. Each feature stream works on isolated files with a final integration phase.

---

## File Overlap Analysis

Based on comprehensive codebase analysis, here's the conflict map:

### HIGH CONFLICT (Same files touched by multiple features)
| File | Features | Resolution |
|------|----------|------------|
| `apps/web/src/components/dashboard/BudgetProgress.tsx` | Budget + Dashboard | Develop in Budget stream, integrate in Dashboard |
| `apps/web/app/dashboard/page.tsx` | Dashboard Insights | Dashboard stream only |
| `transaction.service.ts` | All 3 | Read-only for now, enhance in integration phase |

### NO CONFLICT (Isolated file sets)
| Feature | Exclusive Files |
|---------|-----------------|
| Banking | `apps/backend/src/banking/*`, `apps/web/app/banking/*`, `apps/web/src/components/banking/*` |
| Budget | `apps/backend/src/budgets/*` (new), `apps/web/src/components/budgets/*` (new), `apps/web/app/budgets/page.tsx` |
| Dashboard | `apps/backend/src/analytics/*` (new), `apps/web/src/hooks/useDashboardStats.ts` (new) |

---

## Worktree Strategy

### Setup Commands
```bash
# From main repo (/home/nemesi/dev/money-wise)
git worktree add ../money-wise-banking feature/banking-completion
git worktree add ../money-wise-budget feature/budget-management
git worktree add ../money-wise-dashboard feature/dashboard-insights
```

---

## STREAM A: Banking Completion
**Worktree**: `money-wise-banking`
**Branch**: `feature/banking-completion`
**Status**: Backend complete, frontend needs callback fix

### Scope
Fix the OAuth callback to actually save data and add account display UI.

### Files to Modify (EXCLUSIVE)
```
apps/web/app/banking/callback/page.tsx  # Add completeLink() call
apps/web/app/(dashboard)/banking/page.tsx  # Add account list display
apps/web/src/components/banking/AccountList.tsx  # Wire to real data
apps/backend/src/banking/webhooks/webhook.service.ts  # Implement handlers
```

### Files to Create
```
apps/web/__tests__/components/banking/*.test.tsx  # Unit tests
apps/web/e2e/tests/banking/*.spec.ts  # E2E tests
```

### Dependencies
- None (fully isolated)

### Acceptance Criteria
- [ ] OAuth callback saves connection via completeLink()
- [ ] Accounts page shows linked bank accounts
- [ ] Webhook handlers sync transactions when bank notifies
- [ ] 80%+ test coverage on banking module

---

## STREAM B: Budget Management
**Worktree**: `money-wise-budget`
**Branch**: `feature/budget-management`
**Status**: Schema exists, service exists, need controller + UI

### Scope
Create budget CRUD backend, budget UI components, and wire to existing budget service.

### Files to Create (EXCLUSIVE)
```
# Backend
apps/backend/src/budgets/budgets.module.ts
apps/backend/src/budgets/budgets.controller.ts
apps/backend/src/budgets/dto/create-budget.dto.ts
apps/backend/src/budgets/dto/update-budget.dto.ts

# Frontend Components
apps/web/src/components/budgets/BudgetForm.tsx
apps/web/src/components/budgets/BudgetList.tsx
apps/web/src/components/budgets/BudgetProgressBar.tsx
apps/web/src/components/budgets/OverBudgetAlert.tsx
apps/web/src/components/budgets/index.ts

# Frontend Services
apps/web/src/services/budgets.client.ts
apps/web/src/store/budgets.store.ts
apps/web/src/hooks/useBudgets.ts
```

### Files to Modify (EXCLUSIVE)
```
apps/web/app/budgets/page.tsx  # Implement full page
apps/backend/src/app.module.ts  # Register BudgetsModule
```

### Files to READ ONLY (Shared - No modifications)
```
apps/backend/src/core/database/prisma/services/budget.service.ts  # Use existing
packages/database/prisma/schema.prisma  # Budget model exists
```

### Dependencies
- None (fully isolated new module)

### Acceptance Criteria
- [ ] POST/GET/PUT/DELETE /api/budgets endpoints working
- [ ] Budget creation form with category selection
- [ ] Budget list with progress visualization
- [ ] Over-budget alerts display correctly
- [ ] 80%+ test coverage

---

## STREAM C: Dashboard Insights
**Worktree**: `money-wise-dashboard`
**Branch**: `feature/dashboard-insights`
**Status**: Components exist with mock data, need real data integration

### Scope
Create analytics backend, replace mock data in dashboard components.

### Files to Create (EXCLUSIVE)
```
# Backend Analytics
apps/backend/src/analytics/analytics.module.ts
apps/backend/src/analytics/analytics.controller.ts
apps/backend/src/analytics/analytics.service.ts

# Frontend Data Layer
apps/web/src/hooks/useDashboardStats.ts
apps/web/src/lib/dashboard/aggregations.ts
apps/web/src/types/dashboard.types.ts
apps/web/src/components/dashboard/DashboardFilters.tsx
```

### Files to Modify (EXCLUSIVE)
```
apps/web/src/components/dashboard/StatsCards.tsx  # Accept props
apps/web/src/components/dashboard/SpendingChart.tsx  # Accept props
apps/web/src/components/dashboard/RecentTransactions.tsx  # Accept props
apps/web/app/dashboard/page.tsx  # Add data fetching
apps/backend/src/app.module.ts  # Register AnalyticsModule
```

### Files to READ ONLY (Shared)
```
apps/web/src/store/banking.store.ts  # Read account data
apps/backend/src/core/database/prisma/services/transaction.service.ts
```

### Dependencies
- Reads from banking store (async - banking doesn't need to be done first)

### Acceptance Criteria
- [ ] GET /api/analytics/spending-by-category returns real data
- [ ] GET /api/analytics/stats returns balance/income/expenses
- [ ] Dashboard shows live account balances
- [ ] Spending chart shows real category breakdown
- [ ] Time period filter (weekly/monthly) works

---

## STREAM D: Integration Phase (SEQUENTIAL)
**Branch**: `feature/mvp-integration`
**Timing**: After A, B, C complete

### Scope
Wire all features together, handle shared file conflicts.

### Files to Modify
```
apps/web/src/components/dashboard/BudgetProgress.tsx  # Connect to budgets API
apps/web/app/dashboard/page.tsx  # Final integration
apps/backend/src/core/database/prisma/services/transaction.service.ts  # Add aggregation methods
```

### Merge Order (REVISED - Sequential then Parallel)
1. **Phase 1**: Complete `feature/banking-completion` → merge to main (BLOCKER)
2. **Phase 2**: Create worktrees for Budget + Dashboard (PARALLEL)
   - `feature/budget-management` → merge first (Dashboard needs budget data)
   - `feature/dashboard-insights` → merge second
3. **Phase 3**: Create `feature/mvp-integration` → final polish and testing

---

## Revised Execution Timeline (Sequential → Parallel)

```
Week 1-2: BANKING FOUNDATION (Sequential - Establishes Data Contract)
┌─────────────────────────────────────────────────────────────┐
│ Stream A: Banking         ████████████████████████          │
├─────────────────────────────────────────────────────────────┤
│ • Fix callback page (completeLink bug)                      │
│ • Implement webhook handlers                                │
│ • Account display UI                                        │
│ • Transaction sync working                                  │
│ • REAL DATA FLOWING ← This unlocks parallel work            │
└─────────────────────────────────────────────────────────────┘

Week 2-4: BUDGET + DASHBOARD PARALLEL (After Banking merges)
┌─────────────────────────────────────────────────────────────┐
│ Stream B: Budget          ████████████████████████          │
│ Stream C: Dashboard       ████████████████████████          │
├─────────────────────────────────────────────────────────────┤
│ Budget uses REAL transactions from Banking                  │
│ Dashboard uses REAL data from Banking + Budget              │
│ NO MOCKS for core data paths                                │
└─────────────────────────────────────────────────────────────┘

Week 4-5: INTEGRATION POLISH (Sequential)
┌─────────────────────────────────────────────────────────────┐
│ Stream D: Integration     ████████████████████              │
├─────────────────────────────────────────────────────────────┤
│ Edge cases, error states, loading UX                        │
│ Cross-feature testing                                       │
│ Final merge to main                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Decisions (RESOLVED)

### 1. BudgetProgress.tsx Ownership ✅
**Decision**: Budget stream owns it (Domain ownership)
- Budget defines the interface contract first
- Dashboard consumes via props, never modifies
- If Dashboard needs features Budget didn't anticipate → integration phase

### 2. app.module.ts Conflict Handling ✅
**Decision**: First-merge-wins
- Each stream adds their module registration
- 30-second resolution at merge time (just add the missing import)
- Git handles this naturally - embrace it

### 3. Execution Order ✅
**Decision**: Banking → Budget → Dashboard (Sequential with staged parallelization)

```
Phase 1 (Week 1-2): Banking Foundation
├── Transaction model (the CONTRACT)
├── Account model + connection flow
├── Basic sync working
└── Real data flowing

Phase 2 (Week 2-4): Budget + Dashboard PARALLEL
├── Budget: Uses REAL transactions from Banking
├── Dashboard: Uses REAL data from Banking + Budget
└── No mocks for core data paths

Phase 3 (Week 4-5): Integration Polish
└── Edge cases, error states, loading UX
```

**Rationale**:
- Banking provides the real transaction data that Budget and Dashboard depend on
- Developing Budget/Dashboard with mock data creates "integration debt"
- True parallelization unlocks AFTER Banking provides real data foundation

---

## Risk Mitigation

### Merge Conflict Prevention
- Each stream works on EXCLUSIVE files only
- Shared files are READ ONLY until integration
- Daily rebase from main to catch early conflicts

### Communication Protocol
- Each worktree runs own dev server (ports 3000/3001, 3002/3003, 3004/3005)
- Changes to shared files documented in PR description
- Integration phase handles all cross-feature concerns

---

## Commands Quick Reference

```bash
# === PHASE 1: Banking First (Week 1-2) ===
git checkout -b feature/banking-completion
# Work on banking until real data flows...
# Then merge:
git checkout main && git merge feature/banking-completion
git push origin main

# === PHASE 2: Budget + Dashboard PARALLEL (Week 2-4) ===
# Create worktrees AFTER banking merges (they depend on real data)
git worktree add ../money-wise-budget feature/budget-management
git worktree add ../money-wise-dashboard feature/dashboard-insights

# Navigate between worktrees
cd ../money-wise-budget && code .
cd ../money-wise-dashboard && code .

# Daily rebase in each worktree
git fetch origin && git rebase origin/main

# Merge Budget first (Dashboard depends on budget data)
git checkout main && git merge feature/budget-management
git push origin main
git worktree remove ../money-wise-budget

# Then merge Dashboard
git checkout main && git merge feature/dashboard-insights
git push origin main
git worktree remove ../money-wise-dashboard

# === PHASE 3: Integration (Week 4-5) ===
git checkout -b feature/mvp-integration
# Final polish, cross-feature testing
git checkout main && git merge feature/mvp-integration
```
