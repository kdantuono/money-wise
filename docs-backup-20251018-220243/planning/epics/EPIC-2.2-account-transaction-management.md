# EPIC 2.2: Account & Transaction Management

**Epic ID**: EPIC-2.2
**Priority**: HIGH
**Duration**: 2 weeks (10 days)
**Start Date**: After EPIC-2.1 completion
**Dependencies**: Frontend Authentication (EPIC-2.1), Prisma models complete
**Team**: Frontend specialist + Backend specialist

---

## Business Value

Enable users to manually track their financial accounts and transactions, providing immediate value even before bank integration. This establishes the core value proposition of MoneyWise - comprehensive financial visibility.

## Success Criteria

- [ ] Users can create multiple account types (checking, savings, credit)
- [ ] Manual transaction entry with categories
- [ ] Transaction list with filtering and search
- [ ] Real-time balance calculations
- [ ] Category management (system + custom)
- [ ] Basic dashboard with key metrics
- [ ] Data persistence and consistency
- [ ] Mobile-responsive design
- [ ] < 500ms data operations

---

## User Stories

### Story 2.2.1: Account Management UI
**Points**: 5
**Priority**: P0
**Duration**: 1.5 days

**Description**: Complete CRUD interface for financial accounts.

**Acceptance Criteria**:
- [ ] Accounts list page at `/app/accounts/page.tsx`
- [ ] Create account modal with form validation
- [ ] Account types: Checking, Savings, Credit Card, Cash
- [ ] Edit account details inline
- [ ] Delete account with confirmation (cascade warning)
- [ ] Account card component with balance display
- [ ] Currency formatting (localized)
- [ ] Account status indicators (active/inactive)
- [ ] Sorting by name, balance, type

**Data Model**:
```typescript
interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  currency: string
  institution?: string
  lastSync?: Date
  isActive: boolean
}
```

---

### Story 2.2.2: Manual Transaction Entry
**Points**: 8
**Priority**: P0
**Duration**: 2 days

**Description**: Form for adding transactions manually with intelligent defaults.

**Acceptance Criteria**:
- [ ] Transaction form at `/app/transactions/new/page.tsx`
- [ ] Account selection (with balance preview)
- [ ] Amount input with calculator
- [ ] Date picker (default: today)
- [ ] Payee/Description field with autocomplete
- [ ] Category selection with icons
- [ ] Transaction type toggle (income/expense)
- [ ] Optional notes field
- [ ] Receipt upload preparation (UI only)
- [ ] Save and add another option
- [ ] Keyboard shortcuts (Ctrl+Enter to save)

**Smart Features**:
- Auto-detect transaction type from amount (+/-)
- Remember last used category per payee
- Suggest categories based on description
- Quick-add common transactions

---

### Story 2.2.3: Transaction List & Filters
**Points**: 8
**Priority**: P0
**Duration**: 2 days

**Description**: Comprehensive transaction list with powerful filtering.

**Acceptance Criteria**:
- [ ] Transaction list at `/app/transactions/page.tsx`
- [ ] Infinite scroll or pagination (100 per page)
- [ ] Filter by date range (presets: week, month, year)
- [ ] Filter by account (multi-select)
- [ ] Filter by category (multi-select)
- [ ] Filter by amount range
- [ ] Search by description/payee
- [ ] Sort by date, amount, payee
- [ ] Bulk select and actions
- [ ] Export to CSV button
- [ ] Running balance column

**List Item Display**:
```typescript
- Date (formatted)
- Payee/Description
- Category (icon + name)
- Account
- Amount (colored: green/red)
- Actions (edit, delete)
```

---

### Story 2.2.4: Transaction Edit & Delete
**Points**: 3
**Priority**: P0
**Duration**: 1 day

**Description**: Edit transactions inline or via modal, with bulk operations.

**Acceptance Criteria**:
- [ ] Edit modal/drawer for transactions
- [ ] Inline edit for amount and category
- [ ] Delete with confirmation
- [ ] Bulk categorization
- [ ] Bulk delete with confirmation
- [ ] Undo last action (5 seconds)
- [ ] Audit trail (show last modified)
- [ ] Optimistic updates with rollback

---

### Story 2.2.5: Category Management
**Points**: 5
**Priority**: P0
**Duration**: 1.5 days

**Description**: System and custom categories with icons and colors.

**Acceptance Criteria**:
- [ ] Categories page at `/app/settings/categories/page.tsx`
- [ ] Default categories (non-editable)
- [ ] Create custom category
- [ ] Edit category name, icon, color
- [ ] Delete category (with reassignment option)
- [ ] Category usage statistics
- [ ] Parent-child category support (2 levels)
- [ ] Icon picker (100+ icons)
- [ ] Color picker with presets
- [ ] Merge categories tool

**Default Categories**:
```typescript
const systemCategories = [
  { name: "Food & Dining", icon: "🍽️", color: "#FF6B6B" },
  { name: "Transportation", icon: "🚗", color: "#4ECDC4" },
  { name: "Shopping", icon: "🛍️", color: "#45B7D1" },
  { name: "Entertainment", icon: "🎬", color: "#96E6B3" },
  { name: "Bills & Utilities", icon: "🏠", color: "#DA5552" },
  { name: "Healthcare", icon: "🏥", color: "#F2CC8F" },
  // ... more
]
```

---

### Story 2.2.6: Dashboard Overview
**Points**: 8
**Priority**: P0
**Duration**: 2 days

**Description**: Main dashboard with account summaries and recent activity.

