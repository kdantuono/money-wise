import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { MonitoringInterceptor } from '../../../../src/core/monitoring/monitoring.interceptor';
import { MonitoringService } from '../../../../src/core/monitoring/monitoring.service';
import { of, throwError } from 'rxjs';

/**
 * Unit tests for MonitoringInterceptor
 *
 * Tests:
 * - intercept() method for successful and error requests
 * - trackRequest() error handling
 * - extractUserId() from different user object structures
 * - normalizeEndpoint() for various URL patterns
 */
describe('MonitoringInterceptor', () => {
  let interceptor: MonitoringInterceptor;
  let monitoringService: jest.Mocked<MonitoringService>;
  let loggerErrorSpy: jest.SpyInstance;

  // Mock MonitoringService
  const mockMonitoringService = {
    trackApiRequest: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringInterceptor,
        {
          provide: MonitoringService,
          useValue: mockMonitoringService,
        },
      ],
    }).compile();

    interceptor = module.get<MonitoringInterceptor>(MonitoringInterceptor);
    monitoringService = module.get(MonitoringService) as jest.Mocked<MonitoringService>;

    // Mock Logger.error
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * Helper function to create mock ExecutionContext
   */
  const createMockExecutionContext = (options: {
    method?: string;
    url?: string;
    user?: { id?: string; sub?: string };
    statusCode?: number;
  } = {}): ExecutionContext => {
    const request = {
      method: options.method || 'GET',
      url: options.url || '/api/test',
      user: options.user,
    };

    const response = {
      statusCode: options.statusCode || 200,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as any;
  };

  /**
   * Helper function to create mock CallHandler returning value
   */
  const createMockCallHandler = (returnValue: any): CallHandler => ({
    handle: jest.fn(() => of(returnValue)),
  });

  /**
   * Helper function to create mock CallHandler throwing error
   */
  const createErrorCallHandler = (error: any): CallHandler => ({
    handle: jest.fn(() => throwError(() => error)),
  });

  describe('normalizeEndpoint()', () => {
    it('should remove query parameters', () => {
      const result = interceptor['normalizeEndpoint']('/api/users?page=1&limit=10');
      expect(result).toBe('/api/users');
    });

    it('should replace numeric IDs with :id', () => {
      const result = interceptor['normalizeEndpoint']('/api/users/123');
      expect(result).toBe('/api/users/:id');
    });

    it('should replace UUIDs with :uuid', () => {
      const result = interceptor['normalizeEndpoint'](
        '/api/accounts/f47ac10b-58cc-4372-a967-0e02b2c3d479'
      );
      expect(result).toBe('/api/accounts/:uuid');
    });

    it('should convert to lowercase', () => {
      const result = interceptor['normalizeEndpoint']('/API/Users');
      expect(result).toBe('/api/users');
    });

    it('should handle complex URLs with multiple IDs', () => {
      const result = interceptor['normalizeEndpoint']('/api/users/123/accounts/456');
      expect(result).toBe('/api/users/:id/accounts/:id');
    });

    it('should handle URLs with both numeric and UUID', () => {
      const result = interceptor['normalizeEndpoint'](
        '/api/users/f47ac10b-58cc-4372-a967-0e02b2c3d479/accounts/789'
      );
      expect(result).toBe('/api/users/:uuid/accounts/:id');
    });

    it('should handle URLs without IDs', () => {
      const result = interceptor['normalizeEndpoint']('/api/users');
      expect(result).toBe('/api/users');
    });

    it('should handle URLs with both query params and IDs', () => {
      const result = interceptor['normalizeEndpoint'](
        '/api/users/123/accounts?status=active&page=1'
      );
      expect(result).toBe('/api/users/:id/accounts');
    });

    it('should handle UUID v4 variant 10 (binary 1010)', () => {
      const result = interceptor['normalizeEndpoint'](
        '/api/resource/a1b2c3d4-e5f6-4789-a012-345678901234'
      );
      expect(result).toBe('/api/resource/:uuid');
    });

    it('should handle UUID v4 variant 8 (binary 1000)', () => {
      const result = interceptor['normalizeEndpoint'](
        '/api/resource/f47ac10b-58cc-4372-8967-0e02b2c3d479'
      );
      expect(result).toBe('/api/resource/:uuid');
    });
  });

  describe('extractUserId()', () => {
    it('should extract user ID from user.id', () => {
      const request = { user: { id: 'user-123' } } as any;
      const result = interceptor['extractUserId'](request);
      expect(result).toBe('user-123');
    });

    it('should extract user ID from user.sub when id not available', () => {
      const request = { user: { sub: 'user-456' } } as any;
      const result = interceptor['extractUserId'](request);
      expect(result).toBe('user-456');
    });

    it('should prefer user.id over user.sub', () => {
      const request = { user: { id: 'user-123', sub: 'user-456' } } as any;
      const result = interceptor['extractUserId'](request);
      expect(result).toBe('user-123');
    });

    it('should return undefined when no user', () => {
      const request = {} as any;
      const result = interceptor['extractUserId'](request);
      expect(result).toBeUndefined();
    });

    it('should return undefined when user exists but no id/sub', () => {
      const request = { user: {} } as any;
      const result = interceptor['extractUserId'](request);
      expect(result).toBeUndefined();
    });
  });

  describe('intercept() - successful requests', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000000)
        .mockReturnValueOnce(1000150);
    });

    it('should track successful request with correct parameters', async () => {
      const context = createMockExecutionContext({
        method: 'POST',
        url: '/api/users/123',
        user: { id: 'user-456' },
        statusCode: 201,
      });

      const callHandler = createMockCallHandler({ data: 'success' });

      await interceptor.intercept(context, callHandler).toPromise();

      expect(mockMonitoringService.trackApiRequest).toHaveBeenCalledWith(
        '/api/users/:id',
        'POST',
        201,
        150,
        'user-456',
      );
    });

    it('should track request with userId from user.sub', async () => {
      const context = createMockExecutionContext({
        method: 'GET',
        url: '/api/accounts/f47ac10b-58cc-4372-a967-0e02b2c3d479',
        user: { sub: 'user-789' },
        statusCode: 200,
      });

      const callHandler = createMockCallHandler({ accounts: [] });

      await interceptor.intercept(context, callHandler).toPromise();

      expect(mockMonitoringService.trackApiRequest).toHaveBeenCalledWith(
        '/api/accounts/:uuid',
        'GET',
        200,
        150,
        'user-789',
      );
    });

    it('should track request without userId when no user', async () => {
      const context = createMockExecutionContext({
        method: 'GET',
        url: '/api/health',
        statusCode: 200,
      });

      const callHandler = createMockCallHandler({ status: 'ok' });

      await interceptor.intercept(context, callHandler).toPromise();

      expect(mockMonitoringService.trackApiRequest).toHaveBeenCalledWith(
        '/api/health',
        'GET',
        200,
        150,
        undefined,
      );
    });

    it('should normalize endpoint with query parameters', async () => {
      const context = createMockExecutionContext({
        method: 'GET',
        url: '/api/users?page=1&limit=10&sort=name',
        statusCode: 200,
      });

      const callHandler = createMockCallHandler({ users: [] });

      await interceptor.intercept(context, callHandler).toPromise();

      expect(mockMonitoringService.trackApiRequest).toHaveBeenCalledWith(
        '/api/users',
        'GET',
        200,
        150,
        undefined,
      );
    });

    it('should return the original observable value', async () => {
      const context = createMockExecutionContext({
        method: 'GET',
        url: '/api/test',
        statusCode: 200,
      });

      const expectedData = { id: 1, name: 'test' };
      const callHandler = createMockCallHandler(expectedData);

      const result = await interceptor.intercept(context, callHandler).toPromise();

      expect(result).toEqual(expectedData);
    });
  });

  describe('intercept() - error requests', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(2000000)
        .mockReturnValueOnce(2000080);
    });

    it('should track error request with error status code', async () => {
      const context = createMockExecutionContext({
        method: 'DELETE',
        url: '/api/accounts/f47ac10b-58cc-4372-a967-0e02b2c3d479',
        user: { sub: 'user-789' },
      });

      const error: any = new Error('Not found');
      error.status = 404;
      error.stack = 'Error: Not found\n  at test.ts:10:5';

      const callHandler = createErrorCallHandler(error);

      await expect(
        interceptor.intercept(context, callHandler).toPromise()
      ).rejects.toThrow('Not found');

      expect(mockMonitoringService.trackApiRequest).toHaveBeenCalledWith(
        '/api/accounts/:uuid',
        'DELETE',
        404,
        80,
        'user-789',
      );

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'API Error: DELETE /api/accounts/:uuid - 404 (80ms)',
        'Error: Not found\n  at test.ts:10:5'
      );
    });

    it('should default to 500 status code when error has no status', async () => {
      const context = createMockExecutionContext({
        method: 'POST',
        url: '/api/transactions',
        user: { id: 'user-123' },
      });

      const error: any = new Error('Internal server error');
      error.stack = 'Error: Internal server error\n  at service.ts:50:10';

      const callHandler = createErrorCallHandler(error);

      await expect(
        interceptor.intercept(context, callHandler).toPromise()
      ).rejects.toThrow('Internal server error');

      expect(mockMonitoringService.trackApiRequest).toHaveBeenCalledWith(
        '/api/transactions',
        'POST',
        500,
        80,
        'user-123',
      );

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'API Error: POST /api/transactions - 500 (80ms)',
        'Error: Internal server error\n  at service.ts:50:10'
      );
    });

    it('should handle errors with complex paths', async () => {
      const context = createMockExecutionContext({
        method: 'PUT',
        url: '/api/users/123/accounts/456/transactions/789?refetch=true',
      });

      const error: any = new Error('Forbidden');
      error.status = 403;
      error.stack = 'Error: Forbidden';

      const callHandler = createErrorCallHandler(error);

      await expect(
        interceptor.intercept(context, callHandler).toPromise()
      ).rejects.toThrow('Forbidden');

      expect(mockMonitoringService.trackApiRequest).toHaveBeenCalledWith(
        '/api/users/:id/accounts/:id/transactions/:id',
        'PUT',
        403,
        80,
        undefined,
      );
    });
  });

  describe('trackRequest() - error handling', () => {
    it('should catch and log errors when tracking fails', async () => {
      const context = createMockExecutionContext({
        method: 'GET',
        url: '/api/test',
        statusCode: 200,
      });

      const callHandler = createMockCallHandler({});

      const trackingError: any = new Error('CloudWatch connection failed');
      trackingError.stack = 'Error: CloudWatch connection failed\n  at aws-sdk.ts:100:15';

      mockMonitoringService.trackApiRequest.mockRejectedValueOnce(trackingError);

      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(3000000)
        .mockReturnValueOnce(3000100);

      // Should not throw - tracking error should be caught
      await expect(
        interceptor.intercept(context, callHandler).toPromise()
      ).resolves.toBeDefined();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to track API request metrics',
        'Error: CloudWatch connection failed\n  at aws-sdk.ts:100:15'
      );
    });

    it('should continue to track subsequent requests after tracking error', async () => {
      const context1 = createMockExecutionContext({
        method: 'GET',
        url: '/api/test1',
        statusCode: 200,
      });

      const context2 = createMockExecutionContext({
        method: 'GET',
        url: '/api/test2',
        statusCode: 200,
      });

      const callHandler1 = createMockCallHandler({});
      const callHandler2 = createMockCallHandler({});

      const trackingError: any = new Error('Temporary failure');
      trackingError.stack = 'Error: Temporary failure';

      // First call fails, second succeeds
      mockMonitoringService.trackApiRequest
        .mockRejectedValueOnce(trackingError)
        .mockResolvedValueOnce(undefined);

      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(4000000)
        .mockReturnValueOnce(4000050)
        .mockReturnValueOnce(4001000)
        .mockReturnValueOnce(4001075);

      // First request - tracking fails
      await interceptor.intercept(context1, callHandler1).toPromise();

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Failed to track API request metrics',
        'Error: Temporary failure'
      );

      // Second request - tracking succeeds
      await interceptor.intercept(context2, callHandler2).toPromise();

      expect(mockMonitoringService.trackApiRequest).toHaveBeenCalledTimes(2);
      expect(mockMonitoringService.trackApiRequest).toHaveBeenNthCalledWith(
        2,
        '/api/test2',
        'GET',
        200,
        75,
        undefined
      );
    });
  });

  describe('edge cases', () => {
    it('should handle request with uppercase method', async () => {
      const context = createMockExecutionContext({
        method: 'POST',
        url: '/API/USERS',
        statusCode: 201,
      });

      const callHandler = createMockCallHandler({});

      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(5000000)
        .mockReturnValueOnce(5000200);

      await interceptor.intercept(context, callHandler).toPromise();

      expect(mockMonitoringService.trackApiRequest).toHaveBeenCalledWith(
        '/api/users',
        'POST',
        201,
        200,
        undefined,
      );
    });

    it('should handle zero response time', async () => {
      const context = createMockExecutionContext({
        method: 'GET',
        url: '/api/health',
        statusCode: 200,
      });

      const callHandler = createMockCallHandler({});

      // Same timestamp
      jest.spyOn(Date, 'now')
        .mockReturnValue(6000000);

      await interceptor.intercept(context, callHandler).toPromise();

      expect(mockMonitoringService.trackApiRequest).toHaveBeenCalledWith(
        '/api/health',
        'GET',
        200,
        0,
        undefined,
      );
    });

    it('should handle URL with only query parameters', async () => {
      const context = createMockExecutionContext({
        method: 'GET',
        url: '/?param1=value1&param2=value2',
        statusCode: 200,
      });

      const callHandler = createMockCallHandler({});

      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(7000000)
        .mockReturnValueOnce(7000050);

      await interceptor.intercept(context, callHandler).toPromise();

      expect(mockMonitoringService.trackApiRequest).toHaveBeenCalledWith(
        '/',
        'GET',
        200,
        50,
        undefined,
      );
    });

    it('should handle multiple consecutive numeric segments', async () => {
      const context = createMockExecutionContext({
        method: 'GET',
        url: '/api/123/456/789',
        statusCode: 200,
      });

      const callHandler = createMockCallHandler({});

      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(8000000)
        .mockReturnValueOnce(8000100);

      await interceptor.intercept(context, callHandler).toPromise();

      expect(mockMonitoringService.trackApiRequest).toHaveBeenCalledWith(
        '/api/:id/:id/:id',
        'GET',
        200,
        100,
        undefined,
      );
    });
  });
});
