import { ValidationArguments } from 'class-validator';
import { IsEndDateAfterStart } from '../../../src/budgets/validators/is-end-date-after-start.validator';

describe('IsEndDateAfterStart Validator', () => {
  let validator: IsEndDateAfterStart;

  beforeEach(() => {
    validator = new IsEndDateAfterStart();
  });

  const createValidationArgs = (
    endDate: string,
    startDate: string,
    startDateField = 'startDate',
  ): ValidationArguments => ({
    value: endDate,
    constraints: [startDateField],
    targetName: 'CreateBudgetDto',
    property: 'endDate',
    object: {
      endDate,
      startDate,
    } as Record<string, unknown>,
  });

  describe('validate', () => {
    it('should return true when endDate is after startDate', () => {
      const args = createValidationArgs('2025-01-31', '2025-01-01');
      expect(validator.validate('2025-01-31', args)).toBe(true);
    });

    it('should return false when endDate equals startDate', () => {
      const args = createValidationArgs('2025-01-15', '2025-01-15');
      expect(validator.validate('2025-01-15', args)).toBe(false);
    });

    it('should return false when endDate is before startDate', () => {
      const args = createValidationArgs('2025-01-01', '2025-01-31');
      expect(validator.validate('2025-01-01', args)).toBe(false);
    });

    it('should return true when startDate is missing (let other validators handle)', () => {
      const args: ValidationArguments = {
        value: '2025-01-31',
        constraints: ['startDate'],
        targetName: 'CreateBudgetDto',
        property: 'endDate',
        object: {
          endDate: '2025-01-31',
          startDate: undefined,
        } as Record<string, unknown>,
      };
      expect(validator.validate('2025-01-31', args)).toBe(true);
    });

    it('should return true when endDate is missing (let other validators handle)', () => {
      const args: ValidationArguments = {
        value: '',
        constraints: ['startDate'],
        targetName: 'CreateBudgetDto',
        property: 'endDate',
        object: {
          endDate: '',
          startDate: '2025-01-01',
        } as Record<string, unknown>,
      };
      expect(validator.validate('', args)).toBe(true);
    });

    it('should return true for invalid date formats (let IsDateString handle)', () => {
      const args = createValidationArgs('invalid-date', '2025-01-01');
      expect(validator.validate('invalid-date', args)).toBe(true);
    });

    it('should handle year boundaries correctly', () => {
      const args = createValidationArgs('2026-01-01', '2025-12-31');
      expect(validator.validate('2026-01-01', args)).toBe(true);
    });

    it('should handle same year different months', () => {
      const args = createValidationArgs('2025-12-31', '2025-01-01');
      expect(validator.validate('2025-12-31', args)).toBe(true);
    });

    it('should handle one day difference', () => {
      const args = createValidationArgs('2025-01-02', '2025-01-01');
      expect(validator.validate('2025-01-02', args)).toBe(true);
    });

    it('should use default field name when constraints array is empty', () => {
      const args: ValidationArguments = {
        value: '2025-01-31',
        constraints: [],
        targetName: 'CreateBudgetDto',
        property: 'endDate',
        object: {
          endDate: '2025-01-31',
          startDate: '2025-01-01',
        } as Record<string, unknown>,
      };
      expect(validator.validate('2025-01-31', args)).toBe(true);
    });

    it('should support custom start date field name', () => {
      const args: ValidationArguments = {
        value: '2025-01-31',
        constraints: ['customStartDate'],
        targetName: 'CreateBudgetDto',
        property: 'endDate',
        object: {
          endDate: '2025-01-31',
          customStartDate: '2025-01-01',
        } as Record<string, unknown>,
      };
      expect(validator.validate('2025-01-31', args)).toBe(true);
    });
  });

  describe('defaultMessage', () => {
    it('should return appropriate error message', () => {
      const args = createValidationArgs('2025-01-01', '2025-01-31');
      expect(validator.defaultMessage(args)).toBe('endDate must be after startDate');
    });

    it('should include custom field name in error message', () => {
      const args: ValidationArguments = {
        value: '2025-01-01',
        constraints: ['beginDate'],
        targetName: 'CreateBudgetDto',
        property: 'finishDate',
        object: {
          finishDate: '2025-01-01',
          beginDate: '2025-01-31',
        } as Record<string, unknown>,
      };
      expect(validator.defaultMessage(args)).toBe('finishDate must be after beginDate');
    });

    it('should use default field name in error message when constraints empty', () => {
      const args: ValidationArguments = {
        value: '2025-01-01',
        constraints: [],
        targetName: 'CreateBudgetDto',
        property: 'endDate',
        object: {},
      };
      expect(validator.defaultMessage(args)).toBe('endDate must be after startDate');
    });
  });
});
