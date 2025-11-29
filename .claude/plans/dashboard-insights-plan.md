# Dashboard Insights Implementation Plan

## Overview
Create an Analytics backend module and replace mock data in dashboard components with real data from the database.

## Exploration Findings

### Data Models (Prisma Schema)
- **Transaction**: `amount` (Decimal, absolute value), `type` (DEBIT/CREDIT), `date`, `categoryId`, `accountId`
- **Account**: `currentBalance` (Decimal), `userId`, `familyId`
- **Category**: `name`, `type` (INCOME/EXPENSE/TRANSFER)

### Existing Services
- `TransactionService` at `apps/backend/src/core/database/prisma/services/transaction.service.ts`
- `PrismaAccountService` at `apps/backend/src/core/database/prisma/services/account.service.ts`

### Frontend Stack
- React Query v3 installed (`react-query@3.39.3`)
- No React Query provider configured yet
- Banking client pattern uses fetch with `credentials: 'include'`

### Current Dashboard Mock Data
- `StatsCards.tsx`: Lines 47-56 - hardcoded `mockStats`
- `SpendingChart.tsx`: Lines 14-20 - hardcoded `mockSpending`
- `RecentTransactions.tsx`: Lines 16-57 - hardcoded `mockTransactions`

---

## Implementation Plan

### Phase 1: Backend Analytics Module

#### 1.1 Create Analytics DTOs
**File**: `apps/backend/src/analytics/dto/analytics.dto.ts`

```typescript
// DashboardStatsDto - stats endpoint response
// CategorySpendingDto - spending-by-category response
// RecentTransactionDto - transactions/recent response
// TrendDataDto - trends response
// TimePeriodDto - query validation
```

#### 1.2 Create Analytics Service
**File**: `apps/backend/src/analytics/analytics.service.ts`

Methods:
- `getStats(userId: string, period: string)` - Total balance, income, expenses, savings rate
- `getSpendingByCategory(userId: string, period: string)` - Category breakdown
- `getRecentTransactions(userId: string, limit: number)` - Recent transactions
- `getTrends(userId: string, period: string)` - Time series data

Key implementation details:
- Get user's accounts first (filter by userId)
- Sum balances from all user accounts
- Aggregate transactions using Prisma `aggregate()` and `groupBy()`
- CREDIT = income, DEBIT = expenses (amounts stored as absolute values)

#### 1.3 Create Analytics Controller
**File**: `apps/backend/src/analytics/analytics.controller.ts`

Endpoints:
- `GET /api/analytics/stats?period=monthly`
- `GET /api/analytics/spending-by-category?period=monthly`
- `GET /api/analytics/transactions/recent?limit=10`
- `GET /api/analytics/trends?period=monthly`

Uses: `@UseGuards(JwtAuthGuard)`, `@CurrentUser()` decorator

#### 1.4 Create Analytics Module
**File**: `apps/backend/src/analytics/analytics.module.ts`

Imports: `PrismaModule`, `ConfigModule`
Exports: `AnalyticsService`

#### 1.5 Register Module
**File**: `apps/backend/src/app.module.ts`

Add `AnalyticsModule` to imports array.

---

### Phase 2: Frontend Data Layer

#### 2.1 Create Dashboard Types
**File**: `apps/web/src/types/dashboard.types.ts`

```typescript
export type TimePeriod = 'weekly' | 'monthly' | 'yearly';
export interface DashboardStats { ... }
export interface CategorySpending { ... }
export interface Transaction { ... }
export interface TrendData { ... }
```

#### 2.2 Create Analytics API Client
**File**: `apps/web/src/services/analytics.client.ts`

Following `banking.client.ts` pattern with:
- `getStats(period)`
- `getSpendingByCategory(period)`
- `getRecentTransactions(limit)`
- `getTrends(period)`
- Error handling with typed errors

#### 2.3 Add React Query Provider
**File**: Update `apps/web/app/layout.tsx`

Add `QueryClientProvider` wrapper.

#### 2.4 Create Data Fetching Hooks
**File**: `apps/web/src/hooks/useDashboardStats.ts`

