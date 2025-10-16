/**
 * App Configuration Tests
 *
 * Tests validation and configuration of core application settings
 */
import { validate } from 'class-validator';
import { AppConfig, Environment } from './app.config';
import appConfig from './app.config';

describe('AppConfig', () => {
  let config: AppConfig;
  const originalEnv = process.env;

  beforeEach(() => {
    config = new AppConfig();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('NODE_ENV validation', () => {
    it('should accept valid environments', async () => {
      const validEnvironments = [
        Environment.Development,
        Environment.Staging,
        Environment.Production,
        Environment.Test,
      ];

      for (const env of validEnvironments) {
        config.NODE_ENV = env;
        config.PORT = 3001;
        const errors = await validate(config);
        expect(errors.find(e => e.property === 'NODE_ENV')).toBeUndefined();
      }
    });

    it('should reject invalid environment', async () => {
      // @ts-expect-error Testing invalid value
      config.NODE_ENV = 'invalid';
      config.PORT = 3001;
      const errors = await validate(config);
      const nodeEnvError = errors.find(e => e.property === 'NODE_ENV');
      expect(nodeEnvError).toBeDefined();
      expect(nodeEnvError?.constraints?.isEnum).toContain(
        'NODE_ENV must be one of: development, staging, production, test'
      );
    });
  });

  describe('PORT validation', () => {
    it('should accept valid port numbers', async () => {
      const validPorts = [1024, 3000, 3001, 8080, 65535];

      for (const port of validPorts) {
        config.NODE_ENV = Environment.Development;
        config.PORT = port;
        const errors = await validate(config);
        expect(errors.find(e => e.property === 'PORT')).toBeUndefined();
      }
    });

    it('should reject port below 1024', async () => {
      config.NODE_ENV = Environment.Development;
      config.PORT = 80;
      const errors = await validate(config);
      const portError = errors.find(e => e.property === 'PORT');
      expect(portError).toBeDefined();
      expect(portError?.constraints?.min).toContain('PORT must be at least 1024');
    });

    it('should reject port above 65535', async () => {
      config.NODE_ENV = Environment.Development;
      config.PORT = 70000;
      const errors = await validate(config);
      const portError = errors.find(e => e.property === 'PORT');
      expect(portError).toBeDefined();
      expect(portError?.constraints?.max).toContain('PORT must not exceed 65535');
    });

    it('should reject non-number port', async () => {
      config.NODE_ENV = Environment.Development;
      // @ts-expect-error Testing invalid type
      config.PORT = '3001';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'PORT')).toBeDefined();
    });
  });

  describe('APP_NAME validation', () => {
    it('should accept string app name', async () => {
      config.NODE_ENV = Environment.Development;
      config.PORT = 3001;
      config.APP_NAME = 'Custom App Name';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'APP_NAME')).toBeUndefined();
    });

    it('should use default app name when not provided', () => {
      const newConfig = new AppConfig();
      expect(newConfig.APP_NAME).toBe('MoneyWise Backend');
    });

    it('should accept undefined app name (optional)', async () => {
      config.NODE_ENV = Environment.Development;
      config.PORT = 3001;
      config.APP_NAME = undefined;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'APP_NAME')).toBeUndefined();
    });
  });

  describe('APP_VERSION validation', () => {
    it('should accept string version', async () => {
      config.NODE_ENV = Environment.Development;
      config.PORT = 3001;
      config.APP_VERSION = '1.2.3';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'APP_VERSION')).toBeUndefined();
    });

    it('should accept semantic version format', async () => {
      config.NODE_ENV = Environment.Development;
      config.PORT = 3001;
      config.APP_VERSION = '2.0.0-beta.1';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'APP_VERSION')).toBeUndefined();
    });

    it('should accept undefined version (optional)', async () => {
      config.NODE_ENV = Environment.Development;
      config.PORT = 3001;
      config.APP_VERSION = undefined;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'APP_VERSION')).toBeUndefined();
    });
  });

  describe('API_PREFIX validation', () => {
    it('should accept string prefix', async () => {
      config.NODE_ENV = Environment.Development;
      config.PORT = 3001;
      config.API_PREFIX = 'v1';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'API_PREFIX')).toBeUndefined();
    });

    it('should use default prefix when not provided', () => {
      const newConfig = new AppConfig();
      expect(newConfig.API_PREFIX).toBe('api');
    });

    it('should accept undefined prefix (optional)', async () => {
      config.NODE_ENV = Environment.Development;
      config.PORT = 3001;
      config.API_PREFIX = undefined;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'API_PREFIX')).toBeUndefined();
    });
  });

  describe('CORS_ORIGIN validation', () => {
    it('should accept valid HTTP URLs', async () => {
      const validUrls = [
        'http://localhost:3000',
        'https://example.com',
        'https://app.moneywise.com',
        'http://192.168.1.1:8080',
      ];

      for (const url of validUrls) {
        config.NODE_ENV = Environment.Development;
        config.PORT = 3001;
        config.CORS_ORIGIN = url;
        const errors = await validate(config);
        expect(errors.find(e => e.property === 'CORS_ORIGIN')).toBeUndefined();
      }
    });

    it('should reject invalid URLs', async () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        'ws://example.com',
        'example.com',
        '//example.com',
      ];

      for (const url of invalidUrls) {
        config.NODE_ENV = Environment.Development;
        config.PORT = 3001;
        config.CORS_ORIGIN = url;
        const errors = await validate(config);
        const corsError = errors.find(e => e.property === 'CORS_ORIGIN');
        expect(corsError).toBeDefined();
        expect(corsError?.constraints?.matches).toContain(
          'CORS_ORIGIN must be a valid URL starting with http:// or https://'
        );
      }
    });

    it('should use default CORS origin when not provided', () => {
      const newConfig = new AppConfig();
      expect(newConfig.CORS_ORIGIN).toBe('http://localhost:3000');
    });

    it('should accept undefined CORS origin (optional)', async () => {
      config.NODE_ENV = Environment.Development;
      config.PORT = 3001;
      config.CORS_ORIGIN = undefined;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'CORS_ORIGIN')).toBeUndefined();
    });
  });

  describe('appConfig factory function', () => {
    it('should read configuration from environment variables', () => {
      process.env.NODE_ENV = 'production';
      process.env.PORT = '8080';
      process.env.APP_NAME = 'Test App';
      process.env.APP_VERSION = '2.0.0';
      process.env.API_PREFIX = 'v2';
      process.env.CORS_ORIGIN = 'https://production.com';

      const config = appConfig();

      expect(config).toEqual({
        NODE_ENV: 'production',
        PORT: 8080,
        APP_NAME: 'Test App',
        APP_VERSION: '2.0.0',
        API_PREFIX: 'v2',
        CORS_ORIGIN: 'https://production.com',
      });
    });

    it('should use defaults when environment variables are not set', () => {
      delete process.env.NODE_ENV;
      delete process.env.PORT;
      delete process.env.APP_NAME;
      delete process.env.APP_VERSION;
      delete process.env.API_PREFIX;
      delete process.env.CORS_ORIGIN;

      const config = appConfig();

      expect(config).toEqual({
        NODE_ENV: undefined,
        PORT: 3001,
        APP_NAME: undefined,
        APP_VERSION: undefined,
        API_PREFIX: undefined,
        CORS_ORIGIN: 'http://localhost:3000',
      });
    });

    it('should parse PORT as integer', () => {
      process.env.PORT = '3001';
      const config = appConfig();
      expect(config.PORT).toBe(3001);
      expect(typeof config.PORT).toBe('number');
    });

    it('should handle invalid PORT gracefully', () => {
      process.env.PORT = 'invalid';
      const config = appConfig();
      expect(config.PORT).toBe(3001); // Falls back to default
    });
  });

  describe('Complete configuration validation', () => {
    it('should validate a complete valid configuration', async () => {
      config.NODE_ENV = Environment.Production;
      config.PORT = 3001;
      config.APP_NAME = 'MoneyWise Backend';
      config.APP_VERSION = '1.0.0';
      config.API_PREFIX = 'api';
      config.CORS_ORIGIN = 'https://app.moneywise.com';

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });

    it('should validate minimal required configuration', async () => {
      config.NODE_ENV = Environment.Development;
      config.PORT = 3001;

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });

    it('should collect multiple validation errors', async () => {
      // @ts-expect-error Testing invalid values
      config.NODE_ENV = 'invalid';
      config.PORT = 50;
      config.CORS_ORIGIN = 'not-a-url';

      const errors = await validate(config);
      expect(errors).toHaveLength(3);
      expect(errors.map(e => e.property).sort()).toEqual(['CORS_ORIGIN', 'NODE_ENV', 'PORT']);
    });
  });
});