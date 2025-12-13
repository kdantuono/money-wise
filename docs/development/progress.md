# Development Progress

> **Live tracking of MoneyWise development milestones**
> **Last Updated: December 13, 2025**

## Project Status: MVP Sprint 64% Complete

### Current State Summary

MoneyWise MVP Sprint is progressing with 7 of 11 phases complete:
- ✅ **Phase -1**: Foundation Upgrade (Turbo 2.6, Tailwind v4, Jest 30, NestJS 11)
- ✅ **Phase 0**: Schema Foundation (Financial models, Categories seed, Balance normalizer)
- ✅ **Phase 1**: Categories Enhanced (Full UI, spending analytics, Specification Pattern)
- ✅ **Phase 2**: Transaction Management (CRUD, filters, CSV export, Command Palette)
- ✅ **Phase 3**: Account Details (Account page with filtered transactions)
- ✅ **Phase 4**: Liabilities (CRUD, BNPL detection, Installments, Dashboard widget)
- ✅ **Phase 5**: Scheduled Transactions (Recurrence, calendar events, auto-generate)

### Remaining
- ❌ Phase 6: Financial Calendar
- ❌ Phase 7: Settings & Preferences
- ❌ Phase 8: Notifications
- ❌ Phase 9: Dashboard Integration
- ❌ Phase 10: Testing & Polish

---

## Completed Features

### Authentication System (100%)
**PRs**: #153, #157, #161, #204, #208

- **Backend**: JWT auth with refresh tokens, 2FA support, rate limiting
- **Frontend**: Login/Register forms, protected routes, auth context
- **Security**: HttpOnly cookies, CSRF protection, password validation
- **Testing**: E2E auth flows, unit tests for all guards/strategies

### Dashboard & Analytics (100%)
**PRs**: #210, #213, #214, #216, #225

- **Stats Cards**: Total balance, income/expenses, savings rate
- **Recent Transactions**: Live transaction feed with categories
- **Budget Overview**: Category spending vs budget limits
- **Quick Actions**: Link account, set budget navigation
- **Analytics API**: Spending by category, trends, insights

### Banking Integration - SaltEdge v6 (100%)
**PRs**: #212, #218, #219, hotfix/tech-debt-phase4

- **OAuth Flow**: Popup-based bank authorization
- **Account Linking**: Store and sync connected accounts
- **Transaction Sync**: Auto-fetch transactions on account link (v6 API compliant)
- **Error Handling**: Graceful 404/stale reference cleanup, HTML response detection
- **v6 API Compliance**: Correct endpoint construction with connection_id parameter

### Budget Management (100%)
**PRs**: #217, #222, #223

- **CRUD Operations**: Create, read, update, delete budgets
- **Category Association**: Link budgets to spending categories
- **Progress Tracking**: Visual spending vs budget display
- **Dashboard Integration**: Budget overview on main dashboard

### Navigation & Pages (100%)
**PRs**: #211, #222, #223, #225

- **Dashboard Layout**: Sidebar with all navigation items
- **Planning Dropdown**: Budgets accessible under Planning section
- **Placeholder Pages**: Accounts, Transactions, Investments, Goals, Settings
- **Active State**: Current page highlighting in navigation

### Infrastructure (100%)
**PRs**: #129, #153, #204, #207, #208, #209, #224

- **Prisma ORM**: Complete migration from TypeORM
- **Docker E2E**: Multi-stage builds, pre-built runtime stages
- **CI/CD Pipeline**: GitHub Actions with quality gates
- **Sentry Monitoring**: Error tracking (backend + frontend)
- **Test Infrastructure**: Jest + Vitest + Playwright

---

## Infrastructure Milestones

### EPIC-1.5: Technical Debt (October 2025) - COMPLETE
- STORY-1.5.1 → 1.5.7: All delivered
- TypeORM → Prisma migration: Complete
- Testing infrastructure: 70%+ coverage

### EPIC-2.1: Frontend Auth (November 2025) - COMPLETE
- Login/Register forms: Done
- Protected routes: Done
- Auth context: Done
- Token management: Done

### EPIC-2.2: Dashboard & Analytics (November 2025) - COMPLETE
- Dashboard components: Done
- Analytics API: Done
- Banking integration: Done

