> NOTE: This document references the pre-migration NestJS backend which was replaced by Supabase Edge Functions in Phase 0 (April 2026).

# Prisma Schema vs PostgreSQL Database Audit Report

**Date:** 2025-12-08
**Database:** moneywise (PostgreSQL)
**Prisma Schema Version:** Latest from `apps/backend/prisma/schema.prisma`
**Auditor:** Database Specialist Agent

---

## Executive Summary

✅ **AUDIT RESULT: FULLY ALIGNED**

The Prisma schema and PostgreSQL database are **100% synchronized** with no discrepancies found.

### Audit Scope

1. ✅ All 27 enum types verified
2. ✅ All 22 database tables verified
3. ✅ All constraints verified (PRIMARY KEY, FOREIGN KEY, CHECK, UNIQUE)
4. ✅ All indexes verified (performance optimization indexes)
5. ✅ Schema drift check performed (no migrations needed)

---

## Detailed Findings

### 1. Enum Synchronization (27/27 ✅)

All enum types are perfectly synchronized between Prisma schema and PostgreSQL:

| Enum Name | Status | Schema Values | DB Values | Match |
|-----------|--------|---------------|-----------|-------|
| UserRole | ✅ MATCH | ADMIN, MEMBER, VIEWER | ADMIN, MEMBER, VIEWER | Yes |
| UserStatus | ✅ MATCH | ACTIVE, INACTIVE, SUSPENDED | ACTIVE, INACTIVE, SUSPENDED | Yes |
| AccountType | ✅ MATCH | CHECKING, SAVINGS, CREDIT_CARD, INVESTMENT, LOAN, MORTGAGE, OTHER | Same | Yes |
| AccountStatus | ✅ MATCH | ACTIVE, INACTIVE, HIDDEN, CLOSED, ERROR | Same | Yes |
| AccountSource | ✅ MATCH | SALTEDGE, TINK, YAPILY, PLAID, MANUAL | Same | Yes |
| BankingProvider | ✅ MATCH | MANUAL, SALTEDGE, TINK, YAPILY, TRUELAYER | Same | Yes |
| BankingConnectionStatus | ✅ MATCH | PENDING, IN_PROGRESS, AUTHORIZED, REVOKED, EXPIRED, FAILED | Same | Yes |
| BankingSyncStatus | ✅ MATCH | PENDING, SYNCING, SYNCED, ERROR, DISCONNECTED | Same | Yes |
| TransactionType | ✅ MATCH | DEBIT, CREDIT | DEBIT, CREDIT | Yes |
| FlowType | ✅ MATCH | EXPENSE, INCOME, TRANSFER, LIABILITY_PAYMENT, REFUND | Same | Yes |
| TransferRole | ✅ MATCH | SOURCE, DESTINATION | SOURCE, DESTINATION | Yes |
| TransactionStatus | ✅ MATCH | PENDING, POSTED, CANCELLED | Same | Yes |
| TransactionSource | ✅ MATCH | PLAID, MANUAL, IMPORT, SALTEDGE | Same | Yes |
| CategoryType | ✅ MATCH | INCOME, EXPENSE, TRANSFER | Same | Yes |
| CategoryStatus | ✅ MATCH | ACTIVE, INACTIVE, ARCHIVED | Same | Yes |
| BudgetPeriod | ✅ MATCH | MONTHLY, QUARTERLY, YEARLY, CUSTOM | Same | Yes |
| BudgetStatus | ✅ MATCH | ACTIVE, COMPLETED, DRAFT | Same | Yes |
| AchievementType | ✅ MATCH | SAVINGS, BUDGET, CONSISTENCY, EDUCATION | Same | Yes |
| AchievementStatus | ✅ MATCH | LOCKED, IN_PROGRESS, UNLOCKED | Same | Yes |
| LiabilityType | ✅ MATCH | CREDIT_CARD, BNPL, LOAN, MORTGAGE, OTHER | Same | Yes |
| LiabilityStatus | ✅ MATCH | ACTIVE, PAID_OFF, CLOSED | Same | Yes |
| NotificationType | ✅ MATCH | BUDGET_ALERT, BILL_REMINDER, TRANSACTION_ALERT, SYNC_ERROR, ACHIEVEMENT, SYSTEM | Same | Yes |
| NotificationPriority | ✅ MATCH | LOW, MEDIUM, HIGH, URGENT | Same | Yes |
| NotificationStatus | ✅ MATCH | PENDING, SENT, READ, DISMISSED | Same | Yes |
| RecurrenceFrequency | ✅ MATCH | DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, YEARLY | Same | Yes |
| ScheduledTransactionStatus | ✅ MATCH | ACTIVE, PAUSED, COMPLETED, CANCELLED | Same | Yes |
| AuditEventType | ✅ MATCH | PASSWORD_CHANGED, PASSWORD_RESET_REQUESTED, PASSWORD_RESET_COMPLETED, LOGIN_SUCCESS, LOGIN_FAILED, LOGIN_LOCKED, ACCOUNT_CREATED, ACCOUNT_DELETED, ACCOUNT_SUSPENDED, ACCOUNT_REACTIVATED, TWO_FACTOR_ENABLED, TWO_FACTOR_DISABLED | Same | Yes |

