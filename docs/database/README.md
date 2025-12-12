# MoneyWise Database Documentation

This directory contains database-specific documentation, audit reports, and schema references.

## Quick Links

- **Latest Audit Report:** [schema-audit-report-2025-12-08.md](./schema-audit-report-2025-12-08.md)
- **Prisma Schema:** `apps/backend/prisma/schema.prisma`
- **Migrations:** `apps/backend/prisma/migrations/`

## Audit Scripts

### Quick Audit
Run a fast schema audit to verify alignment:

```bash
./.claude/scripts/audit-database-schema.sh
```

**Output:**
- ✅ All checks pass: Exit code 0
- ❌ Issues found: Exit code 1

**Verbose Mode:**
```bash
./.claude/scripts/audit-database-schema.sh --verbose
```

### Full Audit Report
Generate a comprehensive audit report:

```bash
./audit-schema-v2.sh
```

This creates a detailed report in `docs/database/`.

## Schema Status

**Last Audit:** 2025-12-08
**Status:** ✅ FULLY ALIGNED

### What Was Checked
- ✅ All 27 enum types
- ✅ All 22 database tables
- ✅ All PRIMARY KEY, FOREIGN KEY, CHECK, and UNIQUE constraints
- ✅ All performance optimization indexes
- ✅ Schema drift detection
- ✅ Migration status

### Recent Fixes
- **2025-12-08:** Fixed missing `AccountStatus.HIDDEN` enum value
  - Migration: `20251208_fix_account_status_enum.sql`
  - Issue: Enum value existed in Prisma schema but not in database
  - Resolution: Added missing enum value with `ALTER TYPE` statement

## Database Architecture

### Core Tables

#### User & Family Management
- `families` - Household groups
- `users` - User accounts with family membership
- `user_preferences` - User-specific settings
- `password_history` - Password change audit trail
- `audit_logs` - Security event tracking

#### Financial Accounts
- `accounts` - Financial accounts (bank, credit, investment)
- `transactions` - Financial transaction history
- `categories` - Transaction categorization (hierarchical)

#### Banking Integration
- `banking_customers` - Provider-specific customer records
- `banking_connections` - OAuth banking connections
- `banking_sync_logs` - Sync operation audit trail

#### Budgeting & Planning
- `budgets` - Budget planning and tracking
- `scheduled_transactions` - Recurring bills and payments
- `recurrence_rules` - Recurrence patterns (RFC 5545 inspired)

#### Debt Management
- `liabilities` - Credit cards, BNPL, loans, mortgages
- `installment_plans` - Fixed payment schedules
- `installments` - Individual payment tracking

#### Notifications & Gamification
- `notifications` - In-app and push notifications
- `push_subscriptions` - Web Push API subscriptions
- `achievements` - Achievement definitions
- `user_achievements` - User progress tracking

### Enum Types (27 Total)

#### User & Account Management
- `user_role` - ADMIN, MEMBER, VIEWER
- `user_status` - ACTIVE, INACTIVE, SUSPENDED
- `account_type` - CHECKING, SAVINGS, CREDIT_CARD, INVESTMENT, LOAN, MORTGAGE, OTHER
- `account_status` - ACTIVE, INACTIVE, HIDDEN, CLOSED, ERROR
- `account_source` - SALTEDGE, TINK, YAPILY, PLAID, MANUAL

#### Banking Integration
- `banking_provider` - MANUAL, SALTEDGE, TINK, YAPILY, TRUELAYER
- `banking_connection_status` - PENDING, IN_PROGRESS, AUTHORIZED, REVOKED, EXPIRED, FAILED
- `banking_sync_status` - PENDING, SYNCING, SYNCED, ERROR, DISCONNECTED

#### Transactions
- `transaction_type` - DEBIT, CREDIT
- `flow_type` - EXPENSE, INCOME, TRANSFER, LIABILITY_PAYMENT, REFUND
- `transfer_role` - SOURCE, DESTINATION
- `transaction_status` - PENDING, POSTED, CANCELLED
- `transaction_source` - PLAID, MANUAL, IMPORT, SALTEDGE

#### Categories & Budgets
- `category_type` - INCOME, EXPENSE, TRANSFER
- `category_status` - ACTIVE, INACTIVE, ARCHIVED
- `budget_period` - MONTHLY, QUARTERLY, YEARLY, CUSTOM
- `budget_status` - ACTIVE, COMPLETED, DRAFT

#### Liabilities & Scheduling
- `liability_type` - CREDIT_CARD, BNPL, LOAN, MORTGAGE, OTHER
- `liability_status` - ACTIVE, PAID_OFF, CLOSED
- `recurrence_frequency` - DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, YEARLY
- `scheduled_transaction_status` - ACTIVE, PAUSED, COMPLETED, CANCELLED

#### Notifications & Achievements
- `notification_type` - BUDGET_ALERT, BILL_REMINDER, TRANSACTION_ALERT, SYNC_ERROR, ACHIEVEMENT, SYSTEM
- `notification_priority` - LOW, MEDIUM, HIGH, URGENT
- `notification_status` - PENDING, SENT, READ, DISMISSED
- `achievement_type` - SAVINGS, BUDGET, CONSISTENCY, EDUCATION
- `achievement_status` - LOCKED, IN_PROGRESS, UNLOCKED

