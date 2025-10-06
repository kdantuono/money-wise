/**
 * Custom Validator: IsUniqueSecret
 *
 * Ensures a secret value is different from another property.
 * Use case: JWT refresh secret must differ from access secret for security.
 *
 * @example
 * class AuthConfig {
 *   JWT_ACCESS_SECRET: string;
 *
 *   @Validate(IsUniqueSecret, ['JWT_ACCESS_SECRET'])
 *   JWT_REFRESH_SECRET: string;
 * }
 */
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isUniqueSecret', async: false })
export class IsUniqueSecret implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments): boolean {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    return value !== relatedValue;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be different from ${args.constraints[0]} for security`;
  }
}
