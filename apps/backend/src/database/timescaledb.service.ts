import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

export interface HypertableConfig {
  tableName: string;
  timeColumn: string;
  partitionColumn?: string;
  chunkTimeInterval?: string;
  compressionAfter?: string;
  retentionAfter?: string;
}

export interface HypertableStatus {
  hypertableName: string;
  isHypertable: boolean;
  compressionEnabled: boolean;
  retentionEnabled: boolean;
}

export interface TransactionTrend {
  period: Date;
  transaction_count: number;
  total_debits: number;
  total_credits: number;
  net_flow: number;
  avg_amount: number;
  min_amount: number;
  max_amount: number;
}

export interface CategorySpendingTrend {
  period: Date;
  categoryId: string;
  spending: number;
  transaction_count: number;
  avg_transaction: number;
}

export interface AccountBalanceHistory {
  period: Date;
  balance_change: number;
  running_balance: number;
  transaction_count: number;
}

export interface MerchantSpending {
  period: Date;
  merchantName: string;
  total_spending: number;
  transaction_count: number;
  avg_transaction: number;
}

export interface SpendingAnomaly {
  period: Date;
  daily_spending: number;
  avg_spending: number;
  stddev_spending: number;
  z_score: number;
  classification: 'anomaly' | 'normal';
}

export interface TransactionVelocity {
  period: Date;
  transaction_velocity: number;
  total_amount: number;
  unique_accounts: number;
  unique_merchants: number;
}

export interface ChunkStatistics {
  chunk_name: string;
  range_start: Date;
  range_end: Date;
  is_compressed: boolean;
  uncompressed_heap_size: number;
  uncompressed_toast_size: number;
  uncompressed_index_size: number;
  compressed_heap_size: number;
  compressed_toast_size: number;
  compressed_index_size: number;
  compression_ratio_percent: number;
}

@Injectable()
export class TimescaleDBService implements OnModuleInit {
  private readonly logger = new Logger(TimescaleDBService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const timescaleConfig = this.configService.get('timescaledb');
    if (timescaleConfig?.enabled) {
      await this.initializeTimescaleDB();
    } else {
      this.logger.log('TimescaleDB initialization skipped (disabled in configuration)');
    }
  }

  private async initializeTimescaleDB(): Promise<void> {
    try {
      // Verify TimescaleDB extension is available
      const extensionCheck = await this.dataSource.query(`
        SELECT default_version, installed_version
        FROM pg_available_extensions
        WHERE name = 'timescaledb'
      `);

      if (extensionCheck.length === 0) {
        this.logger.warn('TimescaleDB extension not available');
        return;
      }

      this.logger.log('TimescaleDB extension verified');

      // Initialize hypertables for transactions
      await this.setupTransactionsHypertable();

      this.logger.log('TimescaleDB initialization completed successfully');
    } catch (error) {
      this.logger.error('TimescaleDB initialization failed', error);
      throw error;
    }
  }

  private async setupTransactionsHypertable(): Promise<void> {
    try {
      // Check if transactions table is already a hypertable
      const isHypertable = await this.isTableHypertable('transactions');

      if (isHypertable) {
        this.logger.log('Transactions table is already a hypertable');
        return;
      }

      // Get configuration values
      const timescaleConfig = this.configService.get('timescaledb');

      // Convert transactions table to hypertable
      await this.createHypertable({
        tableName: 'transactions',
        timeColumn: 'date',
        chunkTimeInterval: timescaleConfig?.chunkTimeInterval || '1 day',
        compressionAfter: timescaleConfig?.compressionEnabled ?
          (timescaleConfig?.compressionAfter || '7 days') : undefined,
        retentionAfter: timescaleConfig?.retentionEnabled ?
          (timescaleConfig?.retentionAfter || '7 years') : undefined,
      });

      this.logger.log('Transactions hypertable created successfully');
    } catch (error) {
      this.logger.error('Failed to setup transactions hypertable', error);
      throw error;
    }
  }

