import { Test, TestingModule } from '@nestjs/testing';
import { PasswordStrengthService } from './password-strength.service';
import { DEFAULT_PASSWORD_POLICY } from '../config/password-policy.config';

describe('PasswordStrengthService', () => {
  let service: PasswordStrengthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PasswordStrengthService],
    }).compile();

    service = module.get<PasswordStrengthService>(PasswordStrengthService);
  });

  describe('calculateStrength', () => {
    it('should return very weak for simple passwords', () => {
      const result = service.calculateStrength('password', DEFAULT_PASSWORD_POLICY);

      expect(result.strength).toBe('very-weak');
      expect(result.score).toBeLessThan(20);
      expect(result.isValid).toBe(false);
    });

    it('should return strong for complex passwords', () => {
      const result = service.calculateStrength(
        'MySecur3P@ssw0rd!2024#Complex',
        DEFAULT_PASSWORD_POLICY
      );

      expect(result.strength).toBe('strong');
      expect(result.score).toBeGreaterThan(80);
      expect(result.feedback).toContain('Excellent! This is a strong password');
    });

    it('should detect common passwords', () => {
      const result = service.calculateStrength('Password123!', DEFAULT_PASSWORD_POLICY);

      expect(result.feedback).toContain('This password is too common');
      expect(result.score).toBeLessThan(60);
    });

    it('should detect personal information in password', () => {
      const userInfo = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      };

      const result = service.calculateStrength(
        'JohnSecure123!',
        DEFAULT_PASSWORD_POLICY,
        userInfo
      );

      expect(result.feedback).toContain('Password should not contain personal information');
    });

    it('should detect repeating characters', () => {
      const result = service.calculateStrength(
        'Passwordddd123!',
        DEFAULT_PASSWORD_POLICY
      );

      expect(result.feedback).toContain('Avoid repeating characters');
    });

    it('should detect sequential characters', () => {
      const result = service.calculateStrength(
        'Password123abc!',
        DEFAULT_PASSWORD_POLICY
      );

      expect(result.feedback).toContain('Avoid sequential characters');
    });
  });

  describe('validatePolicy', () => {
    it('should validate minimum length requirement', () => {
      const result = service.validatePolicy('short', DEFAULT_PASSWORD_POLICY);

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain(`Password must be at least ${DEFAULT_PASSWORD_POLICY.minLength} characters long`);
    });

    it('should validate character requirements', () => {
      const result = service.validatePolicy('toolongbutnotcomplex', DEFAULT_PASSWORD_POLICY);

      expect(result.isValid).toBe(false);
      expect(result.violations).toContain('Password must contain at least one uppercase letter');
      expect(result.violations).toContain('Password must contain at least one number');
      expect(result.violations).toContain('Password must contain at least one special character');
    });

    it('should pass for valid passwords', () => {
      const result = service.validatePolicy('MySecur3P@ssw0rd!', DEFAULT_PASSWORD_POLICY);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });
  });
});