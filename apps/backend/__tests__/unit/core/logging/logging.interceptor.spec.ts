import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { LoggingInterceptor } from '../../../../src/core/logging/logging.interceptor';
import { of, throwError } from 'rxjs';
import { Request, Response } from 'express';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let loggerLogSpy: jest.SpyInstance;
  let loggerErrorSpy: jest.SpyInstance;
  let dateNowSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    loggerLogSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Helper to create a mock ExecutionContext
   */
  const createMockExecutionContext = (options: {
    method?: string;
    url?: string;
    ip?: string;
    userAgent?: string | undefined;
    statusCode?: number;
  } = {}): ExecutionContext => {
    const request = {
      method: options.method || 'GET',
      url: options.url || '/api/test',
      ip: options.ip || '192.168.1.1',
      headers: options.userAgent !== undefined
        ? { 'user-agent': options.userAgent }
        : {},
    } as Request;

    const response = {
      statusCode: options.statusCode || 200,
    } as Response;

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ExecutionContext;
  };

  /**
   * Helper to create a mock CallHandler for successful requests
   */
  const createMockCallHandler = (returnValue: any): CallHandler => ({
    handle: jest.fn(() => of(returnValue)),
  });

  /**
   * Helper to create a mock CallHandler that throws an error
   */
  const createErrorCallHandler = (error: any): CallHandler => ({
    handle: jest.fn(() => throwError(() => error)),
  });

  /**
   * Helper to mock Date.now() for duration calculation
   */
  const mockDateNow = (startTime: number, endTime: number) => {
    dateNowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValueOnce(startTime)
      .mockReturnValueOnce(endTime);
  };

  describe('intercept() - Successful Requests', () => {
    it('should log successful GET request with correct format', async () => {
      const context = createMockExecutionContext({
        method: 'GET',
        url: '/api/users',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        statusCode: 200,
      });

      const callHandler = createMockCallHandler({ data: 'success' });

      mockDateNow(1000000, 1000150); // 150ms duration

      await interceptor.intercept(context, callHandler).toPromise();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'GET /api/users 200 - 150ms - 127.0.0.1 - Mozilla/5.0',
      );
      expect(loggerLogSpy).toHaveBeenCalledTimes(1);
    });

    it('should log successful POST request with 201 status', async () => {
      const context = createMockExecutionContext({
        method: 'POST',
        url: '/api/users',
        ip: '127.0.0.1',
        userAgent: 'PostmanRuntime/7.26.8',
        statusCode: 201,
      });

      const callHandler = createMockCallHandler({ id: 1, name: 'John' });

      mockDateNow(2000000, 2000050); // 50ms duration

      await interceptor.intercept(context, callHandler).toPromise();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'POST /api/users 201 - 50ms - 127.0.0.1 - PostmanRuntime/7.26.8',
      );
    });

    it('should log successful PUT request', async () => {
      const context = createMockExecutionContext({
        method: 'PUT',
        url: '/api/users/123',
        ip: '10.0.0.5',
        userAgent: 'curl/7.68.0',
        statusCode: 200,
      });

      const callHandler = createMockCallHandler({ updated: true });

      mockDateNow(3000000, 3000200); // 200ms duration

      await interceptor.intercept(context, callHandler).toPromise();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'PUT /api/users/123 200 - 200ms - 10.0.0.5 - curl/7.68.0',
      );
    });

    it('should log successful DELETE request with 204 status', async () => {
      const context = createMockExecutionContext({
        method: 'DELETE',
        url: '/api/users/456',
        ip: '192.168.0.10',
        userAgent: 'TestAgent/1.0',
        statusCode: 204,
      });

      const callHandler = createMockCallHandler(null);

      mockDateNow(4000000, 4000100); // 100ms duration

      await interceptor.intercept(context, callHandler).toPromise();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'DELETE /api/users/456 204 - 100ms - 192.168.0.10 - TestAgent/1.0',
      );
    });

    it('should handle missing user-agent header with empty string', async () => {
      const context = createMockExecutionContext({
        method: 'GET',
        url: '/api/public',
        ip: '203.0.113.1',
        userAgent: undefined, // No user-agent header
        statusCode: 200,
      });

      const callHandler = createMockCallHandler({ data: 'public' });

      mockDateNow(5000000, 5000075); // 75ms duration

      await interceptor.intercept(context, callHandler).toPromise();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'GET /api/public 200 - 75ms - 203.0.113.1 - ',
      );
    });

    it('should handle empty user-agent header', async () => {
      const context = createMockExecutionContext({
        method: 'PATCH',
        url: '/api/settings',
        ip: '172.16.0.1',
        userAgent: '', // Empty user-agent
        statusCode: 200,
      });

      const callHandler = createMockCallHandler({ updated: true });

      mockDateNow(6000000, 6000125); // 125ms duration

      await interceptor.intercept(context, callHandler).toPromise();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        'PATCH /api/settings 200 - 125ms - 172.16.0.1 - ',
      );
    });

    it('should calculate duration accurately for fast requests', async () => {
      const context = createMockExecutionContext({
        method: 'GET',
        url: '/api/health',
        statusCode: 200,
      });

      const callHandler = createMockCallHandler({ status: 'ok' });

      mockDateNow(7000000, 7000005); // 5ms duration

      await interceptor.intercept(context, callHandler).toPromise();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('5ms'),
      );
    });

    it('should calculate duration accurately for slow requests', async () => {
      const context = createMockExecutionContext({
        method: 'POST',
        url: '/api/heavy-operation',
        statusCode: 200,
      });

      const callHandler = createMockCallHandler({ result: 'completed' });

      mockDateNow(8000000, 8002500); // 2500ms duration

      await interceptor.intercept(context, callHandler).toPromise();

      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('2500ms'),
      );
    });
  });

  describe('intercept() - Error Requests', () => {
    it('should log error request with 404 status and error details', async () => {
      const context = createMockExecutionContext({
        method: 'GET',
        url: '/api/users/999',
        ip: '192.168.1.1',
        userAgent: 'TestAgent',
      });

      const error = new Error('User not found');
      (error as any).status = 404;
      (error as any).stack = 'Error: User not found\n    at Controller.findOne';

      const callHandler = createErrorCallHandler(error);

      mockDateNow(9000000, 9000080); // 80ms duration

      await expect(
        interceptor.intercept(context, callHandler).toPromise(),
      ).rejects.toThrow('User not found');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'GET /api/users/999 404 - 80ms - 192.168.1.1 - TestAgent - Error: User not found',
        'Error: User not found\n    at Controller.findOne',
      );
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should log error request with 500 status when error.status is undefined', async () => {
      const context = createMockExecutionContext({
        method: 'POST',
        url: '/api/process',
        ip: '10.0.0.1',
        userAgent: 'curl/7.68.0',
      });

      const error = new Error('Internal server error');
      (error as any).stack = 'Error: Internal server error\n    at Service.process';

      const callHandler = createErrorCallHandler(error);

      mockDateNow(10000000, 10000200); // 200ms duration

      await expect(
        interceptor.intercept(context, callHandler).toPromise(),
      ).rejects.toThrow('Internal server error');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'POST /api/process 500 - 200ms - 10.0.0.1 - curl/7.68.0 - Error: Internal server error',
        'Error: Internal server error\n    at Service.process',
      );
    });

    it('should log error request with 400 status for validation errors', async () => {
      const context = createMockExecutionContext({
        method: 'POST',
        url: '/api/users',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });

      const error = new Error('Validation failed');
      (error as any).status = 400;
      (error as any).stack = 'Error: Validation failed\n    at ValidationPipe.transform';

      const callHandler = createErrorCallHandler(error);

      mockDateNow(11000000, 11000050); // 50ms duration

      await expect(
        interceptor.intercept(context, callHandler).toPromise(),
      ).rejects.toThrow('Validation failed');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'POST /api/users 400 - 50ms - 127.0.0.1 - Mozilla/5.0 - Error: Validation failed',
        'Error: Validation failed\n    at ValidationPipe.transform',
      );
    });

    it('should log error request with 403 status for authorization errors', async () => {
      const context = createMockExecutionContext({
        method: 'DELETE',
        url: '/api/admin/users/123',
        ip: '192.168.1.100',
        userAgent: 'PostmanRuntime/7.26.8',
      });

      const error = new Error('Forbidden resource');
      (error as any).status = 403;
      (error as any).stack = 'Error: Forbidden resource\n    at AuthGuard.canActivate';

      const callHandler = createErrorCallHandler(error);

      mockDateNow(12000000, 12000030); // 30ms duration

      await expect(
        interceptor.intercept(context, callHandler).toPromise(),
      ).rejects.toThrow('Forbidden resource');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'DELETE /api/admin/users/123 403 - 30ms - 192.168.1.100 - PostmanRuntime/7.26.8 - Error: Forbidden resource',
        'Error: Forbidden resource\n    at AuthGuard.canActivate',
      );
    });

    it('should handle error with missing user-agent header', async () => {
      const context = createMockExecutionContext({
        method: 'PUT',
        url: '/api/data',
        ip: '172.16.0.5',
        userAgent: undefined, // No user-agent
      });

      const error = new Error('Update failed');
      (error as any).status = 500;
      (error as any).stack = 'Error: Update failed\n    at Repository.update';

      const callHandler = createErrorCallHandler(error);

      mockDateNow(13000000, 13000100); // 100ms duration

      await expect(
        interceptor.intercept(context, callHandler).toPromise(),
      ).rejects.toThrow('Update failed');

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'PUT /api/data 500 - 100ms - 172.16.0.5 -  - Error: Update failed',
        'Error: Update failed\n    at Repository.update',
      );
    });

    it('should re-throw error after logging', async () => {
      const context = createMockExecutionContext({
        method: 'GET',
        url: '/api/test',
      });

      const error = new Error('Test error');
      (error as any).status = 500;

      const callHandler = createErrorCallHandler(error);

      mockDateNow(14000000, 14000050);

      const interceptPromise = interceptor
        .intercept(context, callHandler)
        .toPromise();

      await expect(interceptPromise).rejects.toThrow('Test error');
      await expect(interceptPromise).rejects.toThrow(error);
    });

    it('should log error with zero status code correctly', async () => {
      const context = createMockExecutionContext({
        method: 'GET',
        url: '/api/edge-case',
        ip: '203.0.113.10',
        userAgent: 'TestBot',
      });

      const error = new Error('Edge case error');
      (error as any).status = 0; // Edge case: falsy status
      (error as any).stack = 'Error: Edge case error';

      const callHandler = createErrorCallHandler(error);

      mockDateNow(15000000, 15000060); // 60ms duration

      await expect(
        interceptor.intercept(context, callHandler).toPromise(),
      ).rejects.toThrow('Edge case error');

      // Should default to 500 since 0 is falsy
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'GET /api/edge-case 500 - 60ms - 203.0.113.10 - TestBot - Error: Edge case error',
        'Error: Edge case error',
      );
    });
  });

  describe('intercept() - Observable Behavior', () => {
    it('should return an observable that emits the response data', async () => {
      const context = createMockExecutionContext();
      const responseData = { id: 1, name: 'Test' };
      const callHandler = createMockCallHandler(responseData);

      mockDateNow(16000000, 16000100);

      const result = await interceptor.intercept(context, callHandler).toPromise();

      expect(result).toEqual(responseData);
    });

    it('should not modify the response data', async () => {
      const context = createMockExecutionContext();
      const responseData = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        total: 2,
      };
      const callHandler = createMockCallHandler(responseData);

      mockDateNow(17000000, 17000150);

      const result = await interceptor.intercept(context, callHandler).toPromise();

      expect(result).toEqual(responseData);
      expect(result).toBe(responseData); // Same reference
    });
  });
});
