/**
 * Logger Service Tests
 *
 * Tests structured logging service with Sentry integration
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { LoggerService } from './logger.service';

// Mock Sentry
jest.mock('@sentry/node', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

// Mock console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.debug,
};

describe('LoggerService', () => {
  let service: LoggerService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Replace console methods with spies
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.debug = jest.fn();

    // Clear all mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              if (key === 'NODE_ENV') {
                return 'development';
              }
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LoggerService>(LoggerService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.debug = originalConsole.debug;
  });

  describe('Constructor & Initialization', () => {
    it('should set production mode correctly', () => {
      jest.spyOn(configService, 'get').mockReturnValueOnce('production');
      const prodService = new LoggerService(configService);
      // Test by checking log format (production uses JSON)
      prodService.log('test');
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(typeof logOutput).toBe('string');
      expect(() => JSON.parse(logOutput)).not.toThrow();
    });

    it('should set development mode correctly', () => {
      const devService = new LoggerService(configService);
      devService.log('test');
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(typeof logOutput).toBe('string');
      expect(logOutput).toContain('[LOG]');
    });

    it('should set correct log level for production', () => {
      jest.spyOn(configService, 'get').mockReturnValueOnce('production');
      const prodService = new LoggerService(configService);

      // In production, only errors should be logged
      prodService.log('info message');
      expect(console.log).not.toHaveBeenCalled();

      prodService.error('error message');
      expect(console.error).toHaveBeenCalled();
    });

    it('should set correct log level for staging', () => {
      jest.spyOn(configService, 'get').mockReturnValueOnce('staging');
      const stagingService = new LoggerService(configService);

      // In staging, warnings and errors should be logged
      stagingService.log('info message');
      expect(console.log).not.toHaveBeenCalled();

      stagingService.warn('warning message');
      expect(console.warn).toHaveBeenCalled();
    });

    it('should set correct log level for test', () => {
      jest.spyOn(configService, 'get').mockReturnValueOnce('test');
      const testService = new LoggerService(configService);

      // In test, only fatal errors should be logged
      testService.error('error message');
      expect(console.error).not.toHaveBeenCalled();

      testService.fatal('fatal message');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('setContext', () => {
    it('should set context for logger instance', () => {
      service.setContext('TestContext');
      service.log('test message');

      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(logOutput).toContain('TestContext');
    });

    it('should use default context when not set', () => {
      service.log('test message');

      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(logOutput).toContain('Application');
    });
  });

  describe('log method', () => {
    it('should log info messages', () => {
      service.log('Test log message');

      expect(console.log).toHaveBeenCalledTimes(1);
      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(logOutput).toContain('Test log message');
      expect(logOutput).toContain('[LOG]');
    });

    it('should log with metadata', () => {
      service.log('Test log', { userId: '123', action: 'test' });

      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(logOutput).toContain('userId');
      expect(logOutput).toContain('123');
      expect(logOutput).toContain('action');
      expect(logOutput).toContain('test');
    });

    it('should add Sentry breadcrumb', () => {
      service.log('Test log', { data: 'test' });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'log',
        message: 'Test log',
        level: 'info',
        data: { data: 'test' },
      });
    });

    it('should not log when level is below threshold', () => {
      jest.spyOn(configService, 'get').mockReturnValueOnce('production');
      const prodService = new LoggerService(configService);

      prodService.log('Test log');
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('error method', () => {
    it('should log error messages', () => {
      service.error('Test error message');

      expect(console.error).toHaveBeenCalledTimes(1);
      const errorOutput = (console.error as jest.Mock).mock.calls[0][0];
      expect(errorOutput).toContain('Test error message');
      expect(errorOutput).toContain('[ERROR]');
    });

    it('should log error with Error object', () => {
      const error = new Error('Test error');
      service.error('Error occurred', error);

      const errorOutput = (console.error as jest.Mock).mock.calls[0][0];
      expect(errorOutput).toContain('Error occurred');
      expect(errorOutput).toContain('Test error');
      expect(errorOutput).toContain('stack');
    });

    it('should log error with string trace', () => {
      service.error('Error occurred', 'Stack trace string');

      const errorOutput = (console.error as jest.Mock).mock.calls[0][0];
      expect(errorOutput).toContain('Error occurred');
      expect(errorOutput).toContain('Stack trace string');
    });

    it('should log error with metadata', () => {
      service.error('Error occurred', undefined, { userId: '123', code: 'ERR_001' });

      const errorOutput = (console.error as jest.Mock).mock.calls[0][0];
      expect(errorOutput).toContain('userId');
      expect(errorOutput).toContain('123');
      expect(errorOutput).toContain('code');
      expect(errorOutput).toContain('ERR_001');
    });

    it('should send error to Sentry', () => {
      const error = new Error('Test error');
      service.setContext('TestService');
      service.error('Error occurred', error, { userId: '123' });

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: { context: 'TestService' },
          extra: { userId: '123' },
          level: 'error',
        })
      );
    });
  });

  describe('warn method', () => {
    it('should log warning messages', () => {
      service.warn('Test warning');

      expect(console.warn).toHaveBeenCalledTimes(1);
      const warnOutput = (console.warn as jest.Mock).mock.calls[0][0];
      expect(warnOutput).toContain('Test warning');
      expect(warnOutput).toContain('[WARN]');
    });

    it('should log warning with metadata', () => {
      service.warn('Warning', { threshold: 90, current: 85 });

      const warnOutput = (console.warn as jest.Mock).mock.calls[0][0];
      expect(warnOutput).toContain('threshold');
      expect(warnOutput).toContain('90');
    });

    it('should add warning breadcrumb to Sentry', () => {
      service.warn('Test warning', { data: 'test' });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'warning',
        message: 'Test warning',
        level: 'warning',
        data: { data: 'test' },
      });
    });

    it('should not log when level is below threshold', () => {
      jest.spyOn(configService, 'get').mockReturnValueOnce('production');
      const prodService = new LoggerService(configService);

      prodService.warn('Test warning');
      expect(console.warn).not.toHaveBeenCalled();
    });
  });

  describe('debug method', () => {
    it('should log debug messages in development', () => {
      service.debug('Debug message');

      expect(console.debug).toHaveBeenCalledTimes(1);
      const debugOutput = (console.debug as jest.Mock).mock.calls[0][0];
      expect(debugOutput).toContain('Debug message');
      expect(debugOutput).toContain('[DEBUG]');
    });

    it('should log debug with metadata', () => {
      service.debug('Debug info', { step: 1, total: 10 });

      const debugOutput = (console.debug as jest.Mock).mock.calls[0][0];
      expect(debugOutput).toContain('step');
      expect(debugOutput).toContain('1');
    });

    it('should not log debug in production', () => {
      jest.spyOn(configService, 'get').mockReturnValueOnce('production');
      const prodService = new LoggerService(configService);

      prodService.debug('Debug message');
      expect(console.debug).not.toHaveBeenCalled();
    });
  });

  describe('verbose method', () => {
    it('should log verbose messages in development', () => {
      service.verbose('Verbose message');

      expect(console.log).toHaveBeenCalledTimes(1);
      const verboseOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(verboseOutput).toContain('Verbose message');
      expect(verboseOutput).toContain('[VERBOSE]');
    });

    it('should not log verbose in production', () => {
      jest.spyOn(configService, 'get').mockReturnValueOnce('production');
      const prodService = new LoggerService(configService);

      prodService.verbose('Verbose message');
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('fatal method', () => {
    it('should always log fatal errors', () => {
      service.fatal('Fatal error');

      expect(console.error).toHaveBeenCalledTimes(1);
      const fatalOutput = (console.error as jest.Mock).mock.calls[0][0];
      expect(fatalOutput).toContain('Fatal error');
      expect(fatalOutput).toContain('[FATAL]');
    });

    it('should log fatal with Error object', () => {
      const error = new Error('Critical failure');
      service.fatal('System failure', error);

      const fatalOutput = (console.error as jest.Mock).mock.calls[0][0];
      expect(fatalOutput).toContain('System failure');
      expect(fatalOutput).toContain('Critical failure');
    });

    it('should send fatal error to Sentry with high priority', () => {
      const error = new Error('Critical error');
      service.setContext('CriticalService');
      service.fatal('Fatal error', error, { systemId: 'core' });

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: {
            context: 'CriticalService',
            severity: 'fatal'
          },
          extra: { systemId: 'core' },
          level: 'fatal',
        })
      );
    });

    it('should log fatal even in test environment', () => {
      jest.spyOn(configService, 'get').mockReturnValueOnce('test');
      const testService = new LoggerService(configService);

      testService.fatal('Fatal error');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('performance method', () => {
    it('should log performance metrics', () => {
      service.performance('database.query', 150);

      expect(console.log).toHaveBeenCalledTimes(1);
      const perfOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(perfOutput).toContain('Performance: database.query completed in 150ms');
    });

    it('should log performance with metadata', () => {
      service.performance('api.request', 250, { endpoint: '/users', method: 'GET' });

      const perfOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(perfOutput).toContain('250');
      expect(perfOutput).toContain('endpoint');
      expect(perfOutput).toContain('/users');
    });

    it('should add performance breadcrumb to Sentry', () => {
      service.performance('operation', 100, { type: 'test' });

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'performance',
        message: 'operation completed',
        level: 'info',
        data: {
          type: 'test',
          duration: 100,
        },
      });
    });
  });

  describe('child method', () => {
    it('should create child logger with new context', () => {
      const childLogger = service.child('ChildContext');

      expect(childLogger).toBeInstanceOf(LoggerService);
      childLogger.log('Child message');

      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(logOutput).toContain('ChildContext');
    });

    it('should inherit configuration from parent', () => {
      jest.spyOn(configService, 'get').mockReturnValueOnce('production');
      const prodService = new LoggerService(configService);
      const childLogger = prodService.child('ChildContext');

      // Child should also respect production log level
      childLogger.log('Info message');
      expect(console.log).not.toHaveBeenCalled();

      childLogger.error('Error message');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('http method', () => {
    it('should log HTTP requests', () => {
      service.http('GET', '/api/users', 200, 45);

      expect(console.log).toHaveBeenCalledTimes(1);
      const httpOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(httpOutput).toContain('HTTP GET /api/users 200 (45ms)');
    });

    it('should log HTTP errors', () => {
      service.http('POST', '/api/login', 500, 150);

      const httpOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(httpOutput).toContain('500');
      expect(httpOutput).toContain('150ms');
    });

    it('should log HTTP with metadata', () => {
      service.http('GET', '/api/data', 200, 30, { userId: '123', ip: '127.0.0.1' });

      const httpOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(httpOutput).toContain('userId');
      expect(httpOutput).toContain('ip');
    });

    it('should add appropriate breadcrumb based on status code', () => {
      // Success
      service.http('GET', '/api/success', 200, 50);
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'http',
          level: 'info',
        })
      );

      // Client error
      service.http('GET', '/api/notfound', 404, 10);
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'http',
          level: 'warning',
        })
      );

      // Server error
      service.http('POST', '/api/error', 500, 100);
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'http',
          level: 'error',
        })
      );
    });
  });

  describe('query method', () => {
    it('should log database queries in debug mode', () => {
      service.query('SELECT * FROM users WHERE id = $1', 25);

      expect(console.debug).toHaveBeenCalledTimes(1);
      const queryOutput = (console.debug as jest.Mock).mock.calls[0][0];
      expect(queryOutput).toContain('Query executed in 25ms');
    });

    it('should truncate long queries', () => {
      const longQuery = 'SELECT ' + 'a,'.repeat(100) + ' FROM table';
      service.query(longQuery, 30);

      const queryOutput = (console.debug as jest.Mock).mock.calls[0][0];
      expect(queryOutput).toContain('query');
      // Check that query is truncated to 100 chars
      const parsed = JSON.parse(queryOutput.split('[DEBUG]')[1].split('[Application]')[1]);
      expect(parsed.query.length).toBe(100);
    });

    it('should track slow queries in Sentry', () => {
      const slowQuery = 'SELECT * FROM large_table';
      service.query(slowQuery, 1500);

      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        category: 'query',
        message: 'Slow query detected',
        level: 'warning',
        data: {
          query: slowQuery,
          duration: 1500,
        },
      });
    });

    it('should not track fast queries in Sentry', () => {
      jest.clearAllMocks();
      service.query('SELECT * FROM users', 50);

      expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
    });

    it('should include metadata in query logs', () => {
      service.query('UPDATE users SET name = $1', 100, { table: 'users', rows: 1 });

      const queryOutput = (console.debug as jest.Mock).mock.calls[0][0];
      expect(queryOutput).toContain('table');
      expect(queryOutput).toContain('rows');
    });

    it('should not log queries in production', () => {
      jest.spyOn(configService, 'get').mockReturnValueOnce('production');
      const prodService = new LoggerService(configService);

      prodService.query('SELECT * FROM users', 50);
      expect(console.debug).not.toHaveBeenCalled();
    });
  });

  describe('Log formatting', () => {
    it('should format logs as JSON in production', () => {
      jest.spyOn(configService, 'get').mockReturnValueOnce('production');
      const prodService = new LoggerService(configService);

      prodService.error('Test error', undefined, { code: 'ERR_001' });

      const errorOutput = (console.error as jest.Mock).mock.calls[0][0];
      expect(() => JSON.parse(errorOutput)).not.toThrow();

      const parsed = JSON.parse(errorOutput);
      expect(parsed).toMatchObject({
        level: 'error',
        message: 'Test error',
        context: 'Application',
        code: 'ERR_001',
      });
      expect(parsed.timestamp).toBeDefined();
    });

    it('should format logs as readable strings in development', () => {
      service.log('Test message', { data: 'value' });

      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      expect(logOutput).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
      expect(logOutput).toContain('[LOG]');
      expect(logOutput).toContain('[Application]');
      expect(logOutput).toContain('Test message');
      expect(logOutput).toContain('"data": "value"');
    });

    it('should include timestamp in all log formats', () => {
      const beforeTime = new Date().toISOString();
      service.log('Test');
      const afterTime = new Date().toISOString();

      const logOutput = (console.log as jest.Mock).mock.calls[0][0];
      const timestampMatch = logOutput.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
      expect(timestampMatch).toBeTruthy();

      const logTime = new Date(timestampMatch[0]).getTime();
      expect(logTime).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
      expect(logTime).toBeLessThanOrEqual(new Date(afterTime).getTime());
    });
  });

  describe('Log level filtering', () => {
    it('should respect log level hierarchy', () => {
      // Set to warn level
      jest.spyOn(configService, 'get').mockReturnValueOnce('staging');
      const stagingService = new LoggerService(configService);

      stagingService.verbose('verbose'); // Should not log
      stagingService.debug('debug');     // Should not log
      stagingService.log('log');         // Should not log
      stagingService.warn('warn');       // Should log
      stagingService.error('error');     // Should log
      stagingService.fatal('fatal');     // Should log

      expect(console.log).not.toHaveBeenCalled();
      expect(console.debug).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledTimes(2); // error + fatal
    });

    it('should log everything in development', () => {
      service.verbose('verbose');
      service.debug('debug');
      service.log('log');
      service.warn('warn');
      service.error('error');
      service.fatal('fatal');

      expect(console.log).toHaveBeenCalledTimes(2); // verbose + log
      expect(console.debug).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledTimes(2); // error + fatal
    });
  });
});