  async createHypertable(config: HypertableConfig): Promise<void> {
    const { tableName, timeColumn, partitionColumn, chunkTimeInterval } = config;

    try {
      // Create hypertable
      let hypertableQuery = `
        SELECT create_hypertable('${tableName}', '${timeColumn}'
      `;

      if (partitionColumn) {
        hypertableQuery += `, partitioning_column => '${partitionColumn}'`;
      }

      if (chunkTimeInterval) {
        hypertableQuery += `, chunk_time_interval => INTERVAL '${chunkTimeInterval}'`;
      }

      hypertableQuery += ')';

      await this.dataSource.query(hypertableQuery);
      this.logger.log(`Hypertable created for ${tableName}`);

      // Set up compression policy if specified
      if (config.compressionAfter) {
        await this.addCompressionPolicy(tableName, config.compressionAfter);
      }

      // Set up retention policy if specified
      if (config.retentionAfter) {
        await this.addRetentionPolicy(tableName, config.retentionAfter);
      }
    } catch (error) {
      this.logger.error(`Failed to create hypertable for ${tableName}`, error);
      throw error;
    }
  }

  async addCompressionPolicy(tableName: string, compressAfter: string): Promise<void> {
    try {
      await this.dataSource.query(`
        ALTER TABLE ${tableName} SET (
          timescaledb.compress,
          timescaledb.compress_segmentby = 'account_id'
        )
      `);

      await this.dataSource.query(`
        SELECT add_compression_policy('${tableName}', INTERVAL '${compressAfter}')
      `);

      this.logger.log(`Compression policy added for ${tableName} (after ${compressAfter})`);
    } catch (error) {
      this.logger.error(`Failed to add compression policy for ${tableName}`, error);
      throw error;
    }
  }

  async addRetentionPolicy(tableName: string, retainFor: string): Promise<void> {
    try {
      await this.dataSource.query(`
        SELECT add_retention_policy('${tableName}', INTERVAL '${retainFor}')
      `);

      this.logger.log(`Retention policy added for ${tableName} (retain for ${retainFor})`);
    } catch (error) {
      this.logger.error(`Failed to add retention policy for ${tableName}`, error);
      throw error;
    }
  }

  async isTableHypertable(tableName: string): Promise<boolean> {
    try {
      const result = await this.dataSource.query(`
        SELECT EXISTS(
          SELECT 1 FROM timescaledb_information.hypertables
          WHERE hypertable_name = $1
        ) as is_hypertable
      `, [tableName]);

      return result[0]?.is_hypertable || false;
    } catch (error) {
      this.logger.error(`Failed to check hypertable status for ${tableName}`, error);
      return false;
    }
  }

  async getHypertableStatus(): Promise<HypertableStatus[]> {
    try {
      const result = await this.dataSource.query(`
        SELECT * FROM check_hypertable_status()
      `);

      return result;
    } catch (error) {
      this.logger.error('Failed to get hypertable status', error);
      throw error;
    }
  }

  async createContinuousAggregate(
    viewName: string,
    query: string,
    refreshInterval: string,
  ): Promise<void> {
    try {
      // Create continuous aggregate view
      await this.dataSource.query(`
        CREATE MATERIALIZED VIEW ${viewName}
        WITH (timescaledb.continuous) AS
        ${query}
      `);

      // Add refresh policy
      await this.dataSource.query(`
        SELECT add_continuous_aggregate_policy('${viewName}',
          start_offset => INTERVAL '1 month',
          end_offset => INTERVAL '1 hour',
          schedule_interval => INTERVAL '${refreshInterval}'
        )
      `);

      this.logger.log(`Continuous aggregate ${viewName} created with refresh interval ${refreshInterval}`);
    } catch (error) {
      this.logger.error(`Failed to create continuous aggregate ${viewName}`, error);
      throw error;
    }
  }

  async getTimescaleDBInfo(): Promise<{
    extensions: Array<{ name: string; default_version: string; installed_version: string }>;
    hypertables: Array<Record<string, unknown>>;
    policies: Array<Record<string, unknown>>;
  }> {
    try {
      const [versionInfo, hypertables, policies] = await Promise.all([
        this.dataSource.query(`
          SELECT name, default_version, installed_version
          FROM pg_available_extensions
          WHERE name IN ('timescaledb', 'uuid-ossp')
          ORDER BY name
        `),
        this.dataSource.query(`
          SELECT * FROM timescaledb_information.hypertables
        `),
        this.dataSource.query(`
          SELECT * FROM timescaledb_information.policy_stats
        `),
      ]);

      return {
        extensions: versionInfo,
        hypertables,
        policies,
      };
    } catch (error) {
      this.logger.error('Failed to get TimescaleDB info', error);
      throw error;
    }
  }