```typescript
export function useDashboardStats(period: TimePeriod) { ... }
export function useSpendingByCategory(period: TimePeriod) { ... }
export function useRecentTransactions(limit: number) { ... }
export function useDashboardData(period: TimePeriod) { ... }
```

---

### Phase 3: Component Modifications

#### 3.1 Modify StatsCards
**File**: `apps/web/src/components/dashboard/StatsCards.tsx`

- Remove `mockStats` constant
- Accept props: `{ stats: DashboardStats | undefined; isLoading?: boolean }`
- Add loading skeleton
- Add empty state

#### 3.2 Modify SpendingChart
**File**: `apps/web/src/components/dashboard/SpendingChart.tsx`

- Remove `mockSpending` constant
- Accept props: `{ data: CategorySpending[] | undefined; isLoading?: boolean }`
- Calculate total from data
- Add loading/empty states

#### 3.3 Modify RecentTransactions
**File**: `apps/web/src/components/dashboard/RecentTransactions.tsx`

- Remove `mockTransactions` constant
- Accept props: `{ transactions: Transaction[] | undefined; isLoading?: boolean }`
- Add loading/empty states

#### 3.4 Create DashboardFilters
**File**: `apps/web/src/components/dashboard/DashboardFilters.tsx`

Time period selector component with weekly/monthly/yearly options.

#### 3.5 Wire Dashboard Page
**File**: `apps/web/app/dashboard/page.tsx`

- Add `useState` for period
- Use `useDashboardData(period)` hook
- Pass data to components as props
- Handle loading and error states

---

### Phase 4: Testing

#### 4.1 Backend Unit Tests
**File**: `apps/backend/src/analytics/__tests__/analytics.service.spec.ts`

Test cases:
- getStats with various periods
- getSpendingByCategory aggregation
- getRecentTransactions pagination
- Empty data handling
- User isolation (only sees own data)

#### 4.2 Frontend Hook Tests
**File**: `apps/web/__tests__/hooks/useDashboardStats.test.ts`

Test cases:
- Successful data fetching
- Error handling
- Period changes
- Cache behavior

#### 4.3 Component Tests
Update existing component tests for new prop-based interface.

---

## File Creation Summary

### New Files to Create:
1. `apps/backend/src/analytics/analytics.module.ts`
2. `apps/backend/src/analytics/analytics.controller.ts`
3. `apps/backend/src/analytics/analytics.service.ts`
4. `apps/backend/src/analytics/dto/analytics.dto.ts`
5. `apps/backend/src/analytics/__tests__/analytics.service.spec.ts`
6. `apps/web/src/types/dashboard.types.ts`
7. `apps/web/src/services/analytics.client.ts`
8. `apps/web/src/hooks/useDashboardStats.ts`
9. `apps/web/src/components/dashboard/DashboardFilters.tsx`
10. `apps/web/__tests__/hooks/useDashboardStats.test.ts`

### Files to Modify:
1. `apps/backend/src/app.module.ts` - Add AnalyticsModule
2. `apps/web/app/layout.tsx` - Add QueryClientProvider
3. `apps/web/src/components/dashboard/StatsCards.tsx` - Accept props
4. `apps/web/src/components/dashboard/SpendingChart.tsx` - Accept props
5. `apps/web/src/components/dashboard/RecentTransactions.tsx` - Accept props
6. `apps/web/app/dashboard/page.tsx` - Wire data fetching
7. `apps/web/src/services/index.ts` - Export analytics client

---

## Technical Decisions

1. **Period calculation**: Use `getPeriodDates(period)` helper that returns `{ startDate, endDate }` based on 'weekly'/'monthly'/'yearly'

2. **Transaction aggregation**:
   - Income = SUM of amount WHERE type = 'CREDIT'
   - Expenses = SUM of amount WHERE type = 'DEBIT'
   - Amounts are already absolute values in DB

3. **User data isolation**: All queries filter by user's accounts (userId)

4. **Savings rate**: `((income - expenses) / income) * 100`

5. **React Query staleTime**: 5 minutes for stats, 2 minutes for transactions

6. **Trends grouping**: Group by date for time series, show daily data points
