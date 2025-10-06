/**
 * Custom Validator: IsStrongPassword
 *
 * Enforces strong password requirements in production environments.
 * Development/test environments have relaxed requirements for convenience.
 *
 * Production Requirements:
 * - Minimum 32 characters
 * - Mixed case (upper + lower)
 * - At least one number
 * - At least one symbol
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
  validate(value: string, args: ValidationArguments): boolean {
    // Only enforce in production for security-critical fields
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }

    // Production requirements
    const hasLength = value.length >= 32;
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSymbol = /[^A-Za-z0-9]/.test(value);

    return hasLength && hasUpper && hasLower && hasNumber && hasSymbol;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a strong password in production (32+ chars, mixed case, numbers, symbols)`;
  }
}
