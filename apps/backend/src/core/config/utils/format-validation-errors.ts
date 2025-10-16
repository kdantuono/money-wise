/**
 * Configuration Validation Error Formatter
 *
 * Shared utility for formatting class-validator errors with property paths.
 * Used by both config.validator.ts and config.module.ts for consistency.
 */
import { ValidationError } from 'class-validator';

/**
 * Format validation errors with property paths for better debugging
 *
 * @param errors - Array of validation errors from validateSync
 * @returns Formatted error message with property paths and constraints
 *
 * @example
 * ```typescript
 * const errors = validateSync(config);
 * if (errors.length > 0) {
 *   throw new Error(formatValidationErrors(errors));
 * }
 * ```
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  const errorMessages = errors
    .flatMap((error) => {
      const propertyPath = error.property;
      const constraints = error.constraints
        ? Object.values(error.constraints).map((msg) => `${propertyPath}: ${msg}`)
        : [];

      // Handle nested validation errors
      const childErrors =
        error.children?.flatMap((child) => {
          const childPath = `${propertyPath}.${child.property}`;
          return child.constraints
            ? Object.values(child.constraints).map((msg) => `${childPath}: ${msg}`)
            : [];
        }) || [];

      return [...constraints, ...childErrors];
    })
    .join('\n  - ');

  return `❌ Configuration Validation Failed:\n\n  - ${errorMessages}\n\nPlease check your .env file and ensure all required variables are set correctly.\nMissing or invalid environment variables are listed above with their validation errors.`;
}
