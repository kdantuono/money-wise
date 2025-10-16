/**
 * Sentry Configuration Tests
 *
 * Tests validation of Sentry DSN with environment-specific requirements
 */
import { validate } from 'class-validator';
import { SentryConfig } from './sentry.config';

describe('SentryConfig', () => {
  let config: SentryConfig;
  const originalEnv = process.env;

  beforeEach(() => {
    config = new SentryConfig();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('SENTRY_DSN validation - Test Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should allow empty DSN in test environment', async () => {
      config.SENTRY_DSN = '';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'SENTRY_DSN')).toBeUndefined();
    });

    it('should allow undefined DSN in test environment', async () => {
      config.SENTRY_DSN = undefined;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'SENTRY_DSN')).toBeUndefined();
    });

    it('should validate DSN format when provided in test environment', async () => {
      config.SENTRY_DSN = 'https://abc123@o123.ingest.sentry.io/456';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'SENTRY_DSN')).toBeUndefined();
    });

    it('should reject invalid DSN format in test environment', async () => {
      config.SENTRY_DSN = 'http://invalid-sentry-dsn';
      const errors = await validate(config);
      const dsnError = errors.find(e => e.property === 'SENTRY_DSN');
      expect(dsnError).toBeDefined();
    });
  });

  describe('SENTRY_DSN validation - Development Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should allow empty DSN in development environment', async () => {
      config.SENTRY_DSN = '';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'SENTRY_DSN')).toBeUndefined();
    });

    it('should allow undefined DSN in development environment', async () => {
      config.SENTRY_DSN = undefined;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'SENTRY_DSN')).toBeUndefined();
    });

    it('should validate DSN format when provided in development', async () => {
      config.SENTRY_DSN = 'https://dev123@o123.ingest.sentry.io/789';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'SENTRY_DSN')).toBeUndefined();
    });
  });

  describe('SENTRY_DSN validation - Production Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should require DSN in production environment', async () => {
      config.SENTRY_DSN = '';
      const errors = await validate(config);
      const dsnError = errors.find(e => e.property === 'SENTRY_DSN');
      expect(dsnError).toBeDefined();
      expect(dsnError?.constraints?.isUrl).toContain('SENTRY_DSN is required in production/staging');
    });

    it('should reject undefined DSN in production environment', async () => {
      config.SENTRY_DSN = undefined;
      const errors = await validate(config);
      const dsnError = errors.find(e => e.property === 'SENTRY_DSN');
      expect(dsnError).toBeDefined();
    });

    it('should accept valid HTTPS DSN in production', async () => {
      config.SENTRY_DSN = 'https://prod123@o123.ingest.sentry.io/999';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'SENTRY_DSN')).toBeUndefined();
    });

    it('should reject HTTP DSN in production (must be HTTPS)', async () => {
      config.SENTRY_DSN = 'http://prod123@o123.ingest.sentry.io/999';
      const errors = await validate(config);
      const dsnError = errors.find(e => e.property === 'SENTRY_DSN');
      expect(dsnError).toBeDefined();
      expect(dsnError?.constraints?.isUrl).toContain('HTTPS URL');
    });

    it('should reject invalid URL format in production', async () => {
      config.SENTRY_DSN = 'not-a-valid-url';
      const errors = await validate(config);
      const dsnError = errors.find(e => e.property === 'SENTRY_DSN');
      expect(dsnError).toBeDefined();
    });
  });

  describe('SENTRY_DSN validation - Staging Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'staging';
    });

    it('should require DSN in staging environment', async () => {
      config.SENTRY_DSN = '';
      const errors = await validate(config);
      const dsnError = errors.find(e => e.property === 'SENTRY_DSN');
      expect(dsnError).toBeDefined();
      expect(dsnError?.constraints?.isUrl).toContain('SENTRY_DSN is required in production/staging');
    });

    it('should accept valid DSN in staging', async () => {
      config.SENTRY_DSN = 'https://staging123@o123.ingest.sentry.io/888';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'SENTRY_DSN')).toBeUndefined();
    });
  });

  describe('SENTRY_ENVIRONMENT validation', () => {
    it('should accept string environment name', async () => {
      config.SENTRY_ENVIRONMENT = 'production';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'SENTRY_ENVIRONMENT')).toBeUndefined();
    });

    it('should be optional', async () => {
      config.SENTRY_ENVIRONMENT = undefined;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'SENTRY_ENVIRONMENT')).toBeUndefined();
    });
  });

  describe('SENTRY_RELEASE validation', () => {
    it('should accept git SHA format', async () => {
      config.SENTRY_RELEASE = 'a3f2d1b';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'SENTRY_RELEASE')).toBeUndefined();
    });

    it('should accept semver format', async () => {
      config.SENTRY_RELEASE = 'v1.2.3';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'SENTRY_RELEASE')).toBeUndefined();
    });

    it('should be optional', async () => {
      config.SENTRY_RELEASE = undefined;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'SENTRY_RELEASE')).toBeUndefined();
    });
  });

  describe('Sample rate validation', () => {
    it('should accept valid trace sample rate', async () => {
      config.SENTRY_TRACES_SAMPLE_RATE = 0.5;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'SENTRY_TRACES_SAMPLE_RATE')).toBeUndefined();
    });

    it('should accept 0 for trace sample rate', async () => {
      config.SENTRY_TRACES_SAMPLE_RATE = 0;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'SENTRY_TRACES_SAMPLE_RATE')).toBeUndefined();
    });

    it('should accept 1 for trace sample rate', async () => {
      config.SENTRY_TRACES_SAMPLE_RATE = 1;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'SENTRY_TRACES_SAMPLE_RATE')).toBeUndefined();
    });

    it('should reject trace sample rate below 0', async () => {
      config.SENTRY_TRACES_SAMPLE_RATE = -0.1;
      const errors = await validate(config);
      const rateError = errors.find(e => e.property === 'SENTRY_TRACES_SAMPLE_RATE');
      expect(rateError).toBeDefined();
      expect(rateError?.constraints?.min).toContain('must not be less than 0');
    });

    it('should reject trace sample rate above 1', async () => {
      config.SENTRY_TRACES_SAMPLE_RATE = 1.5;
      const errors = await validate(config);
      const rateError = errors.find(e => e.property === 'SENTRY_TRACES_SAMPLE_RATE');
      expect(rateError).toBeDefined();
      expect(rateError?.constraints?.max).toContain('must not be greater than 1');
    });

    it('should accept valid profile sample rate', async () => {
      config.SENTRY_PROFILES_SAMPLE_RATE = 0.2;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'SENTRY_PROFILES_SAMPLE_RATE')).toBeUndefined();
    });
  });

  describe('getSamplingRates()', () => {
    it('should return production rates', () => {
      config.SENTRY_ENVIRONMENT = 'production';
      const rates = config.getSamplingRates();
      expect(rates.traces).toBe(0.1);
      expect(rates.profiles).toBe(0.1);
    });

    it('should return staging rates', () => {
      config.SENTRY_ENVIRONMENT = 'staging';
      const rates = config.getSamplingRates();
      expect(rates.traces).toBe(0.5);
      expect(rates.profiles).toBe(0.2);
    });

    it('should return development rates', () => {
      config.SENTRY_ENVIRONMENT = 'development';
      const rates = config.getSamplingRates();
      expect(rates.traces).toBe(1.0);
      expect(rates.profiles).toBe(0.0);
    });

    it('should use custom rates when provided', () => {
      config.SENTRY_ENVIRONMENT = 'production';
      config.SENTRY_TRACES_SAMPLE_RATE = 0.25;
      config.SENTRY_PROFILES_SAMPLE_RATE = 0.15;
      const rates = config.getSamplingRates();
      expect(rates.traces).toBe(0.25);
      expect(rates.profiles).toBe(0.15);
    });
  });

  describe('isEnabled()', () => {
    it('should return true when DSN is provided', () => {
      config.SENTRY_DSN = 'https://abc@o123.ingest.sentry.io/456';
      expect(config.isEnabled()).toBe(true);
    });

    it('should return false when DSN is empty', () => {
      config.SENTRY_DSN = '';
      expect(config.isEnabled()).toBe(false);
    });

    it('should return false when DSN is undefined', () => {
      config.SENTRY_DSN = undefined;
      expect(config.isEnabled()).toBe(false);
    });
  });
});
