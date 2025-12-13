# MVP Completion Sprint - December 2025

> **Comprehensive implementation plan for MoneyWise MVP completion**
> **Status: In Progress - Phases -1, 0, 1, 2, 3, 4, 5 Complete ✅ (7/11 = 64%)**
> **Last Updated: December 13, 2025**

---

## Executive Summary

This document captures the complete design and implementation plan for completing the MoneyWise MVP. It consolidates decisions from strategic planning sessions covering:

1. **Foundation Upgrade** - Turbo 2.6, Tailwind v4, Jest 30, NestJS 11
2. **Category System** - Hierarchical categories with icons and spending rollup
3. **Transaction Management** - Full CRUD, transfer detection, flow classification
4. **Account Details Page** - Individual account view with transactions
5. **Financial Model** - Liabilities, scheduled transactions, and calendar
6. **Frontend UX** - Navigation, visual style, and layout

---

## Table of Contents

1. [Strategic Decisions](#1-strategic-decisions)
2. [Git Workflow & Parallelization](#2-git-workflow--parallelization)
3. [Phase -1: Foundation Upgrade](#3-phase--1-foundation-upgrade)
4. [Category System](#4-category-system)
5. [Transaction Management](#5-transaction-management)
6. [Account Details Page](#6-account-details-page)
7. [Financial Model](#7-financial-model)
8. [Scheduled Transactions & Calendar](#8-scheduled-transactions--calendar)
9. [User Settings & Preferences](#9-user-settings--preferences)
10. [Notification System](#10-notification-system)
11. [Frontend UX & Navigation](#11-frontend-ux--navigation)
12. [Visual Style Guide](#12-visual-style-guide)
13. [Schema Changes](#13-schema-changes)
14. [Implementation Phases](#14-implementation-phases)
15. [Resolved Decisions](#15-resolved-decisions)
16. [Future Considerations](#16-future-considerations)

---

## 1. Strategic Decisions

### Priority Order
| Priority | Decision | Rationale |
|----------|----------|-----------|
| 1 | **Foundation First** | Upgrade dependencies NOW to avoid migration debt |
| 2 | Features Second | Complete core features on modern stack |
| 3 | MVP-only scope | Defer Investment/Goals to post-validation |
| 4 | Mobile deferred | Keep on roadmap, but focus on web MVP |

### Upgrade Decision: Now vs Later Analysis

**Key Insight**: Code written on old APIs must be migrated later. Better to upgrade first.

| Metric | Now | Post-MVP | Multiplier |
|--------|-----|----------|------------|
| TSX components | 33 | ~80+ | 2.4x |
| Tailwind usages | 588 | ~1500+ | 2.5x |
| Jest test files | 74 | ~150+ | 2x |
| NestJS decorators | 167 | ~300+ | 1.8x |

**Conclusion**: Pay ~2.5 days now, save 5+ days later.

### Key Technical Decisions

| Area | Decision | Details |
|------|----------|---------|
| Category Icons | lucide-react | Already installed, 1000+ icons, consistent |
| Transfer Linking | `transferGroupId` UUID | Flexible, handles multi-leg transfers |
| CC Liability | Single balance per cycle | Option C (detailed) as future enhancement |
| Calendar View | Monthly only (MVP) | Full calendar views in v1.1 |
| Auto-Detection | A→B→C fallback | Auto-apply high confidence, suggest medium, manual low |
| Balance Display | Normalized layer | Mask provider inconsistencies |

### Installment Accounting
- **Decision**: Purchase counted at T+0 (purchase date)
- **Rationale**: Shows true spending, user sees actual expense when it happens
- **Future**: User preference setting for alternative accounting methods

---

## 2. Git Workflow & Parallelization

### Branch Strategy

```
main (protected)
│
└── epic/mvp-completion (long-lived integration branch)
    │
    ├── feature/phase-1-foundation-upgrade
    │   ├── chore: upgrade turbo 1.13 → 2.6
    │   ├── chore: migrate tailwind v3 → v4
    │   ├── chore: upgrade jest 29 → 30
    │   ├── chore: upgrade nestjs 10 → 11
    │   └── chore: patch updates (sentry, playwright, etc)
    │   → PR to epic/mvp-completion
    │
    ├── feature/phase-0-schema
    │   → PR to epic/mvp-completion
    │
    ├── feature/phase-1-categories ──────┐
    ├── feature/phase-2-transactions ────┼── Parallel after schema
    ├── feature/phase-4-liabilities ─────┤
    └── feature/phase-7-settings ────────┘
        → Each PRs to epic/mvp-completion
```

### Parallelization Waves

```
┌─────────────────────────────────────────────────────────────────────┐
│                    EXECUTION WAVES                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  WAVE 0: Foundation (Sequential, Blocking)                          │
│  ├── Turbo 2.6                                                       │
│  ├── Tailwind v4 (automated migration tool)                         │
│  ├── Jest 30                                                         │
│  ├── NestJS 11                                                       │
│  └── Patch updates                                                   │
│       │                                                              │
│       ▼ MUST complete before Wave 1                                  │
│                                                                      │
│  WAVE 1: Schema (Sequential, Blocking)                               │
│  └── All new Prisma models                                           │
│       │                                                              │
│       ▼ MUST complete before Wave 2                                  │
│                                                                      │
│  WAVE 2: Feature Development (PARALLEL)                              │
│  ├── Categories (Phase 1)                                            │
│  ├── Transactions (Phase 2)                                          │
│  ├── Liabilities (Phase 4)                                           │
│  └── Settings (Phase 7)                                              │
│       │                                                              │
│       ▼ Merge all, then Wave 3                                       │
│                                                                      │
│  WAVE 3: Dependent Features (PARALLEL)                               │
│  ├── Accounts (needs Transactions)                                   │
│  ├── Scheduled (needs Liabilities)                                   │
│  └── Notifications (needs Settings)                                  │
│       │                                                              │
│       ▼ Merge all, then Wave 4                                       │
│                                                                      │
│  WAVE 4: Integration Features                                        │
│  ├── Calendar (needs Scheduled)                                      │
│  └── Dashboard (needs all)                                           │
│       │                                                              │
│       ▼                                                              │
│  WAVE 5: Testing & Polish                                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Daily Workflow

```bash
# Start of day
git fetch origin
git checkout epic/mvp-completion
git pull origin epic/mvp-completion

# Work on feature
git checkout -b feature/phase-X-name
# ... develop ...
git push origin feature/phase-X-name

# Create PR to epic/mvp-completion (NOT main)
gh pr create --base epic/mvp-completion

# After merge, update local
git checkout epic/mvp-completion
git pull origin epic/mvp-completion
```

### Merge Strategy

| Branch | Merge To | Strategy |
|--------|----------|----------|
| feature/* | epic/mvp-completion | Squash merge |
| epic/mvp-completion | main | Merge commit (preserves history) |

### Worktree Usage (Optional)

Only if you want true parallel development:

```bash
# Create worktree for parallel work
git worktree add ../money-wise-feature feature/phase-X-name

# Work in separate directory
cd ../money-wise-feature
# ... develop ...

# Clean up after merge
git worktree remove ../money-wise-feature
```

**Recommendation**: Use standard branches. Worktrees add complexity without significant benefit for this project size.

---

## 3. Phase -1: Foundation Upgrade

### Overview

Upgrade all major dependencies BEFORE writing new feature code.

| Package | Current | Target | Migration Guide |
|---------|---------|--------|-----------------|
| Turbo | 1.13.4 | 2.6.1 | [Turbo Upgrade](https://turbo.build/repo/docs/crafting-your-repository/upgrading) |
| Tailwind | 3.3.6 | 4.x | [Tailwind v4 Guide](https://tailwindcss.com/docs/upgrade-guide) |
| Jest | 29.7.0 | 30.x | [Jest 30 Changelog](https://jestjs.io/blog) |
| NestJS | 10.0.0 | 11.x | [NestJS 11 Announcement](https://trilon.io/blog/announcing-nestjs-11-whats-new) |

### 3.1 Turbo 2.6 Upgrade

**Issue**: Lockfile has 1.13.4, package.json declares ^2.6.1

```bash
# Fix lockfile mismatch
pnpm update turbo

# Update turbo.json if needed (new schema)
# Key changes: pipeline → tasks
```

**Breaking Changes**:
- `pipeline` renamed to `tasks` in turbo.json
- New caching behavior (better, but verify)

### 3.2 Tailwind v4 Migration

**Automated Tool Available**:

```bash
# Run official upgrade tool
npx @tailwindcss/upgrade

# Review changes
git diff
```

**Key Changes**:
- `@tailwind` directives → CSS `@import`
- `tailwind.config.js` → CSS-based config
- Default border color now `currentColor`
- Buttons use `cursor: default`

**Scope**: 33 components, 588 className usages

### 3.3 Jest 30 Upgrade

```bash
# Update packages
pnpm update jest jest-environment-jsdom @types/jest ts-jest -r

# Key changes needed:
# - Import types from 'jest' not '@types/jest'
# - Mock API changes
# - Snapshot format updates
```

**Scope**: 74 test files

### 3.4 NestJS 11 Upgrade

```bash
# Update all NestJS packages
pnpm update @nestjs/common @nestjs/core @nestjs/platform-express \
  @nestjs/config @nestjs/jwt @nestjs/passport @nestjs/swagger \
  @nestjs/cli @nestjs/schematics @nestjs/testing -r
```

**New Features Available**:
- Enhanced ConsoleLogger
- ParseDatePipe (useful for our calendar!)
- IntrinsicException (cleaner error handling)

**Scope**: 149 source files, 167 decorators

### 3.5 Patch Updates

```bash
# Safe patch updates
pnpm update @sentry/nestjs @sentry/nextjs @sentry/node @sentry/react \
  @playwright/test prettier husky commitlint -r
```

### 3.6 Verification Checklist

- [ ] `pnpm install` succeeds
- [ ] `pnpm build` succeeds (both apps)
- [ ] `pnpm test:unit` passes (both apps)
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] E2E tests pass
- [ ] Dev servers start correctly

### 3.7 Estimated Effort

| Task | Time |
|------|------|
| Turbo 2.6 | 1-2 hours |
| Tailwind v4 | 4-6 hours |
| Jest 30 | 3-4 hours |
| NestJS 11 | 4-6 hours |
| Patches + Verification | 2 hours |
| **Total** | **~2-2.5 days** |

---

## 4. Category System

### 4.1 Database Schema (Already Exists)

The hierarchical category structure is already in the Prisma schema:

```prisma
model Category {
  id          String     @id @default(uuid())
  userId      String?    // null = system category
  name        String
  icon        String?    // lucide-react icon name
  color       String?    // hex color
  parentId    String?    // hierarchical support
  parent      Category?  @relation("CategoryHierarchy", ...)
  children    Category[] @relation("CategoryHierarchy")
  depth       Int        @default(0)  // max 3 levels, trigger-enforced
  isSystem    Boolean    @default(false)
  isActive    Boolean    @default(true)
}
```

### 4.2 Category Hierarchy Examples

```
Bills (depth: 0)
├── Utilities (depth: 1)
│   ├── Electricity (depth: 2)
│   ├── Water (depth: 2)
│   ├── Gas (depth: 2)
│   └── Internet (depth: 2)
├── Insurance (depth: 1)
│   ├── Health (depth: 2)
│   ├── Car (depth: 2)
│   └── Home (depth: 2)
└── Subscriptions (depth: 1)
    ├── Streaming (depth: 2)
    └── Software (depth: 2)

Food & Dining (depth: 0)
├── Groceries (depth: 1)
├── Restaurants (depth: 1)
├── Coffee Shops (depth: 1)
└── Takeout (depth: 2)
```

### 4.3 Spending Rollup

Parent categories show aggregated spending from all children:

```typescript
// Query: Get category spending with child aggregation
async getCategoryWithSpending(categoryId: string, dateRange: DateRange) {
  const result = await prisma.$queryRaw`
    WITH RECURSIVE category_tree AS (
      SELECT id, name, parent_id, 0 as level
      FROM categories WHERE id = ${categoryId}
      UNION ALL
      SELECT c.id, c.name, c.parent_id, ct.level + 1
      FROM categories c
      JOIN category_tree ct ON c.parent_id = ct.id
      WHERE ct.level < 3
    )
    SELECT
      ${categoryId} as category_id,
      COALESCE(SUM(t.amount), 0) as total_spending,
      COUNT(t.id) as transaction_count
    FROM transactions t
    WHERE t.category_id IN (SELECT id FROM category_tree)
      AND t.date BETWEEN ${dateRange.start} AND ${dateRange.end}
      AND t.flow_type = 'EXPENSE'
  `;
  return result;
}
```

### 4.4 Frontend Components

```
apps/web/src/
├── components/categories/
│   ├── CategoryTree.tsx           # Expandable tree with spending
│   ├── CategoryTreeItem.tsx       # Single node (icon, name, amount)
│   ├── CategoryForm.tsx           # Create/Edit modal
│   ├── CategoryIconPicker.tsx     # Curated icon grid
│   ├── CategoryColorPicker.tsx    # Color presets (6-8 options)
│   └── CategorySpendingBar.tsx    # Visual spending indicator
│
├── hooks/
│   ├── useCategories.ts           # CRUD + tree operations
│   └── useCategorySpending.ts     # Spending with child rollup
│
└── app/dashboard/categories/
    ├── page.tsx                   # Category management
    └── [id]/page.tsx              # Category detail with transactions
```

### 4.5 Icon Picker Design

Use curated groups from lucide-react:

```typescript
const CATEGORY_ICON_GROUPS = {
  'Food & Dining': ['utensils', 'coffee', 'pizza', 'sandwich', 'wine', 'beer'],
  'Transportation': ['car', 'bus', 'train', 'plane', 'bike', 'fuel'],
  'Bills & Utilities': ['receipt', 'zap', 'droplet', 'flame', 'wifi', 'phone'],
  'Shopping': ['shopping-bag', 'shopping-cart', 'shirt', 'gift', 'package'],
  'Health': ['heart', 'pill', 'stethoscope', 'activity', 'thermometer'],
  'Entertainment': ['tv', 'music', 'gamepad-2', 'film', 'ticket', 'party-popper'],
  'Home': ['home', 'sofa', 'lamp', 'wrench', 'hammer', 'paint-bucket'],
  'Finance': ['wallet', 'credit-card', 'banknote', 'piggy-bank', 'trending-up'],
  'Education': ['graduation-cap', 'book', 'pencil', 'library', 'school'],
  'Travel': ['map', 'compass', 'luggage', 'globe', 'palm-tree', 'mountain'],
  'Personal': ['user', 'heart-handshake', 'baby', 'dog', 'scissors'],
  'Work': ['briefcase', 'laptop', 'building', 'presentation', 'calculator'],
};
```

### 4.6 Color Palette

8 preset colors for categories:

```typescript
const CATEGORY_COLORS = [
  { name: 'Red', value: '#EF4444', tailwind: 'bg-red-500' },
  { name: 'Orange', value: '#F97316', tailwind: 'bg-orange-500' },
  { name: 'Yellow', value: '#EAB308', tailwind: 'bg-yellow-500' },
  { name: 'Green', value: '#22C55E', tailwind: 'bg-green-500' },
  { name: 'Blue', value: '#3B82F6', tailwind: 'bg-blue-500' },
  { name: 'Purple', value: '#A855F7', tailwind: 'bg-purple-500' },
  { name: 'Pink', value: '#EC4899', tailwind: 'bg-pink-500' },
  { name: 'Gray', value: '#6B7280', tailwind: 'bg-gray-500' },
];
```

---

## 5. Transaction Management

### 5.1 Transaction Flow Types

Every transaction has a `flowType` that determines how it affects spending calculations:

| Flow Type | Counts as Spending? | When to Use |
|-----------|---------------------|-------------|
| `EXPENSE` | Yes | Normal purchases (pizza, rent, Netflix) |
| `INCOME` | Yes (positive) | Salary, refunds received |
| `TRANSFER` | No | Moving money between own accounts |
| `LIABILITY_PAYMENT` | No | Paying credit card bill, loan payment |
| `REFUND` | Yes (reduces) | Money back from a purchase |

### 5.2 Transfer Detection & Linking

**Scenario: PayPal funded by Credit Card to buy pizza**

```
User pays $10 pizza via PayPal (PayPal has $0, uses CC)

Transactions created:
┌─────────────────────────────────────────────────────────────────┐
│ PayPal: -$10 Pizza                                              │
│ ├── flowType: EXPENSE ✅                                        │
│ ├── countsAsSpending: true                                      │
│ └── This is the ACTUAL expense                                  │
├─────────────────────────────────────────────────────────────────┤
│ Credit Card: -$10 PayPal                                        │
│ ├── flowType: TRANSFER (or LIABILITY_CHARGE)                    │
│ ├── countsAsSpending: false                                     │
│ └── This FUNDS the expense, doesn't count again                 │
├─────────────────────────────────────────────────────────────────┤
│ Bank (next month): -$10 CC Payment                              │
│ ├── flowType: LIABILITY_PAYMENT                                 │
│ ├── countsAsSpending: false                                     │
│ └── This PAYS the CC balance, already counted                   │
└─────────────────────────────────────────────────────────────────┘

Total Spending: $10 (only the pizza)
```

**Scenario: PayPal Pay-in-3 ($90 purchase)**

```
User buys $90 item with Pay-in-3

T+0: Purchase
┌─────────────────────────────────────────────────────────────────┐
│ PayPal: -$90 Electronics Store                                  │
│ ├── flowType: EXPENSE ✅                                        │
│ ├── countsAsSpending: true                                      │
│ └── Creates Liability: $90 BNPL, 3 installments                 │
├─────────────────────────────────────────────────────────────────┤
│ Bank: -$30 PayPal Pay-in-3 (1st installment)                    │
│ ├── flowType: LIABILITY_PAYMENT                                 │
│ ├── countsAsSpending: false                                     │
│ └── Pays installment #1, linked to liability                    │
└─────────────────────────────────────────────────────────────────┘

T+30, T+60: Same pattern for installments 2 & 3

Total Spending at T+0: $90 (counted once at purchase)
Cash Flow: -$30/month for 3 months
```

### 5.3 Transfer Group Linking

```typescript
// When user marks transactions as a transfer
interface TransferGroup {
  id: string; // UUID
  transactions: Transaction[];
}

// All transactions in group share same transferGroupId
// transferRole indicates SOURCE or DESTINATION
```

### 5.4 Frontend Components

```
apps/web/src/
├── components/transactions/
│   ├── TransactionList.tsx        # Enhanced list with filters
│   ├── TransactionListItem.tsx    # Row with quick actions
│   ├── TransactionForm.tsx        # Create/Edit modal
│   ├── TransactionFilters.tsx     # Search, date, category, account, type
│   ├── TransactionDetail.tsx      # Full detail drawer/modal
│   ├── TransferLinkModal.tsx      # Link transactions as transfer
│   ├── FlowTypeSelector.tsx       # Change transaction classification
│   └── BulkActionBar.tsx          # Multi-select actions
│
├── hooks/
│   ├── useTransactions.ts         # List with pagination
│   ├── useTransactionMutations.ts # CRUD operations
│   └── useTransferDetection.ts    # Find potential transfer matches
│
└── app/dashboard/transactions/
    ├── page.tsx                   # Main transactions page
    └── [id]/page.tsx              # Transaction detail page
```

### 5.5 Transaction Form Fields

**Create/Edit Form:**

| Field | Required | Notes |
|-------|----------|-------|
| Amount | Yes | Positive number, type determines sign |
| Type | Yes | DEBIT (expense) or CREDIT (income) |
| Date | Yes | Default: today |
| Account | Yes | Dropdown of user's accounts |
| Description | Yes | Free text |
| Category | No | Tree selector with icons |
| Merchant | No | Autocomplete from history |
| Notes | No | Personal notes |
| Flow Type | Auto | Auto-detected, can override |

**Constraints:**
- SaltEdge-synced transactions: Only category, notes, flowType editable
- Manual transactions: All fields editable
- Transfers: Cannot change individual amounts (must match)

### 5.6 Auto-Detection Rules

```typescript
const DETECTION_RULES = {
  // HIGH CONFIDENCE (>90%) - Auto-apply
  highConfidence: [
    {
      name: 'Internal Transfer',
      pattern: /transfer (to|from)/i,
      matchOwnAccounts: true,
      flowType: 'TRANSFER',
    },
    {
      name: 'CC Bill Payment',
      matchesCCBalance: true, // within 5% tolerance
      fromBankAccount: true,
      flowType: 'LIABILITY_PAYMENT',
    },
  ],

  // MEDIUM CONFIDENCE (50-90%) - Suggest to user
  mediumConfidence: [
    {
      name: 'PayPal/Venmo Transfer',
      pattern: /^(paypal|venmo|zelle)/i,
      flowType: 'TRANSFER',
    },
    {
      name: 'BNPL Payment',
      pattern: /pay.?in.?3|klarna|afterpay|affirm/i,
      flowType: 'LIABILITY_PAYMENT',
    },
  ],

  // LOW CONFIDENCE (<50%) - No action, user decides
};
```

---

## 6. Account Details Page

### 6.1 Current State

- `AccountDetails.tsx` component exists
- `AccountList.tsx` exists for grid view
- Route `/dashboard/accounts/[id]` does NOT exist
- Backend endpoints fully implemented

### 6.2 Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Accounts                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ SECTION 1: Account Header                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Bank Logo]  Chase Checking                                 │ │
│ │              ****4242 • Connected Nov 15                    │ │
│ │                                                              │ │
│ │ $3,450.00                          [↻ Sync] [⚙ Settings]   │ │
│ │ Available Balance                                           │ │
│ │                                                              │ │
│ │ Last synced: 2 hours ago                                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ SECTION 2: Quick Stats (This Month)                             │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│ │   Income     │ │  Expenses    │ │    Net       │             │
│ │  +$4,200     │ │  -$2,890     │ │  +$1,310     │             │
│ │  ↑12% vs LM  │ │  ↓5% vs LM   │ │              │             │
│ └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                  │
│ SECTION 3: Recent Transactions                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Search...] [Date ▼] [Category ▼] [Type ▼]                  │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ Today                                                        │ │
│ │ ├── 🍕 Pizza Hut          Food & Dining      -$24.50       │ │
│ │ └── 💳 Amazon             Shopping           -$89.99       │ │
│ │                                                              │ │
│ │ Yesterday                                                    │ │
│ │ ├── 💰 Payroll Deposit    Income           +$2,100.00      │ │
│ │ └── ⚡ Electric Company   Bills             -$145.00       │ │
│ │                                                              │ │
│ │ [Load More...]                                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ SECTION 4: Account Actions                                      │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [✏️ Rename Account] [🔗 Reconnect] [🗑️ Disconnect]         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Components

```
apps/web/src/
├── components/accounts/
│   ├── AccountHeader.tsx          # Logo, name, balance, sync
│   ├── AccountStats.tsx           # Monthly income/expenses/net
│   ├── AccountTransactions.tsx    # Filtered transaction list
│   ├── AccountActions.tsx         # Rename, reconnect, disconnect
│   └── AccountSyncStatus.tsx      # Sync state indicator
│
└── app/dashboard/accounts/
    ├── page.tsx                   # Existing list view
    └── [id]/page.tsx              # NEW: Account details
```

### 6.4 Data Flow

```typescript
// app/dashboard/accounts/[id]/page.tsx

export default async function AccountDetailPage({ params }: { params: { id: string } }) {
  // 1. Fetch account details
  const account = await getAccount(params.id);

  // 2. Fetch recent transactions (paginated)
  const transactions = await getTransactions({
    accountId: params.id,
    limit: 20
  });

  // 3. Calculate stats
  const stats = await getAccountStats(params.id);

  return (
    <div>
      <AccountHeader account={account} />
      <AccountStats stats={stats} />
      <AccountTransactions
        accountId={params.id}
        initialTransactions={transactions}
      />
      <AccountActions account={account} />
    </div>
  );
}
```

---

## 7. Financial Model

### 7.1 Core Concepts

```
┌─────────────────────────────────────────────────────────────────┐
│                    MoneyWise Financial Model                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ACCOUNTS (What I Have/Owe)                                     │
│  ├── ASSET accounts: Bank, Savings, Wallet                      │
│  │   └── Positive balance = money available                     │
│  └── LIABILITY accounts: Credit Card, Loan                      │
│      └── Balance = money owed (displayed as "Owed")             │
│                                                                  │
│  TRANSACTIONS (What Happened)                                   │
│  ├── Each has flowType determining spending impact              │
│  └── Can link to liabilities (creates or pays)                  │
│                                                                  │
│  LIABILITIES (What I Owe - Detailed)                            │
│  ├── Credit Card cycles (monthly balance)                       │
│  ├── BNPL (PayPal Pay-in-3, Klarna, etc.)                       │
│  └── Each has due dates and payment tracking                    │
│                                                                  │
│  SCHEDULED TRANSACTIONS (What Will Happen)                      │
│  ├── Auto-generated from liabilities                            │
│  ├── Recurring bills                                            │
│  └── User-created expected transactions                         │
│                                                                  │
│  KEY METRICS:                                                   │
│  ├── Net Worth = Assets - Liabilities                           │
│  ├── Available = Bank Balance - Upcoming Debits - CC Minimums   │
│  ├── Spending = Transactions WHERE flowType = EXPENSE           │
│  └── Cash Flow = Actual money movement over time                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Account Balance Normalization

Since providers report balances inconsistently:

```typescript
// Normalize all balances to our standard
interface NormalizedBalance {
  // Our standard representation
  currentBalance: Decimal;    // For assets: positive = have money
                              // For liabilities: positive = owe money

  // Display helpers
  displayAmount: Decimal;     // Always positive
  displayLabel: 'Available' | 'Owed';
  affectsNetWorth: 'positive' | 'negative';
}

// Credit card example:
// Provider says: balance = 500 (or -500 depending on bank)
// We normalize to: currentBalance = 500 (owed)
// Display: "Owed: $500.00"
// Net Worth impact: -$500
```

### 7.3 Credit Card Billing Cycle

```
Account: Chase Visa
├── billingCycleDay: 15    (statement closes on 15th)
├── paymentDueDay: 5       (payment due on 5th of next month)
├── currentBalance: 1,250  (current statement balance)
├── minimumPaymentPercent: 2%
└── autopayEnabled: true
    └── autopayAccountId: -> Chase Checking

Liability Created:
├── type: CREDIT_CARD_CYCLE
├── name: "Chase Visa - Dec 2025"
├── originalAmount: 1,250
├── dueDate: Jan 5, 2026
├── billingCycleStart: Nov 15
├── billingCycleEnd: Dec 15
└── status: ACTIVE

Scheduled Transaction Created:
├── description: "Chase Visa Payment"
├── amount: 1,250 (or minimum payment)
├── accountId: -> Chase Checking
├── expectedDate: Jan 5, 2026
├── liabilityId: -> linked liability
└── status: PENDING
```

### 7.4 BNPL (Buy Now Pay Later)

```
PayPal Pay-in-3 Purchase:
├── Purchase: $90 Electronics
├── Installments: 3 monthly @ $30

Liability:
├── type: BNPL
├── name: "PayPal Pay-in-3 - Electronics Store"
├── originalAmount: 90
├── currentBalance: 60 (after 1st payment)
└── installmentPlan:
    ├── totalInstallments: 3
    ├── installmentAmount: 30
    └── installments:
        ├── #1: Dec 3, $30, PAID
        ├── #2: Jan 3, $30, UPCOMING
        └── #3: Feb 3, $30, UPCOMING

Scheduled Transactions:
├── Jan 3: PayPal Pay-in-3 $30 (installment #2)
└── Feb 3: PayPal Pay-in-3 $30 (installment #3)
```

---

## 8. Scheduled Transactions & Calendar

### 8.1 Scheduled Transaction Sources

| Source | Auto-Created? | Examples |
|--------|---------------|----------|
| `LIABILITY_PAYMENT` | Yes | CC due dates, loan payments |
| `INSTALLMENT` | Yes | BNPL installments |
| `RECURRING` | Yes (learned) | Netflix, rent, salary |
| `MANUAL` | No | User-created expectations |
| `AUTO_DETECTED` | Yes | AI-suggested patterns |

### 8.2 Financial Calendar (Monthly View)

```
┌─────────────────────────────────────────────────────────────────┐
│          ◀  December 2025  ▶                                    │
├─────────────────────────────────────────────────────────────────┤
│  Sun    Mon    Tue    Wed    Thu    Fri    Sat                  │
├─────────────────────────────────────────────────────────────────┤
│   1      2      3      4      5      6      7                   │
│                [PP]                                              │
│                $30                                               │
├─────────────────────────────────────────────────────────────────┤
│   8      9     10     11     12     13     14                   │
│                             [Net]                                │
│                             $15                                  │
├─────────────────────────────────────────────────────────────────┤
│  15     16     17     18     19     20     21                   │
│ [CC]                                      [Rent]                │
│ $500                                      $1,800                │
├─────────────────────────────────────────────────────────────────┤
│  22     23     24     25     26     27     28                   │
│         [Sal]                                                    │
│        +$4,200                                                   │
├─────────────────────────────────────────────────────────────────┤
│  29     30     31                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Legend: [PP]=PayPal, [CC]=Credit Card, [Net]=Netflix, [Sal]=Salary

Monthly Summary:
┌──────────────┬──────────────┬──────────────┐
│  Total Due   │   Expected   │  Net Flow    │
│   -$2,345    │  Income      │   +$1,855    │
│              │   +$4,200    │              │
└──────────────┴──────────────┴──────────────┘
```

### 8.3 Calendar Event Types

| Type | Color | Icon | Description |
|------|-------|------|-------------|
| `BILL_DUE` | Red | receipt | Regular bill payment |
| `INSTALLMENT` | Orange | calendar-check | BNPL installment |
| `CREDIT_CARD` | Purple | credit-card | CC payment due |
| `INCOME` | Green | wallet | Expected income |
| `RECURRING` | Blue | repeat | Recurring expense |

### 8.4 Calendar Components

```
apps/web/src/
├── components/calendar/
│   ├── FinancialCalendar.tsx      # Main monthly grid
│   ├── CalendarDay.tsx            # Day cell with events
│   ├── CalendarEvent.tsx          # Event chip
│   ├── CalendarEventModal.tsx     # Event detail/edit
│   ├── CalendarSummary.tsx        # Monthly totals
│   └── CalendarNavigation.tsx     # Month nav + today button
│
├── hooks/
│   ├── useCalendarEvents.ts       # Fetch events for month
│   └── useScheduledTransactions.ts
│
└── app/dashboard/calendar/
    └── page.tsx                   # Calendar view
```

---

## 9. User Settings & Preferences

### 9.1 Settings Overview

User settings are critical for personalization and proper financial calculations.

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Settings                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PROFILE                                                        │
│  ├── Display Name                                               │
│  ├── Email (with verification status)                           │
│  ├── Phone (optional, for 2FA)                                  │
│  └── Avatar                                                     │
│                                                                  │
│  PREFERENCES                                                    │
│  ├── Timezone (affects all date/time displays)                  │
│  ├── Currency (default for manual transactions)                 │
│  ├── Date Format (DD/MM/YYYY vs MM/DD/YYYY)                     │
│  ├── Week Start (Sunday vs Monday)                              │
│  └── Number Format (1,000.00 vs 1.000,00)                       │
│                                                                  │
│  NOTIFICATIONS                                                  │
│  ├── Email Notifications (on/off + frequency)                   │
│  ├── Push Notifications (on/off)                                │
│  ├── In-App Notifications (always on)                           │
│  └── Reminder Days Before Due (default: 3 days)                 │
│                                                                  │
│  SECURITY                                                       │
│  ├── Change Password                                            │
│  ├── Two-Factor Authentication                                  │
│  └── Active Sessions                                            │
│                                                                  │
│  DATA                                                           │
│  ├── Export My Data                                             │
│  └── Delete Account                                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Timezone Handling

**Decision**: Timezone is captured from user settings and applied application-wide.

```typescript
// User preference stored in database
interface UserPreferences {
  timezone: string;           // e.g., "Europe/Rome", "America/New_York"
  currency: string;           // e.g., "EUR", "USD"
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  weekStartsOn: 0 | 1;        // 0 = Sunday, 1 = Monday
  locale: string;             // e.g., "it-IT", "en-US"
}

// Server-side: Store all dates in UTC
// Client-side: Convert to user's timezone for display
// Scheduled transactions: Store expectedDate in UTC, display in user timezone
```

### 9.3 Settings Schema Addition

```prisma
model UserPreferences {
  id                    String   @id @default(uuid()) @db.Uuid
  userId                String   @unique @map("user_id") @db.Uuid
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Display preferences
  timezone              String   @default("UTC")
  currency              String   @default("EUR") @db.VarChar(3)
  dateFormat            String   @default("DD/MM/YYYY") @map("date_format")
  weekStartsOn          Int      @default(1) @map("week_starts_on") // 0=Sun, 1=Mon
  locale                String   @default("en-US")

  // Notification preferences
  emailNotifications    Boolean  @default(true) @map("email_notifications")
  emailDigestFrequency  String   @default("daily") @map("email_digest_frequency") // daily, weekly, never
  pushNotifications     Boolean  @default(true) @map("push_notifications")
  reminderDaysBefore    Int      @default(3) @map("reminder_days_before")

  createdAt             DateTime @default(now()) @map("created_at")
  updatedAt             DateTime @updatedAt @map("updated_at")

  @@map("user_preferences")
}
```

### 9.4 Settings Page Components

```
apps/web/src/
├── app/dashboard/settings/
│   ├── page.tsx                   # Settings overview
│   ├── profile/page.tsx           # Profile settings
│   ├── preferences/page.tsx       # App preferences
│   ├── notifications/page.tsx     # Notification settings
│   ├── security/page.tsx          # Security settings
│   └── data/page.tsx              # Data export/delete
│
└── components/settings/
    ├── ProfileForm.tsx
    ├── PreferencesForm.tsx
    ├── NotificationSettings.tsx
    ├── SecuritySettings.tsx
    ├── TimezoneSelector.tsx       # Searchable timezone dropdown
    ├── CurrencySelector.tsx
    └── DataManagement.tsx
```

---

## 10. Notification System

### 10.1 Notification Types

| Type | Trigger | Channels |
|------|---------|----------|
| Payment Due Soon | X days before due date | Email, Push, In-App |
| Payment Overdue | Day after due date | Email, Push, In-App |
| Account Sync Failed | Sync error | In-App |
| Low Balance Alert | Balance below threshold | Push, In-App |
| Budget Alert | 80%/100% of budget spent | Push, In-App |
| New Transaction | Large transaction detected | In-App |
| Weekly Summary | Every Sunday/Monday | Email |

### 10.2 Email Infrastructure

**Provider**: Resend (recommended) or SendGrid

**Email Types**:
1. **Transactional Emails** (Required for MVP)
   - Email verification on registration
   - Password reset
   - Payment due reminders
   - Payment overdue alerts

2. **Digest Emails** (Optional for MVP)
   - Daily summary
   - Weekly summary

```typescript
// Email templates needed
const EMAIL_TEMPLATES = {
  // Auth
  'email-verification': 'Verify your MoneyWise email',
  'password-reset': 'Reset your password',
  'password-changed': 'Your password was changed',

  // Payments
  'payment-due-reminder': 'Payment due in {days} days: {liability}',
  'payment-overdue': 'Overdue: {liability} was due on {date}',

  // Summaries (v1.1)
  'daily-summary': 'Your daily financial summary',
  'weekly-summary': 'Your weekly financial summary',
};
```

### 10.3 Push Notifications

**Web Push** (Service Worker + Web Push API):
- Browser permission request on first login
- Store subscription in database
- Send via web-push library

**Mobile Push** (v1.1 - React Native):
- Firebase Cloud Messaging (FCM)
- Apple Push Notification Service (APNS)

### 10.4 In-App Notifications

```typescript
// Notification model
interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;  // e.g., { liabilityId: '...' }
  actionUrl?: string;          // e.g., '/dashboard/liabilities/123'
  isRead: boolean;
  createdAt: Date;
}

// UI Component
// Bell icon in header with unread count badge
// Dropdown showing recent notifications
// "Mark all as read" action
// Link to full notification history
```

### 10.5 Notification Schema

```prisma
model Notification {
  id          String           @id @default(uuid()) @db.Uuid
  userId      String           @map("user_id") @db.Uuid
  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  type        NotificationType
  title       String
  message     String
  data        Json?            @default("{}")
  actionUrl   String?          @map("action_url")

  isRead      Boolean          @default(false) @map("is_read")
  readAt      DateTime?        @map("read_at")

  // For scheduled notifications
  scheduledFor DateTime?       @map("scheduled_for")
  sentAt       DateTime?       @map("sent_at")

  createdAt   DateTime         @default(now()) @map("created_at")

  @@map("notifications")
  @@index([userId, isRead])
  @@index([userId, createdAt])
}

enum NotificationType {
  PAYMENT_DUE_SOON
  PAYMENT_OVERDUE
  SYNC_FAILED
  LOW_BALANCE
  BUDGET_WARNING
  BUDGET_EXCEEDED
  LARGE_TRANSACTION
  WEEKLY_SUMMARY
  SYSTEM
}

model PushSubscription {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  endpoint    String   @unique
  p256dh      String   // Public key
  auth        String   // Auth secret

  userAgent   String?  @map("user_agent")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("push_subscriptions")
  @@index([userId])
}
```

### 10.6 Notification Components

```
apps/web/src/
├── components/notifications/
│   ├── NotificationBell.tsx       # Header bell with badge
│   ├── NotificationDropdown.tsx   # Recent notifications
│   ├── NotificationItem.tsx       # Single notification row
│   ├── NotificationList.tsx       # Full notification history
│   └── NotificationEmpty.tsx      # Empty state
│
├── hooks/
│   ├── useNotifications.ts        # Fetch + real-time updates
│   └── usePushSubscription.ts     # Manage push subscription
│
└── services/
    ├── notifications.client.ts    # API client
    └── push.service.ts            # Push subscription management
```

---

## 11. Frontend UX & Navigation

### 11.1 Current Navigation Structure

```
Dashboard
├── Overview (/)
├── Accounts (/accounts)
├── Transactions (/transactions)
├── Planning
│   ├── Budgets (/budgets)
│   ├── Goals (/goals) [placeholder]
│   └── Calendar (/calendar) [NEW]
├── Investments (/investments) [placeholder]
├── Analytics (/analytics)
└── Settings (/settings) [placeholder]
```

### 11.2 Proposed Navigation Improvements

```
Dashboard (main financial snapshot)
│
├── 💰 Accounts
│   ├── All Accounts (list/grid view)
│   └── [Account Detail] (individual account)
│
├── 📝 Transactions
│   ├── All Transactions (filterable list)
│   ├── Transfers (internal movements)
│   └── [Transaction Detail]
│
├── 🏷️ Categories
│   ├── Category Tree (manage hierarchy)
│   └── [Category Detail] (transactions in category)
│
├── 📊 Planning
│   ├── Budgets (spending limits by category)
│   ├── Calendar (upcoming payments)
│   └── Liabilities (what you owe)
│
├── 📈 Analytics
│   ├── Spending Trends
│   ├── Income vs Expenses
│   └── Net Worth History
│
└── ⚙️ Settings
    ├── Profile
    ├── Notifications
    ├── Linked Accounts
    └── Preferences
```

### 11.3 Quick Actions (Dashboard)

Prominently displayed actions:

| Action | Icon | Route |
|--------|------|-------|
| Add Transaction | plus-circle | Opens TransactionForm modal |
| Link Account | link | Opens SaltEdge flow |
| Set Budget | target | /budgets/new |
| View Calendar | calendar | /calendar |

### 11.4 Contextual Navigation

**From Transaction List:**
- Click category → Go to category detail
- Click account → Go to account detail
- Click merchant → Filter by merchant

**From Account Detail:**
- Click transaction → Go to transaction detail
- Click category chip → Go to category detail

**From Category Tree:**
- Click category spending → See transactions in that category
- Click subcategory → Expand/collapse or navigate

### 11.5 Breadcrumb Pattern

```
Dashboard > Accounts > Chase Checking

Dashboard > Transactions > [Transaction ID]

Dashboard > Categories > Bills > Utilities
```

---

## 12. Visual Style Guide

### 12.1 Design System

**Framework:** Tailwind CSS + shadcn/ui components
**Icons:** lucide-react
**Charts:** recharts (already installed)

### 12.2 Color Palette

**Primary Colors:**
```css
--primary: #3B82F6;     /* Blue - primary actions */
--primary-dark: #2563EB;
--primary-light: #60A5FA;
```

**Semantic Colors:**
```css
--success: #22C55E;     /* Green - income, positive */
--warning: #F59E0B;     /* Amber - due soon */
--danger: #EF4444;      /* Red - expenses, overdue, negative */
--info: #3B82F6;        /* Blue - informational */
```

**Background:**
```css
--bg-primary: #FFFFFF;
--bg-secondary: #F9FAFB;
--bg-tertiary: #F3F4F6;
--bg-dark: #111827;     /* Dark mode */
```

### 12.3 Typography

```css
/* Headings */
h1: text-2xl font-bold (24px)
h2: text-xl font-semibold (20px)
h3: text-lg font-medium (18px)

/* Body */
body: text-base (16px)
small: text-sm (14px)
caption: text-xs (12px)

/* Numbers/Money */
.amount-large: text-3xl font-bold tabular-nums
.amount-medium: text-xl font-semibold tabular-nums
.amount-small: text-base font-medium tabular-nums
```

### 12.4 Component Patterns

**Cards:**
```tsx
<Card className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
  <CardHeader />
  <CardContent />
  <CardFooter />
</Card>
```

**Transaction Row:**
```tsx
<div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
  {/* Left: Icon + Details */}
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-full bg-category-color flex items-center justify-center">
      <CategoryIcon />
    </div>
    <div>
      <p className="font-medium">{description}</p>
      <p className="text-sm text-muted-foreground">{category} • {account}</p>
    </div>
  </div>

  {/* Right: Amount */}
  <span className={cn(
    "font-semibold tabular-nums",
    type === 'DEBIT' ? 'text-red-600' : 'text-green-600'
  )}>
    {type === 'DEBIT' ? '-' : '+'}{formatCurrency(amount)}
  </span>
</div>
```

**Stat Card:**
```tsx
<Card className="p-4">
  <p className="text-sm text-muted-foreground">{label}</p>
  <p className="text-2xl font-bold">{formatCurrency(value)}</p>
  {trend && (
    <p className={cn("text-sm", trend > 0 ? "text-green-600" : "text-red-600")}>
      {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last month
    </p>
  )}
</Card>
```

### 12.5 Amount Display Conventions

| Context | Positive | Negative | Zero |
|---------|----------|----------|------|
| Transaction list | +$100.00 (green) | -$50.00 (red) | $0.00 (gray) |
| Balance (asset) | $1,234.56 (default) | -$50.00 (red, overdrawn) | $0.00 |
| Balance (liability) | Owed: $500.00 (amber) | Paid off! (green) | $0.00 (green) |
| Net worth | $50,000 (green) | -$5,000 (red) | $0.00 |

### 12.6 Loading States

```tsx
// Skeleton for transaction row
<div className="flex items-center gap-3 p-3 animate-pulse">
  <div className="w-10 h-10 rounded-full bg-gray-200" />
  <div className="flex-1 space-y-2">
    <div className="h-4 bg-gray-200 rounded w-3/4" />
    <div className="h-3 bg-gray-200 rounded w-1/2" />
  </div>
  <div className="h-5 bg-gray-200 rounded w-20" />
</div>
```

### 12.7 Empty States

Each list view should have a meaningful empty state:

```tsx
<EmptyState
  icon={<WalletIcon className="w-12 h-12 text-gray-400" />}
  title="No transactions yet"
  description="Link a bank account or add a transaction manually to get started."
  action={
    <Button>
      <PlusIcon className="w-4 h-4 mr-2" />
      Add Transaction
    </Button>
  }
/>
```

---

## 13. Schema Changes

### 13.1 New/Modified Models Summary

| Model | Status | Changes |
|-------|--------|---------|
| Account | Modify | Add `accountNature`, `billingCycleDay`, `paymentDueDay`, balance normalization fields |
| Transaction | Modify | Add `flowType`, `transferGroupId`, `transferRole`, liability links |
| Category | Exists | No changes (hierarchy already supported) |
| Liability | New | Credit card cycles, BNPL, loans |
| InstallmentPlan | New | For BNPL installment tracking |
| Installment | New | Individual installment records |
| ScheduledTransaction | New | Expected future transactions |
| RecurrenceRule | New | For recurring transaction patterns |

### 13.2 BNPL Providers Supported

```typescript
enum BNPLProvider {
  // PayPal family
  PAYPAL_PAY_IN_3 = 'PAYPAL_PAY_IN_3',
  PAYPAL_PAY_IN_6 = 'PAYPAL_PAY_IN_6',
  PAYPAL_PAY_IN_12 = 'PAYPAL_PAY_IN_12',
  PAYPAL_PAY_IN_24 = 'PAYPAL_PAY_IN_24',

  // Other providers
  KLARNA = 'KLARNA',
  AFTERPAY = 'AFTERPAY',
  SATISPAY = 'SATISPAY',
  AFFIRM = 'AFFIRM',

  // Extensible
  OTHER = 'OTHER',
}

// Detection patterns
const BNPL_DETECTION_PATTERNS = {
  PAYPAL_PAY_IN_3: /pay\s*in\s*3/i,
  PAYPAL_PAY_IN_6: /pay\s*in\s*6/i,
  PAYPAL_PAY_IN_12: /pay\s*in\s*12/i,
  PAYPAL_PAY_IN_24: /pay\s*in\s*24/i,
  KLARNA: /klarna/i,
  AFTERPAY: /afterpay|after\s*pay/i,
  SATISPAY: /satispay/i,
  AFFIRM: /affirm/i,
};
```

### 13.3 Full Schema

See [Appendix A: Complete Prisma Schema](#appendix-a-complete-prisma-schema) for the full schema definition.

---

## 14. Implementation Phases

### Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                    COMPLETE TIMELINE (~27.5 days)                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  WAVE 0: Foundation (2.5 days) - BLOCKING                            │
│  └── Phase -1: Dependency Upgrades                                    │
│                                                                       │
│  WAVE 1: Schema (2 days) - BLOCKING                                   │
│  └── Phase 0: Database Schema                                         │
│                                                                       │
│  WAVE 2: Features (10 days) - PARALLEL                               │
│  ├── Phase 1: Categories (2 days)                                     │
│  ├── Phase 2: Transactions (3 days)                                   │
│  ├── Phase 4: Liabilities (3 days)                                    │
│  └── Phase 7: Settings (2 days)                                       │
│                                                                       │
│  WAVE 3: Dependent Features (7 days) - PARALLEL                      │
│  ├── Phase 3: Account Details (2 days)                                │
│  ├── Phase 5: Scheduled Transactions (2 days)                         │
│  └── Phase 8: Notifications (3 days)                                  │
│                                                                       │
│  WAVE 4: Integration (4 days)                                         │
│  ├── Phase 6: Financial Calendar (2 days)                             │
│  └── Phase 9: Dashboard (2 days)                                      │
│                                                                       │
│  WAVE 5: Polish (2 days)                                              │
│  └── Phase 10: Testing & Polish                                       │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

---

### Phase -1: Foundation Upgrade (2.5 days) ⚡ WAVE 0 ✅ COMPLETE

**Branch**: `feature/phase-1-foundation-upgrade`
**PR**: #231 (Merged December 3, 2025)

| Task | Time | Status |
|------|------|--------|
| Turbo 1.13 → 2.6 | 1-2 hours | [x] |
| Tailwind v3 → v4 | 4-6 hours | [x] |
| Jest 29 → 30 | 3-4 hours | [x] |
| NestJS 10 → 11 | 4-6 hours | [x] |
| Expo 51 → 52 | 1 hour | [x] |
| pnpm 9.x → 10.24 | 30 min | [x] |
| Patch updates | 2 hours | [x] |
| Verification | 2 hours | [x] |

**Verification Checklist:**
- [x] `pnpm install` succeeds
- [x] `pnpm build` succeeds (both apps)
- [x] `pnpm test:unit` passes (both apps) - 2302 tests total
- [x] `pnpm lint` passes
- [x] `pnpm typecheck` passes
- [x] E2E tests pass
- [x] Dev servers start correctly

**Key Migrations Completed:**
- Tailwind CSS v4: Migrated to CSS-based configuration (@import "tailwindcss")
- Jest 30: Updated --testPathPattern → --testPathPatterns
- NestJS 11: Fixed JWT expiresIn type compatibility (StringValue from ms package)
- Removed unused autoprefixer dependency (integrated in @tailwindcss/postcss)

---

### Phase 0: Schema & Foundation (2 days) ⚡ WAVE 1 ✅ COMPLETE

**Branch**: `feature/phase-0-schema`
**PR**: #237 (Merged December 5, 2025)

- [x] Add new Prisma models (Liability, InstallmentPlan, Installment, ScheduledTransaction, RecurrenceRule)
- [x] Add UserPreferences, Notification, PushSubscription models
- [x] Add FlowType enum, transferGroupId, transferRole to Transaction
- [x] Run migration (20250604_add_financial_models)
- [x] Create BalanceNormalizerService
- [x] Account lifecycle management (HIDDEN status, soft delete)
- [x] Seed system categories (47 categories across 12 top-level groups)
- [x] OAuth Popup Modal for SaltEdge re-linking

**Key Deliverables:**
- Complete financial model schema for liabilities, scheduled transactions, notifications
- Category seed with icons and colors for all default categories
- Account deletion eligibility with transfer integrity validation

---

### Phase 1: Category System ENHANCED (4 days) 🔀 WAVE 2 ✅ COMPLETE

**Branch**: `feature/phase-1-categories-enhanced`
**PR**: #275, #278 (Merged December 12-13, 2025)
**Strategy Doc**: `docs/planning/category-strategy.md`

- [x] Category seeding (47 categories with icons/colors)
- [x] CategorySelector component (for transaction forms)
- [x] Categories client API with full CRUD
- [x] Backend CategoriesController with CRUD operations
- [x] `/dashboard/categories` management page
- [x] CategoryTree component (collapsible hierarchy)
- [x] CategoryForm modal (name, type, parent, icon, color)
- [x] IconPicker component (curated Lucide preset ~50 icons)
- [x] ColorPicker component (preset palette)
- [x] Spending rollup queries (recursive CTE backend)
- [x] CategorySpendingSummary component with date range filtering
- [x] Specification Pattern for business rule validation
- [x] Schema migration: removed TRANSFER from CategoryType

---

### Phase 2: Transaction Enhancement (3 days) 🔀 WAVE 2 ✅ COMPLETE

**Branch**: `feature/phase-2-transactions`
**PR**: #238 (Merged December 6, 2025)

- [x] FlowType integration in transaction model
- [x] TransactionForm (create/edit) with full validation
- [x] TransactionFormModal wrapper component
- [x] EnhancedTransactionList with filtering, search, pagination
- [x] TransactionRow with inline edit/delete actions
- [x] CategorySelector dropdown with icons/colors
- [x] BulkActionsBar for multi-select operations
- [x] RecategorizeDialog for bulk categorization
- [x] DeleteConfirmDialog for safe deletions
- [x] QuickAddTransaction for dashboard
- [x] Zustand transactions.store with optimistic updates
- [x] CSV export with ISO + localized dates
- [x] Command Palette (Cmd+K) for quick navigation

---

### Phase 3: Account Details (2 days) 🔀 WAVE 3 ✅ COMPLETE

**Branch**: `feature/phase-2-transactions` (included in Phase 2 PR)
**PR**: #238 (Merged December 6, 2025)

- [x] Created `/dashboard/accounts/[id]` route
- [x] Account header with balance display
- [x] Filtered transaction list for specific account
- [x] Back navigation and error handling
- [x] 404 handling for invalid account IDs

---

### Phase 4: Liability System (3 days) 🔀 WAVE 2 ✅ COMPLETE

**Branch**: `feature/phase-4-liabilities`
**PR**: #239 (Merged December 7, 2025)

- [x] LiabilitiesModule with CRUD operations
- [x] LiabilitiesService with family-based authorization
- [x] LiabilitiesController with Swagger documentation
- [x] InstallmentPlan management with auto-generation
- [x] BNPL detection (10 providers: PayPal Pay-in-3/4/6/12/24, Klarna, Afterpay, Affirm, Clearpay, Satispay)
- [x] Cross-field DTO validation (credit card requires creditLimit, etc.)
- [x] Pagination support for findAll
- [x] Optimistic locking for markInstallmentPaid
- [x] Frontend: LiabilityCard, LiabilityList, LiabilityForm, InstallmentTimeline
- [x] Frontend: UpcomingPayments dashboard widget
- [x] Frontend: Liabilities page and detail page
- [x] Unit tests: 47 tests (34 service + 13 controller)

---

### Phase 5: Scheduled Transactions (2 days) 🔀 WAVE 3 ✅ COMPLETE

**Branch**: `feature/phase-5-scheduled`
**PR**: #240 (Merged December 7, 2025)
**Depends on**: Phase 4 (Liabilities) ✅

- [x] ScheduledModule with CRUD operations and family-based authorization
- [x] RecurrenceService for calculating next occurrences (daily/weekly/monthly/yearly/once)
- [x] Calendar events endpoint for Phase 6 integration
- [x] Auto-generate scheduled transactions from liabilities
- [x] Skip and complete functionality
- [x] Frontend: ScheduledTransactionCard, List, Form components
- [x] Frontend: RecurrenceSelector for user-friendly pattern building
- [x] Frontend: UpcomingScheduled dashboard widget
- [x] Scheduled transactions page at `/dashboard/scheduled`
- [x] Unit tests: 73 tests (recurrence, service, controller)
- [x] Integration tests: 22 API tests

---

### Phase 6: Financial Calendar (2 days) 🔀 WAVE 4

**Branch**: `feature/phase-6-calendar`
**Depends on**: Phase 5 (Scheduled)

- [ ] FinancialCalendar component (monthly view)
- [ ] Show ALL event types: income, expenses, bills, installments, recurring
- [ ] Calendar API endpoint
- [ ] Event detail modal
- [ ] Monthly summary (due, income, net flow)

---

### Phase 7: User Settings & Preferences (2 days) 🔀 WAVE 2

**Branch**: `feature/phase-7-settings`

- [ ] Settings page structure
- [ ] Profile settings (name, email, avatar)
- [ ] Preferences (timezone, currency, date format, locale)
- [ ] TimezoneSelector component
- [ ] CurrencySelector component

---

### Phase 8: Notification System (3 days) 🔀 WAVE 3

**Branch**: `feature/phase-8-notifications`
**Depends on**: Phase 7 (Settings)

- [ ] Notification model and service
- [ ] In-app notifications (bell, dropdown, list)
- [ ] Email integration (Resend/SendGrid)
- [ ] Email verification on registration
- [ ] Payment due/overdue email reminders
- [ ] Push notification infrastructure (web-push)
- [ ] Notification preferences UI

---

### Phase 9: Dashboard Integration (2 days) 🔀 WAVE 4

**Branch**: `feature/phase-9-dashboard`
**Depends on**: All feature phases

- [ ] Net worth calculation
- [ ] Available-to-spend metric
- [ ] Financial alerts widget
- [ ] Updated dashboard layout
- [ ] Notification bell in header

---

### Phase 10: Testing & Polish (2 days) ⚡ WAVE 5

**Branch**: `feature/phase-10-testing`
**Depends on**: All phases

- [ ] Unit tests for new services
- [ ] Integration tests
- [ ] E2E tests for critical flows
- [ ] Mobile responsiveness verification
- [ ] UI polish and edge cases

---

### Summary

| Wave | Phases | Duration | Status |
|------|--------|----------|--------|
| Wave 0 | Phase -1 (Foundation) | 2.5 days | ✅ COMPLETE |
| Wave 1 | Phase 0 (Schema) | 2 days | ✅ COMPLETE |
| Wave 2 | Phases 1, 2, 4, 7 | 3 days* | 🟡 75% (7 remaining) |
| Wave 3 | Phases 3, 5, 8 | 3 days* | 🟡 67% (8 remaining) |
| Wave 4 | Phases 6, 9 | 2 days* | ❌ NOT STARTED |
| Wave 5 | Phase 10 (Testing) | 2 days | ❌ NOT STARTED |

### Progress Summary (Updated December 13, 2025)

| Metric | Value |
|--------|-------|
| **Phases Complete** | 7 of 11 (64%) |
| **Backend Tests** | 1,936 passing |
| **Frontend Tests** | 1,372 passing |
| **PRs Merged to Epic** | #231, #237, #238, #239, #240, #275, #278 |
| **Next Phase** | Phase 6: Financial Calendar |
| **Remaining Effort** | ~9 days |

### Remaining Phases (Revised Order)

1. **Phase 6: Financial Calendar** (2 days) - Monthly view with scheduled transactions
2. **Phase 7: Settings** (2 days) - User preferences
3. **Phase 8: Notifications** (3 days) - Payment reminders
4. **Phase 9: Dashboard Integration** (2 days) - Final polish
5. **Phase 10: Testing & Polish** (2 days) - E2E and QA

---

## 15. Resolved Decisions

All major decisions have been made. This section documents the final choices.

### Foundation & Workflow
| Decision | Choice | Date |
|----------|--------|------|
| Upgrades timing | Now (before features) | Dec 3, 2025 |
| Turbo | 1.13 → 2.6 | Dec 3, 2025 |
| Tailwind | v3 → v4 | Dec 3, 2025 |
| Jest | 29 → 30 | Dec 3, 2025 |
| NestJS | 10 → 11 | Dec 3, 2025 |
| Git workflow | Epic branch + feature branches | Dec 3, 2025 |
| Merge strategy | Squash to epic, merge to main | Dec 3, 2025 |
| Worktrees | Not recommended | Dec 3, 2025 |

### Core Architecture
| Decision | Choice | Date |
|----------|--------|------|
| Category icons | lucide-react (curated presets) | Dec 3, 2025 |
| Category colors | Presets only (8 colors) | Dec 3, 2025 |
| Transfer linking | `transferGroupId` UUID | Dec 3, 2025 |
| CC tracking | Single balance per billing cycle | Dec 3, 2025 |
| Calendar view | Monthly only (MVP), full views v1.1 | Dec 3, 2025 |
| Auto-detection | A→B→C fallback (auto, suggest, manual) | Dec 3, 2025 |
| Installment accounting | Purchase date (T+0) | Dec 3, 2025 |

### BNPL Providers (Initial Support)
- PayPal Pay-in-3
- PayPal Pay-in-6
- PayPal Pay-in-12
- PayPal Pay-in-24
- Klarna
- Afterpay
- Satispay
- Affirm
- Other (extensible)

### Calendar Content
**Decision**: Show ALL financial events
- Income (salary, expected deposits)
- Expenses (recurring bills)
- Credit card due dates
- BNPL installments
- User-created scheduled transactions

### Timezone Handling
**Decision**: User preference in settings
- Stored in UserPreferences.timezone
- All dates stored in UTC server-side
- Converted to user timezone for display
- Default: Browser-detected or UTC

### Notification Channels
**Decision**: All three channels are mandatory
- **Email**: Registration verification + payment reminders
- **Push**: Browser push notifications (web-push)
- **In-App**: Always enabled, notification bell in header

### Email Integration
**Decision**: Implement with Resend or SendGrid
- Registration email verification (required)
- Password reset (required)
- Payment due reminders (required)
- Payment overdue alerts (required)
- Digest emails (v1.1)

---

## 16. Future Considerations

### v1.1 Features
- [ ] Balance history charts (account detail page)
- [ ] Detailed CC purchase tracking (per-transaction liabilities)
- [ ] Full calendar views (week/day)
- [ ] Recurring transaction auto-detection
- [ ] Split transactions (one transaction, multiple categories)
- [ ] Merchant management with logos
- [ ] CSV import for transactions
- [ ] PDF/CSV export for reports
- [ ] Advanced search (global)

### v2.0 Features
- [ ] ML-based categorization
- [ ] Spending predictions
- [ ] Smart budgets (AI-suggested limits)
- [ ] Bill negotiation suggestions
- [ ] Investment tracking
- [ ] Goal setting and tracking
- [ ] Family/shared accounts

### Mobile App (React Native)
- [ ] Authentication
- [ ] Dashboard
- [ ] Push notifications (FCM/APNS)
- [ ] Transaction quick-add
- [ ] Account overview
- [ ] Budget tracking

### Deferred Technical Items
- [ ] Tailwind v4 migration
- [ ] Prisma 7 upgrade
- [ ] React 19 types alignment
- [ ] Advanced accessibility audit
- [ ] Multi-language support (i18n)

---

## Appendix A: Complete Prisma Schema

```prisma
// See separate file: docs/planning/schemas/mvp-completion-schema.prisma
```

---

## Appendix B: API Endpoints

### Categories
- `GET /api/categories` - List user categories (tree structure)
- `GET /api/categories/:id` - Get category with spending
- `POST /api/categories` - Create category
- `PATCH /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category (reassign transactions)

### Transactions
- `GET /api/transactions` - List with filters
- `GET /api/transactions/:id` - Get transaction detail
- `POST /api/transactions` - Create manual transaction
- `PATCH /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction
- `POST /api/transactions/link-transfer` - Link as transfer group

### Liabilities
- `GET /api/liabilities` - List user liabilities
- `GET /api/liabilities/:id` - Get liability with installments
- `POST /api/liabilities` - Create liability
- `PATCH /api/liabilities/:id` - Update liability
- `DELETE /api/liabilities/:id` - Delete liability
- `POST /api/liabilities/:id/payment` - Record payment

### Scheduled Transactions
- `GET /api/scheduled` - List scheduled transactions
- `GET /api/scheduled/calendar` - Get calendar events for date range
- `POST /api/scheduled` - Create scheduled transaction
- `PATCH /api/scheduled/:id` - Update scheduled transaction
- `DELETE /api/scheduled/:id` - Delete scheduled transaction
- `POST /api/scheduled/:id/complete` - Mark as completed

### Analytics
- `GET /api/analytics/net-worth` - Get net worth breakdown
- `GET /api/analytics/spending` - Get spending by category/period
- `GET /api/analytics/available` - Get available-to-spend

---

## Appendix C: Component Library

All new components should follow shadcn/ui patterns and be added to:
- `apps/web/src/components/ui/` - Base UI components
- `apps/web/src/components/[domain]/` - Domain-specific components

---

*Document created: December 3, 2025*
*Last updated: December 3, 2025*
*Status: Draft - Pending Review*