### Phase -1: Foundation Upgrades (December 2025) - COMPLETE
**PR**: #231

Major dependency upgrades completed successfully:
- **Tailwind CSS v4**: CSS-based configuration, @import syntax
- **Jest 30**: Updated test patterns and assertions
- **NestJS 11**: Enhanced decorators, new JWT types
- **Expo 52**: Latest React Native tooling
- **pnpm 10.24**: Modern package management

All 2302 tests passing, zero breaking changes in application code.

### Phase 2: Transaction Management UI (December 2025) - COMPLETE
**Branch**: `feature/phase-2-transactions`
**PR**: #238 (Merged December 6, 2025)

- **Transaction CRUD**: Full create, read, update, delete for manual transactions
- **Transaction Components**: Form, Modal, Row, List with filtering/search
- **Category Selector**: Dropdown with icons and color indicators
- **Bulk Operations**: Multi-select, bulk categorize, bulk delete
- **Account Details Page**: `/dashboard/accounts/[id]` with filtered transactions
- **Command Palette**: Cmd+K global navigation shortcut
- **CSV Export**: Export transactions with ISO + localized dates
- **Zustand Store**: Full state management for transactions
- **Test Coverage**: 7 test files covering all major components

### Phase 4: Liabilities Module (December 2025) - COMPLETE
**Branch**: `feature/phase-4-liabilities`
**PR**: #239 (Merged December 7, 2025)

- **Liabilities CRUD**: Full backend module with NestJS (service, controller, DTOs)
- **BNPL Detection**: 10 providers (PayPal Pay-in-3/4/6/12/24, Klarna, Afterpay, Affirm, Clearpay, Satispay)
- **InstallmentPlan Management**: Create/manage payment plans with individual installments
- **Frontend Components**: LiabilityCard, LiabilityList, LiabilityForm, InstallmentTimeline
- **Dashboard Widget**: UpcomingPayments component for quick visibility
- **Liabilities Pages**: List view + detail page with edit/delete
- **Pagination**: Backend pagination support for large liability lists
- **Cross-field Validation**: Type-specific DTO validation (CC requires creditLimit, etc.)
- **Test Coverage**: 47 tests (34 service + 13 controller)

### Phase 5: Scheduled Transactions (December 2025) - COMPLETE
**Branch**: `feature/phase-5-scheduled`
**PR**: #240 (Merged December 7, 2025)

- **ScheduledModule**: NestJS module with CRUD operations and family-based authorization
- **RecurrenceService**: Calculate next occurrences (daily/weekly/monthly/yearly/once)
- **Calendar Events Endpoint**: Integration point for Phase 6 Financial Calendar
- **Auto-generate from Liabilities**: Create scheduled transactions from liability payments
- **Skip and Complete**: Mark scheduled transactions as skipped or completed
- **Frontend Components**: ScheduledTransactionCard, List, Form components
- **RecurrenceSelector**: User-friendly recurrence pattern builder
- **UpcomingScheduled Widget**: Dashboard widget for upcoming transactions
- **Scheduled Page**: `/dashboard/scheduled` management interface
- **Test Coverage**: 73 tests (recurrence, service, controller) + 22 API integration tests

### Phase 1: Categories Enhanced (December 2025) - COMPLETE
**Branch**: `feature/phase-1-categories-enhanced`
**PR**: #275, #278 (Merged December 12-13, 2025)

- **Categories Management Page**: `/dashboard/categories` with hierarchical tree view
- **CategoryTree Component**: Collapsible hierarchy with expand/collapse controls
- **CategoryForm Modal**: Create/edit with name, type, parent, icon, and color selection
- **IconPicker Component**: Curated Lucide icon selection (~50 icons)
- **ColorPicker Component**: Preset color palette for category customization
- **CategorySpendingSummary**: Spending analytics with date range filtering
- **Spending Rollup Queries**: Recursive CTE for hierarchical spending calculation
- **Specification Pattern**: Business rule validation (CategoryValidationSpecification)
- **Schema Migration**: Removed TRANSFER from CategoryType (transfers use FlowType)
- **Test Coverage**: 33+ unit tests, Specification Pattern tests, API integration tests

---

## Technical Stack

