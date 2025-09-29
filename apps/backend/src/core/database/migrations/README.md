# Database Migrations

## Migration Files

### Current Active Migrations

1. **1760000000000-ConsolidatedCompleteSchema.ts**
   - Complete schema migration generated from current entity definitions
   - Creates all tables: users, accounts, categories, transactions
   - Includes all enum types and indexes as defined in entities
   - Includes all foreign key constraints

2. **1759998888888-AddTimescaleDBSupport.ts**
   - Adds TimescaleDB extension and hypertable support
   - Converts transactions table to hypertable for time-series optimization
   - Adds compression and retention policies
   - Creates continuous aggregates for daily summaries

### Backed Up Migrations

- **BACKUP_1758926681909-InitialSchema.ts** - Original empty baseline migration
- **BACKUP_1759002732450-FixInitialSchema.ts** - Previous comprehensive migration

## Migration Commands

```bash
# Run migrations
pnpm run db:migrate

# Revert last migration
pnpm run db:migrate:revert

# Generate new migration (requires database connection)
pnpm run db:generate -- --name MigrationName
```

## Migration Validation

All migrations have been validated to match current entity definitions:

### Schema Completeness
- ✅ All entities represented: User, Account, Category, Transaction
- ✅ All enum types included
- ✅ All indexes from entity decorators included
- ✅ All foreign key relationships included
- ✅ TimescaleDB hypertable support added

### Index Coverage
- ✅ User: email (unique), status+createdAt
- ✅ Account: userId+status
- ✅ Category: slug (unique), type+status, parentId+status
- ✅ Transaction: accountId+date, categoryId+date, status+date, plaidTransactionId (unique), amount+date, merchantName+date

### Foreign Key Constraints
- ✅ accounts.userId → users.id (CASCADE)
- ✅ categories.parentId → categories.id (CASCADE)
- ✅ transactions.accountId → accounts.id (CASCADE)
- ✅ transactions.categoryId → categories.id (SET NULL)

## TimescaleDB Features

The TimescaleDB migration adds:

1. **Hypertable**: Transactions table optimized for time-series queries
2. **Compression**: Data older than 7 days automatically compressed
3. **Retention**: Data older than 7 years automatically removed (compliance)
4. **Continuous Aggregates**: Pre-computed daily summaries for performance
5. **Time-bucket Indexes**: Optimized for date-range queries

## Testing

To test migrations on a clean database:

```bash
# Start clean database
docker-compose down -v
docker-compose up -d postgres

# Run migrations
pnpm run db:migrate

# Verify schema
pnpm run typecheck
```