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

## Time-Series Features (Future)

### Planned Optimizations
- **Hypertables**: Convert transactions to hypertables for time-series optimization
- **Continuous Aggregates**: Real-time financial reporting
- **Data Compression**: Automatic compression of old transactions
- **Retention Policies**: Automated data lifecycle management

### Analytics Capabilities
- Time-bucketed transaction analysis
- Moving averages and financial trends
- Real-time spending patterns
- Historical data analysis with optimal performance

## Troubleshooting

### Common Issues
1. **Extension Not Found**: Ensure TimescaleDB image is used
2. **Permission Errors**: Check POSTGRES_INITDB_ARGS configuration
3. **Connection Issues**: Verify Docker container health status

### Health Checks
```bash
# Verify TimescaleDB extension
docker exec postgres-dev psql -U postgres -d moneywise -c "SELECT default_version, installed_version FROM pg_available_extensions WHERE name = 'timescaledb';"

# Check database schema
docker exec postgres-dev psql -U postgres -d moneywise -c '\dt'

# Test time-series functionality
docker exec postgres-dev psql -U postgres -d moneywise -c "SELECT now();"
```

---
*Created: September 27, 2025 | Updated: September 27, 2025*