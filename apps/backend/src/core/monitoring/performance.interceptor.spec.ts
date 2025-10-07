/**
 * Performance Interceptor Tests
 *
 * Tests the HTTP request performance monitoring interceptor
 */
import { Test } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import * as Sentry from '@sentry/node';
import { PerformanceInterceptor } from './performance.interceptor';
import { LoggerService } from '../logging/logger.service';

// Mock Sentry
jest.mock('@sentry/node', () => ({
  startSpan: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

describe('PerformanceInterceptor', () => {
  let interceptor: PerformanceInterceptor;
  let loggerService: LoggerService;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;
  let mockRequest: any;
  let mockResponse: any;
  let mockChildLogger: any;

  beforeEach(async () => {
    // Create mock child logger
    mockChildLogger = {
      http: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    // Create mock logger service
    const mockLoggerService = {
      child: jest.fn().mockReturnValue(mockChildLogger),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      http: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        PerformanceInterceptor,
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    interceptor = module.get<PerformanceInterceptor>(PerformanceInterceptor);
    loggerService = module.get<LoggerService>(LoggerService);

    // Setup mock request
    mockRequest = {
      method: 'GET',
      url: '/api/users/123',
      user: { id: 'user-456' },
      ip: '192.168.1.1',
    };

    // Setup mock response
    mockResponse = {
      statusCode: 200,
    };

    // Setup mock execution context
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest),
        getResponse: jest.fn().mockReturnValue(mockResponse),
      }),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    };

    // Setup mock call handler
    mockCallHandler = {
      handle: jest.fn().mockReturnValue(of('response')),
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a child logger with correct context', () => {
      expect(loggerService.child).toHaveBeenCalledWith('PerformanceInterceptor');
    });
  });

  describe('intercept - successful requests', () => {
    beforeEach(() => {
      // Mock Sentry.startSpan to execute the callback immediately
      (Sentry.startSpan as jest.Mock).mockImplementation((_, callback) => callback());
    });

    it('should track successful HTTP request', (done) => {
      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        next: (value) => {
          expect(value).toBe('response');
        },
        complete: () => {
          // Verify Sentry span was started
          expect(Sentry.startSpan).toHaveBeenCalledWith(
            {
              op: 'http.server',
              name: 'GET /api/users/123',
              attributes: {
                'http.method': 'GET',
                'http.url': '/api/users/123',
                'http.user_id': 'user-456',
              },
            },
            expect.any(Function)
          );

          // Verify HTTP request was logged
          expect(mockChildLogger.http).toHaveBeenCalledWith(
            'GET',
            '/api/users/123',
            200,
            expect.any(Number),
            {
              userId: 'user-456',
              ip: '192.168.1.1',
            }
          );

          // Verify Sentry breadcrumb was added
          expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
            category: 'http.request',
            type: 'http',
            level: 'info',
            data: {
              method: 'GET',
              url: '/api/users',
              status_code: 200,
              duration: expect.any(Number),
            },
          });

          done();
        },
      });
    });

    it('should handle request without user', (done) => {
      mockRequest.user = undefined;

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        complete: () => {
          expect(Sentry.startSpan).toHaveBeenCalledWith(
            expect.objectContaining({
              attributes: expect.objectContaining({
                'http.user_id': undefined,
              }),
            }),
            expect.any(Function)
          );

          expect(mockChildLogger.http).toHaveBeenCalledWith(
            'GET',
            '/api/users/123',
            200,
            expect.any(Number),
            {
              userId: undefined,
              ip: '192.168.1.1',
            }
          );

          done();
        },
      });
    });

    it('should detect and log slow requests (>1000ms)', (done) => {
      // Mock Date.now to simulate slow request
      const originalDateNow = Date.now;
      let callCount = 0;
      const startTime = 1000;

      jest.spyOn(Date, 'now').mockImplementation(() => {
        if (callCount === 0) {
          callCount++;
          return startTime;
        }
        return startTime + 1500; // 1500ms duration
      });

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        complete: () => {
          // Verify slow request warning
          expect(mockChildLogger.warn).toHaveBeenCalledWith('Slow request detected', {
            method: 'GET',
            url: '/api/users/123',
            duration: 1500,
            statusCode: 200,
            userId: 'user-456',
          });

          // Restore Date.now
          Date.now = originalDateNow;
          done();
        },
      });
    });

    it('should handle different HTTP methods', (done) => {
      mockRequest.method = 'POST';
      mockRequest.url = '/api/users';

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        complete: () => {
          expect(Sentry.startSpan).toHaveBeenCalledWith(
            expect.objectContaining({
              name: 'POST /api/users',
            }),
            expect.any(Function)
          );

          expect(mockChildLogger.http).toHaveBeenCalledWith(
            'POST',
            '/api/users',
            200,
            expect.any(Number),
            expect.any(Object)
          );

          done();
        },
      });
    });

    it('should strip query parameters from URL in breadcrumb', (done) => {
      mockRequest.url = '/api/users?page=1&limit=10';

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        complete: () => {
          expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                url: '/api/users', // Query params stripped
              }),
            })
          );

          done();
        },
      });
    });

    it('should handle different status codes', (done) => {
      mockResponse.statusCode = 201;

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        complete: () => {
          expect(mockChildLogger.http).toHaveBeenCalledWith(
            'GET',
            '/api/users/123',
            201,
            expect.any(Number),
            expect.any(Object)
          );

          expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                status_code: 201,
              }),
            })
          );

          done();
        },
      });
    });
  });

  describe('intercept - error handling', () => {
    beforeEach(() => {
      // Mock Sentry.startSpan to execute the callback immediately
      (Sentry.startSpan as jest.Mock).mockImplementation((_, callback) => callback());
    });

    it('should track failed HTTP request with error status', (done) => {
      const error = { status: 400, message: 'Bad Request' };
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        error: (err) => {
          expect(err).toBe(error);

          // Verify error was logged
          expect(mockChildLogger.error).toHaveBeenCalledWith(
            'Request failed',
            error,
            {
              method: 'GET',
              url: '/api/users/123',
              duration: expect.any(Number),
              statusCode: 400,
              userId: 'user-456',
            }
          );

          // Verify error breadcrumb
          expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
            category: 'http.request',
            type: 'http',
            level: 'error',
            data: {
              method: 'GET',
              url: '/api/users',
              status_code: 400,
              duration: expect.any(Number),
              error: true,
            },
          });

          done();
        },
      });
    });

    it('should default to 500 status for errors without status', (done) => {
      const error = new Error('Internal Server Error');
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        error: () => {
          expect(mockChildLogger.error).toHaveBeenCalledWith(
            'Request failed',
            error,
            expect.objectContaining({
              statusCode: 500,
            })
          );

          expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                status_code: 500,
              }),
            })
          );

          done();
        },
      });
    });

    it('should handle error without user context', (done) => {
      mockRequest.user = undefined;
      const error = { status: 401, message: 'Unauthorized' };
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        error: () => {
          expect(mockChildLogger.error).toHaveBeenCalledWith(
            'Request failed',
            error,
            expect.objectContaining({
              userId: undefined,
            })
          );

          done();
        },
      });
    });

    it('should strip query parameters from error breadcrumb URL', (done) => {
      mockRequest.url = '/api/users?page=1&limit=10';
      const error = { status: 404, message: 'Not Found' };
      mockCallHandler.handle = jest.fn().mockReturnValue(throwError(() => error));

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        error: () => {
          expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                url: '/api/users', // Query params stripped
              }),
            })
          );

          done();
        },
      });
    });
  });

  describe('performance tracking', () => {
    beforeEach(() => {
      (Sentry.startSpan as jest.Mock).mockImplementation((_, callback) => callback());
    });

    it('should accurately measure request duration', (done) => {
      const originalDateNow = Date.now;
      let callCount = 0;
      const startTime = 1000;
      const endTime = 1250; // 250ms duration

      jest.spyOn(Date, 'now').mockImplementation(() => {
        if (callCount === 0) {
          callCount++;
          return startTime;
        }
        return endTime;
      });

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        complete: () => {
          expect(mockChildLogger.http).toHaveBeenCalledWith(
            'GET',
            '/api/users/123',
            200,
            250, // Exact duration
            expect.any(Object)
          );

          expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                duration: 250,
              }),
            })
          );

          Date.now = originalDateNow;
          done();
        },
      });
    });

    it('should not log slow request warning for fast requests (<1000ms)', (done) => {
      const originalDateNow = Date.now;
      let callCount = 0;
      const startTime = 1000;

      jest.spyOn(Date, 'now').mockImplementation(() => {
        if (callCount === 0) {
          callCount++;
          return startTime;
        }
        return startTime + 500; // 500ms duration
      });

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        complete: () => {
          expect(mockChildLogger.warn).not.toHaveBeenCalled();
          Date.now = originalDateNow;
          done();
        },
      });
    });

    it('should log slow request warning exactly at 1001ms', (done) => {
      const originalDateNow = Date.now;
      let callCount = 0;
      const startTime = 1000;

      jest.spyOn(Date, 'now').mockImplementation(() => {
        if (callCount === 0) {
          callCount++;
          return startTime;
        }
        return startTime + 1001; // Just over threshold
      });

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        complete: () => {
          expect(mockChildLogger.warn).toHaveBeenCalledWith(
            'Slow request detected',
            expect.objectContaining({
              duration: 1001,
            })
          );
          Date.now = originalDateNow;
          done();
        },
      });
    });
  });

  describe('Sentry integration', () => {
    it('should pass correct span configuration to Sentry', (done) => {
      (Sentry.startSpan as jest.Mock).mockImplementation((config, callback) => {
        // Verify span configuration
        expect(config).toEqual({
          op: 'http.server',
          name: 'GET /api/users/123',
          attributes: {
            'http.method': 'GET',
            'http.url': '/api/users/123',
            'http.user_id': 'user-456',
          },
        });
        return callback();
      });

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        complete: () => {
          expect(Sentry.startSpan).toHaveBeenCalledTimes(1);
          done();
        },
      });
    });

    it('should return the result from Sentry.startSpan callback', (done) => {
      const expectedResult = { data: 'test' };
      mockCallHandler.handle = jest.fn().mockReturnValue(of(expectedResult));

      (Sentry.startSpan as jest.Mock).mockImplementation((_, callback) => {
        return callback();
      });

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        next: (value) => {
          expect(value).toBe(expectedResult);
          done();
        },
      });
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      (Sentry.startSpan as jest.Mock).mockImplementation((_, callback) => callback());
    });

    it('should handle empty URL', (done) => {
      mockRequest.url = '';

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        complete: () => {
          expect(mockChildLogger.http).toHaveBeenCalledWith(
            'GET',
            '',
            200,
            expect.any(Number),
            expect.any(Object)
          );
          done();
        },
      });
    });

    it('should handle URL with only query parameters', (done) => {
      mockRequest.url = '?page=1';

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        complete: () => {
          expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                url: '', // Empty after stripping query
              }),
            })
          );
          done();
        },
      });
    });

    it('should handle null IP address', (done) => {
      mockRequest.ip = null;

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);

      result$.subscribe({
        complete: () => {
          expect(mockChildLogger.http).toHaveBeenCalledWith(
            'GET',
            '/api/users/123',
            200,
            expect.any(Number),
            {
              userId: 'user-456',
              ip: null,
            }
          );
          done();
        },
      });
    });

    it('should handle Observable that emits multiple values', (done) => {
      const values = ['first', 'second', 'third'];
      mockCallHandler.handle = jest.fn().mockReturnValue(of(...values));

      const result$ = interceptor.intercept(mockExecutionContext, mockCallHandler);
      const received: any[] = [];

      result$.subscribe({
        next: (value) => {
          received.push(value);
        },
        complete: () => {
          expect(received).toEqual(values);
          // Should still only log once at the end
          expect(mockChildLogger.http).toHaveBeenCalledTimes(1);
          expect(Sentry.addBreadcrumb).toHaveBeenCalledTimes(1);
          done();
        },
      });
    });
  });
});