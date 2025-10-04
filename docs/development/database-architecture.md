# Database Architecture - TimescaleDB

## Overview

MoneyWise uses **TimescaleDB** - PostgreSQL with time-series extensions optimized for financial data.

## Why TimescaleDB?

### Financial Data is Time-Series Data
- Transactions are inherently time-ordered
- Queries often involve date ranges (monthly reports, trends)
- Time-series optimizations improve performance significantly
- Better compression for historical financial data

### Benefits for MoneyWise
- **Performance**: Optimized for time-based queries and aggregations
- **Compatibility**: 100% PostgreSQL compatible - existing tools work
- **Analytics**: Built-in time-series functions for financial analysis
- **Scalability**: Handles large volumes of financial transactions efficiently

## Configuration

### Docker Setup (`docker-compose.dev.yml`)
```yaml
postgres:
  image: timescale/timescaledb:latest-pg15
  container_name: postgres-dev
  environment:
    POSTGRES_DB: moneywise
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: password
  volumes:
    - ./infrastructure/docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
```

### Initialization (`infrastructure/docker/postgres/init.sql`)
```sql
-- Create test database
CREATE DATABASE moneywise_test;

-- Enable TimescaleDB extension on main database
\c moneywise;
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Enable TimescaleDB extension on test database
\c moneywise_test;
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

## Database Schema

### Core Tables
- **users**: User accounts and preferences
- **accounts**: Financial accounts (checking, savings, credit cards)
- **transactions**: Financial transactions with time-series optimization
- **categories**: Transaction categorization with nested structure

### Time-Series Optimizations
- Transactions table partitioned by time for optimal performance
- Automatic data compression for older transactions
- Continuous aggregates for real-time analytics

## Migration Management

### TypeORM Integration
```typescript
// Database configuration supports both PostgreSQL and TimescaleDB
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'moneywise',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development'
};
```

### Current Migrations
- **1759002732450-FixInitialSchema.ts**: Complete schema creation with all core tables
- **1759998888888-AddTimescaleDBSupport.ts**: TimescaleDB hypertable and optimization setup

### TimescaleDB Configuration
Environment variables for TimescaleDB customization:
```bash
# TimescaleDB Feature Toggles
TIMESCALEDB_ENABLED=true
TIMESCALEDB_COMPRESSION_ENABLED=true
TIMESCALEDB_RETENTION_ENABLED=true

# TimescaleDB Settings
TIMESCALEDB_CHUNK_TIME_INTERVAL=1d
TIMESCALEDB_COMPRESSION_AFTER=7d
TIMESCALEDB_RETENTION_AFTER=7y
```

### Hypertable Configuration
The transactions table is automatically converted to a hypertable with:
- **Time Column**: `date` (transaction date)
- **Chunk Interval**: 1 day (configurable)
- **Compression**: Enabled after 7 days (configurable)
- **Retention**: 7 years for compliance (configurable)
- **Segment By**: `account_id` for optimal compression

## Development Workflow

### Database Management Commands
```bash
# Start database service
docker compose -f docker-compose.dev.yml up postgres -d

# Run migrations
pnpm run db:migrate

# Generate new migration
pnpm run db:generate

# Reset database (development only)
pnpm run db:drop && pnpm run db:migrate

# Health check
docker exec postgres-dev pg_isready -U postgres -d moneywise
```

### Testing
- **Main Database**: `moneywise` for development
- **Test Database**: `moneywise_test` for isolated testing
- Both databases have TimescaleDB extensions enabled

## Time-Series Features (IMPLEMENTED)

### Active Optimizations
- **Hypertables**: ✅ Transactions table converted to hypertable for time-series optimization
- **Continuous Aggregates**: ✅ Daily account balances and category spending views
- **Data Compression**: ✅ Automatic compression of transactions older than 7 days
- **Retention Policies**: ✅ Automated data lifecycle management (7-year retention)

### Analytics Capabilities (Available)
- ✅ Time-bucketed transaction analysis via `time_bucket()` functions
- ✅ Moving averages and financial trends through continuous aggregates
- ✅ Real-time spending patterns with optimized time-series queries
- ✅ Historical data analysis with chunk-based performance optimizations

### TimescaleDB Service Features

#### Available Query Methods
```typescript
// Get transaction trends with time buckets
await timescaleDbService.getTransactionTrends(accountId, '1 day', startDate, endDate);

