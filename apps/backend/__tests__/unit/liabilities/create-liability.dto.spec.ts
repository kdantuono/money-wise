import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateLiabilityDto } from '../../../src/liabilities/dto/create-liability.dto';
import { LiabilityType } from '../../../generated/prisma';

/**
 * CreateLiabilityDto Validation Tests
 *
 * TDD approach: Tests for cross-field validation rules
 * - Credit card requires creditLimit
 * - BNPL requires provider and originalAmount
 * - Loan/Mortgage requires originalAmount
 */
describe('CreateLiabilityDto', () => {
  const validateDto = async (dto: Partial<CreateLiabilityDto>) => {
    const instance = plainToInstance(CreateLiabilityDto, dto);
    return validate(instance);
  };

  describe('basic validation', () => {
    it('should pass with valid minimal data', async () => {
      const dto = {
        type: LiabilityType.OTHER,
        name: 'Test Liability',
      };
      const errors = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with missing type', async () => {
      const dto = {
        name: 'Test Liability',
      };
      const errors = await validateDto(dto);
      expect(errors.some((e) => e.property === 'type')).toBe(true);
    });

    it('should fail with missing name', async () => {
      const dto = {
        type: LiabilityType.CREDIT_CARD,
      };
      const errors = await validateDto(dto);
      expect(errors.some((e) => e.property === 'name')).toBe(true);
    });

    it('should fail with invalid type', async () => {
      const dto = {
        type: 'INVALID_TYPE' as unknown as LiabilityType,
        name: 'Test',
      };
      const errors = await validateDto(dto);
      expect(errors.some((e) => e.property === 'type')).toBe(true);
    });
  });

  describe('CREDIT_CARD cross-field validation', () => {
    it('should fail when CREDIT_CARD is missing creditLimit', async () => {
      const dto = {
        type: LiabilityType.CREDIT_CARD,
        name: 'Chase Sapphire',
        currentBalance: 1500,
      };
      const errors = await validateDto(dto);
      expect(errors.some((e) => e.property === 'creditLimit')).toBe(true);
    });

    it('should pass when CREDIT_CARD has creditLimit', async () => {
      const dto = {
        type: LiabilityType.CREDIT_CARD,
        name: 'Chase Sapphire',
        currentBalance: 1500,
        creditLimit: 10000,
      };
      const errors = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail when CREDIT_CARD has zero creditLimit', async () => {
      const dto = {
        type: LiabilityType.CREDIT_CARD,
        name: 'Chase Sapphire',
        creditLimit: 0,
      };
      const errors = await validateDto(dto);
      expect(errors.some((e) => e.property === 'creditLimit')).toBe(true);
    });
  });

  describe('BNPL cross-field validation', () => {
    it('should fail when BNPL is missing provider', async () => {
      const dto = {
        type: LiabilityType.BNPL,
        name: 'Klarna Purchase',
        originalAmount: 500,
      };
      const errors = await validateDto(dto);
      expect(errors.some((e) => e.property === 'provider')).toBe(true);
    });

    it('should fail when BNPL is missing originalAmount', async () => {
      const dto = {
        type: LiabilityType.BNPL,
        name: 'Klarna Purchase',
        provider: 'Klarna',
      };
      const errors = await validateDto(dto);
      expect(errors.some((e) => e.property === 'originalAmount')).toBe(true);
    });

    it('should pass when BNPL has provider and originalAmount', async () => {
      const dto = {
        type: LiabilityType.BNPL,
        name: 'Klarna Purchase',
        provider: 'Klarna',
        originalAmount: 500,
      };
      const errors = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('LOAN cross-field validation', () => {
    it('should fail when LOAN is missing originalAmount', async () => {
      const dto = {
        type: LiabilityType.LOAN,
        name: 'Personal Loan',
        currentBalance: 5000,
      };
      const errors = await validateDto(dto);
      expect(errors.some((e) => e.property === 'originalAmount')).toBe(true);
    });

    it('should pass when LOAN has originalAmount', async () => {
      const dto = {
        type: LiabilityType.LOAN,
        name: 'Personal Loan',
        originalAmount: 10000,
        currentBalance: 5000,
      };
      const errors = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('MORTGAGE cross-field validation', () => {
    it('should fail when MORTGAGE is missing originalAmount', async () => {
      const dto = {
        type: LiabilityType.MORTGAGE,
        name: 'Home Mortgage',
        currentBalance: 200000,
      };
      const errors = await validateDto(dto);
      expect(errors.some((e) => e.property === 'originalAmount')).toBe(true);
    });

    it('should pass when MORTGAGE has originalAmount', async () => {
      const dto = {
        type: LiabilityType.MORTGAGE,
        name: 'Home Mortgage',
        originalAmount: 300000,
        currentBalance: 200000,
      };
      const errors = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('OTHER type validation', () => {
    it('should pass with minimal data for OTHER type', async () => {
      const dto = {
        type: LiabilityType.OTHER,
        name: 'Misc Debt',
      };
      const errors = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });

    it('should not require creditLimit for OTHER type', async () => {
      const dto = {
        type: LiabilityType.OTHER,
        name: 'Misc Debt',
        currentBalance: 1000,
      };
      const errors = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('numeric validations', () => {
    it('should fail with negative creditLimit', async () => {
      const dto = {
        type: LiabilityType.CREDIT_CARD,
        name: 'Test Card',
        creditLimit: -1000,
      };
      const errors = await validateDto(dto);
      expect(errors.some((e) => e.property === 'creditLimit')).toBe(true);
    });

    it('should fail with negative originalAmount', async () => {
      const dto = {
        type: LiabilityType.LOAN,
        name: 'Test Loan',
        originalAmount: -5000,
      };
      const errors = await validateDto(dto);
      expect(errors.some((e) => e.property === 'originalAmount')).toBe(true);
    });

    it('should accept billingCycleDay in range 1-31', async () => {
      const dto = {
        type: LiabilityType.CREDIT_CARD,
        name: 'Test Card',
        creditLimit: 10000,
        billingCycleDay: 15,
      };
      const errors = await validateDto(dto);
      expect(errors).toHaveLength(0);
    });

    it('should fail with billingCycleDay outside range', async () => {
      const dto = {
        type: LiabilityType.CREDIT_CARD,
        name: 'Test Card',
        creditLimit: 10000,
        billingCycleDay: 32,
      };
      const errors = await validateDto(dto);
      expect(errors.some((e) => e.property === 'billingCycleDay')).toBe(true);
    });
  });
});