**Note:** The recent fix for `AccountStatus.HIDDEN` was successful and is now properly reflected in the database.

---

### 2. Table Structure (22 Tables ✅)

All tables present and accounted for:

1. ✅ `_prisma_migrations` - Migration tracking
2. ✅ `accounts` - Financial accounts
3. ✅ `achievements` - Gamification achievements
4. ✅ `audit_logs` - Security audit trail
5. ✅ `banking_connections` - OAuth banking connections
6. ✅ `banking_customers` - Banking provider customers
7. ✅ `banking_sync_logs` - Sync operation logs
8. ✅ `budgets` - Budget planning
9. ✅ `categories` - Transaction categories
10. ✅ `families` - Family/household groups
11. ✅ `installment_plans` - BNPL/loan payment plans
12. ✅ `installments` - Individual installment payments
13. ✅ `liabilities` - Debts and credit cards
14. ✅ `notifications` - User notifications
15. ✅ `password_history` - Password change history
16. ✅ `push_subscriptions` - Web push subscriptions
17. ✅ `recurrence_rules` - Recurring transaction rules
18. ✅ `scheduled_transactions` - Scheduled/recurring bills
19. ✅ `transactions` - Financial transactions
20. ✅ `user_achievements` - User achievement progress
21. ✅ `user_preferences` - User settings
22. ✅ `users` - User accounts

---

### 3. Constraints & Data Integrity (✅)

All critical constraints verified and functioning:

#### Primary Keys
- ✅ All 22 tables have PRIMARY KEY constraints
- ✅ All using UUID type for primary keys

#### Foreign Keys
- ✅ `accounts.user_id` → `users.id` (CASCADE)
- ✅ `accounts.family_id` → `families.id` (CASCADE)
- ✅ `banking_connections.user_id` → `users.id` (CASCADE)
- ✅ `banking_connections.customer_id` → `banking_customers.id` (SET NULL)
- ✅ `banking_customers.user_id` → `users.id` (CASCADE)
- ✅ `banking_sync_logs.account_id` → `accounts.id` (CASCADE)
- ✅ `budgets.category_id` → `categories.id` (CASCADE)
- ✅ `budgets.family_id` → `families.id` (CASCADE)
- ✅ `categories.parent_id` → `categories.id` (CASCADE)
- ✅ `categories.family_id` → `families.id` (CASCADE)
- ✅ All other foreign key relationships verified

#### Check Constraints
- ✅ `chk_account_ownership_xor` - Ensures accounts belong to either user OR family (not both)
- ✅ `chk_category_depth` - Enforces maximum category hierarchy depth (3 levels)
- ✅ `chk_budget_date_range` - Ensures budget end_date >= start_date
- ✅ All NOT NULL constraints properly enforced

