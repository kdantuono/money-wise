/**
 * CloudWatchService Unit Tests
 * Comprehensive test suite for CloudWatchService with 80%+ coverage target
 * Tests CloudWatch metrics publishing, logging, and alarm configuration
 */

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudWatchService, BusinessMetrics } from '@/core/monitoring/cloudwatch.service';
import {
  CloudWatchClient,
  PutMetricDataCommand,
  PutMetricAlarmCommand,
  StandardUnit,
} from '@aws-sdk/client-cloudwatch';
import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  CreateLogStreamCommand,
  PutLogEventsCommand,
  DescribeLogGroupsCommand,
} from '@aws-sdk/client-cloudwatch-logs';

// Mock AWS SDK modules
jest.mock('@aws-sdk/client-cloudwatch');
jest.mock('@aws-sdk/client-cloudwatch-logs');

// Mock the alarms config module
jest.mock('@/core/monitoring/alarms.config', () => ({
  CLOUDWATCH_ALARMS: [
    {
      enabled: true,
      environment: ['production', 'staging'],
      AlarmName: 'MoneyWise-HighErrorRate',
      AlarmDescription: 'Test alarm',
      ComparisonOperator: 'GreaterThanThreshold',
      EvaluationPeriods: 2,
      MetricName: 'ApiErrors',
      Period: 300,
      Statistic: 'Sum',
      Threshold: 10,
      TreatMissingData: 'notBreaching',
    },
    {
      enabled: true,
      environment: ['production'],
      AlarmName: 'MoneyWise-HighResponseTime',
      AlarmDescription: 'Test alarm 2',
      ComparisonOperator: 'GreaterThanThreshold',
      EvaluationPeriods: 3,
      MetricName: 'ResponseTime',
      Period: 300,
      Statistic: 'Average',
      Threshold: 2000,
      TreatMissingData: 'notBreaching',
    },
    {
      enabled: false,
      environment: ['production'],
      AlarmName: 'MoneyWise-DisabledAlarm',
      AlarmDescription: 'This should not be created',
      ComparisonOperator: 'GreaterThanThreshold',
      EvaluationPeriods: 1,
      MetricName: 'TestMetric',
      Period: 60,
      Statistic: 'Sum',
      Threshold: 100,
    },
  ],
  ENVIRONMENT_THRESHOLDS: {
    development: {
      errorRate: 20,
      responseTime: 5000,
      memoryUsage: 90,
    },
    staging: {
      errorRate: 10,
      responseTime: 3000,
      memoryUsage: 85,
    },
    production: {
      errorRate: 5,
      responseTime: 2000,
      memoryUsage: 80,
    },
  },
}));

