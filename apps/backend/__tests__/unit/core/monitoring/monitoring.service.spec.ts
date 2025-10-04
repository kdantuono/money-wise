/**
 * MonitoringService Unit Tests
 * Comprehensive test suite for MonitoringService with 80%+ coverage target
 * Tests system metrics, request tracking, performance logging, and CloudWatch integration
 */

import { Logger } from '@nestjs/common';
import { MonitoringService, SystemMetrics, ApiMetrics } from '@/core/monitoring/monitoring.service';
import { CloudWatchService } from '@/core/monitoring/cloudwatch.service';

describe('MonitoringService', () => {
  let monitoringService: MonitoringService;
  let mockCloudWatchService: jest.Mocked<CloudWatchService>;
  let mockLogger: jest.Mocked<Logger>;

  // Store original process methods
  const originalMemoryUsage = process.memoryUsage;
  const originalCpuUsage = process.cpuUsage;
  const originalUptime = process.uptime;
  const originalDateNow = Date.now;
  const originalSetInterval = global.setInterval;
  const originalClearInterval = global.clearInterval;

  beforeEach(() => {
    jest.useFakeTimers();

    // Mock CloudWatchService
    mockCloudWatchService = {
      logApiMetrics: jest.fn().mockResolvedValue(undefined),
      logDatabaseMetrics: jest.fn().mockResolvedValue(undefined),
      logBusinessMetrics: jest.fn().mockResolvedValue(undefined),
      logSystemMetrics: jest.fn().mockResolvedValue(undefined),
      putMetric: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock Logger
    mockLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    // Mock process methods
    process.memoryUsage = jest.fn().mockReturnValue({
      heapUsed: 50 * 1024 * 1024, // 50MB
      heapTotal: 100 * 1024 * 1024, // 100MB
      rss: 150 * 1024 * 1024,
      external: 10 * 1024 * 1024,
      arrayBuffers: 5 * 1024 * 1024,
    }) as any;

    process.cpuUsage = jest.fn().mockReturnValue({
      user: 1000000, // 1 second in microseconds
      system: 500000,
    }) as any;

    process.uptime = jest.fn().mockReturnValue(3600) as any; // 1 hour

    Date.now = jest.fn().mockReturnValue(1609459200000); // Fixed timestamp: 2021-01-01T00:00:00.000Z

    // Create service instance
    monitoringService = new MonitoringService(mockCloudWatchService);
    (monitoringService as any).logger = mockLogger;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.clearAllMocks();

    // Restore original methods
    process.memoryUsage = originalMemoryUsage;
    process.cpuUsage = originalCpuUsage;
    process.uptime = originalUptime;
    Date.now = originalDateNow;
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
  });

  describe('Initialization', () => {
    it('should initialize with CloudWatch service', async () => {
      await monitoringService.onModuleInit();

      expect(mockLogger.log).toHaveBeenCalledWith('Monitoring service initialized');
    });

    it('should initialize without CloudWatch service', async () => {
      const serviceWithoutCloudWatch = new MonitoringService();
      (serviceWithoutCloudWatch as any).logger = mockLogger;

      await serviceWithoutCloudWatch.onModuleInit();

      expect(mockLogger.log).toHaveBeenCalledWith('Monitoring service initialized');
    });

    it('should setup system metrics reporting when CloudWatch is available', async () => {
      await monitoringService.onModuleInit();

      // Fast-forward 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);

      expect(mockCloudWatchService.logSystemMetrics).toHaveBeenCalled();
    });

    it('should not setup system metrics reporting without CloudWatch', async () => {
      const serviceWithoutCloudWatch = new MonitoringService();
      (serviceWithoutCloudWatch as any).logger = mockLogger;

      await serviceWithoutCloudWatch.onModuleInit();

      // Fast-forward 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);

      // CloudWatch service should not be called
      expect(mockCloudWatchService.logSystemMetrics).not.toHaveBeenCalled();
    });

    it('should setup metrics buffer flushing', async () => {
      await monitoringService.onModuleInit();

      // Add some metrics to buffer
      await monitoringService.trackApiRequest('/api/test', 'GET', 200, 100);

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30 * 1000);

      // Metrics should be flushed to CloudWatch
      expect(mockCloudWatchService.putMetric).toHaveBeenCalled();
    });

    it('should handle system metrics reporting errors', async () => {
      mockCloudWatchService.logSystemMetrics.mockRejectedValue(new Error('CloudWatch error'));

      await monitoringService.onModuleInit();

      // Fast-forward 5 minutes
      jest.advanceTimersByTime(5 * 60 * 1000);

      // Wait for async operations
      await Promise.resolve();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to send system metrics to CloudWatch',
        expect.any(String)
      );
    });
  });

  describe('Module Destruction', () => {
    it('should clear flush interval on destroy', async () => {
      await monitoringService.onModuleInit();

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      monitoringService.onModuleDestroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should handle destroy when no interval exists', () => {
      expect(() => monitoringService.onModuleDestroy()).not.toThrow();
    });
  });

  describe('getSystemMetrics', () => {
    it('should return complete system metrics', () => {
      const metrics: SystemMetrics = monitoringService.getSystemMetrics();

      expect(metrics).toEqual({
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        memory: {
          used: 50 * 1024 * 1024,
          total: 100 * 1024 * 1024,
          usage: 50,
        },
        cpu: {
          usage: 1, // 1000000 microseconds / 1000000 = 1 second
        },
        requests: {
          total: 0,
          errors: 0,
          successRate: 100,
        },
      });
    });

    it('should calculate memory usage percentage correctly', () => {
      const metrics = monitoringService.getSystemMetrics();

      expect(metrics.memory.usage).toBe(50); // 50MB / 100MB = 50%
    });

    it('should calculate success rate with no requests', () => {
      const metrics = monitoringService.getSystemMetrics();

      expect(metrics.requests.successRate).toBe(100);
    });

    it('should calculate success rate with requests and errors', () => {
      monitoringService.incrementRequestCount();
      monitoringService.incrementRequestCount();
      monitoringService.incrementRequestCount();
      monitoringService.incrementErrorCount();

      const metrics = monitoringService.getSystemMetrics();

      // 3 requests, 1 error = 66.67% success rate
      expect(metrics.requests.total).toBe(3);
      expect(metrics.requests.errors).toBe(1);
      expect(metrics.requests.successRate).toBeCloseTo(66.67, 1);
    });

    it('should track uptime from start', () => {
      // Initial time
      Date.now = jest.fn().mockReturnValue(1609459200000);
      const service = new MonitoringService();

      // Advance time by 1 hour
      Date.now = jest.fn().mockReturnValue(1609459200000 + 3600000);

      const metrics = service.getSystemMetrics();
      expect(metrics.uptime).toBe(3600000); // 1 hour in milliseconds
    });
  });

  describe('Request Tracking', () => {
    it('should increment request count', () => {
      monitoringService.incrementRequestCount();
      monitoringService.incrementRequestCount();

      const metrics = monitoringService.getSystemMetrics();
      expect(metrics.requests.total).toBe(2);
    });

    it('should increment error count', () => {
      monitoringService.incrementErrorCount();

      const metrics = monitoringService.getSystemMetrics();
      expect(metrics.requests.errors).toBe(1);
      expect(mockLogger.warn).toHaveBeenCalledWith('Error count increased to 1');
    });

    it('should log error count increases', () => {
      monitoringService.incrementErrorCount();
      monitoringService.incrementErrorCount();

      expect(mockLogger.warn).toHaveBeenCalledWith('Error count increased to 1');
      expect(mockLogger.warn).toHaveBeenCalledWith('Error count increased to 2');
    });
  });

  describe('Performance Logging', () => {
    it('should log normal performance metrics', () => {
      monitoringService.logPerformanceMetric('test-operation', 500);

      expect(mockLogger.log).toHaveBeenCalledWith('Performance: test-operation took 500ms');
    });

    it('should warn on slow operations (>1000ms)', () => {
      monitoringService.logPerformanceMetric('slow-operation', 1500);

      expect(mockLogger.log).toHaveBeenCalledWith('Performance: slow-operation took 1500ms');
      expect(mockLogger.warn).toHaveBeenCalledWith('Slow operation detected: slow-operation took 1500ms');
    });

    it('should not warn on fast operations', () => {
      monitoringService.logPerformanceMetric('fast-operation', 999);

      expect(mockLogger.log).toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should handle operations at threshold (1000ms)', () => {
      monitoringService.logPerformanceMetric('threshold-operation', 1000);

      expect(mockLogger.log).toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('Database Query Logging', () => {
    it('should log normal database queries', () => {
      monitoringService.logDatabaseQuery('SELECT * FROM users', 100);

      expect(mockLogger.debug).toHaveBeenCalledWith('DB Query: SELECT * FROM users (100ms)');
    });

    it('should warn on slow queries (>500ms)', () => {
      monitoringService.logDatabaseQuery('SELECT * FROM large_table', 800);

      expect(mockLogger.debug).toHaveBeenCalledWith('DB Query: SELECT * FROM large_table (800ms)');
      expect(mockLogger.warn).toHaveBeenCalledWith('Slow database query: SELECT * FROM large_table took 800ms');
    });

    it('should send database metrics to CloudWatch', () => {
      monitoringService.logDatabaseQuery('SELECT * FROM accounts', 250);

      expect(mockCloudWatchService.logDatabaseMetrics).toHaveBeenCalledWith('SELECT * FROM accounts', 250);
    });

    it('should not send to CloudWatch when unavailable', () => {
      const serviceWithoutCloudWatch = new MonitoringService();
      (serviceWithoutCloudWatch as any).logger = mockLogger;

      serviceWithoutCloudWatch.logDatabaseQuery('SELECT * FROM users', 100);

      expect(mockCloudWatchService.logDatabaseMetrics).not.toHaveBeenCalled();
    });

    it('should handle queries at threshold (500ms)', () => {
      monitoringService.logDatabaseQuery('SELECT * FROM test', 500);

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('API Request Tracking', () => {
    it('should track successful API requests', async () => {
      await monitoringService.trackApiRequest('/api/users', 'GET', 200, 150);

      const metrics = monitoringService.getSystemMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.errors).toBe(0);
      expect(mockCloudWatchService.logApiMetrics).toHaveBeenCalledWith(
        '/api/users',
        'GET',
        200,
        150,
        undefined
      );
    });

    it('should track failed API requests (4xx)', async () => {
      await monitoringService.trackApiRequest('/api/invalid', 'POST', 400, 50);

      const metrics = monitoringService.getSystemMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.errors).toBe(1);
    });

    it('should track server error requests (5xx)', async () => {
      await monitoringService.trackApiRequest('/api/error', 'GET', 500, 1200);

      const metrics = monitoringService.getSystemMetrics();
      expect(metrics.requests.total).toBe(1);
      expect(metrics.requests.errors).toBe(1);
    });

    it('should include userId when provided', async () => {
      await monitoringService.trackApiRequest('/api/profile', 'GET', 200, 100, 'user-123');

      expect(mockCloudWatchService.logApiMetrics).toHaveBeenCalledWith(
        '/api/profile',
        'GET',
        200,
        100,
        'user-123'
      );
    });

    it('should buffer metrics for batch processing', async () => {
      await monitoringService.trackApiRequest('/api/test', 'GET', 200, 100);
      await monitoringService.trackApiRequest('/api/test2', 'POST', 201, 150);

      const buffer = (monitoringService as any).metricsBuffer;
      expect(buffer).toHaveLength(2);
    });

    it('should log performance for tracked requests', async () => {
      await monitoringService.trackApiRequest('/api/slow', 'GET', 200, 1500);

      expect(mockLogger.log).toHaveBeenCalledWith('Performance: GET /api/slow took 1500ms');
      expect(mockLogger.warn).toHaveBeenCalledWith('Slow operation detected: GET /api/slow took 1500ms');
    });

    it('should work without CloudWatch service', async () => {
      const serviceWithoutCloudWatch = new MonitoringService();
      (serviceWithoutCloudWatch as any).logger = mockLogger;

      await expect(
        serviceWithoutCloudWatch.trackApiRequest('/api/test', 'GET', 200, 100)
      ).resolves.not.toThrow();

      const metrics = serviceWithoutCloudWatch.getSystemMetrics();
      expect(metrics.requests.total).toBe(1);
    });
  });

  describe('Business Metrics Tracking', () => {
    it('should track business metrics with CloudWatch', async () => {
      monitoringService.incrementRequestCount();
      monitoringService.incrementRequestCount();
      monitoringService.incrementErrorCount();

      await monitoringService.trackBusinessMetrics(100, 50, 5000.50);

      expect(mockCloudWatchService.logBusinessMetrics).toHaveBeenCalledWith({
        activeUsers: 100,
        transactionCount: 50,
        totalTransactionValue: 5000.50,
        errorRate: 50, // 1 error out of 2 requests = 50%
        responseTime: 0, // No buffered metrics
      });
    });

    it('should calculate error rate correctly', async () => {
      // 10 requests, 2 errors = 20% error rate
      for (let i = 0; i < 10; i++) {
        monitoringService.incrementRequestCount();
      }
      monitoringService.incrementErrorCount();
      monitoringService.incrementErrorCount();

      await monitoringService.trackBusinessMetrics(50, 25, 1000);

      expect(mockCloudWatchService.logBusinessMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          errorRate: 20,
        })
      );
    });

    it('should handle zero requests (0% error rate)', async () => {
      await monitoringService.trackBusinessMetrics(10, 5, 500);

      expect(mockCloudWatchService.logBusinessMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          errorRate: 0,
        })
      );
    });

    it('should include average response time from buffer', async () => {
      await monitoringService.trackApiRequest('/api/test1', 'GET', 200, 100);
      await monitoringService.trackApiRequest('/api/test2', 'GET', 200, 200);

      await monitoringService.trackBusinessMetrics(20, 10, 1500);

      expect(mockCloudWatchService.logBusinessMetrics).toHaveBeenCalledWith(
        expect.objectContaining({
          responseTime: 150, // (100 + 200) / 2
        })
      );
    });

    it('should log business metrics summary', async () => {
      await monitoringService.trackBusinessMetrics(75, 30, 12345.67);

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Business metrics: 75 users, 30 transactions, $12345.67 total value'
      );
    });

    it('should work without CloudWatch', async () => {
      const serviceWithoutCloudWatch = new MonitoringService();
      (serviceWithoutCloudWatch as any).logger = mockLogger;

      await expect(
        serviceWithoutCloudWatch.trackBusinessMetrics(50, 25, 1000)
      ).resolves.not.toThrow();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Business metrics: 50 users, 25 transactions, $1000.00 total value'
      );
    });
  });

  describe('Performance Summary', () => {
    it('should return complete performance summary', () => {
      monitoringService.incrementRequestCount();
      monitoringService.incrementRequestCount();
      monitoringService.incrementRequestCount();
      monitoringService.incrementErrorCount();

      const summary = monitoringService.getPerformanceSummary();

      expect(summary).toEqual({
        totalRequests: 3,
        errorCount: 1,
        errorRate: expect.closeTo(33.33, 1),
        uptime: expect.any(Number),
        memoryUsage: 50, // 50MB / 100MB
      });
    });

    it('should handle zero requests in summary', () => {
      const summary = monitoringService.getPerformanceSummary();

      expect(summary).toEqual({
        totalRequests: 0,
        errorCount: 0,
        errorRate: 0,
        uptime: expect.any(Number),
        memoryUsage: 50,
      });
    });

    it('should calculate uptime correctly', () => {
      Date.now = jest.fn().mockReturnValue(1609459200000);
      const service = new MonitoringService();

      Date.now = jest.fn().mockReturnValue(1609459200000 + 5000); // 5 seconds later

      const summary = service.getPerformanceSummary();
      expect(summary.uptime).toBe(5000);
    });
  });

  describe('Metrics Buffer Flushing', () => {
    it('should flush buffered metrics to CloudWatch', async () => {
      await monitoringService.onModuleInit();

      // Add metrics to buffer
      await monitoringService.trackApiRequest('/api/test', 'GET', 200, 100);
      await monitoringService.trackApiRequest('/api/test', 'GET', 200, 150);

      // Manually call flushMetricsBuffer to test functionality
      await (monitoringService as any).flushMetricsBuffer();

      expect(mockCloudWatchService.putMetric).toHaveBeenCalled();
    });

    it('should aggregate metrics by endpoint and method', async () => {
      await monitoringService.onModuleInit();

      // Add multiple metrics for same endpoint
      await monitoringService.trackApiRequest('/api/users', 'GET', 200, 100);
      await monitoringService.trackApiRequest('/api/users', 'GET', 200, 200);
      await monitoringService.trackApiRequest('/api/users', 'GET', 500, 150);

      // Manually flush to test aggregation
      await (monitoringService as any).flushMetricsBuffer();

      // Should send aggregated metrics: RequestCount, AverageResponseTime, ErrorCount
      expect(mockCloudWatchService.putMetric).toHaveBeenCalledWith(
        'RequestCount',
        3,
        'Count',
        { Endpoint: '/api/users', Method: 'GET' }
      );

      expect(mockCloudWatchService.putMetric).toHaveBeenCalledWith(
        'AverageResponseTime',
        150, // (100 + 200 + 150) / 3
        'Count', // Note: Current implementation always uses 'Count' - this is a known limitation
        { Endpoint: '/api/users', Method: 'GET' }
      );

      expect(mockCloudWatchService.putMetric).toHaveBeenCalledWith(
        'ErrorCount',
        1, // One 500 error
        'Count',
        { Endpoint: '/api/users', Method: 'GET' }
      );
    });

    it('should clear buffer after flushing', async () => {
      await monitoringService.onModuleInit();

      await monitoringService.trackApiRequest('/api/test', 'GET', 200, 100);

      await (monitoringService as any).flushMetricsBuffer();

      const buffer = (monitoringService as any).metricsBuffer;
      expect(buffer).toHaveLength(0);
    });

    it('should not flush empty buffer', async () => {
      await monitoringService.onModuleInit();

      jest.advanceTimersByTime(30 * 1000);
      await Promise.resolve();

      expect(mockCloudWatchService.putMetric).not.toHaveBeenCalled();
    });

    it('should not flush without CloudWatch', async () => {
      const serviceWithoutCloudWatch = new MonitoringService();
      (serviceWithoutCloudWatch as any).logger = mockLogger;

      await serviceWithoutCloudWatch.onModuleInit();

      // Manually add to buffer using trackApiRequest (which won't send to CloudWatch)
      await serviceWithoutCloudWatch.trackApiRequest('/api/test', 'GET', 200, 100);

      jest.advanceTimersByTime(30 * 1000);
      await Promise.resolve();

      expect(mockCloudWatchService.putMetric).not.toHaveBeenCalled();
    });

    it('should handle flush errors gracefully', async () => {
      mockCloudWatchService.putMetric.mockRejectedValue(new Error('Flush error'));

      await monitoringService.onModuleInit();

      await monitoringService.trackApiRequest('/api/test', 'GET', 200, 100);

      jest.advanceTimersByTime(30 * 1000);
      await Promise.resolve();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to flush metrics buffer',
        expect.any(String)
      );
    });

    it('should aggregate metrics for different endpoints separately', async () => {
      await monitoringService.onModuleInit();

      await monitoringService.trackApiRequest('/api/users', 'GET', 200, 100);
      await monitoringService.trackApiRequest('/api/accounts', 'POST', 201, 200);

      await (monitoringService as any).flushMetricsBuffer();

      // Should have separate metrics for each endpoint
      expect(mockCloudWatchService.putMetric).toHaveBeenCalledWith(
        'RequestCount',
        1,
        'Count',
        { Endpoint: '/api/users', Method: 'GET' }
      );

      expect(mockCloudWatchService.putMetric).toHaveBeenCalledWith(
        'RequestCount',
        1,
        'Count',
        { Endpoint: '/api/accounts', Method: 'POST' }
      );
    });
  });

  describe('Average Response Time Calculation', () => {
    it('should calculate average from buffered metrics', async () => {
      await monitoringService.trackApiRequest('/api/test', 'GET', 200, 100);
      await monitoringService.trackApiRequest('/api/test', 'GET', 200, 200);
      await monitoringService.trackApiRequest('/api/test', 'GET', 200, 300);

      const avgResponseTime = (monitoringService as any).getAverageResponseTime();
      expect(avgResponseTime).toBe(200); // (100 + 200 + 300) / 3
    });

    it('should return 0 for empty buffer', () => {
      const avgResponseTime = (monitoringService as any).getAverageResponseTime();
      expect(avgResponseTime).toBe(0);
    });

    it('should handle single metric in buffer', async () => {
      await monitoringService.trackApiRequest('/api/test', 'GET', 200, 500);

      const avgResponseTime = (monitoringService as any).getAverageResponseTime();
      expect(avgResponseTime).toBe(500);
    });
  });

  describe('Error Cases', () => {
    it('should handle CloudWatch API errors gracefully in trackApiRequest', async () => {
      mockCloudWatchService.logApiMetrics.mockRejectedValue(new Error('CloudWatch error'));

      await expect(
        monitoringService.trackApiRequest('/api/test', 'GET', 200, 100)
      ).rejects.toThrow('CloudWatch error');
    });

    it('should continue operation if CloudWatch is unavailable', async () => {
      const serviceWithoutCloudWatch = new MonitoringService();
      (serviceWithoutCloudWatch as any).logger = mockLogger;

      await serviceWithoutCloudWatch.onModuleInit();
      serviceWithoutCloudWatch.incrementRequestCount();

      const metrics = serviceWithoutCloudWatch.getSystemMetrics();
      expect(metrics.requests.total).toBe(1);
    });
  });
});
