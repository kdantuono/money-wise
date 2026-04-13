/**
 * Custom Validator: IsStrongPassword
 *
 * Enforces environment-tiered password requirements for config values.
 *
 * - production: 32+ chars, mixed case, numbers, symbols
 * - staging: 16+ chars, mixed case, at least one number
 * - development/test: no enforcement (convenience)
 *
 * @example
 * class DatabaseConfig {
 *   @Validate(IsStrongPassword)
 *   DB_PASSWORD: string;
 * }
 */
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPassword implements ValidatorConstraintInterface {
  validate(value: string, _args: ValidationArguments): boolean {
    const env = process.env.NODE_ENV;

    // Development and test: skip validation for convenience
    if (env === 'development' || env === 'test' || !env) {
      return true;
    }

    // Staging: moderate requirements
    if (env === 'staging') {
      const hasLength = value.length >= 16;
      const hasUpper = /[A-Z]/.test(value);
      const hasLower = /[a-z]/.test(value);
      const hasNumber = /[0-9]/.test(value);
      return hasLength && hasUpper && hasLower && hasNumber;
    }

    // Production: full requirements
    const hasLength = value.length >= 32;
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSymbol = /[^A-Za-z0-9]/.test(value);

    return hasLength && hasUpper && hasLower && hasNumber && hasSymbol;
  }

  defaultMessage(args: ValidationArguments): string {
    const env = process.env.NODE_ENV;

    if (env === 'staging') {
      return `${args.property} must be a strong password in staging (16+ chars, mixed case, numbers)`;
    }

    return `${args.property} must be a strong password in production (32+ chars, mixed case, numbers, symbols)`;
  }
}
