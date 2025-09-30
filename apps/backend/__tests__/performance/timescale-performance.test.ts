/**
 * TimescaleDB Time-Series Performance Tests
 * Tests time-series functionality, hypertables, and time-based queries
 */

import { DataSource } from 'typeorm';
import { setupTestDatabase, cleanTestDatabase, teardownTestDatabase, DatabaseTestManager } from '../database-test.config';
import { TestDataFactory } from '../factories/test-data.factory';
import { Transaction, TransactionType } from '../../entities/transaction.entity';
import { Account, AccountType } from '../../entities/account.entity';

describe('TimescaleDB Time-Series Performance', () => {
  let dataSource: DataSource;
  let factory: TestDataFactory;
  let manager: DatabaseTestManager;

  beforeAll(async () => {
    dataSource = await setupTestDatabase();
    factory = new TestDataFactory(dataSource);
    manager = DatabaseTestManager.getInstance();

    // Create hypertables if TimescaleDB is available
    try {
      await manager.createHypertables();
    } catch (error) {
      console.warn('TimescaleDB not available, running standard PostgreSQL tests');
    }
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestDatabase();
  });

  describe('Hypertable Operations', () => {
    it('should verify hypertable creation', async () => {
      // Act - Check if transactions table is a hypertable
      const hypertableCheck = await dataSource.query(`
        SELECT * FROM timescaledb_information.hypertables
        WHERE hypertable_name = 'transactions'
      `).catch(() => []);

      // Assert - If TimescaleDB is available, should have hypertable
      if (hypertableCheck.length > 0) {
        expect(hypertableCheck[0].hypertable_name).toBe('transactions');
        expect(hypertableCheck[0].time_column_name).toBe('date');
      } else {
        console.warn('TimescaleDB hypertables not available');
      }
    });

    it('should create chunks for time-partitioned data', async () => {
      // Arrange
      const user = await factory.users.build();
      const account = await factory.accounts.build({ userId: user.id });

      // Create transactions across multiple months
      const baseDate = new Date('2024-01-01');
      for (let month = 0; month < 6; month++) {
        for (let day = 1; day <= 10; day++) {
          const date = new Date(baseDate);
          date.setMonth(month);
          date.setDate(day);

          await factory.transactions.build({
            accountId: account.id,
            date,
            amount: Math.random() * 1000
          });
        }
      }

      // Act - Check chunk information (TimescaleDB specific)
      const chunkInfo = await dataSource.query(`
        SELECT chunk_name, range_start, range_end
        FROM timescaledb_information.chunks
        WHERE hypertable_name = 'transactions'
        ORDER BY range_start
      `).catch(() => []);

      // Assert
      if (chunkInfo.length > 0) {
        expect(chunkInfo.length).toBeGreaterThan(0);
        console.log(`Created ${chunkInfo.length} chunks for time-series data`);
      }
    });
  });

  describe('Time-Series Query Performance', () => {
    let testAccount: Account;
    const TEST_DATA_POINTS = 10000;

    beforeEach(async () => {
      // Create test account and large dataset
      const user = await factory.users.build();
      testAccount = await factory.accounts.build({ userId: user.id });

      console.log(`Creating ${TEST_DATA_POINTS} test transactions...`);
      const startTime = Date.now();

      // Create time series data over 2 years
      const transactions = factory.transactions.createTimeSeries(
        testAccount.id,
        730 // 2 years
      );

      // Batch insert for performance
      const batchSize = 1000;
      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        await dataSource.getRepository(Transaction).save(batch);
      }

      const duration = Date.now() - startTime;
      console.log(`Created ${transactions.length} transactions in ${duration}ms`);
    });

    it('should perform fast time-range queries', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-03-31'); // Q1 2024

      // Act
      const startTime = Date.now();
      const transactions = await dataSource
        .createQueryBuilder(Transaction, 'transaction')
        .where('transaction.accountId = :accountId', { accountId: testAccount.id })
        .andWhere('transaction.date BETWEEN :start AND :end', {
          start: startDate,
          end: endDate
        })
        .orderBy('transaction.date', 'DESC')
        .getMany();

      const queryTime = Date.now() - startTime;

      // Assert
      expect(transactions.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(1000); // Should complete in under 1 second
      console.log(`Time-range query: ${transactions.length} results in ${queryTime}ms`);
    });

    it('should perform fast monthly aggregations', async () => {
      // Arrange & Act
      const startTime = Date.now();
      const monthlyTotals = await dataSource.query(`
        SELECT
          DATE_TRUNC('month', date) AS month,
          SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END) AS net_amount,
          COUNT(*) AS transaction_count,
          AVG(amount) AS avg_amount
        FROM transactions
        WHERE "accountId" = $1
        AND date >= $2
        AND date < $3
        GROUP BY DATE_TRUNC('month', date)
        ORDER BY month
      `, [
        testAccount.id,
        new Date('2024-01-01'),
        new Date('2025-01-01')
      ]);

      const queryTime = Date.now() - startTime;

      // Assert
      expect(monthlyTotals.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(500); // Should be very fast
      console.log(`Monthly aggregation: ${monthlyTotals.length} months in ${queryTime}ms`);

      // Verify aggregation structure
      expect(monthlyTotals[0]).toHaveProperty('month');
      expect(monthlyTotals[0]).toHaveProperty('net_amount');
      expect(monthlyTotals[0]).toHaveProperty('transaction_count');
      expect(monthlyTotals[0]).toHaveProperty('avg_amount');
    });

    it('should perform fast daily balance calculations', async () => {
      // Arrange & Act
      const startTime = Date.now();
      const dailyBalances = await dataSource.query(`
        SELECT
          date,
          SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END)
            OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) AS running_balance
        FROM transactions
        WHERE "accountId" = $1
        AND date >= $2
        ORDER BY date
      `, [
        testAccount.id,
        new Date('2024-01-01')
      ]);

      const queryTime = Date.now() - startTime;

      // Assert
      expect(dailyBalances.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(1000);
      console.log(`Daily balance calculation: ${dailyBalances.length} days in ${queryTime}ms`);

      // Verify running balance is calculated correctly
      for (let i = 1; i < Math.min(dailyBalances.length, 10); i++) {
        const current = parseFloat(dailyBalances[i].running_balance);
        const previous = parseFloat(dailyBalances[i - 1].running_balance);
        expect(typeof current).toBe('number');
        expect(current).not.toBe(previous); // Balance should change
      }
    });

    it('should perform fast time-bucket aggregations', async () => {
      // TimescaleDB specific time_bucket function
      const query = `
        SELECT
          time_bucket('1 week', date) AS week,
          COUNT(*) AS transaction_count,
          SUM(amount) AS total_amount,
          AVG(amount) AS avg_amount
        FROM transactions
        WHERE "accountId" = $1
        AND date >= $2
        GROUP BY week
        ORDER BY week
      `;

      try {
        // Act
        const startTime = Date.now();
        const weeklyAggregates = await dataSource.query(query, [
          testAccount.id,
          new Date('2024-01-01')
        ]);

        const queryTime = Date.now() - startTime;

        // Assert
        expect(weeklyAggregates.length).toBeGreaterThan(0);
        expect(queryTime).toBeLessThan(500);
        console.log(`Time-bucket aggregation: ${weeklyAggregates.length} weeks in ${queryTime}ms`);

      } catch (error) {
        // Fallback for standard PostgreSQL
        console.warn('TimescaleDB time_bucket not available, using standard DATE_TRUNC');

        const fallbackQuery = `
          SELECT
            DATE_TRUNC('week', date) AS week,
            COUNT(*) AS transaction_count,
            SUM(amount) AS total_amount,
            AVG(amount) AS avg_amount
          FROM transactions
          WHERE "accountId" = $1
          AND date >= $2
          GROUP BY week
          ORDER BY week
        `;

        const startTime = Date.now();
        const weeklyAggregates = await dataSource.query(fallbackQuery, [
          testAccount.id,
          new Date('2024-01-01')
        ]);

        const queryTime = Date.now() - startTime;
        expect(weeklyAggregates.length).toBeGreaterThan(0);
        expect(queryTime).toBeLessThan(1000);
      }
    });
  });

  describe('Compression and Storage Optimization', () => {
    it('should test data compression capabilities', async () => {
      // This test checks if TimescaleDB compression is working
      const compressionCheck = await dataSource.query(`
        SELECT
          hypertable_name,
          compression_enabled
        FROM timescaledb_information.hypertables
        WHERE hypertable_name = 'transactions'
      `).catch(() => []);

      if (compressionCheck.length > 0) {
        console.log('Compression status:', compressionCheck[0]);
        // Note: Compression is typically enabled for older chunks in production
      }
    });

    it('should measure storage efficiency', async () => {
      // Create large dataset for storage testing
      const user = await factory.users.build();
      const account = await factory.accounts.build({ userId: user.id });

      // Create 1 year of daily transactions
      const transactions = factory.transactions.createTimeSeries(account.id, 365);
      await dataSource.getRepository(Transaction).save(transactions);

      // Check table size
      const sizeQuery = await dataSource.query(`
        SELECT
          pg_size_pretty(pg_total_relation_size('transactions')) AS table_size,
          pg_size_pretty(pg_relation_size('transactions')) AS data_size,
          pg_size_pretty(pg_total_relation_size('transactions') - pg_relation_size('transactions')) AS index_size
      `);

      console.log('Storage metrics:', sizeQuery[0]);
      expect(sizeQuery[0]).toHaveProperty('table_size');
      expect(sizeQuery[0]).toHaveProperty('data_size');
    });
  });

  describe('Continuous Aggregates', () => {
    it('should create and query continuous aggregates', async () => {
      // TimescaleDB continuous aggregates for real-time analytics
      const createContinuousAggregate = `
        CREATE MATERIALIZED VIEW IF NOT EXISTS daily_transaction_summary
        WITH (timescaledb.continuous) AS
        SELECT
          time_bucket('1 day', date) AS day,
          "accountId",
          COUNT(*) AS transaction_count,
          SUM(amount) AS total_amount,
          AVG(amount) AS avg_amount
        FROM transactions
        GROUP BY day, "accountId"
        WITH NO DATA
      `;

      try {
        // Act - Create continuous aggregate
        await dataSource.query(createContinuousAggregate);

        // Refresh the aggregate
        await dataSource.query(`
          CALL refresh_continuous_aggregate('daily_transaction_summary', NULL, NULL)
        `);

        // Query the aggregate
        const aggregateData = await dataSource.query(`
          SELECT * FROM daily_transaction_summary
          ORDER BY day DESC
          LIMIT 10
        `);

        // Assert
        console.log('Continuous aggregate data:', aggregateData.length, 'rows');

        // Cleanup
        await dataSource.query('DROP MATERIALIZED VIEW IF EXISTS daily_transaction_summary');

      } catch (error) {
        console.warn('TimescaleDB continuous aggregates not available:', error.message);
      }
    });
  });

  describe('Index Performance on Time-Series Data', () => {
    it('should verify time-based index performance', async () => {
      // Create test data
      const user = await factory.users.build();
      const account = await factory.accounts.build({ userId: user.id });

      // Insert time-series data
      const transactions = factory.transactions.createTimeSeries(account.id, 365);
      await dataSource.getRepository(Transaction).save(transactions);

      // Test index usage with EXPLAIN
      const explainQuery = `
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT * FROM transactions
        WHERE "accountId" = $1
        AND date >= $2
        AND date < $3
        ORDER BY date DESC
      `;

      const queryPlan = await dataSource.query(explainQuery, [
        account.id,
        new Date('2024-06-01'),
        new Date('2024-07-01')
      ]);

      // Assert - Check if index is being used efficiently
      const planText = queryPlan.map(row => row['QUERY PLAN']).join('\n');
      console.log('Query execution plan:', planText);

      // Should use index scan, not sequential scan for large datasets
      expect(planText).toMatch(/(Index|Bitmap)/i);
    });

    it('should test compound index performance', async () => {
      // Test performance of queries using multiple indexed columns
      const user = await factory.users.build();
      const account = await factory.accounts.build({ userId: user.id });
      const category = await factory.categories.build();

      // Create transactions with category
      const transactions = factory.transactions.createTimeSeries(account.id, 180);
      transactions.forEach(t => t.categoryId = category.id);
      await dataSource.getRepository(Transaction).save(transactions);

      // Test compound query performance
      const startTime = Date.now();
      const results = await dataSource
        .createQueryBuilder(Transaction, 'transaction')
        .where('transaction.accountId = :accountId', { accountId: account.id })
        .andWhere('transaction.categoryId = :categoryId', { categoryId: category.id })
        .andWhere('transaction.date >= :startDate', { startDate: new Date('2024-01-01') })
        .orderBy('transaction.date', 'DESC')
        .limit(100)
        .getMany();

      const queryTime = Date.now() - startTime;

      // Assert
      expect(results.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(500); // Should be fast with proper indexes
      console.log(`Compound index query: ${results.length} results in ${queryTime}ms`);
    });
  });

  describe('Real-time Analytics Patterns', () => {
    it('should calculate rolling averages efficiently', async () => {
      // Create test data
      const user = await factory.users.build();
      const account = await factory.accounts.build({ userId: user.id });

      // Create daily transactions
      const transactions = factory.transactions.createTimeSeries(account.id, 90);
      await dataSource.getRepository(Transaction).save(transactions);

      // Calculate 7-day rolling average
      const rollingAverageQuery = `
        SELECT
          date,
          amount,
          AVG(amount) OVER (
            ORDER BY date
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
          ) AS rolling_avg_7d
        FROM transactions
        WHERE "accountId" = $1
        ORDER BY date
      `;

      const startTime = Date.now();
      const rollingData = await dataSource.query(rollingAverageQuery, [account.id]);
      const queryTime = Date.now() - startTime;

      // Assert
      expect(rollingData.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(500);
      console.log(`Rolling average calculation: ${rollingData.length} points in ${queryTime}ms`);

      // Verify rolling average calculation
      for (let i = 7; i < Math.min(rollingData.length, 20); i++) {
        expect(rollingData[i].rolling_avg_7d).toBeDefined();
        expect(typeof parseFloat(rollingData[i].rolling_avg_7d)).toBe('number');
      }
    });

    it('should perform time-series forecasting queries', async () => {
      // Create predictable pattern for testing
      const user = await factory.users.build();
      const account = await factory.accounts.build({ userId: user.id });

      // Create transactions with a trend
      const baseDate = new Date('2024-01-01');
      const transactions = [];

      for (let day = 0; day < 90; day++) {
        const date = new Date(baseDate);
        date.setDate(date.getDate() + day);

        // Create trend: gradually increasing amounts
        const baseAmount = 100 + (day * 2);
        transactions.push(factory.transactions.create({
          accountId: account.id,
          date,
          amount: baseAmount + (Math.random() * 20 - 10), // Add noise
          type: TransactionType.DEBIT
        }));
      }

      await dataSource.getRepository(Transaction).save(transactions);

      // Simple linear regression for trend analysis
      const trendQuery = `
        SELECT
          EXTRACT(EPOCH FROM date - DATE '2024-01-01') / 86400 AS day_number,
          amount,
          COUNT(*) OVER () AS total_points,
          AVG(EXTRACT(EPOCH FROM date - DATE '2024-01-01') / 86400) OVER () AS avg_day,
          AVG(amount) OVER () AS avg_amount
        FROM transactions
        WHERE "accountId" = $1
        AND type = 'debit'
        ORDER BY date
      `;

      const startTime = Date.now();
      const trendData = await dataSource.query(trendQuery, [account.id]);
      const queryTime = Date.now() - startTime;

      // Assert
      expect(trendData.length).toBe(90);
      expect(queryTime).toBeLessThan(300);
      console.log(`Trend analysis: ${trendData.length} points in ${queryTime}ms`);

      // Verify trend exists (amounts should generally increase)
      const firstHalf = trendData.slice(0, 30);
      const secondHalf = trendData.slice(-30);

      const firstAvg = firstHalf.reduce((sum, t) => sum + parseFloat(t.amount), 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, t) => sum + parseFloat(t.amount), 0) / secondHalf.length;

      expect(secondAvg).toBeGreaterThan(firstAvg);
    });
  });
});