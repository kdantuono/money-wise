/* eslint-disable no-secrets/no-secrets -- Test file with mock AWS credentials marked as "EXAMPLE", not real secrets */
/**
 * Monitoring Configuration Tests
 *
 * Tests validation and configuration of CloudWatch and application metrics settings
 */
import { validate } from 'class-validator';
import { MonitoringConfig } from './monitoring.config';

describe('MonitoringConfig', () => {
  let config: MonitoringConfig;

  beforeEach(() => {
    config = new MonitoringConfig();
  });

  describe('CLOUDWATCH_ENABLED validation', () => {
    it('should accept boolean values', async () => {
      config.CLOUDWATCH_ENABLED = true;
      let errors = await validate(config);
      expect(errors.find(e => e.property === 'CLOUDWATCH_ENABLED')).toBeUndefined();

      config.CLOUDWATCH_ENABLED = false;
      errors = await validate(config);
      expect(errors.find(e => e.property === 'CLOUDWATCH_ENABLED')).toBeUndefined();
    });

    it('should use default value when not provided', () => {
      const newConfig = new MonitoringConfig();
      expect(newConfig.CLOUDWATCH_ENABLED).toBe(false);
    });

    it('should reject non-boolean values', async () => {
      // @ts-expect-error Testing invalid type
      config.CLOUDWATCH_ENABLED = 'true';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'CLOUDWATCH_ENABLED')).toBeDefined();
    });

    it('should accept undefined (optional)', async () => {
      config.CLOUDWATCH_ENABLED = undefined;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'CLOUDWATCH_ENABLED')).toBeUndefined();
    });
  });

  describe('CLOUDWATCH_NAMESPACE validation', () => {
    it('should accept valid namespace strings', async () => {
      const validNamespaces = [
        'MoneyWise/Backend',
        'Application/Production',
        'MyApp',
        'AWS/Custom',
        'Company/Service/Environment',
      ];

      for (const namespace of validNamespaces) {
        config.CLOUDWATCH_NAMESPACE = namespace;
        const errors = await validate(config);
        expect(errors.find(e => e.property === 'CLOUDWATCH_NAMESPACE')).toBeUndefined();
      }
    });

    it('should use default namespace when not provided', () => {
      const newConfig = new MonitoringConfig();
      expect(newConfig.CLOUDWATCH_NAMESPACE).toBe('MoneyWise/Backend');
    });

    it('should reject non-string values', async () => {
      // @ts-expect-error Testing invalid type
      config.CLOUDWATCH_NAMESPACE = 123;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'CLOUDWATCH_NAMESPACE')).toBeDefined();
    });

    it('should accept undefined (optional)', async () => {
      config.CLOUDWATCH_NAMESPACE = undefined;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'CLOUDWATCH_NAMESPACE')).toBeUndefined();
    });
  });

  describe('AWS_REGION validation', () => {
    it('should accept valid AWS region strings', async () => {
      const validRegions = [
        'us-east-1',
        'us-west-2',
        'eu-west-1',
        'ap-southeast-1',
        'ca-central-1',
      ];

      for (const region of validRegions) {
        config.AWS_REGION = region;
        const errors = await validate(config);
        expect(errors.find(e => e.property === 'AWS_REGION')).toBeUndefined();
      }
    });

    it('should use default region when not provided', () => {
      const newConfig = new MonitoringConfig();
      expect(newConfig.AWS_REGION).toBe('us-east-1');
    });

    it('should reject non-string values', async () => {
      // @ts-expect-error Testing invalid type
      config.AWS_REGION = ['us-east-1'];
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'AWS_REGION')).toBeDefined();
    });

    it('should accept undefined (optional)', async () => {
      config.AWS_REGION = undefined;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'AWS_REGION')).toBeUndefined();
    });
  });

  describe('AWS_ACCESS_KEY_ID validation', () => {
    it('should accept valid access key strings', async () => {
      const validKeys = [
        'AKIAIOSFODNN7EXAMPLE',
        'AKIAIOSFODNN7EXAMPLE2',
        'test-access-key',
      ];

      for (const key of validKeys) {
        config.AWS_ACCESS_KEY_ID = key;
        const errors = await validate(config);
        expect(errors.find(e => e.property === 'AWS_ACCESS_KEY_ID')).toBeUndefined();
      }
    });

    it('should accept undefined (optional)', async () => {
      config.AWS_ACCESS_KEY_ID = undefined;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'AWS_ACCESS_KEY_ID')).toBeUndefined();
    });

    it('should reject non-string values', async () => {
      // @ts-expect-error Testing invalid type
      config.AWS_ACCESS_KEY_ID = 12345;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'AWS_ACCESS_KEY_ID')).toBeDefined();
    });
  });

  describe('AWS_SECRET_ACCESS_KEY validation', () => {
    it('should accept valid secret key strings', async () => {
      const validKeys = [
        'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        'test-secret-key',
        'some-long-secret-key-value',
      ];

      for (const key of validKeys) {
        config.AWS_SECRET_ACCESS_KEY = key;
        const errors = await validate(config);
        expect(errors.find(e => e.property === 'AWS_SECRET_ACCESS_KEY')).toBeUndefined();
      }
    });

    it('should accept undefined (optional)', async () => {
      config.AWS_SECRET_ACCESS_KEY = undefined;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'AWS_SECRET_ACCESS_KEY')).toBeUndefined();
    });

    it('should reject non-string values', async () => {
      // @ts-expect-error Testing invalid type
      config.AWS_SECRET_ACCESS_KEY = true;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'AWS_SECRET_ACCESS_KEY')).toBeDefined();
    });
  });

  describe('METRICS_ENABLED validation', () => {
    it('should accept boolean values', async () => {
      config.METRICS_ENABLED = true;
      let errors = await validate(config);
      expect(errors.find(e => e.property === 'METRICS_ENABLED')).toBeUndefined();

      config.METRICS_ENABLED = false;
      errors = await validate(config);
      expect(errors.find(e => e.property === 'METRICS_ENABLED')).toBeUndefined();
    });

    it('should use default value when not provided', () => {
      const newConfig = new MonitoringConfig();
      expect(newConfig.METRICS_ENABLED).toBe(true);
    });

    it('should reject non-boolean values', async () => {
      // @ts-expect-error Testing invalid type
      config.METRICS_ENABLED = 1;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'METRICS_ENABLED')).toBeDefined();
    });

    it('should accept undefined (optional)', async () => {
      config.METRICS_ENABLED = undefined;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'METRICS_ENABLED')).toBeUndefined();
    });
  });

  describe('METRICS_FLUSH_INTERVAL validation', () => {
    it('should accept valid intervals above minimum', async () => {
      const validIntervals = [1000, 5000, 30000, 60000, 300000];

      for (const interval of validIntervals) {
        config.METRICS_FLUSH_INTERVAL = interval;
        const errors = await validate(config);
        expect(errors.find(e => e.property === 'METRICS_FLUSH_INTERVAL')).toBeUndefined();
      }
    });

    it('should use default interval when not provided', () => {
      const newConfig = new MonitoringConfig();
      expect(newConfig.METRICS_FLUSH_INTERVAL).toBe(30000);
    });

    it('should reject intervals below 1000ms', async () => {
      config.METRICS_FLUSH_INTERVAL = 999;
      const errors = await validate(config);
      const intervalError = errors.find(e => e.property === 'METRICS_FLUSH_INTERVAL');
      expect(intervalError).toBeDefined();
      expect(intervalError?.constraints?.min).toBeDefined();
    });

    it('should reject non-number values', async () => {
      // @ts-expect-error Testing invalid type
      config.METRICS_FLUSH_INTERVAL = '30000';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'METRICS_FLUSH_INTERVAL')).toBeDefined();
    });

    it('should accept undefined (optional)', async () => {
      config.METRICS_FLUSH_INTERVAL = undefined;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'METRICS_FLUSH_INTERVAL')).toBeUndefined();
    });
  });

  describe('HEALTH_CHECK_ENABLED validation', () => {
    it('should accept boolean values', async () => {
      config.HEALTH_CHECK_ENABLED = true;
      let errors = await validate(config);
      expect(errors.find(e => e.property === 'HEALTH_CHECK_ENABLED')).toBeUndefined();

      config.HEALTH_CHECK_ENABLED = false;
      errors = await validate(config);
      expect(errors.find(e => e.property === 'HEALTH_CHECK_ENABLED')).toBeUndefined();
    });

    it('should use default value when not provided', () => {
      const newConfig = new MonitoringConfig();
      expect(newConfig.HEALTH_CHECK_ENABLED).toBe(true);
    });

    it('should reject non-boolean values', async () => {
      // @ts-expect-error Testing invalid type
      config.HEALTH_CHECK_ENABLED = 'yes';
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'HEALTH_CHECK_ENABLED')).toBeDefined();
    });

    it('should accept undefined (optional)', async () => {
      config.HEALTH_CHECK_ENABLED = undefined;
      const errors = await validate(config);
      expect(errors.find(e => e.property === 'HEALTH_CHECK_ENABLED')).toBeUndefined();
    });
  });

  describe('Helper methods', () => {
    describe('isCloudWatchEnabled()', () => {
      it('should return true when CLOUDWATCH_ENABLED is true', () => {
        config.CLOUDWATCH_ENABLED = true;
        expect(config.isCloudWatchEnabled()).toBe(true);
      });

      it('should return false when CLOUDWATCH_ENABLED is false', () => {
        config.CLOUDWATCH_ENABLED = false;
        expect(config.isCloudWatchEnabled()).toBe(false);
      });

      it('should return false when CLOUDWATCH_ENABLED is undefined', () => {
        config.CLOUDWATCH_ENABLED = undefined;
        expect(config.isCloudWatchEnabled()).toBe(false);
      });

      it('should return false for default configuration', () => {
        const newConfig = new MonitoringConfig();
        expect(newConfig.isCloudWatchEnabled()).toBe(false);
      });
    });

    describe('isMetricsEnabled()', () => {
      it('should return true when METRICS_ENABLED is true', () => {
        config.METRICS_ENABLED = true;
        expect(config.isMetricsEnabled()).toBe(true);
      });

      it('should return false when METRICS_ENABLED is false', () => {
        config.METRICS_ENABLED = false;
        expect(config.isMetricsEnabled()).toBe(false);
      });

      it('should return false when METRICS_ENABLED is undefined', () => {
        config.METRICS_ENABLED = undefined;
        expect(config.isMetricsEnabled()).toBe(false);
      });

      it('should return true for default configuration', () => {
        const newConfig = new MonitoringConfig();
        expect(newConfig.isMetricsEnabled()).toBe(true);
      });
    });

    describe('isHealthCheckEnabled()', () => {
      it('should return true when HEALTH_CHECK_ENABLED is true', () => {
        config.HEALTH_CHECK_ENABLED = true;
        expect(config.isHealthCheckEnabled()).toBe(true);
      });

      it('should return false when HEALTH_CHECK_ENABLED is false', () => {
        config.HEALTH_CHECK_ENABLED = false;
        expect(config.isHealthCheckEnabled()).toBe(false);
      });

      it('should return false when HEALTH_CHECK_ENABLED is undefined', () => {
        config.HEALTH_CHECK_ENABLED = undefined;
        expect(config.isHealthCheckEnabled()).toBe(false);
      });

      it('should return true for default configuration', () => {
        const newConfig = new MonitoringConfig();
        expect(newConfig.isHealthCheckEnabled()).toBe(true);
      });
    });
  });

  describe('Complete configuration validation', () => {
    it('should validate a complete CloudWatch configuration', async () => {
      config.CLOUDWATCH_ENABLED = true;
      config.CLOUDWATCH_NAMESPACE = 'MoneyWise/Production';
      config.AWS_REGION = 'us-west-2';
      config.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
      config.AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
      config.METRICS_ENABLED = true;
      config.METRICS_FLUSH_INTERVAL = 60000;
      config.HEALTH_CHECK_ENABLED = true;

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });

    it('should validate a minimal configuration with defaults', async () => {
      // Using all defaults
      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });

    it('should validate a configuration with CloudWatch disabled', async () => {
      config.CLOUDWATCH_ENABLED = false;
      config.METRICS_ENABLED = true;
      config.HEALTH_CHECK_ENABLED = true;
      // AWS credentials not required when CloudWatch is disabled

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });

    it('should validate mixed configuration', async () => {
      config.CLOUDWATCH_ENABLED = false;
      config.CLOUDWATCH_NAMESPACE = 'Custom/Namespace';
      config.AWS_REGION = 'eu-central-1';
      config.METRICS_ENABLED = false;
      config.METRICS_FLUSH_INTERVAL = 10000;
      config.HEALTH_CHECK_ENABLED = true;

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });

    it('should collect multiple validation errors', async () => {
      // @ts-expect-error Testing invalid types
      config.CLOUDWATCH_ENABLED = 'yes';
      // @ts-expect-error Testing invalid types
      config.CLOUDWATCH_NAMESPACE = 123;
      // @ts-expect-error Testing invalid types
      config.AWS_REGION = true;
      // @ts-expect-error Testing invalid types
      config.METRICS_ENABLED = 'true';
      config.METRICS_FLUSH_INTERVAL = 500; // Below minimum
      // @ts-expect-error Testing invalid types
      config.HEALTH_CHECK_ENABLED = 1;

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThanOrEqual(6);
      const errorProperties = errors.map(e => e.property);
      expect(errorProperties).toContain('CLOUDWATCH_ENABLED');
      expect(errorProperties).toContain('CLOUDWATCH_NAMESPACE');
      expect(errorProperties).toContain('AWS_REGION');
      expect(errorProperties).toContain('METRICS_ENABLED');
      expect(errorProperties).toContain('METRICS_FLUSH_INTERVAL');
      expect(errorProperties).toContain('HEALTH_CHECK_ENABLED');
    });
  });

  describe('Configuration scenarios', () => {
    it('should support development configuration', async () => {
      // Typical development setup
      config.CLOUDWATCH_ENABLED = false;
      config.METRICS_ENABLED = true;
      config.METRICS_FLUSH_INTERVAL = 5000; // Faster feedback in dev
      config.HEALTH_CHECK_ENABLED = true;

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
      expect(config.isCloudWatchEnabled()).toBe(false);
      expect(config.isMetricsEnabled()).toBe(true);
      expect(config.isHealthCheckEnabled()).toBe(true);
    });

    it('should support production configuration', async () => {
      // Typical production setup
      config.CLOUDWATCH_ENABLED = true;
      config.CLOUDWATCH_NAMESPACE = 'MoneyWise/Production';
      config.AWS_REGION = 'us-east-1';
      config.AWS_ACCESS_KEY_ID = 'production-key';
      config.AWS_SECRET_ACCESS_KEY = 'production-secret';
      config.METRICS_ENABLED = true;
      config.METRICS_FLUSH_INTERVAL = 60000; // Less frequent in production
      config.HEALTH_CHECK_ENABLED = true;

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
      expect(config.isCloudWatchEnabled()).toBe(true);
      expect(config.isMetricsEnabled()).toBe(true);
      expect(config.isHealthCheckEnabled()).toBe(true);
    });

    it('should support disabled monitoring configuration', async () => {
      // All monitoring disabled (e.g., for testing)
      config.CLOUDWATCH_ENABLED = false;
      config.METRICS_ENABLED = false;
      config.HEALTH_CHECK_ENABLED = false;

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
      expect(config.isCloudWatchEnabled()).toBe(false);
      expect(config.isMetricsEnabled()).toBe(false);
      expect(config.isHealthCheckEnabled()).toBe(false);
    });
  });
});