#### Security
- `audit_event_type` - PASSWORD_CHANGED, PASSWORD_RESET_REQUESTED, LOGIN_SUCCESS, LOGIN_FAILED, etc.

## Key Architectural Decisions

### 1. Family-First Design
Every user MUST belong to a family (no nullable `familyId`). Solo users get auto-created single-member families on signup.

**Rationale:** Simplifies authorization logic and aligns with multi-generational finance platform vision.

### 2. Dual Ownership Model (Accounts)
Accounts can be owned by User OR Family (both nullable, XOR enforced at application layer).

**Constraints:**
```sql
CHECK ((user_id IS NULL) != (family_id IS NULL))
```

### 3. Decimal for Money Fields
All monetary values use `DECIMAL(15, 2)` instead of `FLOAT` or `DOUBLE`.

**Rationale:** Prevents floating-point precision errors in financial calculations.

### 4. JSONB for Flexible Metadata
Complex/evolving structures stored as JSONB (Plaid metadata, settings, rules).

**Trade-off:** Flexibility vs type safety (acceptable for auxiliary data).

### 5. Immutable Transaction History
Transactions should not be deleted, only marked as `CANCELLED`.

**Exception:** CASCADE delete when parent Account deleted (account closure).

### 6. Time-Series Optimized Indexes
All transaction indexes include `date` as second column for efficient time-range queries.

**Examples:**
- `(account_id, date)` - "Show last 30 days"
- `(category_id, date)` - "This month's spending"
- `(merchant_name, date)` - "Starbucks purchases this year"

## Performance Considerations

### Index Strategy
- **Primary keys:** Automatic UUID indexes
- **Foreign keys:** Always indexed for join performance
- **Filter columns:** Indexed for WHERE clauses (status, type, etc.)
- **Sort columns:** Indexed for ORDER BY (date, created_at)
- **Time-series:** Composite indexes with date for range queries

### Connection Pooling
- **Min connections:** 5
- **Max connections:** 20
- **Idle timeout:** 10 seconds
- **Connection timeout:** 5 seconds

### Query Optimization
1. Use `EXPLAIN ANALYZE` for slow queries
2. Avoid N+1 queries with eager loading
3. Batch operations for bulk inserts/updates
4. Leverage JSONB indexes (GIN) when querying JSON fields

## Maintenance

### Regular Audits
Run schema audit before:
- Major deployments
- Production releases
- Database migrations
- Enum modifications

```bash
# Quick check
./.claude/scripts/audit-database-schema.sh

# Full report
./audit-schema-v2.sh
```

### Migration Best Practices
1. **Always test migrations** in development first
2. **Provide down migrations** for rollback
3. **Test both up and down** before committing
4. **Document breaking changes** in migration comments
5. **Backup production data** before applying

### Enum Modifications
When adding enum values:

```sql
-- Safe: Add new value
ALTER TYPE account_status ADD VALUE IF NOT EXISTS 'NEW_VALUE';

-- Unsafe: Cannot remove enum values directly
-- Must create new enum, migrate data, drop old enum
```

## CI/CD Integration

Add schema audit to CI/CD pipeline:

```yaml
# .github/workflows/ci.yml
- name: Audit Database Schema
  run: ./.claude/scripts/audit-database-schema.sh
```

This ensures:
- Enum synchronization before deployment
- No schema drift introduced
- All migrations applied correctly

## Troubleshooting

### Enum Mismatch
**Symptom:** Runtime errors with enum values

**Diagnosis:**
```bash
./.claude/scripts/audit-database-schema.sh --verbose
```

**Solution:**
```sql
-- Add missing enum value
ALTER TYPE enum_name ADD VALUE IF NOT EXISTS 'MISSING_VALUE';
```

### Schema Drift
**Symptom:** Prisma client errors, unexpected database structure

**Diagnosis:**
```bash
cd apps/backend
pnpm prisma migrate status
pnpm prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script
```

**Solution:**
```bash
# Create migration for drift
pnpm prisma migrate dev --name fix_schema_drift

# Or reset database (DEVELOPMENT ONLY)
pnpm prisma migrate reset
```

### Pending Migrations
**Symptom:** "Database schema is not up to date" error

**Solution:**
```bash
cd apps/backend
pnpm prisma migrate deploy
```

## Resources

- **Prisma Documentation:** https://www.prisma.io/docs
- **PostgreSQL Enum Types:** https://www.postgresql.org/docs/current/datatype-enum.html
- **Database Best Practices:** `.claude/agents/database-specialist.md`
- **Migration Guide:** `apps/backend/prisma/migrations/README.md`

## Contact

For database-related questions or issues, refer to:
- **Database Specialist Agent:** `.claude/agents/database-specialist.md`
- **Architecture Decisions:** `.claude/knowledge/architecture.md`
- **Issue Tracker:** GitHub Issues with `database` label