**Acceptance Criteria**:
- [ ] Dashboard at `/app/dashboard/page.tsx`
- [ ] Total net worth calculation
- [ ] Accounts summary cards
- [ ] Recent transactions (last 10)
- [ ] Monthly spending by category (chart)
- [ ] Income vs expenses (this month)
- [ ] Quick actions (add transaction, transfer)
- [ ] Customizable widget layout
- [ ] Period selector (month/quarter/year)
- [ ] Trend indicators (vs last period)

**Widgets**:
```typescript
- NetWorthCard: Total across all accounts
- AccountsList: Mini cards with balances
- RecentTransactions: Compact list
- SpendingChart: Donut chart by category
- MonthlyTrend: Line chart income/expense
- QuickStats: Cards with KPIs
```

---

### Story 2.2.7: Data Visualization Components
**Points**: 5
**Priority**: P1
**Duration**: 1.5 days

**Description**: Reusable chart components for financial data.

**Acceptance Criteria**:
- [ ] Spending by category (pie/donut chart)
- [ ] Income vs expense (bar chart)
- [ ] Balance over time (line chart)
- [ ] Category trends (stacked area)
- [ ] Responsive and interactive
- [ ] Tooltips with details
- [ ] Export as image option
- [ ] Consistent color scheme
- [ ] Loading skeletons
- [ ] Empty states

**Chart Library**: Recharts or Tremor
**Data Format**: Standardized for all charts

---

### Story 2.2.8: Search & Global Actions
**Points**: 3
**Priority**: P1
**Duration**: 1 day

**Description**: Global search and quick action command palette.

**Acceptance Criteria**:
- [ ] Global search in navbar
- [ ] Search accounts, transactions, categories
- [ ] Command palette (Cmd+K)
- [ ] Quick add transaction
- [ ] Quick transfer between accounts
- [ ] Jump to any page
- [ ] Recent searches
- [ ] Search suggestions
- [ ] Keyboard navigation

---

## Technical Architecture

### Component Structure
```
apps/web/
├── app/
│   ├── accounts/
│   │   ├── page.tsx (list)
│   │   └── [id]/page.tsx (detail)
│   ├── transactions/
│   │   ├── page.tsx (list)
│   │   ├── new/page.tsx (create)
│   │   └── [id]/edit/page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   └── settings/
│       └── categories/page.tsx
├── components/
│   ├── accounts/
│   │   ├── account-card.tsx
│   │   ├── account-form.tsx
│   │   └── account-list.tsx
│   ├── transactions/
│   │   ├── transaction-form.tsx
│   │   ├── transaction-list.tsx
│   │   ├── transaction-filters.tsx
│   │   └── transaction-item.tsx
│   ├── categories/
│   │   ├── category-picker.tsx
│   │   └── category-manager.tsx
│   └── charts/
│       ├── spending-chart.tsx
│       ├── balance-chart.tsx
│       └── trend-chart.tsx
└── lib/
    ├── stores/
    │   ├── accounts.store.ts
    │   ├── transactions.store.ts
    │   └── categories.store.ts
    └── api/
        ├── accounts.api.ts
        ├── transactions.api.ts
        └── categories.api.ts
```

### API Endpoints Required

**Accounts**:
- `GET /api/accounts` - List all accounts
- `POST /api/accounts` - Create account
- `PATCH /api/accounts/:id` - Update account
- `DELETE /api/accounts/:id` - Delete account

**Transactions**:
- `GET /api/transactions` - List with filters
- `POST /api/transactions` - Create transaction
- `PATCH /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `POST /api/transactions/bulk` - Bulk operations

**Categories**:
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create category
- `PATCH /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

**Dashboard**:
- `GET /api/dashboard/summary` - Aggregated data
- `GET /api/dashboard/trends` - Time series data

### State Management

```typescript
// Zustand stores for client state
interface AccountsStore {
  accounts: Account[]
  selectedAccount: Account | null
  createAccount: (data) => Promise<void>
  updateAccount: (id, data) => Promise<void>
  deleteAccount: (id) => Promise<void>
}

interface TransactionsStore {
  transactions: Transaction[]
  filters: TransactionFilters
  createTransaction: (data) => Promise<void>
  updateTransaction: (id, data) => Promise<void>
  deleteTransaction: (id) => Promise<void>
  setFilters: (filters) => void
}
```

### Performance Optimizations

- Virtual scrolling for long lists (react-window)
- Debounced search (300ms)
- Optimistic UI updates
- Lazy load charts
- Memoized calculations
- IndexedDB for offline capability
- Service worker for caching

---

## Dependencies & Blockers

### Dependencies
- ✅ Prisma models (Account, Transaction, Category)
- ✅ Backend APIs (to be verified)
- ✅ Authentication (EPIC-2.1)

### Potential Blockers
- Chart library selection
- Performance with large datasets
- Offline sync complexity

---

## Definition of Done

- [ ] All stories completed
- [ ] Unit tests > 80% coverage
- [ ] E2E tests for critical paths
- [ ] Responsive design verified
- [ ] Performance targets met
- [ ] Accessibility audit passed
- [ ] Code reviewed and merged
- [ ] API documentation complete
- [ ] User documentation written

---

## Metrics to Track

- Transaction entry time (target: < 30s)
- Page load time (target: < 2s)
- Data operation latency (target: < 500ms)
- User engagement (transactions/day)
- Feature adoption rate
- Error rate in production

---

**Epic Owner**: Frontend Specialist
**Backend Support**: Backend Specialist
**Estimated Completion**: 10 working days