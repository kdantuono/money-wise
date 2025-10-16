/**
 * Strong Password Validator Tests
 *
 * Tests the custom strong password validation logic
 */
import { ValidationArguments } from 'class-validator';
import { IsStrongPassword } from './strong-password.validator';

describe('IsStrongPassword Validator', () => {
  let validator: IsStrongPassword;
  let mockArgs: ValidationArguments;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    validator = new IsStrongPassword();
    mockArgs = {
      property: 'DB_PASSWORD',
      object: {},
      value: '',
      constraints: [],
      targetName: 'TestClass',
    };
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('Non-production environments', () => {
    it.each(['development', 'test', 'staging'])(
      'should always return true in %s environment',
      (env) => {
        process.env.NODE_ENV = env;

        // Should accept any password in non-production
        expect(validator.validate('', mockArgs)).toBe(true);
        expect(validator.validate('a', mockArgs)).toBe(true);
        expect(validator.validate('password', mockArgs)).toBe(true);
        expect(validator.validate('123', mockArgs)).toBe(true);
        expect(validator.validate('!@#$%^&*()', mockArgs)).toBe(true);
      }
    );

    it('should return true when NODE_ENV is undefined', () => {
      delete process.env.NODE_ENV;

      expect(validator.validate('simple', mockArgs)).toBe(true);
      expect(validator.validate('', mockArgs)).toBe(true);
    });

    it('should return true when NODE_ENV is empty string', () => {
      process.env.NODE_ENV = '';

      expect(validator.validate('anything', mockArgs)).toBe(true);
    });
  });

  describe('Production environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    describe('Valid passwords', () => {
      it('should accept passwords meeting all requirements', () => {
        const validPasswords = [
          'ThisIsAVeryLongPasswordWith123AndSymbols!@#',
          'AnotherSecureP@ssw0rd1234567890!!!',
          'ComplexPassword123!@#WithMixedCaseAndSymbols',
          'Pr0duct10n$ecureP@ssw0rd!WithAllRequirements',
          'UPPERCASE_lowercase_123_symbols!@#$%^&*()',
        ];

        validPasswords.forEach(password => {
          expect(validator.validate(password, mockArgs)).toBe(true);
        });
      });

      it('should accept exactly 32 characters with all requirements', () => {
        const password = 'Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!Aa1!'; // Exactly 32 chars
        expect(password.length).toBe(32);
        expect(validator.validate(password, mockArgs)).toBe(true);
      });

      it('should accept passwords longer than 32 characters', () => {
        const password = 'ThisIsAVeryLongPasswordThatExceeds32Characters123!@#';
        expect(password.length).toBeGreaterThan(32);
        expect(validator.validate(password, mockArgs)).toBe(true);
      });

      it('should accept various special characters', () => {
        const passwords = [
          'ValidPassword1234567890ABCDEFGH!@#$%^&*()_+',
          'ValidPassword1234567890ABCDEFGH-=[]{}|;:,.<>?',
          'ValidPassword1234567890ABCDEFGH`~"\'/\\',
        ];

        passwords.forEach(password => {
          expect(validator.validate(password, mockArgs)).toBe(true);
        });
      });
    });

    describe('Invalid passwords', () => {
      it('should reject passwords shorter than 32 characters', () => {
        const shortPasswords = [
          'Short1!',
          'AlmostButNotQuite123!@#',
          'ThisIsOnly31Characters123!@#$',
        ];

        shortPasswords.forEach(password => {
          expect(password.length).toBeLessThan(32);
          expect(validator.validate(password, mockArgs)).toBe(false);
        });
      });

      it('should reject passwords without uppercase letters', () => {
        const password = 'thisislongpasswordwithout123uppercase!@#';
        expect(password.length).toBeGreaterThanOrEqual(32);
        expect(validator.validate(password, mockArgs)).toBe(false);
      });

      it('should reject passwords without lowercase letters', () => {
        const password = 'THISISLONGPASSWORDWITHOUT123LOWERCASE!@#';
        expect(password.length).toBeGreaterThanOrEqual(32);
        expect(validator.validate(password, mockArgs)).toBe(false);
      });

      it('should reject passwords without numbers', () => {
        const password = 'ThisIsLongPasswordWithoutNumbersButWithSymbols!@#';
        expect(password.length).toBeGreaterThanOrEqual(32);
        expect(validator.validate(password, mockArgs)).toBe(false);
      });

      it('should reject passwords without special characters', () => {
        const password = 'ThisIsLongPasswordWithoutSymbols1234567890';
        expect(password.length).toBeGreaterThanOrEqual(32);
        expect(validator.validate(password, mockArgs)).toBe(false);
      });

      it('should reject empty password', () => {
        expect(validator.validate('', mockArgs)).toBe(false);
      });

      it('should reject passwords with only one type of character', () => {
        const passwords = [
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', // Only lowercase
          'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', // Only uppercase
          '12345678901234567890123456789012', // Only numbers
          '!@#$%^&*()!@#$%^&*()!@#$%^&*()!@', // Only symbols
        ];

        passwords.forEach(password => {
          expect(password.length).toBeGreaterThanOrEqual(32);
          expect(validator.validate(password, mockArgs)).toBe(false);
        });
      });

      it('should reject passwords missing any single requirement', () => {
        const testCases = [
          {
            password: 'thisisalllowercasewithsymbols!@#andnumbers123',
            missing: 'uppercase',
          },
          {
            password: 'THISISALLUPPERCASEWITHSYMBOLS!@#ANDNUMBERS123',
            missing: 'lowercase',
          },
          {
            password: 'ThisIsAPasswordWithSymbols!@#ButNoNumbers',
            missing: 'numbers',
          },
          {
            password: 'ThisIsAPasswordWith1234567890ButNoSymbols',
            missing: 'symbols',
          },
        ];

        testCases.forEach(({ password }) => {
          expect(password.length).toBeGreaterThanOrEqual(32);
          expect(validator.validate(password, mockArgs)).toBe(false);
        });
      });
    });

    describe('Regex pattern testing', () => {
      it('should correctly identify uppercase letters', () => {
        const password = 'A' + 'a'.repeat(30) + '1!';
        expect(password.length).toBe(32);
        expect(validator.validate(password, mockArgs)).toBe(true);
      });

      it('should correctly identify lowercase letters', () => {
        const password = 'a' + 'A'.repeat(30) + '1!';
        expect(password.length).toBe(32);
        expect(validator.validate(password, mockArgs)).toBe(true);
      });

      it('should correctly identify numbers', () => {
        const password = '1' + 'Aa!'.repeat(10) + 'A';
        expect(password.length).toBe(32);
        expect(validator.validate(password, mockArgs)).toBe(true);
      });

      it('should correctly identify symbols', () => {
        const password = '!' + 'Aa1'.repeat(10) + 'A';
        expect(password.length).toBe(32);
        expect(validator.validate(password, mockArgs)).toBe(true);
      });
    });
  });

  describe('defaultMessage method', () => {
    it('should return appropriate error message', () => {
      const message = validator.defaultMessage(mockArgs);
      expect(message).toBe(
        'DB_PASSWORD must be a strong password in production (32+ chars, mixed case, numbers, symbols)'
      );
    });

    it('should use property name in error message', () => {
      mockArgs.property = 'JWT_SECRET';
      const message = validator.defaultMessage(mockArgs);
      expect(message).toContain('JWT_SECRET');
      expect(message).toContain('must be a strong password in production');
    });

    it('should include all requirements in message', () => {
      const message = validator.defaultMessage(mockArgs);
      expect(message).toContain('32+ chars');
      expect(message).toContain('mixed case');
      expect(message).toContain('numbers');
      expect(message).toContain('symbols');
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should handle unicode characters as symbols', () => {
      const password = 'ValidPassword123456789АБВГД€£¥';
      expect(password.length).toBeGreaterThanOrEqual(32);
      expect(validator.validate(password, mockArgs)).toBe(true);
    });

    it('should handle spaces as symbols', () => {
      const password = 'Valid Password With Spaces 123 And More!';
      expect(password.length).toBeGreaterThanOrEqual(32);
      expect(validator.validate(password, mockArgs)).toBe(true);
    });

    it('should handle password with all character types at boundaries', () => {
      // First char upper, last char symbol, number in middle
      const password = 'A' + 'a'.repeat(29) + '1!';
      expect(password.length).toBe(32);
      expect(validator.validate(password, mockArgs)).toBe(true);
    });

    it('should handle very long passwords efficiently', () => {
      const password = 'Aa1!' + 'x'.repeat(1000);
      expect(validator.validate(password, mockArgs)).toBe(true);
    });
  });

  describe('Environment switching', () => {
    it('should immediately reflect environment changes', () => {
      const password = 'weak';

      process.env.NODE_ENV = 'development';
      expect(validator.validate(password, mockArgs)).toBe(true);

      process.env.NODE_ENV = 'production';
      expect(validator.validate(password, mockArgs)).toBe(false);

      process.env.NODE_ENV = 'test';
      expect(validator.validate(password, mockArgs)).toBe(true);
    });

    it('should handle case-sensitive environment names', () => {
      const strongPassword = 'ThisIsAVeryStrongPassword123!@#WithAllRequirements';

      process.env.NODE_ENV = 'production';
      expect(validator.validate(strongPassword, mockArgs)).toBe(true);

      process.env.NODE_ENV = 'Production'; // Capital P
      expect(validator.validate('weak', mockArgs)).toBe(true); // Not production

      process.env.NODE_ENV = 'PRODUCTION'; // All caps
      expect(validator.validate('weak', mockArgs)).toBe(true); // Not production
    });
  });
});