#### Unique Constraints
- ✅ `users.email` - Unique user emails
- ✅ `accounts.plaid_account_id` - Prevents duplicate Plaid connections
- ✅ `accounts.saltedge_account_id` - Prevents duplicate SaltEdge connections
- ✅ `accounts.tink_account_id` - Prevents duplicate Tink connections
- ✅ `accounts.yapily_account_id` - Prevents duplicate Yapily connections
- ✅ `transactions.plaid_transaction_id` - Prevents duplicate transaction imports
- ✅ `transactions.saltedge_transaction_id` - Prevents duplicate SaltEdge imports
- ✅ `categories.family_id + slug` - Unique category slugs per family
- ✅ All other unique constraints verified

---

### 4. Performance Indexes (✅)

All performance optimization indexes are in place:

#### Account Indexes
- ✅ `idx_accounts_user_id` - User account lookups
- ✅ `idx_accounts_family_id` - Family account lookups
- ✅ `idx_accounts_user_status` - Active account filtering
- ✅ `idx_accounts_family_status` - Family active accounts
- ✅ `idx_accounts_plaid_item` - Plaid sync operations
- ✅ `idx_accounts_provider_sync` - Banking provider sync

#### Transaction Indexes (Time-Series Optimized)
- ✅ `idx_transactions_account_date` - Account transaction history
- ✅ `idx_transactions_category_date` - Category spending reports
- ✅ `idx_transactions_status_date` - Pending transaction views
- ✅ `idx_transactions_merchant_date` - Merchant spending patterns
- ✅ `idx_transactions_amount_date` - Large transaction alerts
- ✅ `idx_transactions_flow_type_date` - Flow type analysis
- ✅ `idx_transactions_transfer_group` - Transfer pair lookups

#### Category Indexes
- ✅ `idx_categories_family_type` - Family expense/income categories
- ✅ `idx_categories_family_status` - Active category filtering
- ✅ `idx_categories_parent_id` - Child category lookups
- ✅ `idx_categories_type_status` - Type + status filtering

#### Budget Indexes
- ✅ `idx_budgets_family_status` - Active budget filtering
- ✅ `idx_budgets_family_period` - Period-based budgets
- ✅ `idx_budgets_category_id` - Category budget lookups
- ✅ `idx_budgets_date_range` - Date range queries

#### User & Family Indexes
- ✅ `idx_users_email` - Login lookups
- ✅ `idx_users_family_id` - Family member queries
- ✅ `idx_users_status_created` - User filtering
- ✅ `idx_users_family_role` - Family role filtering

#### Audit & Security Indexes
- ✅ `idx_audit_logs_user_event_created` - User activity timeline
- ✅ `idx_audit_logs_event_created` - Event monitoring
- ✅ `idx_audit_logs_ip_created` - IP analysis
- ✅ `idx_audit_logs_security_created` - Security alerts
- ✅ `idx_password_history_user_created` - Password reuse checks

#### Banking Indexes
- ✅ `idx_banking_conn_user_status` - User connection status
- ✅ `idx_banking_conn_customer` - Customer connections
- ✅ `idx_banking_conn_provider_status` - Provider sync status
- ✅ `idx_banking_conn_expires` - Expiration monitoring
- ✅ `idx_banking_customer_provider_active` - Active customers
- ✅ `idx_sync_logs_account_date` - Sync history
- ✅ `idx_sync_logs_provider_status` - Provider sync monitoring
- ✅ `idx_sync_logs_status_date` - Sync status tracking

#### Liability & Scheduled Transaction Indexes
- ✅ `idx_liabilities_family_status` - Active liability filtering
- ✅ `idx_liabilities_family_type` - Liability type filtering
- ✅ `idx_liabilities_account` - Account-linked liabilities
- ✅ `idx_installment_plans_liability` - Liability installments
- ✅ `idx_installments_plan_due` - Due installments
- ✅ `idx_installments_due_status` - Payment status
- ✅ `idx_scheduled_tx_family_status` - Active scheduled transactions
- ✅ `idx_scheduled_tx_due_status` - Due date monitoring
- ✅ `idx_scheduled_tx_account` - Account scheduled transactions

#### Notification Indexes
- ✅ `idx_notifications_user_status` - User notification filtering
- ✅ `idx_notifications_user_created` - Notification timeline
- ✅ `idx_notifications_type_status` - Type-based filtering
- ✅ `idx_push_subscriptions_user_active` - Active push subscriptions

