# MoneyWise Database Tests

Comprehensive database testing suite for the MoneyWise backend application.

## Overview

This test suite provides comprehensive coverage for database operations, including:

- ✅ Entity relationship tests
- ✅ Migration validation
- ✅ Repository operations (CRUD)
- ✅ TimescaleDB time-series functionality
- ✅ Performance testing with large datasets
- ✅ Database constraints and validation
- ✅ Test data factories for consistent fixtures

## Test Structure

```
tests/
├── entities/                 # Entity relationship tests
│   └── entity-relationships.test.ts
├── migrations/               # Migration testing
│   └── migration.test.ts
├── repositories/            # Repository operation tests
│   └── repository-operations.test.ts
├── performance/             # Performance and TimescaleDB tests
│   ├── timescale-performance.test.ts
│   └── large-dataset.test.ts
├── factories/               # Test data factories
│   └── test-data.factory.ts
├── database-test.config.ts  # Test database configuration
├── database-test-suite.ts   # Complete test suite runner
└── jest.database.config.js  # Jest configuration for database tests
```

## Running Tests

### All Database Tests
```bash
npm run test:db
```

### Database Tests with Coverage
```bash
npm run test:db:coverage
```

### Performance Tests Only
```bash
npm run test:db:performance
```

### Complete Test Suite with Report
```bash
npm run test:db:suite
```

### Watch Mode
```bash
npm run test:db:watch
```

## Test Configuration

### Environment Variables

```bash
# Database connection (will use TestContainers if Docker available)
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=moneywise_test
DB_SCHEMA=public

# Test configuration
NODE_ENV=test
USE_TEST_CONTAINERS=true  # Set to false to use local PostgreSQL
```

### Docker Requirements (Optional)

For isolated testing with TestContainers:
- Docker installed and running
- Sufficient memory (2GB+ recommended)

If Docker is not available, tests will use local PostgreSQL.

## Test Database Setup

### Option 1: TestContainers (Recommended)
Tests automatically start a PostgreSQL container:
- Fresh database for each test run
- Automatic cleanup
- No interference with development database

### Option 2: Local PostgreSQL
Configure local PostgreSQL instance:
```sql
CREATE DATABASE moneywise_test;
CREATE USER test_user WITH PASSWORD 'test_password';
GRANT ALL PRIVILEGES ON DATABASE moneywise_test TO test_user;
```

### TimescaleDB Support
For time-series performance tests:
```sql
-- Install TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

## Test Features

### Entity Relationship Tests
- User → Account (One-to-Many)
- Account → Transaction (One-to-Many)
- Category → Transaction (One-to-Many)
- Category tree structure (Self-referencing)
- Cascade deletion validation
- Foreign key constraint enforcement

### Migration Tests
- Schema creation validation
- Index creation verification
- Constraint enforcement
- Data type validation (JSONB, decimals, enums)
- Rollback capability

### Repository Operations
- CRUD operations for all entities
- Complex queries with joins
- Pagination performance
- Aggregation queries
- Full-text search
- Concurrent operations

### Performance Tests
- Bulk insert operations (1,000-10,000 records)
- Large dataset queries
- Index usage validation
- Query execution plan analysis
- Memory usage monitoring
- Connection pool testing

### TimescaleDB Features
- Hypertable creation
- Time-bucket aggregations
- Continuous aggregates
- Compression testing
- Time-series query optimization

## Test Data Factories

Consistent test data generation:

```typescript
// Create test user
const user = await factory.users.build();

// Create account with specific properties
const account = await factory.accounts.build({
  userId: user.id,
  type: AccountType.CHECKING,
  currentBalance: 1500.50
});

// Create time-series transaction data
const transactions = factory.transactions.createTimeSeries(account.id, 365);
```

### Available Factories
- `UserFactory` - User entities with realistic data
- `AccountFactory` - Bank accounts (manual and Plaid)
- `CategoryFactory` - Categories with tree structure
- `TransactionFactory` - Transactions with time-series support

## Performance Thresholds

Current performance targets:

| Operation | Threshold | Records |
|-----------|-----------|---------|
| Bulk Insert | 5s | 1,000 |
| Bulk Insert | 30s | 10,000 |
| Complex Query | 2s | 10,000+ |
| Aggregation | 3s | 5,000+ |
| Pagination | 500ms | Any offset |

## Coverage Reports

Test coverage includes:
- Entity definitions
- Repository operations
- Migration scripts
- Test factories
- Database configuration

View coverage report:
```bash
npm run test:db:coverage
open coverage/lcov-report/index.html
```

## Continuous Integration

### GitHub Actions Integration
```yaml
- name: Run Database Tests
  run: npm run test:db:suite
  env:
    NODE_ENV: test
    USE_TEST_CONTAINERS: true
```

### Test Results
Test suite generates `test-results.json` with:
- Test summary and metrics
- Performance benchmarks
- Database compatibility info
- Coverage analysis
- Optimization recommendations

## Troubleshooting

### Common Issues

#### Docker/TestContainers Issues
```bash
# Check Docker status
docker --version
docker ps

# Pull PostgreSQL image
docker pull postgres:15-alpine
```

#### Local PostgreSQL Issues
```bash
# Check connection
psql -h localhost -U postgres -d moneywise_test -c "SELECT 1"

# Reset test database
DROP DATABASE IF EXISTS moneywise_test;
CREATE DATABASE moneywise_test;
```

#### TimescaleDB Issues
```bash
# Check TimescaleDB availability
psql -d moneywise_test -c "SELECT timescaledb_version()"

# Install TimescaleDB (if not available)
# Note: TimescaleDB tests will be skipped if extension not available
```

#### Performance Issues
- Increase Jest timeout in jest.database.config.js
- Reduce test data size for slower systems
- Check system resources (CPU, memory, disk)

### Debug Mode
```bash
# Run with detailed logging
NODE_ENV=test-debug npm run test:db

# Run specific test file
npm run test:db -- --testPathPattern='entity-relationships'
```

## Contributing

### Adding New Tests
1. Create test file in appropriate subdirectory
2. Use existing factories for test data
3. Follow naming convention: `*.test.ts`
4. Include performance assertions where applicable

### Adding New Entities
1. Add entity to `entities/index.ts`
2. Create factory in `factories/test-data.factory.ts`
3. Add relationship tests in `entity-relationships.test.ts`
4. Update test suite coverage

### Performance Testing
1. Use realistic data volumes
2. Set appropriate thresholds
3. Include query plan analysis
4. Test with and without indexes

## Support

For database test issues:
1. Check test logs for specific errors
2. Verify database connectivity
3. Ensure proper test environment setup
4. Review performance thresholds for your system

Test suite provides detailed diagnostics and recommendations for optimization.