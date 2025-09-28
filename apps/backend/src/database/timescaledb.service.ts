import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
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

@Injectable()
export class TimescaleDBService implements OnModuleInit {
  private readonly logger = new Logger(TimescaleDBService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.initializeTimescaleDB();
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

      // Convert transactions table to hypertable
      await this.createHypertable({
        tableName: 'transactions',
        timeColumn: 'date',
        chunkTimeInterval: '1 month',
        compressionAfter: '7 days',
        retentionAfter: '7 years',
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

  async getTimescaleDBInfo(): Promise<any> {
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
}