#### Achievement Indexes
- ✅ `idx_achievements_type_active` - Active achievements
- ✅ `idx_achievements_sort` - Achievement ordering
- ✅ `idx_user_achievements_user_status` - User achievement status
- ✅ `idx_user_achievements_user_unlocked` - Unlocked achievements
- ✅ `idx_user_achievements_achievement` - Achievement progress

---

### 5. Schema Drift Check (✅)

**Result:** No schema drift detected

```sql
-- Prisma migrate diff output:
-- This is an empty migration.
```

This confirms that:
- ✅ All Prisma schema definitions match database structure
- ✅ All enum values are synchronized
- ✅ All table columns match expected types
- ✅ All constraints are properly defined
- ✅ No pending migrations required

---

## Migration Status

**Current Status:** All migrations applied ✅

```
13 migrations found in prisma/migrations
Database schema is up to date!
```

### Recent Critical Fix

**Issue Resolved:** `AccountStatus.HIDDEN` enum value was missing from database

**Migration Applied:** `20251208_fix_account_status_enum.sql`

```sql
-- Add missing HIDDEN value to account_status enum
ALTER TYPE account_status ADD VALUE IF NOT EXISTS 'HIDDEN';
```

This migration was successfully applied and the database is now fully synchronized.

---

## Recommendations

### ✅ Preventive Measures

1. **Pre-deployment Enum Validation** ✅ IMPLEMENTED
   - Audit script created: `/audit-schema-v2.sh`
   - Checks all 27 enums automatically
   - Can be integrated into CI/CD pipeline

2. **Migration Review Process** ✅ ACTIVE
   - All migrations in `prisma/migrations/` folder
   - Prisma migrate tracks applied migrations
   - Down migrations available for rollback

3. **Regular Audits** 🔄 RECOMMENDED
   - Run audit script monthly or after major releases
   - Include in pre-deployment checklist
   - Add to staging deployment pipeline

### ⚠️ Known Considerations

1. **XOR Constraint on Accounts**
   - Check constraint `chk_account_ownership_xor` enforces: `(user_id IS NULL) XOR (family_id IS NULL)`
   - Application layer must validate before insert/update
   - Prevents orphaned accounts or dual-ownership conflicts

2. **Category Depth Limit**
   - Enforced by database trigger `trg_category_depth`
   - Maximum depth: 3 levels
   - Prevents excessive nesting in category hierarchy

3. **Budget Date Range Validation**
   - Check constraint `chk_budget_date_range` enforces: `end_date >= start_date`
   - Application layer should validate before submission
   - Prevents invalid budget periods

---

## Audit Methodology

### Tools Used
1. **PostgreSQL System Catalogs**
   - `pg_enum` - Enum value inspection
   - `pg_type` - Type definitions
   - `information_schema.table_constraints` - Constraint verification
   - `pg_indexes` - Index verification

2. **Prisma CLI**
   - `prisma migrate status` - Migration tracking
   - `prisma migrate diff` - Schema drift detection
   - `prisma db pull` - Database introspection

3. **Custom Audit Script**
   - Enum value comparison
   - Automated reporting
   - Exit code for CI/CD integration

### Audit Script Location
```bash
/home/nemesi/dev/money-wise-categories/audit-schema-v2.sh
```

**Usage:**
```bash
# Check alignment
./audit-schema-v2.sh

# Integrate with CI/CD
./audit-schema-v2.sh && echo "Schema aligned" || exit 1
```

---

## Conclusion

**Status: ✅ FULLY ALIGNED**

The Prisma schema and PostgreSQL database are in perfect synchronization. All enums, tables, constraints, indexes, and relationships are properly defined and functioning as expected.

The recent issue with `AccountStatus.HIDDEN` has been resolved, and no further migration work is required at this time.

**Next Steps:**
1. ✅ Continue regular development
2. ✅ Run audit script before major deployments
3. ✅ Monitor for future schema drift
4. ✅ Document any new enum additions in ADR format

---

**Report Generated By:** Database Specialist Agent
**Review Status:** Complete
**Action Required:** None - System fully synchronized