  async optimizeHypertable(tableName: string): Promise<void> {
    try {
      // Reorder chunks for better compression
      await this.dataSource.query(`
        SELECT reorder_chunk(chunk, '${tableName}_date_idx')
        FROM timescaledb_information.chunks
        WHERE hypertable_name = '${tableName}'
        AND NOT is_compressed
        ORDER BY chunk_name
        LIMIT 10
      `);

      this.logger.log(`Hypertable ${tableName} optimized`);
    } catch (error) {
      this.logger.error(`Failed to optimize hypertable ${tableName}`, error);
      throw error;
    }
  }

  // Additional Time-Series Query Helpers

  /**
   * Get transaction trends using time bucket aggregation
   * @param accountId - Optional account filter
   * @param period - Time bucket period ('1 hour', '1 day', '1 week', '1 month')
   * @param startDate - Start date for analysis
   * @param endDate - End date for analysis
   */
  async getTransactionTrends(
    accountId?: string,
    period: string = '1 day',
    startDate?: Date,
    endDate?: Date
  ): Promise<TransactionTrend[]> {
    const params: unknown[] = [];
    let whereClause = '';
    let paramIndex = 1;

    if (accountId) {
      whereClause += ` AND "accountId" = $${paramIndex}`;
      params.push(accountId);
      paramIndex++;
    }

    if (startDate) {
      whereClause += ` AND date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereClause += ` AND date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    const query = `
      SELECT
        time_bucket('${period}', date) as period,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_debits,
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_credits,
        SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END) as net_flow,
        AVG(amount) as avg_amount,
        MIN(amount) as min_amount,
        MAX(amount) as max_amount
      FROM transactions
      WHERE status = 'posted' ${whereClause}
      GROUP BY period
      ORDER BY period DESC;
    `;

    return this.dataSource.query(query, params);
  }

  /**
   * Get spending patterns by category over time
   * @param categoryId - Optional category filter
   * @param period - Time bucket period
   * @param limit - Number of periods to return
   */
  async getCategorySpendingTrends(
    categoryId?: string,
    period: string = '1 week',
    limit: number = 12
  ): Promise<CategorySpendingTrend[]> {
    const params: unknown[] = [limit];
    let whereClause = '';

    if (categoryId) {
      whereClause = ` AND "categoryId" = $2`;
      params.push(categoryId);
    }

    const query = `
      SELECT
        time_bucket('${period}', date) as period,
        "categoryId",
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as spending,
        COUNT(*) as transaction_count,
        AVG(CASE WHEN type = 'debit' THEN amount ELSE NULL END) as avg_transaction
      FROM transactions
      WHERE status = 'posted' AND type = 'debit' AND "categoryId" IS NOT NULL ${whereClause}
      GROUP BY period, "categoryId"
      ORDER BY period DESC, spending DESC
      LIMIT $1;
    `;

    return this.dataSource.query(query, params);
  }

  /**
   * Get time-series data for account balance changes
   * @param accountId - Account to analyze
   * @param period - Time bucket period
   * @param limit - Number of periods to return
   */
  async getAccountBalanceHistory(
    accountId: string,
    period: string = '1 day',
    limit: number = 30
  ): Promise<AccountBalanceHistory[]> {
    const query = `
      SELECT
        time_bucket('${period}', date) as period,
        SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END) as balance_change,
        SUM(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END))
          OVER (ORDER BY time_bucket('${period}', date)) as running_balance,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE "accountId" = $1 AND status = 'posted'
      GROUP BY period
      ORDER BY period DESC
      LIMIT $2;
    `;

    return this.dataSource.query(query, [accountId, limit]);
  }

  /**
   * Get top spending merchants over time
   * @param period - Time bucket period
   * @param limit - Number of merchants to return
   * @param accountId - Optional account filter
   */
  async getTopMerchantSpending(
    period: string = '1 month',
    limit: number = 10,
    accountId?: string
  ): Promise<MerchantSpending[]> {
    const params: unknown[] = [limit];
    let whereClause = '';

    if (accountId) {
      whereClause = ` AND "accountId" = $2`;
      params.push(accountId);
    }

    const query = `
      SELECT
        time_bucket('${period}', date) as period,
        "merchantName",
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_spending,
        COUNT(*) as transaction_count,
        AVG(CASE WHEN type = 'debit' THEN amount ELSE NULL END) as avg_transaction
      FROM transactions
      WHERE status = 'posted' AND type = 'debit' AND "merchantName" IS NOT NULL ${whereClause}
      GROUP BY period, "merchantName"
      HAVING SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) > 0
      ORDER BY period DESC, total_spending DESC
      LIMIT $1;
    `;

    return this.dataSource.query(query, params);
  }

  /**
   * Detect spending anomalies using statistical analysis
   * @param accountId - Account to analyze
   * @param period - Analysis period
   * @param threshold - Standard deviation threshold for anomalies
   */
  async detectSpendingAnomalies(
    accountId: string,
    period: string = '1 day',
    threshold: number = 2.0
  ): Promise<SpendingAnomaly[]> {
    const query = `
      WITH daily_stats AS (
        SELECT
          time_bucket('${period}', date) as period,
          SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as daily_spending
        FROM transactions
        WHERE "accountId" = $1 AND status = 'posted'
        GROUP BY period
      ),
      spending_analysis AS (
        SELECT
          period,
          daily_spending,
          AVG(daily_spending) OVER() as avg_spending,
          STDDEV(daily_spending) OVER() as stddev_spending
        FROM daily_stats
      )
      SELECT
        period,
        daily_spending,
        avg_spending,
        stddev_spending,
        ABS(daily_spending - avg_spending) / NULLIF(stddev_spending, 0) as z_score,
        CASE
          WHEN ABS(daily_spending - avg_spending) / NULLIF(stddev_spending, 0) > $2
          THEN 'anomaly'
          ELSE 'normal'
        END as classification
      FROM spending_analysis
      WHERE ABS(daily_spending - avg_spending) / NULLIF(stddev_spending, 0) > $2
      ORDER BY period DESC;
    `;

    return this.dataSource.query(query, [accountId, threshold]);
  }

  /**
   * Get transaction velocity (transactions per unit time)
   * @param period - Time bucket period
   * @param accountId - Optional account filter
   * @param limit - Number of periods to return
   */
  async getTransactionVelocity(
    period: string = '1 hour',
    accountId?: string,
    limit: number = 24
  ): Promise<TransactionVelocity[]> {
    const params: unknown[] = [limit];
    let whereClause = '';

    if (accountId) {
      whereClause = ` AND "accountId" = $2`;
      params.push(accountId);
    }

    const query = `
      SELECT
        time_bucket('${period}', "createdAt") as period,
        COUNT(*) as transaction_velocity,
        SUM(amount) as total_amount,
        COUNT(DISTINCT "accountId") as unique_accounts,
        COUNT(DISTINCT "merchantName") as unique_merchants
      FROM transactions
      WHERE status = 'posted' ${whereClause}
      GROUP BY period
      ORDER BY period DESC
      LIMIT $1;
    `;

    return this.dataSource.query(query, params);
  }

  /**
   * Get continuous aggregate data for dashboard
   * @param viewName - Name of the continuous aggregate view
   * @param limit - Number of records to return
   */
  async getContinuousAggregateData(viewName: string, limit: number = 30): Promise<Record<string, unknown>[]> {
    const query = `
      SELECT * FROM ${viewName}
      ORDER BY bucket DESC
      LIMIT $1;
    `;

    return this.dataSource.query(query, [limit]);
  }

  /**
   * Refresh continuous aggregate manually
   * @param viewName - Name of the continuous aggregate to refresh
   * @param startTime - Start time for refresh window
   * @param endTime - End time for refresh window
   */
  async refreshContinuousAggregate(
    viewName: string,
    startTime: Date,
    endTime: Date
  ): Promise<void> {
    try {
      await this.dataSource.query(`
        CALL refresh_continuous_aggregate('${viewName}', $1, $2);
      `, [startTime, endTime]);

      this.logger.log(`Continuous aggregate ${viewName} refreshed from ${startTime} to ${endTime}`);
    } catch (error) {
      this.logger.error(`Failed to refresh continuous aggregate ${viewName}`, error);
      throw error;
    }
  }

  /**
   * Get hypertable chunk statistics
   * @param tableName - Name of the hypertable
   */
  async getChunkStatistics(tableName: string): Promise<ChunkStatistics[]> {
    const query = `
      SELECT
        chunk_name,
        range_start,
        range_end,
        is_compressed,
        uncompressed_heap_size,
        uncompressed_toast_size,
        uncompressed_index_size,
        compressed_heap_size,
        compressed_toast_size,
        compressed_index_size,
        CASE
          WHEN uncompressed_heap_size > 0
          THEN ROUND((compressed_heap_size::float / uncompressed_heap_size::float) * 100, 2)
          ELSE 0
        END as compression_ratio_percent
      FROM timescaledb_information.compressed_chunk_stats
      WHERE hypertable_name = $1
      ORDER BY range_start DESC;
    `;

    return this.dataSource.query(query, [tableName]);
  }
}