| Component | Technology |
|-----------|------------|
| Backend | NestJS 11 + Express 5 + Prisma + PostgreSQL + Redis |
| Frontend | Next.js 15 + React 19 + Tailwind CSS v4 |
| Mobile | React Native 0.76 (Expo 52) - Pending |
| Testing | Jest 30 + Vitest 4 + Playwright |
| CI/CD | GitHub Actions + Turborepo 2.6 |
| Monitoring | Sentry |
| Banking | SaltEdge v6 API |
| Package Manager | pnpm 10.24 |

---

## Metrics

### Feature Completion
- **Backend API**: 98%
- **Frontend Web**: 95%
- **Mobile App**: 0% (Pending)
- **E2E Tests**: 100% passing
- **CI/CD**: 100% operational

### Code Quality
- **Unit Test Coverage**: 70%+
- **Lint/TypeCheck**: Zero errors
- **Security Alerts**: Resolved

---

## Remaining Work (MVP Sprint)

### High Priority (Critical Path)
1. **Phase 5: Scheduled Transactions** - NEXT UP
   - ScheduledTransaction CRUD backend
   - Auto-generate from liabilities
   - RecurrenceRule support
2. **Phase 6: Financial Calendar** - Depends on Phase 5
   - Monthly calendar view
   - Event types (bills, income, installments)
   - Cash flow projection

### Medium Priority
3. **Phase 7: Settings & Preferences**
   - Timezone, currency, date format
   - Profile settings
4. **Phase 8: Notifications**
   - In-app notification bell
   - Email reminders (payment due/overdue)
   - Push notification infrastructure
5. **Phase 1: Categories** (complete remaining)
   - CategoryTree hierarchical view
   - Category management page

### Integration & Polish
6. **Phase 9: Dashboard Integration**
   - Net worth calculation
   - Available-to-spend metric
   - Financial alerts widget
7. **Phase 10: Testing & Polish**
   - E2E tests for critical flows
   - UI polish and edge cases

### Post-MVP
- Investment Tracking
- Goal Setting
- Mobile App (React Native)
- Multi-currency support

---

## Recent Activity (November-December 2025)

| Date | PR | Description |
|------|-----|-------------|
| Dec 7 | #239 | **Phase 4: Liabilities Module** - BNPL detection, InstallmentPlans, Dashboard widget |
| Dec 6 | #238 | **Phase 2: Transaction Management** - CRUD, CSV export, Command Palette |
| Dec 5 | #237 | **Phase 0: Schema Foundation** - Financial models, Category seed, Balance normalizer |
| Dec 3 | #231 | **Phase -1: Foundation Upgrades** - Tailwind v4, Jest 30, NestJS 11, pnpm 10.24 |
| Dec 3 | #230 | SaltEdge v6 API compliance fix, transactions page display |
| Dec 1 | #225 | Goals navigation fix |
| Dec 1 | #224 | Docker E2E infrastructure |
| Nov 30 | #223 | Planning dropdown in sidebar |
| Nov 30 | #222 | Budgets moved to dashboard |
| Nov 30 | #221 | E2E infrastructure fixes |
| Nov 30 | #219 | SaltEdge 404 error handling |
| Nov 30 | #218 | Auto-sync transactions |
| Nov 30 | #217 | Budget Management Module |
| Nov 29 | #216 | Dashboard Insights API |
| Nov 29 | #215 | Banking status documentation |
| Nov 28 | #214 | E2E QuickActions fix |
| Nov 28 | #213 | Dashboard data-testid attributes |
| Nov 28 | #212 | SaltEdge v6 OAuth integration |
| Nov 27 | #210 | Dashboard MVP components |
| Nov 27 | #209 | Codebase cleanup |
| Nov 27 | #208 | Security fixes (CodeQL) |
| Nov 27 | #207 | Sentry package upgrade |

---

## GitHub Issues Status

### Stale/Resolved (to be closed)
- #154: Integration Tests - E2E now 100% passing
- #116: EPIC-2.1 Frontend Auth - Complete
- #120-127: Prisma migration stories - Complete
- #102: EPIC-1.5 Technical Debt - Complete

### Active
- #98: Core Finance Features - In progress (accounts/transactions UI)
- #146: AccountsService tests - Needs verification

---

*This document reflects the actual state of the codebase as of December 7, 2025*
