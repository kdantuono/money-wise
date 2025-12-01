 
/**
 * Unique Secret Validator Tests
 *
 * Tests the custom validator that ensures secrets are unique
 */
import { ValidationArguments } from 'class-validator';
import { IsUniqueSecret } from './unique-secret.validator';

describe('IsUniqueSecret Validator', () => {
  let validator: IsUniqueSecret;
  let mockArgs: ValidationArguments;

  beforeEach(() => {
    validator = new IsUniqueSecret();
    mockArgs = {
      property: 'JWT_REFRESH_SECRET',
      object: {
        JWT_ACCESS_SECRET: 'access-secret-value',
        JWT_REFRESH_SECRET: 'refresh-secret-value',
      },
      value: 'refresh-secret-value',
      constraints: ['JWT_ACCESS_SECRET'],
      targetName: 'AuthConfig',
    };
  });

  describe('validate method', () => {
    it('should return true when secrets are different', () => {
      mockArgs.value = 'different-refresh-secret';
      mockArgs.object = {
        JWT_ACCESS_SECRET: 'access-secret',
        JWT_REFRESH_SECRET: 'different-refresh-secret',
      };

      expect(validator.validate('different-refresh-secret', mockArgs)).toBe(true);
    });

    it('should return false when secrets are the same', () => {
      mockArgs.value = 'same-secret';
      mockArgs.object = {
        JWT_ACCESS_SECRET: 'same-secret',
        JWT_REFRESH_SECRET: 'same-secret',
      };

      expect(validator.validate('same-secret', mockArgs)).toBe(false);
    });

    it('should handle empty strings as valid if different', () => {
      mockArgs.value = '';
      mockArgs.object = {
        JWT_ACCESS_SECRET: 'non-empty',
        JWT_REFRESH_SECRET: '',
      };

      expect(validator.validate('', mockArgs)).toBe(true);
    });

    it('should handle empty strings as invalid if both empty', () => {
      mockArgs.value = '';
      mockArgs.object = {
        JWT_ACCESS_SECRET: '',
        JWT_REFRESH_SECRET: '',
      };

      expect(validator.validate('', mockArgs)).toBe(false);
    });

    it('should handle undefined related property gracefully', () => {
      mockArgs.value = 'some-secret';
      mockArgs.object = {
        JWT_REFRESH_SECRET: 'some-secret',
        // JWT_ACCESS_SECRET is undefined
      };

      expect(validator.validate('some-secret', mockArgs)).toBe(true);
    });

    it('should handle null related property gracefully', () => {
      mockArgs.value = 'some-secret';
      mockArgs.object = {
        JWT_ACCESS_SECRET: null,
        JWT_REFRESH_SECRET: 'some-secret',
      };

      expect(validator.validate('some-secret', mockArgs)).toBe(true);
    });

    it('should be case-sensitive when comparing', () => {
      mockArgs.value = 'Secret123';
      mockArgs.object = {
        JWT_ACCESS_SECRET: 'secret123', // Different case
        JWT_REFRESH_SECRET: 'Secret123',
      };

      expect(validator.validate('Secret123', mockArgs)).toBe(true);
    });

    it('should handle special characters in secrets', () => {
      mockArgs.value = 'secret!@#$%^&*()_+-=[]{}|;:,.<>?';
      mockArgs.object = {
        JWT_ACCESS_SECRET: 'different!@#$%^&*()_+-=[]{}|;:,.<>?',
        JWT_REFRESH_SECRET: 'secret!@#$%^&*()_+-=[]{}|;:,.<>?',
      };

      expect(validator.validate('secret!@#$%^&*()_+-=[]{}|;:,.<>?', mockArgs)).toBe(true);
    });

    it('should handle very long secrets', () => {
      const longSecret1 = 'a'.repeat(1000);
      const longSecret2 = 'b'.repeat(1000);

      mockArgs.value = longSecret2;
      mockArgs.object = {
        JWT_ACCESS_SECRET: longSecret1,
        JWT_REFRESH_SECRET: longSecret2,
      };

      expect(validator.validate(longSecret2, mockArgs)).toBe(true);
    });

    it('should handle unicode characters', () => {
      mockArgs.value = 'secret-с-unicode-символами-🔐';
      mockArgs.object = {
        JWT_ACCESS_SECRET: 'different-с-unicode-символами-🔒',
        JWT_REFRESH_SECRET: 'secret-с-unicode-символами-🔐',
      };

      expect(validator.validate('secret-с-unicode-символами-🔐', mockArgs)).toBe(true);
    });
  });

  describe('Multiple property comparison', () => {
    it('should compare against the correct property from constraints', () => {
      mockArgs.constraints = ['DB_PASSWORD'];
      mockArgs.value = 'app-secret';
      mockArgs.object = {
        DB_PASSWORD: 'database-password',
        APP_SECRET: 'app-secret',
        JWT_SECRET: 'app-secret', // Same as APP_SECRET but we're not checking this
      };

      expect(validator.validate('app-secret', mockArgs)).toBe(true);
    });

    it('should use first constraint when multiple are provided', () => {
      mockArgs.constraints = ['FIRST_SECRET', 'SECOND_SECRET'];
      mockArgs.value = 'current-value';
      mockArgs.object = {
        FIRST_SECRET: 'different-value',
        SECOND_SECRET: 'current-value', // Same as current but we check FIRST_SECRET
        CURRENT_SECRET: 'current-value',
      };

      expect(validator.validate('current-value', mockArgs)).toBe(true);
    });
  });

  describe('defaultMessage method', () => {
    it('should return appropriate error message', () => {
      const message = validator.defaultMessage(mockArgs);
      expect(message).toBe(
        'JWT_REFRESH_SECRET must be different from JWT_ACCESS_SECRET for security'
      );
    });

    it('should include both property names in message', () => {
      mockArgs.property = 'DB_REPLICA_PASSWORD';
      mockArgs.constraints = ['DB_MASTER_PASSWORD'];
      const message = validator.defaultMessage(mockArgs);
      expect(message).toContain('DB_REPLICA_PASSWORD');
      expect(message).toContain('DB_MASTER_PASSWORD');
      expect(message).toContain('for security');
    });

    it('should handle missing constraints gracefully', () => {
      mockArgs.constraints = [];
      const message = validator.defaultMessage(mockArgs);
      expect(message).toContain('JWT_REFRESH_SECRET');
      expect(message).toContain('undefined');
    });
  });

  describe('Real-world scenarios', () => {
    it('should validate JWT access and refresh tokens', () => {
      const config = {
        JWT_ACCESS_SECRET: 'super-secret-access-key-2024',
        JWT_REFRESH_SECRET: 'super-secret-refresh-key-2024',
      };

      mockArgs.object = config;
      mockArgs.value = config.JWT_REFRESH_SECRET;
      mockArgs.constraints = ['JWT_ACCESS_SECRET'];

      expect(validator.validate(config.JWT_REFRESH_SECRET, mockArgs)).toBe(true);
    });

    it('should reject same JWT tokens', () => {
      const config = {
        JWT_ACCESS_SECRET: 'same-secret-key',
        JWT_REFRESH_SECRET: 'same-secret-key',
      };

      mockArgs.object = config;
      mockArgs.value = config.JWT_REFRESH_SECRET;
      mockArgs.constraints = ['JWT_ACCESS_SECRET'];

      expect(validator.validate(config.JWT_REFRESH_SECRET, mockArgs)).toBe(false);
    });

    it('should validate database master and replica passwords', () => {
      const config = {
        DB_MASTER_PASSWORD: 'master-password-123',
        DB_REPLICA_PASSWORD: 'replica-password-456',
      };

      mockArgs.property = 'DB_REPLICA_PASSWORD';
      mockArgs.object = config;
      mockArgs.value = config.DB_REPLICA_PASSWORD;
      mockArgs.constraints = ['DB_MASTER_PASSWORD'];

      expect(validator.validate(config.DB_REPLICA_PASSWORD, mockArgs)).toBe(true);
    });

    it('should validate API keys', () => {
      const config = {
        API_KEY_PRIMARY: 'pk_live_abcdef123456',
        API_KEY_SECONDARY: 'sk_live_ghijkl789012',
      };

      mockArgs.property = 'API_KEY_SECONDARY';
      mockArgs.object = config;
      mockArgs.value = config.API_KEY_SECONDARY;
      mockArgs.constraints = ['API_KEY_PRIMARY'];

      expect(validator.validate(config.API_KEY_SECONDARY, mockArgs)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle when value is undefined', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockArgs.value = undefined as any;
      mockArgs.object = {
        JWT_ACCESS_SECRET: 'some-secret',
        JWT_REFRESH_SECRET: undefined,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validator.validate(undefined as any, mockArgs)).toBe(true);
    });

    it('should handle when both are undefined', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockArgs.value = undefined as any;
      mockArgs.object = {
        JWT_ACCESS_SECRET: undefined,
        JWT_REFRESH_SECRET: undefined,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validator.validate(undefined as any, mockArgs)).toBe(false);
    });

    it('should handle when value is null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockArgs.value = null as any;
      mockArgs.object = {
        JWT_ACCESS_SECRET: 'some-secret',
        JWT_REFRESH_SECRET: null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validator.validate(null as any, mockArgs)).toBe(true);
    });

    it('should handle when both are null', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockArgs.value = null as any;
      mockArgs.object = {
        JWT_ACCESS_SECRET: null,
        JWT_REFRESH_SECRET: null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validator.validate(null as any, mockArgs)).toBe(false);
    });

    it('should handle numeric values', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockArgs.value = 12345 as any;
      mockArgs.object = {
        SECRET_A: 67890,
        SECRET_B: 12345,
      };
      mockArgs.constraints = ['SECRET_A'];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validator.validate(12345 as any, mockArgs)).toBe(true);
    });

    it('should handle boolean values', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockArgs.value = true as any;
      mockArgs.object = {
        FLAG_A: false,
        FLAG_B: true,
      };
      mockArgs.constraints = ['FLAG_A'];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validator.validate(true as any, mockArgs)).toBe(true);
    });

    it('should handle object comparison (reference equality)', () => {
      const obj1 = { key: 'value1' };
      const obj2 = { key: 'value2' };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockArgs.value = obj2 as any;
      mockArgs.object = {
        CONFIG_A: obj1,
        CONFIG_B: obj2,
      };
      mockArgs.constraints = ['CONFIG_A'];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validator.validate(obj2 as any, mockArgs)).toBe(true);
    });

    it('should detect same object reference', () => {
      const sameObj = { key: 'value' };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockArgs.value = sameObj as any;
      mockArgs.object = {
        CONFIG_A: sameObj,
        CONFIG_B: sameObj,
      };
      mockArgs.constraints = ['CONFIG_A'];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(validator.validate(sameObj as any, mockArgs)).toBe(false);
    });
  });

  describe('Type coercion behavior', () => {
    it('should use strict equality (no type coercion)', () => {
      mockArgs.value = '123';
      mockArgs.object = {
        NUM_SECRET: 123,
        STR_SECRET: '123',
      };
      mockArgs.constraints = ['NUM_SECRET'];

      // '123' !== 123
      expect(validator.validate('123', mockArgs)).toBe(true);
    });

    it('should differentiate between "0" and 0', () => {
      mockArgs.value = '0';
      mockArgs.object = {
        NUM_VALUE: 0,
        STR_VALUE: '0',
      };
      mockArgs.constraints = ['NUM_VALUE'];

      expect(validator.validate('0', mockArgs)).toBe(true);
    });

    it('should differentiate between "false" and false', () => {
      mockArgs.value = 'false';
      mockArgs.object = {
        BOOL_VALUE: false,
        STR_VALUE: 'false',
      };
      mockArgs.constraints = ['BOOL_VALUE'];

      expect(validator.validate('false', mockArgs)).toBe(true);
    });
  });
});