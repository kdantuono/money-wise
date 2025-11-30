/**
 * Custom Validator: IsEndDateAfterStart
 *
 * Validates that the endDate field is after the startDate field.
 * This is a class-level validator that compares two date fields.
 *
 * @example
 * class CreateBudgetDto {
 *   @IsDateString()
 *   startDate: string;
 *
 *   @IsDateString()
 *   @Validate(IsEndDateAfterStart, ['startDate'])
 *   endDate: string;
 * }
 */
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isEndDateAfterStart', async: false })
export class IsEndDateAfterStart implements ValidatorConstraintInterface {
  /**
   * Validates that endDate is strictly after startDate
   *
   * @param endDate - The end date value being validated
   * @param args - Validation arguments containing constraints (startDate field name)
   * @returns true if endDate > startDate, false otherwise
   */
  validate(endDate: string, args: ValidationArguments): boolean {
    // Get the field name to compare against (default: 'startDate')
    const [startDateField] = args.constraints;
    const startDateFieldName = startDateField || 'startDate';

    // Get the object being validated to access startDate
    const object = args.object as Record<string, unknown>;
    const startDate = object[startDateFieldName] as string;

    // If either date is missing, let other validators handle it
    if (!startDate || !endDate) {
      return true;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return true; // Let IsDateString validator handle invalid dates
    }

    // End date must be strictly after start date
    return end > start;
  }

  /**
   * Returns the default error message
   */
  defaultMessage(args: ValidationArguments): string {
    const [startDateField] = args.constraints;
    const startDateFieldName = startDateField || 'startDate';
    return `${args.property} must be after ${startDateFieldName}`;
  }
}
