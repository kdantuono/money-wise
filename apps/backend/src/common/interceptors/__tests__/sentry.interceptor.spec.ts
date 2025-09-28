import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import * as Sentry from '@sentry/nestjs';
import { SentryInterceptor } from '../sentry.interceptor';

// Mock Sentry
jest.mock('@sentry/nestjs', () => ({
  setContext: jest.fn(),
  setUser: jest.fn(),
  setTags: jest.fn(),
  captureException: jest.fn(),
}));

describe('SentryInterceptor', () => {
  let interceptor: SentryInterceptor;
  let mockExecutionContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SentryInterceptor],
    }).compile();

    interceptor = module.get<SentryInterceptor>(SentryInterceptor);

    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          url: '/api/test',
          method: 'GET',
          headers: {
            'authorization': 'Bearer token123',
            'user-agent': 'TestAgent/1.0',
            'content-type': 'application/json',
          },
          query: { page: '1' },
          ip: '127.0.0.1',
          get: jest.fn((header) => {
            const headers = {
              'User-Agent': 'TestAgent/1.0',
            };
            return headers[header];
          }),
          route: { path: '/api/test' },
          user: {
            id: 'user123',
            email: 'test@example.com',
            username: 'testuser',
          },
        }),
      }),
      getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
      getHandler: jest.fn().mockReturnValue({ name: 'testMethod' }),
    } as any;

    mockCallHandler = {
      handle: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe('intercept', () => {
    it('should set Sentry context and user information', (done) => {
      mockCallHandler.handle.mockReturnValue(of('success'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(Sentry.setContext).toHaveBeenCalledWith('request', {
          url: '/api/test',
          method: 'GET',
          headers: {
            'authorization': '[REDACTED]',
            'user-agent': 'TestAgent/1.0',
            'content-type': 'application/json',
          },
          query: { page: '1' },
          ip: '127.0.0.1',
          userAgent: 'TestAgent/1.0',
        });

        expect(Sentry.setUser).toHaveBeenCalledWith({
          id: 'user123',
          email: 'test@example.com',
          username: 'testuser',
        });

        expect(Sentry.setTags).toHaveBeenCalledWith({
          endpoint: 'GET /api/test',
          controller: 'TestController',
          handler: 'testMethod',
        });

        done();
      });
    });

    it('should sanitize sensitive headers', (done) => {
      const requestWithSensitiveHeaders = {
        url: '/api/test',
        method: 'POST',
        headers: {
          'authorization': 'Bearer secret-token',
          'cookie': 'session=abc123',
          'x-api-key': 'api-key-123',
          'content-type': 'application/json',
        },
        query: {},
        ip: '127.0.0.1',
        get: jest.fn(),
        route: { path: '/api/test' },
      };

      mockExecutionContext.switchToHttp().getRequest.mockReturnValue(requestWithSensitiveHeaders);
      mockCallHandler.handle.mockReturnValue(of('success'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(Sentry.setContext).toHaveBeenCalledWith('request', expect.objectContaining({
          headers: {
            'authorization': '[REDACTED]',
            'cookie': '[REDACTED]',
            'x-api-key': '[REDACTED]',
            'content-type': 'application/json',
          },
        }));

        done();
      });
    });

    it('should handle requests without user information', (done) => {
      const requestWithoutUser = {
        url: '/api/public',
        method: 'GET',
        headers: {},
        query: {},
        ip: '127.0.0.1',
        get: jest.fn(),
        route: { path: '/api/public' },
        user: undefined,
      };

      mockExecutionContext.switchToHttp().getRequest.mockReturnValue(requestWithoutUser);
      mockCallHandler.handle.mockReturnValue(of('success'));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(Sentry.setUser).not.toHaveBeenCalled();
        done();
      });
    });

    it('should capture exceptions with Sentry', (done) => {
      const testError = new Error('Test error');
      testError.stack = 'Error stack trace';

      mockCallHandler.handle.mockReturnValue(throwError(() => testError));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (error) => {
          expect(Sentry.setContext).toHaveBeenCalledWith('error_details', {
            message: 'Test error',
            stack: 'Error stack trace',
            status: undefined,
            response: undefined,
          });

          expect(Sentry.captureException).toHaveBeenCalledWith(testError);
          expect(error).toBe(testError);
          done();
        },
      });
    });

    it('should handle HTTP exceptions with status codes', (done) => {
      const httpError = {
        message: 'Not Found',
        status: 404,
        response: 'Resource not found',
        stack: 'HTTP Error stack',
      };

      mockCallHandler.handle.mockReturnValue(throwError(() => httpError));

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (error) => {
          expect(Sentry.setContext).toHaveBeenCalledWith('error_details', {
            message: 'Not Found',
            stack: 'HTTP Error stack',
            status: 404,
            response: 'Resource not found',
          });

          expect(Sentry.captureException).toHaveBeenCalledWith(httpError);
          done();
        },
      });
    });

    it('should handle successful requests in development mode', (done) => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      mockCallHandler.handle.mockReturnValue(of('success'));

      const loggerSpy = jest.spyOn((interceptor as any).logger, 'debug');

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(loggerSpy).toHaveBeenCalledWith('GET /api/test - Success');
        process.env.NODE_ENV = originalEnv;
        done();
      });
    });

    it('should not log in production mode', (done) => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockCallHandler.handle.mockReturnValue(of('success'));

      const loggerSpy = jest.spyOn((interceptor as any).logger, 'debug');

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe(() => {
        expect(loggerSpy).not.toHaveBeenCalled();
        process.env.NODE_ENV = originalEnv;
        done();
      });
    });
  });

  describe('sanitizeHeaders', () => {
    it('should sanitize sensitive headers', () => {
      const headers = {
        'authorization': 'Bearer secret',
        'cookie': 'session=abc',
        'x-api-key': 'key123',
        'content-type': 'application/json',
        'user-agent': 'TestAgent/1.0',
      };

      const sanitized = (interceptor as any).sanitizeHeaders(headers);

      expect(sanitized).toEqual({
        'authorization': '[REDACTED]',
        'cookie': '[REDACTED]',
        'x-api-key': '[REDACTED]',
        'content-type': 'application/json',
        'user-agent': 'TestAgent/1.0',
      });
    });

    it('should handle headers without sensitive data', () => {
      const headers = {
        'content-type': 'application/json',
        'accept': 'application/json',
        'user-agent': 'TestAgent/1.0',
      };

      const sanitized = (interceptor as any).sanitizeHeaders(headers);

      expect(sanitized).toEqual(headers);
    });

    it('should handle empty headers object', () => {
      const headers = {};
      const sanitized = (interceptor as any).sanitizeHeaders(headers);

      expect(sanitized).toEqual({});
    });
  });
});