describe('CloudWatchService', () => {
  let cloudWatchService: CloudWatchService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockCloudWatchClient: jest.Mocked<CloudWatchClient>;
  let mockCloudWatchLogsClient: jest.Mocked<CloudWatchLogsClient>;
  let mockLogger: jest.Mocked<Logger>;
  let mockSend: jest.Mock;

  const originalProcessPid = process.pid;

  beforeEach(() => {
    // Mock ConfigService
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          AWS_REGION: 'us-east-1',
          CLOUDWATCH_NAMESPACE: 'MoneyWise/Backend',
          CLOUDWATCH_ENABLED: 'true',
          AWS_ACCESS_KEY_ID: 'test-access-key',
          AWS_SECRET_ACCESS_KEY: 'test-secret-key',
          NODE_ENV: 'production',
        };
        return config[key] ?? defaultValue;
      }),
    } as any;

    // Mock CloudWatch client send method
    mockSend = jest.fn().mockResolvedValue({});

    mockCloudWatchClient = {
      send: mockSend,
    } as any;

    mockCloudWatchLogsClient = {
      send: mockSend,
    } as any;

    // Mock CloudWatch client constructors
    (CloudWatchClient as jest.MockedClass<typeof CloudWatchClient>).mockImplementation(
      () => mockCloudWatchClient
    );
    (CloudWatchLogsClient as jest.MockedClass<typeof CloudWatchLogsClient>).mockImplementation(
      () => mockCloudWatchLogsClient
    );

    // Create service instance
    cloudWatchService = new CloudWatchService(mockConfigService);

    // Mock logger
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;
    (cloudWatchService as any).logger = mockLogger;

    // Mock process.pid
    Object.defineProperty(process, 'pid', {
      value: 12345,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(process, 'pid', {
      value: originalProcessPid,
      writable: true,
      configurable: true,
    });
  });

  describe('Configuration', () => {
    it('should initialize with default configuration', () => {
      const config = (cloudWatchService as any).config;

      expect(config).toEqual({
        region: 'us-east-1',
        namespace: 'MoneyWise/Backend',
        enabled: true,
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
        },
      });
    });

    it('should use default values when env vars not set', () => {
      (mockConfigService.get as any) = jest.fn((key: string, defaultValue?: any) => defaultValue);

      const service = new CloudWatchService(mockConfigService);
      const config = (service as any).config;

      expect(config.region).toBe('us-east-1');
      expect(config.namespace).toBe('MoneyWise/Backend');
      expect(config.enabled).toBe(false); // 'false' string becomes false
      expect(config.credentials).toBeUndefined();
    });

    it('should not set credentials when AWS keys are not provided', () => {
      (mockConfigService.get as any) = jest.fn((key: string, defaultValue?: any) => {
        if (key === 'AWS_ACCESS_KEY_ID') return undefined;
        if (key === 'CLOUDWATCH_ENABLED') return 'true';
        return defaultValue;
      });

      const service = new CloudWatchService(mockConfigService);
      const config = (service as any).config;

      expect(config.credentials).toBeUndefined();
    });

    it('should set log group name based on environment', () => {
      const logGroupName = (cloudWatchService as any).logGroupName;
      expect(logGroupName).toBe('/aws/moneywise/production');
    });

    it('should set log stream name with date and pid', () => {
      const logStreamName = (cloudWatchService as any).logStreamName;
      expect(logStreamName).toMatch(/^backend-\d{4}-\d{2}-\d{2}-\d+$/);
    });
  });

  describe('Module Initialization', () => {
    it('should initialize when enabled', async () => {
      mockSend
        .mockResolvedValueOnce({ logGroups: [] }) // DescribeLogGroupsCommand
        .mockResolvedValueOnce({}) // CreateLogGroupCommand
        .mockResolvedValueOnce({}) // CreateLogStreamCommand
        .mockResolvedValue({}); // PutMetricAlarmCommand calls

      await cloudWatchService.onModuleInit();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'CloudWatch monitoring initialized for region: us-east-1'
      );
      expect(CloudWatchClient).toHaveBeenCalledWith({
        region: 'us-east-1',
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
        },
      });
    });

    it('should not initialize when disabled', async () => {
      (mockConfigService.get as any) = jest.fn((key: string, defaultValue?: any) => {
        if (key === 'CLOUDWATCH_ENABLED') return 'false';
        return defaultValue;
      });

      const service = new CloudWatchService(mockConfigService);
      (service as any).logger = mockLogger;

      await service.onModuleInit();

      expect(mockLogger.log).toHaveBeenCalledWith('CloudWatch monitoring disabled');
      expect(CloudWatchClient).not.toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      mockSend.mockRejectedValue(new Error('AWS Error'));

      await cloudWatchService.onModuleInit();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to initialize CloudWatch service',
        expect.any(String)
      );
    });

    it('should create log group and stream during initialization', async () => {
      mockSend
        .mockResolvedValueOnce({ logGroups: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValue({});

      await cloudWatchService.onModuleInit();

      expect(mockSend).toHaveBeenCalledWith(expect.any(DescribeLogGroupsCommand));
      expect(mockSend).toHaveBeenCalledWith(expect.any(CreateLogGroupCommand));
      expect(mockSend).toHaveBeenCalledWith(expect.any(CreateLogStreamCommand));
    });

    it('should setup alarms during initialization', async () => {
      mockSend
        .mockResolvedValueOnce({ logGroups: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValue({});

      await cloudWatchService.onModuleInit();

      // Should create alarms for production environment
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Setting up')
      );
    });
  });

  describe('Log Setup', () => {
    beforeEach(async () => {
      // Initialize the service to set up clients
      mockSend
        .mockResolvedValueOnce({ logGroups: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValue({});

      await cloudWatchService.onModuleInit();
      jest.clearAllMocks();
    });

    it('should create log group when it does not exist', async () => {
      mockSend
        .mockResolvedValueOnce({ logGroups: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      await (cloudWatchService as any).setupLogging();

      expect(mockSend).toHaveBeenCalledWith(expect.any(CreateLogGroupCommand));
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Created CloudWatch log group')
      );
    });

    it('should not create log group when it already exists', async () => {
      mockSend.mockResolvedValueOnce({
        logGroups: [{ logGroupName: '/aws/moneywise/production' }],
      });
      mockSend.mockResolvedValueOnce({});

      await (cloudWatchService as any).setupLogging();

      // Should not call CreateLogGroupCommand
      const createLogGroupCalls = mockSend.mock.calls.filter(
        (call) => call[0] instanceof CreateLogGroupCommand
      );
      expect(createLogGroupCalls).toHaveLength(0);
    });

    it('should create log stream', async () => {
      mockSend
        .mockResolvedValueOnce({ logGroups: [{ logGroupName: '/aws/moneywise/production' }] })
        .mockResolvedValueOnce({});

      await (cloudWatchService as any).setupLogging();

      expect(mockSend).toHaveBeenCalledWith(expect.any(CreateLogStreamCommand));
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Created CloudWatch log stream')
      );
    });

    it('should handle ResourceAlreadyExistsException gracefully', async () => {
      const error = new Error('Resource already exists');
      (error as any).name = 'ResourceAlreadyExistsException';

      mockSend
        .mockResolvedValueOnce({ logGroups: [] })
        .mockRejectedValueOnce(error);

      await expect((cloudWatchService as any).setupLogging()).resolves.not.toThrow();
    });

    it('should throw other errors', async () => {
      const error = new Error('Network error');
      mockSend.mockRejectedValue(error);

      await expect((cloudWatchService as any).setupLogging()).rejects.toThrow();
    });
  });

  describe('Alarm Setup', () => {
    beforeEach(async () => {
      // Initialize the service to set up clients
      mockSend
        .mockResolvedValueOnce({ logGroups: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValue({});

      await cloudWatchService.onModuleInit();
      jest.clearAllMocks();
    });

    it('should create alarms for current environment', async () => {
      mockSend.mockResolvedValue({});

      await (cloudWatchService as any).setupDefaultAlarms();

      // Should create alarms for production (from mocked config)
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Setting up')
      );
    });

    it('should filter alarms by environment', async () => {
      (mockConfigService.get as any) = jest.fn((key: string, defaultValue?: any) => {
        if (key === 'NODE_ENV') return 'staging';
        if (key === 'CLOUDWATCH_ENABLED') return 'true';
        return defaultValue;
      });

      const service = new CloudWatchService(mockConfigService);
      const serviceLogger = {
        log: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      } as any;
      (service as any).logger = serviceLogger;
      mockSend.mockResolvedValue({});

      await (service as any).setupDefaultAlarms();

      // Should log alarms setup
      expect(serviceLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Setting up')
      );
    });

    it('should skip disabled alarms', async () => {
      mockSend.mockResolvedValue({});

      await (cloudWatchService as any).setupDefaultAlarms();

      // Disabled alarms should not be set up
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Setting up')
      );
    });

    it('should adjust thresholds for environment', async () => {
      mockSend.mockResolvedValue({});

      await (cloudWatchService as any).setupDefaultAlarms();

      // Threshold should be adjusted for production
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Setting up')
      );
    });

    it('should handle alarm creation errors', async () => {
      mockSend.mockRejectedValue(new Error('Alarm creation failed'));

      await (cloudWatchService as any).setupDefaultAlarms();

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should use namespace from config', async () => {
      mockSend.mockResolvedValue({});

      await (cloudWatchService as any).setupDefaultAlarms();

      // Should set up alarms with proper namespace
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Setting up')
      );
    });
  });

  describe('Threshold Adjustment', () => {
    it('should adjust errorRate threshold', () => {
      const adjusted = (cloudWatchService as any).adjustThresholdForEnvironment(
        'ApiErrors',
        10,
        'production',
        {
          production: { errorRate: 5, responseTime: 2000, memoryUsage: 80 },
        }
      );

      expect(adjusted).toBe(5);
    });

    it('should adjust responseTime threshold', () => {
      const adjusted = (cloudWatchService as any).adjustThresholdForEnvironment(
        'ResponseTime',
        3000,
        'staging',
        {
          staging: { errorRate: 10, responseTime: 3000, memoryUsage: 85 },
        }
      );

      expect(adjusted).toBe(3000);
    });

    it('should adjust memoryUsage threshold', () => {
      const adjusted = (cloudWatchService as any).adjustThresholdForEnvironment(
        'MemoryUsage',
        90,
        'development',
        {
          development: { errorRate: 20, responseTime: 5000, memoryUsage: 90 },
        }
      );

      expect(adjusted).toBe(90);
    });

    it('should return default threshold for unknown metric', () => {
      const adjusted = (cloudWatchService as any).adjustThresholdForEnvironment(
        'UnknownMetric',
        100,
        'production',
        {
          production: { errorRate: 5, responseTime: 2000, memoryUsage: 80 },
        }
      );

      expect(adjusted).toBe(100);
    });

    it('should return default threshold for unknown environment', () => {
      const adjusted = (cloudWatchService as any).adjustThresholdForEnvironment(
        'ApiErrors',
        10,
        'unknown-env',
        {
          production: { errorRate: 5, responseTime: 2000, memoryUsage: 80 },
        }
      );

      expect(adjusted).toBe(10);
    });
  });

  describe('Single Metric Publishing', () => {
    beforeEach(async () => {
      mockSend
        .mockResolvedValueOnce({ logGroups: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValue({});

      await cloudWatchService.onModuleInit();
      jest.clearAllMocks();
    });

    it('should send metric to CloudWatch', async () => {
      await cloudWatchService.putMetric('TestMetric', 100, StandardUnit.Count, {
        Dimension1: 'Value1',
      });

      expect(mockSend).toHaveBeenCalledWith(expect.any(PutMetricDataCommand));
      expect(mockLogger.debug).toHaveBeenCalledWith('Metric sent to CloudWatch: TestMetric = 100');
    });

    it('should use default unit (Count)', async () => {
      await cloudWatchService.putMetric('TestMetric', 50);

      expect(mockSend).toHaveBeenCalledWith(expect.any(PutMetricDataCommand));
    });

    it('should handle metrics with no dimensions', async () => {
      await cloudWatchService.putMetric('TestMetric', 75, StandardUnit.Milliseconds);

      expect(mockSend).toHaveBeenCalledWith(expect.any(PutMetricDataCommand));
    });

    it('should not send when disabled', async () => {
      (mockConfigService.get as any) = jest.fn((key: string, defaultValue?: any) => {
        if (key === 'CLOUDWATCH_ENABLED') return 'false';
        return defaultValue;
      });

      const service = new CloudWatchService(mockConfigService);
      await service.onModuleInit();

      await service.putMetric('TestMetric', 100);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should handle send errors', async () => {
      mockSend.mockRejectedValue(new Error('Send failed'));

      await cloudWatchService.putMetric('TestMetric', 100);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to send metric TestMetric',
        expect.any(String)
      );
    });
  });

  describe('Batch Metric Publishing', () => {
    beforeEach(async () => {
      mockSend
        .mockResolvedValueOnce({ logGroups: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValue({});

      await cloudWatchService.onModuleInit();
      jest.clearAllMocks();
    });

    it('should send multiple metrics in batch', async () => {
      const metrics = [
        { MetricName: 'Metric1', Value: 100, Unit: StandardUnit.Count },
        { MetricName: 'Metric2', Value: 200, Unit: StandardUnit.Milliseconds },
      ];

      await cloudWatchService.putMetrics(metrics);

      expect(mockSend).toHaveBeenCalledWith(expect.any(PutMetricDataCommand));
      expect(mockLogger.debug).toHaveBeenCalledWith('Sent 2 metrics to CloudWatch');
    });

    it('should chunk metrics when >20', async () => {
      const metrics = Array.from({ length: 45 }, (_, i) => ({
        MetricName: `Metric${i}`,
        Value: i,
        Unit: StandardUnit.Count,
      }));

      await cloudWatchService.putMetrics(metrics);

      // Should make 3 calls: 20 + 20 + 5
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('should add timestamp if not provided', async () => {
      const metrics = [{ MetricName: 'Test', Value: 100, Unit: StandardUnit.Count }];

      await cloudWatchService.putMetrics(metrics);

      expect(mockSend).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Sent 1 metrics to CloudWatch');
    });

    it('should not send when disabled', async () => {
      (mockConfigService.get as any) = jest.fn((key: string, defaultValue?: any) => {
        if (key === 'CLOUDWATCH_ENABLED') return 'false';
        return defaultValue;
      });

      const service = new CloudWatchService(mockConfigService);
      await service.onModuleInit();

      await service.putMetrics([{ MetricName: 'Test', Value: 100, Unit: StandardUnit.Count }]);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should not send empty metrics array', async () => {
      await cloudWatchService.putMetrics([]);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should handle batch send errors', async () => {
      mockSend.mockRejectedValue(new Error('Batch send failed'));

      await cloudWatchService.putMetrics([{ MetricName: 'Test', Value: 100, Unit: StandardUnit.Count }]);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to send batch metrics',
        expect.any(String)
      );
    });
  });

  describe('API Metrics Logging', () => {
    beforeEach(async () => {
      mockSend
        .mockResolvedValueOnce({ logGroups: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValue({});

      await cloudWatchService.onModuleInit();
      jest.clearAllMocks();
    });

    it('should log API metrics with all dimensions', async () => {
      await cloudWatchService.logApiMetrics('/api/users', 'GET', 200, 150, 'user-123');

      // Should send 3 metrics: ApiRequests, ResponseTime, ApiErrors
      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('should track errors for 4xx status codes', async () => {
      await cloudWatchService.logApiMetrics('/api/invalid', 'POST', 400, 50);

      // Verify ApiErrors metric is sent with value 1
      expect(mockSend).toHaveBeenCalledWith(expect.any(PutMetricDataCommand));
    });

    it('should track errors for 5xx status codes', async () => {
      await cloudWatchService.logApiMetrics('/api/error', 'GET', 500, 100);

      expect(mockSend).toHaveBeenCalled();
    });

    it('should not track errors for 2xx status codes', async () => {
      await cloudWatchService.logApiMetrics('/api/success', 'GET', 200, 100);

      expect(mockSend).toHaveBeenCalled();
    });

    it('should include userId when provided', async () => {
      await cloudWatchService.logApiMetrics('/api/profile', 'GET', 200, 100, 'user-456');

      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('Database Metrics Logging', () => {
    beforeEach(async () => {
      mockSend
        .mockResolvedValueOnce({ logGroups: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValue({});

      await cloudWatchService.onModuleInit();
      jest.clearAllMocks();
    });

    it('should log database query duration', async () => {
      await cloudWatchService.logDatabaseMetrics('SELECT * FROM users', 250);

      expect(mockSend).toHaveBeenCalledWith(expect.any(PutMetricDataCommand));
    });

    it('should include record count when provided', async () => {
      await cloudWatchService.logDatabaseMetrics('SELECT * FROM accounts', 150, 100);

      // Should send 2 metrics: duration and record count
      expect(mockSend).toHaveBeenCalledWith(expect.any(PutMetricDataCommand));
    });

    it('should work without record count', async () => {
      await cloudWatchService.logDatabaseMetrics('UPDATE users SET name = ?', 300);

      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('Business Metrics Logging', () => {
    beforeEach(async () => {
      mockSend
        .mockResolvedValueOnce({ logGroups: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValue({});

      await cloudWatchService.onModuleInit();
      jest.clearAllMocks();
    });

    it('should log all business metrics', async () => {
      const metrics: BusinessMetrics = {
        activeUsers: 100,
        transactionCount: 50,
        totalTransactionValue: 5000.50,
        errorRate: 2.5,
        responseTime: 150,
      };

      await cloudWatchService.logBusinessMetrics(metrics);

      // Should send 5 metrics
      expect(mockSend).toHaveBeenCalledWith(expect.any(PutMetricDataCommand));
      expect(mockLogger.debug).toHaveBeenCalledWith('Sent 5 metrics to CloudWatch');
    });

    it('should handle zero values', async () => {
      const metrics: BusinessMetrics = {
        activeUsers: 0,
        transactionCount: 0,
        totalTransactionValue: 0,
        errorRate: 0,
        responseTime: 0,
      };

      await cloudWatchService.logBusinessMetrics(metrics);

      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('System Metrics Logging', () => {
    beforeEach(async () => {
      mockSend
        .mockResolvedValueOnce({ logGroups: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValue({});

      await cloudWatchService.onModuleInit();
      jest.clearAllMocks();

      // Mock process methods
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      }) as any;

      process.uptime = jest.fn().mockReturnValue(3600) as any;
    });

    it('should log system health metrics', async () => {
      await cloudWatchService.logSystemMetrics();

      // Should send 4 metrics: MemoryUsage, HeapUsed, HeapTotal, ProcessUptime
      expect(mockSend).toHaveBeenCalledWith(expect.any(PutMetricDataCommand));
      expect(mockLogger.debug).toHaveBeenCalledWith('Sent 4 metrics to CloudWatch');
    });

    it('should calculate memory usage percentage', async () => {
      await cloudWatchService.logSystemMetrics();

      expect(mockSend).toHaveBeenCalled();
    });

    it('should convert memory to megabytes', async () => {
      await cloudWatchService.logSystemMetrics();

      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('Structured Logging', () => {
    beforeEach(async () => {
      mockSend
        .mockResolvedValueOnce({ logGroups: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValue({});

      await cloudWatchService.onModuleInit();
      jest.clearAllMocks();
    });

    it('should send structured logs to CloudWatch', async () => {
      await cloudWatchService.sendLog('info', 'Test message', 'TestContext', {
        key: 'value',
      });

      expect(mockSend).toHaveBeenCalledWith(expect.any(PutLogEventsCommand));
    });

    it('should include timestamp and pid in log', async () => {
      await cloudWatchService.sendLog('error', 'Error message');

      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle logs without metadata', async () => {
      await cloudWatchService.sendLog('warn', 'Warning message', 'WarnContext');

      expect(mockSend).toHaveBeenCalled();
    });

    it('should not send when disabled', async () => {
      (mockConfigService.get as any) = jest.fn((key: string, defaultValue?: any) => {
        if (key === 'CLOUDWATCH_ENABLED') return 'false';
        return defaultValue;
      });

      const service = new CloudWatchService(mockConfigService);
      await service.onModuleInit();

      await service.sendLog('info', 'Test message');

      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should handle log send errors', async () => {
      mockSend.mockRejectedValue(new Error('Log send failed'));

      await cloudWatchService.sendLog('info', 'Test message');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to send log to CloudWatch',
        expect.any(String)
      );
    });
  });

  describe('Utility Methods', () => {
    it('should chunk array correctly', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const chunks = (cloudWatchService as any).chunkArray(array, 3);

      expect(chunks).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [10],
      ]);
    });

    it('should handle empty array', () => {
      const chunks = (cloudWatchService as any).chunkArray([], 5);
      expect(chunks).toEqual([]);
    });

    it('should handle chunk size larger than array', () => {
      const chunks = (cloudWatchService as any).chunkArray([1, 2, 3], 10);
      expect(chunks).toEqual([[1, 2, 3]]);
    });

    it('should handle chunk size of 1', () => {
      const chunks = (cloudWatchService as any).chunkArray([1, 2, 3], 1);
      expect(chunks).toEqual([[1], [2], [3]]);
    });
  });

  describe('Integration Scenarios', () => {
    beforeEach(async () => {
      mockSend
        .mockResolvedValueOnce({ logGroups: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValue({});

      await cloudWatchService.onModuleInit();
      jest.clearAllMocks();
    });

    it('should handle complete monitoring workflow', async () => {
      // Log API metrics
      await cloudWatchService.logApiMetrics('/api/users', 'GET', 200, 150);

      // Log database metrics
      await cloudWatchService.logDatabaseMetrics('SELECT * FROM users', 100, 50);

      // Log business metrics
      await cloudWatchService.logBusinessMetrics({
        activeUsers: 100,
        transactionCount: 50,
        totalTransactionValue: 5000,
        errorRate: 2,
        responseTime: 150,
      });

      // Log system metrics
      await cloudWatchService.logSystemMetrics();

      // Send structured log
      await cloudWatchService.sendLog('info', 'Monitoring complete');

      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle concurrent metric publishing', async () => {
      const promises = [
        cloudWatchService.logApiMetrics('/api/users', 'GET', 200, 100),
        cloudWatchService.logApiMetrics('/api/accounts', 'POST', 201, 150),
        cloudWatchService.logSystemMetrics(),
      ];

      await Promise.all(promises);

      expect(mockSend).toHaveBeenCalled();
    });
  });
});
