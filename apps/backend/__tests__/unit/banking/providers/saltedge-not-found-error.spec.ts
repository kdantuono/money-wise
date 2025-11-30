/**
 * SaltEdge 404 Error Detection Tests
 *
 * Tests the SaltEdgeNotFoundError class and 404 detection logic
 * to ensure proper handling of permanently deleted SaltEdge resources.
 */
import { SaltEdgeNotFoundError } from '../../../../src/banking/providers/saltedge.provider';

describe('SaltEdgeNotFoundError', () => {
  describe('Error Construction', () => {
    it('should create error with default unknown resource type', () => {
      const error = new SaltEdgeNotFoundError('Resource not found');

      expect(error.name).toBe('SaltEdgeNotFoundError');
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.resourceType).toBe('unknown');
      expect(error.resourceId).toBeUndefined();
    });

    it('should create error with account resource type and ID', () => {
      const error = new SaltEdgeNotFoundError(
        'Account deleted',
        'account',
        '168552387',
      );

      expect(error.name).toBe('SaltEdgeNotFoundError');
      expect(error.resourceType).toBe('account');
      expect(error.resourceId).toBe('168552387');
      expect(error.statusCode).toBe(404);
    });

    it('should create error with connection resource type', () => {
      const error = new SaltEdgeNotFoundError(
        'Connection not found',
        'connection',
        '168553123',
      );

      expect(error.resourceType).toBe('connection');
      expect(error.resourceId).toBe('168553123');
    });

    it('should create error with customer resource type', () => {
      const error = new SaltEdgeNotFoundError('Customer not found', 'customer');

      expect(error.resourceType).toBe('customer');
      expect(error.resourceId).toBeUndefined();
    });

    it('should extend Error class', () => {
      const error = new SaltEdgeNotFoundError('Test error');

      expect(error instanceof Error).toBe(true);
      expect(error.stack).toBeDefined();
    });
  });

  describe('Resource Type Detection', () => {
    it('should identify account path correctly', () => {
      const path = '/accounts/168552387';
      const resourceType = identifyResourceType(path);

      expect(resourceType).toBe('account');
    });

    it('should identify connection path correctly', () => {
      const path = '/connections/168553123';
      const resourceType = identifyResourceType(path);

      expect(resourceType).toBe('connection');
    });

    it('should identify customer path correctly', () => {
      const path = '/customers/12345';
      const resourceType = identifyResourceType(path);

      expect(resourceType).toBe('customer');
    });

    it('should return unknown for unrecognized paths', () => {
      const path = '/transactions/123';
      const resourceType = identifyResourceType(path);

      expect(resourceType).toBe('unknown');
    });
  });

  describe('Resource ID Extraction', () => {
    it('should extract account ID from path', () => {
      const path = '/accounts/168552387';
      const id = extractResourceId(path, 'account');

      expect(id).toBe('168552387');
    });

    it('should extract connection ID from path', () => {
      const path = '/connections/168553123/refresh';
      const id = extractResourceId(path, 'connection');

      expect(id).toBe('168553123');
    });

    it('should return undefined for paths without IDs', () => {
      const path = '/accounts';
      const id = extractResourceId(path, 'account');

      expect(id).toBeUndefined();
    });
  });
});

// Helper functions to test the path parsing logic
// (mirrors the logic in saltedge.provider.ts request() method)
function identifyResourceType(
  path: string,
): 'account' | 'connection' | 'customer' | 'unknown' {
  if (path.includes('/accounts')) return 'account';
  if (path.includes('/connections')) return 'connection';
  if (path.includes('/customers')) return 'customer';
  return 'unknown';
}

function extractResourceId(
  path: string,
  resourceType: string,
): string | undefined {
  const patterns: Record<string, RegExp> = {
    account: /\/accounts\/(\d+)/,
    connection: /\/connections\/(\d+)/,
    customer: /\/customers\/(\d+)/,
  };

  const pattern = patterns[resourceType];
  if (!pattern) return undefined;

  const match = path.match(pattern);
  return match?.[1];
}