// Analyze category spending patterns
await timescaleDbService.getCategorySpendingTrends(categoryId, '1 week', 12);

// Track account balance history
await timescaleDbService.getAccountBalanceHistory(accountId, '1 day', 30);

// Find top merchants by spending
await timescaleDbService.getTopMerchantSpending('1 month', 10, accountId);

// Detect spending anomalies
await timescaleDbService.detectSpendingAnomalies(accountId, '1 day', 2.0);

// Monitor transaction velocity
await timescaleDbService.getTransactionVelocity('1 hour', accountId, 24);

// Get continuous aggregate data
await timescaleDbService.getContinuousAggregateData('daily_account_balances', 30);

// Check hypertable status
await timescaleDbService.getHypertableInfo('transactions');

// Get compression statistics
await timescaleDbService.getChunkStatistics('transactions');
```

#### Continuous Aggregates
The following materialized views are automatically maintained:
- **daily_account_balances**: Daily balance changes per account
- **daily_category_spending**: Daily spending totals per category

Both views refresh hourly with 1-hour delay for near real-time analytics.

## Troubleshooting

### Common Issues
1. **Extension Not Found**: Ensure TimescaleDB image is used
2. **Permission Errors**: Check POSTGRES_INITDB_ARGS configuration
3. **Connection Issues**: Verify Docker container health status

### Health Checks
```bash
# Verify TimescaleDB extension
docker exec postgres-dev psql -U postgres -d moneywise -c "SELECT default_version, installed_version FROM pg_available_extensions WHERE name = 'timescaledb';"

# Check hypertable status
docker exec postgres-dev psql -U postgres -d moneywise -c "SELECT * FROM timescaledb_information.hypertables;"

# Check compression status
docker exec postgres-dev psql -U postgres -d moneywise -c "SELECT * FROM timescaledb_information.compressed_hypertable_stats;"

# View chunk information
docker exec postgres-dev psql -U postgres -d moneywise -c "SELECT chunk_schema, chunk_name, range_start, range_end, is_compressed FROM timescaledb_information.chunks WHERE hypertable_name = 'transactions' ORDER BY range_start DESC LIMIT 10;"

# Check continuous aggregates
docker exec postgres-dev psql -U postgres -d moneywise -c "SELECT * FROM timescaledb_information.continuous_aggregates;"

# Test time-series queries
docker exec postgres-dev psql -U postgres -d moneywise -c "SELECT time_bucket('1 day', date) as day, count(*) FROM transactions GROUP BY day ORDER BY day DESC LIMIT 7;"
```

### TimescaleDB Maintenance
```bash
# Check compression ratios
docker exec postgres-dev psql -U postgres -d moneywise -c "SELECT * FROM timescaledb_information.compressed_chunk_stats WHERE hypertable_name = 'transactions';"

# Manual compression (if needed)
docker exec postgres-dev psql -U postgres -d moneywise -c "SELECT compress_chunk(c) FROM show_chunks('transactions') c;"

# Check retention policy status
docker exec postgres-dev psql -U postgres -d moneywise -c "SELECT * FROM timescaledb_information.policy_stats WHERE hypertable = 'transactions';"

# Refresh continuous aggregates manually
docker exec postgres-dev psql -U postgres -d moneywise -c "CALL refresh_continuous_aggregate('daily_account_balances', NULL, NULL);"
```

---
*Created: September 27, 2025 | Updated: September 28, 2025 - TimescaleDB Implementation Complete*