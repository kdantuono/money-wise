/**
 * Metrics Service Tests
 *
 * Tests metrics collection and reporting service
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { MetricsService } from './metrics.service';
import { LoggerService } from '../logging/logger.service';

// Mock Sentry
jest.mock('@sentry/node', () => ({
  addBreadcrumb: jest.fn(),
}));

describe('MetricsService', () => {
  let service: MetricsService;
  let configService: ConfigService;
  let loggerService: LoggerService;
  let mockChildLogger: Partial<LoggerService>;

  beforeEach(async () => {
    // Create mock child logger
    mockChildLogger = {
      log: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      verbose: jest.fn(),
      fatal: jest.fn(),
      setContext: jest.fn(),
      child: jest.fn(),
      performance: jest.fn(),
      http: jest.fn(),
      query: jest.fn(),
    } as Partial<LoggerService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              if (key === 'METRICS_ENABLED') return true;
              return defaultValue;
            }),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            child: jest.fn().mockReturnValue(mockChildLogger),
            setContext: jest.fn(),
            verbose: jest.fn(),
            fatal: jest.fn(),
            performance: jest.fn(),
            http: jest.fn(),
            query: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    configService = module.get<ConfigService>(ConfigService);
    loggerService = module.get<LoggerService>(LoggerService);

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create child logger with MetricsService context', () => {
      expect(loggerService.child).toHaveBeenCalledWith('MetricsService');
    });

    it('should read metrics enabled from config', () => {
      expect(configService.get).toHaveBeenCalledWith('METRICS_ENABLED', true);
    });

    it('should disable metrics when configured', () => {
      jest.spyOn(configService, 'get').mockReturnValue(false);
      const disabledService = new MetricsService(configService, loggerService);

      disabledService.incrementCounter('test');
      expect(mockChildLogger.debug).not.toHaveBeenCalled();
    });
  });

  describe('incrementCounter', () => {
    it('should increment counter with default value', () => {
      service.incrementCounter('api.requests');

      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Counter incremented: api.requests',
        { value: 1, tags: undefined }
      );

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'metrics',
        message: 'Counter: api.requests',
        level: 'info',
        data: { value: 1 },
      });
    });

    it('should increment counter with custom value', () => {
      service.incrementCounter('errors.count', undefined, 5);

      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Counter incremented: errors.count',
        { value: 5, tags: undefined }
      );

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'metrics',
        message: 'Counter: errors.count',
        level: 'info',
        data: { value: 5 },
      });
    });

    it('should increment counter with tags', () => {
      const tags = { endpoint: '/users', method: 'GET' };
      service.incrementCounter('api.requests', tags);

      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Counter incremented: api.requests',
        { value: 1, tags }
      );

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'metrics',
        message: 'Counter: api.requests',
        level: 'info',
        data: { value: 1, endpoint: '/users', method: 'GET' },
      });
    });

    it('should not increment when metrics disabled', () => {
      jest.spyOn(configService, 'get').mockReturnValue(false);
      const disabledService = new MetricsService(configService, loggerService);

      disabledService.incrementCounter('test');

      expect(mockChildLogger.debug).not.toHaveBeenCalled();
      expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
    });
  });

  describe('recordDistribution', () => {
    it('should record distribution metric without unit', () => {
      service.recordDistribution('response.size', 1024);

      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Distribution recorded: response.size',
        { value: 1024, tags: undefined, unit: undefined }
      );

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'metrics',
        message: 'Distribution: response.size',
        level: 'info',
        data: { value: 1024, unit: 'none' },
      });
    });

    it('should record distribution with unit', () => {
      service.recordDistribution('memory.usage', 512, undefined, 'megabytes');

      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Distribution recorded: memory.usage',
        { value: 512, tags: undefined, unit: 'megabytes' }
      );

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'metrics',
        message: 'Distribution: memory.usage',
        level: 'info',
        data: { value: 512, unit: 'megabytes' },
      });
    });

    it('should record distribution with tags', () => {
      const tags = { table: 'users', operation: 'select' };
      service.recordDistribution('query.duration', 45, tags, 'millisecond');

      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Distribution recorded: query.duration',
        { value: 45, tags, unit: 'millisecond' }
      );

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'metrics',
        message: 'Distribution: query.duration',
        level: 'info',
        data: { value: 45, unit: 'millisecond', table: 'users', operation: 'select' },
      });
    });

    it('should not record when metrics disabled', () => {
      jest.spyOn(configService, 'get').mockReturnValue(false);
      const disabledService = new MetricsService(configService, loggerService);

      disabledService.recordDistribution('test', 100);

      expect(mockChildLogger.debug).not.toHaveBeenCalled();
      expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
    });
  });

  describe('setGauge', () => {
    it('should set gauge metric', () => {
      service.setGauge('connections.active', 25);

      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Gauge set: connections.active',
        { value: 25, tags: undefined }
      );

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'metrics',
        message: 'Gauge: connections.active',
        level: 'info',
        data: { value: 25 },
      });
    });

    it('should set gauge with tags', () => {
      const tags = { pool: 'primary', database: 'postgres' };
      service.setGauge('connections.active', 10, tags);

      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Gauge set: connections.active',
        { value: 10, tags }
      );

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'metrics',
        message: 'Gauge: connections.active',
        level: 'info',
        data: { value: 10, pool: 'primary', database: 'postgres' },
      });
    });

    it('should handle zero values', () => {
      service.setGauge('errors.active', 0);

      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Gauge set: errors.active',
        { value: 0, tags: undefined }
      );
    });

    it('should handle negative values', () => {
      service.setGauge('temperature.celsius', -5);

      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Gauge set: temperature.celsius',
        { value: -5, tags: undefined }
      );
    });

    it('should not set when metrics disabled', () => {
      jest.spyOn(configService, 'get').mockReturnValue(false);
      const disabledService = new MetricsService(configService, loggerService);

      disabledService.setGauge('test', 100);

      expect(mockChildLogger.debug).not.toHaveBeenCalled();
      expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
    });
  });

  describe('recordTiming', () => {
    it('should record timing metric', () => {
      service.recordTiming('operation.duration', 250);

      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Distribution recorded: operation.duration',
        { value: 250, tags: undefined, unit: 'millisecond' }
      );

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'metrics',
        message: 'Distribution: operation.duration',
        level: 'info',
        data: { value: 250, unit: 'millisecond' },
      });
    });

    it('should record timing with tags', () => {
      const tags = { operation: 'save', entity: 'user' };
      service.recordTiming('database.operation', 50, tags);

      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Distribution recorded: database.operation',
        { value: 50, tags, unit: 'millisecond' }
      );

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'metrics',
        message: 'Distribution: database.operation',
        level: 'info',
        data: { value: 50, unit: 'millisecond', operation: 'save', entity: 'user' },
      });
    });

    it('should delegate to recordDistribution', () => {
      const recordDistributionSpy = jest.spyOn(service, 'recordDistribution');
      const tags = { test: 'value' };

      service.recordTiming('test.timing', 100, tags);

      expect(recordDistributionSpy).toHaveBeenCalledWith(
        'test.timing',
        100,
        tags,
        'millisecond'
      );
    });
  });

  describe('trackBusinessMetric', () => {
    it('should track business metric as counter', () => {
      service.trackBusinessMetric('user.registration');

      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Counter incremented: business.user.registration',
        { value: 1, tags: undefined }
      );

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'metrics',
        message: 'Counter: business.user.registration',
        level: 'info',
        data: { value: 1 },
      });
    });

    it('should track business metric with tags', () => {
      const tags = { plan: 'premium', source: 'web' };
      service.trackBusinessMetric('subscription.created', tags);

      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Counter incremented: business.subscription.created',
        { value: 1, tags }
      );

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'metrics',
        message: 'Counter: business.subscription.created',
        level: 'info',
        data: { value: 1, plan: 'premium', source: 'web' },
      });
    });

    it('should delegate to incrementCounter', () => {
      const incrementCounterSpy = jest.spyOn(service, 'incrementCounter');
      const tags = { test: 'value' };

      service.trackBusinessMetric('test.event', tags);

      expect(incrementCounterSpy).toHaveBeenCalledWith(
        'business.test.event',
        tags
      );
    });
  });

  describe('trackSystemMetrics', () => {
    let processMemoryUsageSpy: jest.SpyInstance;
    let processCpuUsageSpy: jest.SpyInstance;
    let processUptimeSpy: jest.SpyInstance;

    beforeEach(() => {
      processMemoryUsageSpy = jest.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 100 * 1024 * 1024, // 100 MB
        heapTotal: 80 * 1024 * 1024, // 80 MB
        heapUsed: 60 * 1024 * 1024, // 60 MB
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });

      processCpuUsageSpy = jest.spyOn(process, 'cpuUsage').mockReturnValue({
        user: 1000000, // 1 second
        system: 500000, // 0.5 seconds
      });

      processUptimeSpy = jest.spyOn(process, 'uptime').mockReturnValue(3600); // 1 hour
    });

    afterEach(() => {
      processMemoryUsageSpy.mockRestore();
      processCpuUsageSpy.mockRestore();
      processUptimeSpy.mockRestore();
    });

    it('should track memory metrics', () => {
      service.trackSystemMetrics();

      // Check heap used
      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Gauge set: system.memory.heap_used',
        { value: 60, tags: { unit: 'megabytes' } }
      );

      // Check heap total
      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Gauge set: system.memory.heap_total',
        { value: 80, tags: { unit: 'megabytes' } }
      );

      // Check RSS
      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Gauge set: system.memory.rss',
        { value: 100, tags: { unit: 'megabytes' } }
      );
    });

    it('should track uptime metric', () => {
      service.trackSystemMetrics();

      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Gauge set: system.uptime',
        { value: 3600, tags: { unit: 'seconds' } }
      );
    });

    it('should track CPU metrics', () => {
      service.trackSystemMetrics();

      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Gauge set: system.cpu.user',
        { value: 1000000, tags: undefined }
      );

      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Gauge set: system.cpu.system',
        { value: 500000, tags: undefined }
      );
    });

    it('should log system metrics summary', () => {
      service.trackSystemMetrics();

      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'System metrics tracked',
        {
          memoryUsed: 60,
          uptime: 3600,
        }
      );
    });

    it('should not track when metrics disabled', () => {
      jest.spyOn(configService, 'get').mockReturnValue(false);
      const disabledService = new MetricsService(configService, loggerService);

      disabledService.trackSystemMetrics();

      expect(mockChildLogger.debug).not.toHaveBeenCalled();
      expect(processMemoryUsageSpy).not.toHaveBeenCalled();
    });
  });

  describe('startPeriodicCollection', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.spyOn(global, 'setInterval');
    });

    afterEach(() => {
      jest.useRealTimers();
      jest.restoreAllMocks();
    });

    it('should start periodic collection with default interval', () => {
      const trackSystemMetricsSpy = jest.spyOn(service, 'trackSystemMetrics').mockImplementation();

      const intervalId = service.startPeriodicCollection();

      expect(mockChildLogger.log).toHaveBeenCalledWith(
        'Starting periodic metrics collection (interval: 60000ms)'
      );

      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 60000);

      // Fast-forward time
      jest.advanceTimersByTime(60000);
      expect(trackSystemMetricsSpy).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(60000);
      expect(trackSystemMetricsSpy).toHaveBeenCalledTimes(2);

      clearInterval(intervalId);
    });

    it('should start periodic collection with custom interval', () => {
      const trackSystemMetricsSpy = jest.spyOn(service, 'trackSystemMetrics').mockImplementation();

      const intervalId = service.startPeriodicCollection(30000);

      expect(mockChildLogger.log).toHaveBeenCalledWith(
        'Starting periodic metrics collection (interval: 30000ms)'
      );

      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 30000);

      // Fast-forward time
      jest.advanceTimersByTime(30000);
      expect(trackSystemMetricsSpy).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(30000);
      expect(trackSystemMetricsSpy).toHaveBeenCalledTimes(2);

      clearInterval(intervalId);
    });

    it('should return interval ID for cleanup', () => {
      jest.spyOn(service, 'trackSystemMetrics').mockImplementation();

      const intervalId = service.startPeriodicCollection();

      expect(intervalId).toBeDefined();
      expect(typeof intervalId).toBe('object'); // NodeJS.Timeout

      clearInterval(intervalId);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle high frequency metrics without errors', () => {
      for (let i = 0; i < 1000; i++) {
        service.incrementCounter('high.frequency', { index: i.toString() });
      }

      expect(mockChildLogger.debug).toHaveBeenCalledTimes(1000);
      expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(1000);
    });

    it('should handle various metric types in sequence', () => {
      service.incrementCounter('requests.total');
      service.recordDistribution('response.time', 150);
      service.setGauge('connections.active', 10);
      service.recordTiming('operation.duration', 250);
      service.trackBusinessMetric('user.action');
      service.trackSystemMetrics();

      // Verify all metrics were recorded
      expect(mockChildLogger.debug).toHaveBeenCalled();
      expect(Sentry.addBreadcrumb).toHaveBeenCalled();
    });

    it('should handle metrics with large values', () => {
      service.incrementCounter('large.counter', undefined, Number.MAX_SAFE_INTEGER);
      service.recordDistribution('large.distribution', Number.MAX_VALUE);
      service.setGauge('large.gauge', Number.MAX_SAFE_INTEGER);

      expect(mockChildLogger.debug).toHaveBeenCalledTimes(3);
    });

    it('should handle metrics with many tags', () => {
      const manyTags: Record<string, string> = {};
      for (let i = 0; i < 100; i++) {
        manyTags[`tag${i}`] = `value${i}`;
      }

      service.incrementCounter('many.tags', manyTags);

      expect(mockChildLogger.debug).toHaveBeenCalledWith(
        'Counter incremented: many.tags',
        { value: 1, tags: manyTags }
      );
    });
  });
});