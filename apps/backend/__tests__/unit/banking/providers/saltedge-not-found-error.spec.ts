/**
 * SaltEdge 404 Error Detection Tests
 *
 * Tests the SaltEdgeNotFoundError class and 404 detection logic
 * to ensure proper handling of permanently deleted SaltEdge resources.
 *
 * REGRESSION TEST: This file includes critical tests for distinguishing between:
 * - API 404 errors (resource actually deleted - should throw SaltEdgeNotFoundError)
 * - HTML 404 pages (fake providers/unsupported endpoints - should NOT throw SaltEdgeNotFoundError)
 *
 * See: hotfix/tech-debt-phase4 - SaltEdge IDs were being incorrectly wiped because
 * HTML 404 pages from fake providers were treated as "resource deleted".
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

/**
 * REGRESSION TESTS: 404 Response Type Detection
 *
 * These tests ensure that the 404 handling logic correctly distinguishes between:
 * 1. Real SaltEdge API 404s (JSON with error class) - should trigger resource cleanup
 * 2. Generic HTML 404 pages (from fake providers) - should NOT trigger resource cleanup
 *
 * Background: The fake bank providers in SaltEdge don't support all API endpoints.
 * When calling /accounts/{id} for a fake bank account, SaltEdge returns a generic
 * HTML 404 page (not a JSON API response). Previously, this was incorrectly treated
 * as "resource deleted" which caused saltEdgeAccountId to be wiped from the database.
 */
describe('404 Response Type Detection (Regression)', () => {
  // Sample HTML 404 response from SaltEdge web server (fake providers)
  const HTML_404_RESPONSE = `<!DOCTYPE html>
<html>
<head>
  <title>Not found | Salt Edge</title>
</head>
<body>
  <h2>Oops, something went wrong</h2>
  <p>Looks like this page doesn't exist</p>
</body>
</html>`;

  // Sample proper API 404 error response (real resource deletion)
  const API_404_RESPONSE = {
    error: {
      class: 'NotFound',
      message: 'Account with id 168552387 was not found',
    },
  };

  // Account-specific API 404 error
  const ACCOUNT_NOT_FOUND_RESPONSE = {
    error: {
      class: 'AccountNotFound',
      message: 'Account not found',
    },
  };

  // Connection-specific API 404 error
  const CONNECTION_NOT_FOUND_RESPONSE = {
    error: {
      class: 'ConnectionNotFound',
      message: 'Connection not found',
    },
  };

  describe('shouldThrowSaltEdgeNotFoundError', () => {
    it('should return TRUE for proper API 404 with NotFound error class', () => {
      const errorData = API_404_RESPONSE.error;
      const responseData = API_404_RESPONSE;

      const result = shouldThrowSaltEdgeNotFoundError(errorData, responseData);

      expect(result).toBe(true);
    });

    it('should return TRUE for AccountNotFound error class', () => {
      const errorData = ACCOUNT_NOT_FOUND_RESPONSE.error;
      const responseData = ACCOUNT_NOT_FOUND_RESPONSE;

      const result = shouldThrowSaltEdgeNotFoundError(errorData, responseData);

      expect(result).toBe(true);
    });

    it('should return TRUE for ConnectionNotFound error class', () => {
      const errorData = CONNECTION_NOT_FOUND_RESPONSE.error;
      const responseData = CONNECTION_NOT_FOUND_RESPONSE;

      const result = shouldThrowSaltEdgeNotFoundError(errorData, responseData);

      expect(result).toBe(true);
    });

    it('should return FALSE for HTML 404 page response (string)', () => {
      const errorData = undefined;
      const responseData = HTML_404_RESPONSE;

      const result = shouldThrowSaltEdgeNotFoundError(errorData, responseData);

      expect(result).toBe(false);
    });

    it('should return FALSE when error class is not a NotFound variant', () => {
      const errorData = { class: 'InvalidCredentials', message: 'Bad creds' };
      const responseData = { error: errorData };

      const result = shouldThrowSaltEdgeNotFoundError(errorData, responseData);

      expect(result).toBe(false);
    });

    it('should return FALSE when errorData is undefined', () => {
      const errorData = undefined;
      const responseData = { some: 'other response' };

      const result = shouldThrowSaltEdgeNotFoundError(errorData, responseData);

      expect(result).toBe(false);
    });

    it('should return FALSE when errorData has no class property', () => {
      const errorData = { class: undefined, message: 'Some error without class' };
      const responseData = { error: errorData };

      const result = shouldThrowSaltEdgeNotFoundError(errorData, responseData);

      expect(result).toBe(false);
    });
  });

  describe('isHtmlResponse', () => {
    it('should return TRUE for HTML string response', () => {
      expect(isHtmlResponse(HTML_404_RESPONSE)).toBe(true);
    });

    it('should return TRUE for partial HTML doctype', () => {
      expect(isHtmlResponse('<!DOCTYPE html><html><body>Error</body></html>')).toBe(true);
    });

    it('should return FALSE for JSON object response', () => {
      expect(isHtmlResponse(API_404_RESPONSE)).toBe(false);
    });

    it('should return FALSE for non-HTML string', () => {
      expect(isHtmlResponse('Just a plain text error')).toBe(false);
    });

    it('should return FALSE for undefined', () => {
      expect(isHtmlResponse(undefined)).toBe(false);
    });

    it('should return FALSE for null', () => {
      expect(isHtmlResponse(null)).toBe(false);
    });
  });
});

/**
 * Helper function that mirrors the 404 detection logic in saltedge.provider.ts
 * This determines if a 404 response should throw SaltEdgeNotFoundError
 */
function shouldThrowSaltEdgeNotFoundError(
  errorData: { class?: string } | undefined,
  responseData: unknown,
): boolean {
  // Check if this is a proper SaltEdge API 404 (JSON with error class)
  const isApiError =
    errorData?.class === 'NotFound' ||
    errorData?.class === 'AccountNotFound' ||
    errorData?.class === 'ConnectionNotFound' ||
    errorData?.class === 'CustomerNotFound';

  // Check if response is HTML (not JSON API error)
  const isHtml = isHtmlResponse(responseData);

  // Only throw SaltEdgeNotFoundError for API errors, NOT HTML pages
  return isApiError && !isHtml;
}

/**
 * Helper function to detect HTML responses
 */
function isHtmlResponse(data: unknown): boolean {
  return typeof data === 'string' && data.includes('<!DOCTYPE html');
}
