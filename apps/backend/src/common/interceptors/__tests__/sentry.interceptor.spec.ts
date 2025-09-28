import { SentryInterceptor } from '../sentry.interceptor';

describe('SentryInterceptor', () => {
  let interceptor: SentryInterceptor;

  beforeEach(() => {
    interceptor = new SentryInterceptor();
  });

  describe('intercept', () => {
    it('should create interceptor instance', () => {
      expect(interceptor).toBeDefined();
    });
  });
});
