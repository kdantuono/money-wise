import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { TimescaleDBService, HypertableConfig } from '@/database/timescaledb.service';

describe('TimescaleDBService', () => {
  let service: TimescaleDBService;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let loggerSpy: jest.SpyInstance;

  const createMockDataSource = (): jest.Mocked<DataSource> => ({
    query: jest.fn(),
  } as any);

  beforeEach(async () => {
    mockDataSource = createMockDataSource();
    mockConfigService = {
      get: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimescaleDBService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TimescaleDBService>(TimescaleDBService);

    // Spy on logger methods
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize TimescaleDB when enabled in configuration', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue({ enabled: true });
      mockDataSource.query
        .mockResolvedValueOnce([{ default_version: '2.11.0', installed_version: '2.11.0' }]) // extension check
        .mockResolvedValueOnce([{ is_hypertable: false }]) // isTableHypertable
        .mockResolvedValueOnce([{ create_hypertable: 'success' }]); // create hypertable

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockConfigService.get).toHaveBeenCalledWith('timescaledb');
      expect(mockDataSource.query).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('TimescaleDB extension verified'));
    });

    it('should skip initialization when disabled in configuration', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue({ enabled: false });

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockDataSource.query).not.toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith('TimescaleDB initialization skipped (disabled in configuration)');
    });

    it('should skip initialization when configuration is not provided', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue(null);

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockDataSource.query).not.toHaveBeenCalled();
    });

    it('should handle missing TimescaleDB extension gracefully', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue({ enabled: true });
      mockDataSource.query.mockResolvedValueOnce([]); // no extension found

      // Act
      await service.onModuleInit();

      // Assert
      expect(Logger.prototype.warn).toHaveBeenCalledWith('TimescaleDB extension not available');
    });

    it('should throw error when initialization fails', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue({ enabled: true });
      const dbError = new Error('Database connection failed');
      mockDataSource.query.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(service.onModuleInit()).rejects.toThrow('Database connection failed');
      expect(Logger.prototype.error).toHaveBeenCalledWith('TimescaleDB initialization failed', dbError);
    });
  });

  describe('createHypertable', () => {
    it('should create a basic hypertable with required parameters', async () => {
      // Arrange
      const config: HypertableConfig = {
        tableName: 'test_table',
        timeColumn: 'timestamp',
      };
      mockDataSource.query.mockResolvedValueOnce([{ create_hypertable: 'success' }]);

      // Act
      await service.createHypertable(config);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT create_hypertable('test_table', 'timestamp'")
      );
      expect(loggerSpy).toHaveBeenCalledWith('Hypertable created for test_table');
    });

    it('should create hypertable with partition column', async () => {
      // Arrange
      const config: HypertableConfig = {
        tableName: 'test_table',
        timeColumn: 'timestamp',
        partitionColumn: 'user_id',
      };
      mockDataSource.query.mockResolvedValueOnce([{ create_hypertable: 'success' }]);

      // Act
      await service.createHypertable(config);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("partitioning_column => 'user_id'")
      );
    });

    it('should create hypertable with chunk time interval', async () => {
      // Arrange
      const config: HypertableConfig = {
        tableName: 'test_table',
        timeColumn: 'timestamp',
        chunkTimeInterval: '7 days',
      };
      mockDataSource.query.mockResolvedValueOnce([{ create_hypertable: 'success' }]);

      // Act
      await service.createHypertable(config);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("chunk_time_interval => INTERVAL '7 days'")
      );
    });

    it('should add compression policy when specified', async () => {
      // Arrange
      const config: HypertableConfig = {
        tableName: 'test_table',
        timeColumn: 'timestamp',
        compressionAfter: '7 days',
      };
      mockDataSource.query
        .mockResolvedValueOnce([{ create_hypertable: 'success' }])
        .mockResolvedValueOnce([]) // ALTER TABLE
        .mockResolvedValueOnce([{ add_compression_policy: 'success' }]);

      // Act
      await service.createHypertable(config);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledTimes(3);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('timescaledb.compress')
      );
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Compression policy added'));
    });

    it('should add retention policy when specified', async () => {
      // Arrange
      const config: HypertableConfig = {
        tableName: 'test_table',
        timeColumn: 'timestamp',
        retentionAfter: '365 days',
      };
      mockDataSource.query
        .mockResolvedValueOnce([{ create_hypertable: 'success' }])
        .mockResolvedValueOnce([{ add_retention_policy: 'success' }]);

      // Act
      await service.createHypertable(config);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledTimes(2);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('add_retention_policy')
      );
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Retention policy added'));
    });

    it('should throw error when hypertable creation fails', async () => {
      // Arrange
      const config: HypertableConfig = {
        tableName: 'test_table',
        timeColumn: 'timestamp',
      };
      const dbError = new Error('Table does not exist');
      mockDataSource.query.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(service.createHypertable(config)).rejects.toThrow('Table does not exist');
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to create hypertable for test_table',
        dbError
      );
    });
  });

  describe('addCompressionPolicy', () => {
    it('should add compression policy successfully', async () => {
      // Arrange
      mockDataSource.query
        .mockResolvedValueOnce([]) // ALTER TABLE
        .mockResolvedValueOnce([{ add_compression_policy: 'success' }]);

      // Act
      await service.addCompressionPolicy('test_table', '7 days');

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledTimes(2);
      expect(mockDataSource.query).toHaveBeenNthCalledWith(1, expect.stringContaining('ALTER TABLE test_table'));
      expect(mockDataSource.query).toHaveBeenNthCalledWith(2, expect.stringContaining('add_compression_policy'));
      expect(loggerSpy).toHaveBeenCalledWith('Compression policy added for test_table (after 7 days)');
    });

    it('should configure compression with segmentby', async () => {
      // Arrange
      mockDataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ add_compression_policy: 'success' }]);

      // Act
      await service.addCompressionPolicy('transactions', '30 days');

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("timescaledb.compress_segmentby = 'account_id'")
      );
    });

    it('should throw error when compression policy fails', async () => {
      // Arrange
      const dbError = new Error('Compression policy failed');
      mockDataSource.query.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(service.addCompressionPolicy('test_table', '7 days')).rejects.toThrow(
        'Compression policy failed'
      );
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to add compression policy for test_table',
        dbError
      );
    });
  });

  describe('addRetentionPolicy', () => {
    it('should add retention policy successfully', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValueOnce([{ add_retention_policy: 'success' }]);

      // Act
      await service.addRetentionPolicy('test_table', '365 days');

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT add_retention_policy('test_table', INTERVAL '365 days')")
      );
      expect(loggerSpy).toHaveBeenCalledWith('Retention policy added for test_table (retain for 365 days)');
    });

    it('should throw error when retention policy fails', async () => {
      // Arrange
      const dbError = new Error('Retention policy failed');
      mockDataSource.query.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(service.addRetentionPolicy('test_table', '365 days')).rejects.toThrow(
        'Retention policy failed'
      );
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to add retention policy for test_table',
        dbError
      );
    });
  });

  describe('isTableHypertable', () => {
    it('should return true when table is a hypertable', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValueOnce([{ is_hypertable: true }]);

      // Act
      const result = await service.isTableHypertable('transactions');

      // Assert
      expect(result).toBe(true);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('timescaledb_information.hypertables'),
        ['transactions']
      );
    });

    it('should return false when table is not a hypertable', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValueOnce([{ is_hypertable: false }]);

      // Act
      const result = await service.isTableHypertable('regular_table');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when query returns empty result', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValueOnce([]);

      // Act
      const result = await service.isTableHypertable('nonexistent_table');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false on database error and log error', async () => {
      // Arrange
      const dbError = new Error('Database error');
      mockDataSource.query.mockRejectedValueOnce(dbError);

      // Act
      const result = await service.isTableHypertable('test_table');

      // Assert
      expect(result).toBe(false);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to check hypertable status for test_table',
        dbError
      );
    });
  });

  describe('getHypertableStatus', () => {
    it('should return hypertable status successfully', async () => {
      // Arrange
      const mockStatus = [
        {
          hypertableName: 'transactions',
          isHypertable: true,
          compressionEnabled: true,
          retentionEnabled: true,
        },
      ];
      mockDataSource.query.mockResolvedValueOnce(mockStatus);

      // Act
      const result = await service.getHypertableStatus();

      // Assert
      expect(result).toEqual(mockStatus);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('check_hypertable_status()')
      );
    });

    it('should throw error when status query fails', async () => {
      // Arrange
      const dbError = new Error('Status query failed');
      mockDataSource.query.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(service.getHypertableStatus()).rejects.toThrow('Status query failed');
      expect(Logger.prototype.error).toHaveBeenCalledWith('Failed to get hypertable status', dbError);
    });
  });

  describe('createContinuousAggregate', () => {
    it('should create continuous aggregate with refresh policy', async () => {
      // Arrange
      const viewName = 'daily_transaction_summary';
      const query = 'SELECT time_bucket(\'1 day\', date) as bucket, COUNT(*) FROM transactions GROUP BY bucket';
      const refreshInterval = '1 hour';

      mockDataSource.query
        .mockResolvedValueOnce([]) // CREATE MATERIALIZED VIEW
        .mockResolvedValueOnce([{ add_continuous_aggregate_policy: 'success' }]);

      // Act
      await service.createContinuousAggregate(viewName, query, refreshInterval);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledTimes(2);
      expect(mockDataSource.query).toHaveBeenNthCalledWith(1, expect.stringContaining('CREATE MATERIALIZED VIEW'));
      expect(mockDataSource.query).toHaveBeenNthCalledWith(2, expect.stringContaining('add_continuous_aggregate_policy'));
      expect(loggerSpy).toHaveBeenCalledWith(
        `Continuous aggregate ${viewName} created with refresh interval ${refreshInterval}`
      );
    });

    it('should throw error when continuous aggregate creation fails', async () => {
      // Arrange
      const dbError = new Error('View already exists');
      mockDataSource.query.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(
        service.createContinuousAggregate('test_view', 'SELECT 1', '1 hour')
      ).rejects.toThrow('View already exists');
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to create continuous aggregate test_view',
        dbError
      );
    });
  });

  describe('getTimescaleDBInfo', () => {
    it('should return complete TimescaleDB information', async () => {
      // Arrange
      const mockExtensions = [
        { name: 'timescaledb', default_version: '2.11.0', installed_version: '2.11.0' },
        { name: 'uuid-ossp', default_version: '1.1', installed_version: '1.1' },
      ];
      const mockHypertables = [{ hypertable_name: 'transactions' }];
      const mockPolicies = [{ policy_name: 'compression_policy' }];

      mockDataSource.query
        .mockResolvedValueOnce(mockExtensions)
        .mockResolvedValueOnce(mockHypertables)
        .mockResolvedValueOnce(mockPolicies);

      // Act
      const result = await service.getTimescaleDBInfo();

      // Assert
      expect(result).toEqual({
        extensions: mockExtensions,
        hypertables: mockHypertables,
        policies: mockPolicies,
      });
      expect(mockDataSource.query).toHaveBeenCalledTimes(3);
    });

    it('should throw error when info query fails', async () => {
      // Arrange
      const dbError = new Error('Query failed');
      mockDataSource.query.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(service.getTimescaleDBInfo()).rejects.toThrow('Query failed');
      expect(Logger.prototype.error).toHaveBeenCalledWith('Failed to get TimescaleDB info', dbError);
    });
  });

  describe('optimizeHypertable', () => {
    it('should optimize hypertable chunks successfully', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValueOnce([{ reorder_chunk: 'success' }]);

      // Act
      await service.optimizeHypertable('transactions');

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT reorder_chunk(chunk')
      );
      expect(loggerSpy).toHaveBeenCalledWith('Hypertable transactions optimized');
    });

    it('should throw error when optimization fails', async () => {
      // Arrange
      const dbError = new Error('Optimization failed');
      mockDataSource.query.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(service.optimizeHypertable('transactions')).rejects.toThrow('Optimization failed');
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to optimize hypertable transactions',
        dbError
      );
    });
  });

  describe('getTransactionTrends', () => {
    it('should get transaction trends without filters', async () => {
      // Arrange
      const mockTrends = [
        {
          period: new Date('2025-01-01'),
          transaction_count: 10,
          total_debits: 500,
          total_credits: 1000,
          net_flow: 500,
          avg_amount: 75,
          min_amount: 10,
          max_amount: 200,
        },
      ];
      mockDataSource.query.mockResolvedValueOnce(mockTrends);

      // Act
      const result = await service.getTransactionTrends();

      // Assert
      expect(result).toEqual(mockTrends);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("time_bucket('1 day', date)"),
        []
      );
    });

    it('should get transaction trends with account filter', async () => {
      // Arrange
      const accountId = 'acc-123';
      mockDataSource.query.mockResolvedValueOnce([]);

      // Act
      await service.getTransactionTrends(accountId);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('"accountId" = $1'),
        [accountId]
      );
    });

    it('should get transaction trends with date range', async () => {
      // Arrange
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      mockDataSource.query.mockResolvedValueOnce([]);

      // Act
      await service.getTransactionTrends(undefined, '1 day', startDate, endDate);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('date >= $1'),
        [startDate, endDate]
      );
    });

    it('should support custom time bucket period', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValueOnce([]);

      // Act
      await service.getTransactionTrends(undefined, '1 week');

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("time_bucket('1 week', date)"),
        []
      );
    });
  });

  describe('getCategorySpendingTrends', () => {
    it('should get category spending trends without category filter', async () => {
      // Arrange
      const mockTrends = [
        {
          period: new Date('2025-01-01'),
          categoryId: 'cat-123',
          spending: 500,
          transaction_count: 10,
          avg_transaction: 50,
        },
      ];
      mockDataSource.query.mockResolvedValueOnce(mockTrends);

      // Act
      const result = await service.getCategorySpendingTrends();

      // Assert
      expect(result).toEqual(mockTrends);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY period, "categoryId"'),
        [12]
      );
    });

    it('should get category spending trends with category filter', async () => {
      // Arrange
      const categoryId = 'cat-123';
      mockDataSource.query.mockResolvedValueOnce([]);

      // Act
      await service.getCategorySpendingTrends(categoryId, '1 week', 10);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('"categoryId" = $2'),
        [10, categoryId]
      );
    });

    it('should respect limit parameter', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValueOnce([]);

      // Act
      await service.getCategorySpendingTrends(undefined, '1 month', 5);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [5]
      );
    });
  });

  describe('getAccountBalanceHistory', () => {
    it('should get account balance history', async () => {
      // Arrange
      const accountId = 'acc-123';
      const mockHistory = [
        {
          period: new Date('2025-01-01'),
          balance_change: 100,
          running_balance: 1000,
          transaction_count: 5,
        },
      ];
      mockDataSource.query.mockResolvedValueOnce(mockHistory);

      // Act
      const result = await service.getAccountBalanceHistory(accountId);

      // Assert
      expect(result).toEqual(mockHistory);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('SUM(SUM(CASE WHEN type'),
        [accountId, 30]
      );
    });

    it('should support custom period and limit', async () => {
      // Arrange
      const accountId = 'acc-123';
      mockDataSource.query.mockResolvedValueOnce([]);

      // Act
      await service.getAccountBalanceHistory(accountId, '1 week', 60);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("time_bucket('1 week', date)"),
        [accountId, 60]
      );
    });
  });

  describe('getTopMerchantSpending', () => {
    it('should get top merchant spending without account filter', async () => {
      // Arrange
      const mockSpending = [
        {
          period: new Date('2025-01-01'),
          merchantName: 'Amazon',
          total_spending: 500,
          transaction_count: 10,
          avg_transaction: 50,
        },
      ];
      mockDataSource.query.mockResolvedValueOnce(mockSpending);

      // Act
      const result = await service.getTopMerchantSpending();

      // Assert
      expect(result).toEqual(mockSpending);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('"merchantName"'),
        [10]
      );
    });

    it('should get top merchant spending with account filter', async () => {
      // Arrange
      const accountId = 'acc-123';
      mockDataSource.query.mockResolvedValueOnce([]);

      // Act
      await service.getTopMerchantSpending('1 month', 10, accountId);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('"accountId" = $2'),
        [10, accountId]
      );
    });

    it('should support custom period and limit', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValueOnce([]);

      // Act
      await service.getTopMerchantSpending('1 week', 20);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("time_bucket('1 week', date)"),
        [20]
      );
    });
  });

  describe('detectSpendingAnomalies', () => {
    it('should detect spending anomalies with default threshold', async () => {
      // Arrange
      const accountId = 'acc-123';
      const mockAnomalies = [
        {
          period: new Date('2025-01-01'),
          daily_spending: 1000,
          avg_spending: 100,
          stddev_spending: 50,
          z_score: 18,
          classification: 'anomaly',
        },
      ];
      mockDataSource.query.mockResolvedValueOnce(mockAnomalies);

      // Act
      const result = await service.detectSpendingAnomalies(accountId);

      // Assert
      expect(result).toEqual(mockAnomalies);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('WITH daily_stats AS'),
        [accountId, 2.0]
      );
    });

    it('should support custom period and threshold', async () => {
      // Arrange
      const accountId = 'acc-123';
      mockDataSource.query.mockResolvedValueOnce([]);

      // Act
      await service.detectSpendingAnomalies(accountId, '1 hour', 3.0);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("time_bucket('1 hour', date)"),
        [accountId, 3.0]
      );
    });

    it('should filter only anomalies using z-score', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValueOnce([]);

      // Act
      await service.detectSpendingAnomalies('acc-123', '1 day', 2.5);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE ABS(daily_spending - avg_spending)'),
        ['acc-123', 2.5]
      );
    });
  });

  describe('getTransactionVelocity', () => {
    it('should get transaction velocity without account filter', async () => {
      // Arrange
      const mockVelocity = [
        {
          period: new Date('2025-01-01T12:00:00Z'),
          transaction_velocity: 50,
          total_amount: 1000,
          unique_accounts: 10,
          unique_merchants: 15,
        },
      ];
      mockDataSource.query.mockResolvedValueOnce(mockVelocity);

      // Act
      const result = await service.getTransactionVelocity();

      // Assert
      expect(result).toEqual(mockVelocity);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("time_bucket('1 hour', \"createdAt\")"),
        [24]
      );
    });

    it('should get transaction velocity with account filter', async () => {
      // Arrange
      const accountId = 'acc-123';
      mockDataSource.query.mockResolvedValueOnce([]);

      // Act
      await service.getTransactionVelocity('1 hour', accountId, 48);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('"accountId" = $2'),
        [48, accountId]
      );
    });

    it('should support custom period', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValueOnce([]);

      // Act
      await service.getTransactionVelocity('15 minutes');

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("time_bucket('15 minutes', \"createdAt\")"),
        [24]
      );
    });
  });

  describe('getContinuousAggregateData', () => {
    it('should get continuous aggregate data with default limit', async () => {
      // Arrange
      const viewName = 'daily_transaction_summary';
      const mockData = [{ bucket: new Date('2025-01-01'), count: 100 }];
      mockDataSource.query.mockResolvedValueOnce(mockData);

      // Act
      const result = await service.getContinuousAggregateData(viewName);

      // Assert
      expect(result).toEqual(mockData);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining(`SELECT * FROM ${viewName}`),
        [30]
      );
    });

    it('should support custom limit', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValueOnce([]);

      // Act
      await service.getContinuousAggregateData('test_view', 100);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1'),
        [100]
      );
    });
  });

  describe('refreshContinuousAggregate', () => {
    it('should refresh continuous aggregate successfully', async () => {
      // Arrange
      const viewName = 'daily_transaction_summary';
      const startTime = new Date('2025-01-01');
      const endTime = new Date('2025-01-31');
      mockDataSource.query.mockResolvedValueOnce([]);

      // Act
      await service.refreshContinuousAggregate(viewName, startTime, endTime);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('CALL refresh_continuous_aggregate'),
        [startTime, endTime]
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Continuous aggregate ${viewName} refreshed`)
      );
    });

    it('should throw error when refresh fails', async () => {
      // Arrange
      const dbError = new Error('Refresh failed');
      mockDataSource.query.mockRejectedValueOnce(dbError);

      // Act & Assert
      await expect(
        service.refreshContinuousAggregate('test_view', new Date(), new Date())
      ).rejects.toThrow('Refresh failed');
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to refresh continuous aggregate test_view',
        dbError
      );
    });
  });

  describe('getChunkStatistics', () => {
    it('should get chunk statistics for hypertable', async () => {
      // Arrange
      const tableName = 'transactions';
      const mockStats = [
        {
          chunk_name: '_hyper_1_1_chunk',
          range_start: new Date('2025-01-01'),
          range_end: new Date('2025-01-02'),
          is_compressed: true,
          uncompressed_heap_size: 1000000,
          uncompressed_toast_size: 100000,
          uncompressed_index_size: 50000,
          compressed_heap_size: 200000,
          compressed_toast_size: 20000,
          compressed_index_size: 10000,
          compression_ratio_percent: 20,
        },
      ];
      mockDataSource.query.mockResolvedValueOnce(mockStats);

      // Act
      const result = await service.getChunkStatistics(tableName);

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('timescaledb_information.compressed_chunk_stats'),
        [tableName]
      );
    });

    it('should return empty array when no chunks found', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValueOnce([]);

      // Act
      const result = await service.getChunkStatistics('empty_table');

      // Assert
      expect(result).toEqual([]);
    });

    it('should order chunks by range_start descending', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValueOnce([]);

      // Act
      await service.getChunkStatistics('transactions');

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY range_start DESC'),
        ['transactions']
      );
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle SQL injection attempts in table names', async () => {
      // Arrange
      const maliciousTableName = "test'; DROP TABLE users; --";
      mockDataSource.query.mockResolvedValueOnce([{ is_hypertable: false }]);

      // Act
      const result = await service.isTableHypertable(maliciousTableName);

      // Assert
      expect(result).toBe(false);
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.any(String),
        [maliciousTableName] // Parameterized query protects against injection
      );
    });

    it('should handle empty result sets gracefully', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValueOnce([]);

      // Act
      const result = await service.getTransactionTrends();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle null/undefined parameters in query methods', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValueOnce([]);

      // Act
      const result = await service.getTransactionTrends(undefined, '1 day', undefined, undefined);

      // Assert
      expect(result).toEqual([]);
      expect(mockDataSource.query).toHaveBeenCalledWith(expect.any(String), []);
    });

    it('should handle database connection timeouts', async () => {
      // Arrange
      const timeoutError = new Error('Connection timeout');
      mockDataSource.query.mockRejectedValueOnce(timeoutError);

      // Act & Assert
      await expect(service.getTimescaleDBInfo()).rejects.toThrow('Connection timeout');
    });

    it('should handle concurrent policy creation attempts', async () => {
      // Arrange
      const duplicateError = new Error('Policy already exists');
      mockDataSource.query.mockRejectedValueOnce(duplicateError);

      // Act & Assert
      await expect(service.addCompressionPolicy('transactions', '7 days')).rejects.toThrow(
        'Policy already exists'
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should setup complete hypertable with all policies', async () => {
      // Arrange
      const config: HypertableConfig = {
        tableName: 'transactions',
        timeColumn: 'date',
        partitionColumn: 'account_id',
        chunkTimeInterval: '1 day',
        compressionAfter: '7 days',
        retentionAfter: '365 days',
      };
      mockDataSource.query
        .mockResolvedValueOnce([{ create_hypertable: 'success' }]) // create
        .mockResolvedValueOnce([]) // compression ALTER TABLE
        .mockResolvedValueOnce([{ add_compression_policy: 'success' }]) // compression policy
        .mockResolvedValueOnce([{ add_retention_policy: 'success' }]); // retention policy

      // Act
      await service.createHypertable(config);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledTimes(4);
      expect(loggerSpy).toHaveBeenCalledWith('Hypertable created for transactions');
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Compression policy added'));
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('Retention policy added'));
    });

    it('should handle full initialization flow', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue({
        enabled: true,
        chunkTimeInterval: '1 day',
        compressionEnabled: true,
        compressionAfter: '7 days',
        retentionEnabled: true,
        retentionAfter: '365 days',
      });
      mockDataSource.query
        .mockResolvedValueOnce([{ default_version: '2.11.0', installed_version: '2.11.0' }]) // extension check
        .mockResolvedValueOnce([{ is_hypertable: false }]) // isTableHypertable
        .mockResolvedValueOnce([{ create_hypertable: 'success' }]) // create hypertable
        .mockResolvedValueOnce([]) // compression ALTER TABLE
        .mockResolvedValueOnce([{ add_compression_policy: 'success' }]) // compression policy
        .mockResolvedValueOnce([{ add_retention_policy: 'success' }]); // retention policy

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledTimes(6);
      expect(loggerSpy).toHaveBeenCalledWith('TimescaleDB initialization completed successfully');
    });
  });
});
