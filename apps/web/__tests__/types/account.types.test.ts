/**
 * Account Types Tests
 *
 * TDD Tests for frontend account types that consume the
 * /accounts/financial-summary endpoint.
 *
 * These tests validate:
 * 1. Type structure matches backend DTOs
 * 2. Type guards work correctly
 * 3. Enum values are correct
 */

import { describe, it, expect } from 'vitest';
import {
  AccountType,
  AccountStatus,
  AccountSource,
  AccountNature,
  NetWorthEffect,
  BalanceDisplayLabel,
  NormalizedAccountBalance,
  FinancialSummary,
  isNormalizedAccountBalance,
  isFinancialSummary,
  isValidAccountType,
  isValidAccountNature,
  getAccountNature,
} from '../../src/types/account.types';

describe('Account Types', () => {
  describe('AccountType enum', () => {
    it('should have all required account types', () => {
      expect(AccountType.CHECKING).toBe('CHECKING');
      expect(AccountType.SAVINGS).toBe('SAVINGS');
      expect(AccountType.CREDIT_CARD).toBe('CREDIT_CARD');
      expect(AccountType.LOAN).toBe('LOAN');
      expect(AccountType.INVESTMENT).toBe('INVESTMENT');
      expect(AccountType.MORTGAGE).toBe('MORTGAGE');
      expect(AccountType.OTHER).toBe('OTHER');
    });

    it('should have exactly 7 account types', () => {
      const types = Object.values(AccountType);
      expect(types).toHaveLength(7);
    });
  });

  describe('AccountStatus enum', () => {
    it('should have all required statuses', () => {
      expect(AccountStatus.ACTIVE).toBe('ACTIVE');
      expect(AccountStatus.INACTIVE).toBe('INACTIVE');
      expect(AccountStatus.CLOSED).toBe('CLOSED');
      expect(AccountStatus.PENDING).toBe('PENDING');
    });
  });

  describe('AccountSource enum', () => {
    it('should have all required sources', () => {
      expect(AccountSource.MANUAL).toBe('MANUAL');
      expect(AccountSource.PLAID).toBe('PLAID');
      expect(AccountSource.SALTEDGE).toBe('SALTEDGE');
    });
  });

  describe('AccountNature enum', () => {
    it('should distinguish assets from liabilities', () => {
      expect(AccountNature.ASSET).toBe('ASSET');
      expect(AccountNature.LIABILITY).toBe('LIABILITY');
    });
  });

  describe('NetWorthEffect enum', () => {
    it('should have correct effect types', () => {
      expect(NetWorthEffect.POSITIVE).toBe('positive');
      expect(NetWorthEffect.NEGATIVE).toBe('negative');
      expect(NetWorthEffect.NEUTRAL).toBe('neutral');
    });
  });

  describe('BalanceDisplayLabel enum', () => {
    it('should have all display labels', () => {
      expect(BalanceDisplayLabel.AVAILABLE).toBe('Available');
      expect(BalanceDisplayLabel.OWED).toBe('Owed');
      expect(BalanceDisplayLabel.PAID_OFF).toBe('Paid Off');
      expect(BalanceDisplayLabel.OVERDRAWN).toBe('Overdrawn');
      expect(BalanceDisplayLabel.MARGIN_DEBT).toBe('Margin Debt');
    });
  });

  describe('NormalizedAccountBalance interface', () => {
    const validBalance: NormalizedAccountBalance = {
      accountId: '123e4567-e89b-12d3-a456-426614174000',
      accountName: 'Chase Checking',
      accountType: AccountType.CHECKING,
      accountNature: AccountNature.ASSET,
      currentBalance: 1500.5,
      displayAmount: 1500.5,
      displayLabel: BalanceDisplayLabel.AVAILABLE,
      affectsNetWorth: NetWorthEffect.POSITIVE,
      currency: 'USD',
    };

    it('should accept valid balance with required fields', () => {
      expect(validBalance.accountId).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(validBalance.accountName).toBe('Chase Checking');
      expect(validBalance.accountType).toBe(AccountType.CHECKING);
      expect(validBalance.accountNature).toBe(AccountNature.ASSET);
      expect(validBalance.currentBalance).toBe(1500.5);
      expect(validBalance.displayAmount).toBe(1500.5);
      expect(validBalance.displayLabel).toBe(BalanceDisplayLabel.AVAILABLE);
      expect(validBalance.affectsNetWorth).toBe(NetWorthEffect.POSITIVE);
      expect(validBalance.currency).toBe('USD');
    });

    it('should accept optional institutionName', () => {
      const balanceWithInstitution: NormalizedAccountBalance = {
        ...validBalance,
        institutionName: 'Chase Bank',
      };
      expect(balanceWithInstitution.institutionName).toBe('Chase Bank');
    });

    it('should validate credit card balance (liability)', () => {
      const creditCardBalance: NormalizedAccountBalance = {
        accountId: 'cc-123',
        accountName: 'Chase Sapphire',
        accountType: AccountType.CREDIT_CARD,
        accountNature: AccountNature.LIABILITY,
        currentBalance: 2500, // Amount owed (positive for liabilities)
        displayAmount: 2500,
        displayLabel: BalanceDisplayLabel.OWED,
        affectsNetWorth: NetWorthEffect.NEGATIVE,
        currency: 'USD',
      };
      expect(creditCardBalance.accountNature).toBe(AccountNature.LIABILITY);
      expect(creditCardBalance.affectsNetWorth).toBe(NetWorthEffect.NEGATIVE);
      expect(creditCardBalance.displayLabel).toBe(BalanceDisplayLabel.OWED);
    });
  });

  describe('FinancialSummary interface', () => {
    const validSummary: FinancialSummary = {
      totalAssets: 15000,
      totalLiabilities: 5000,
      netWorth: 10000,
      totalAvailableCredit: 7500,
      accounts: [],
      currency: 'USD',
      calculatedAt: new Date().toISOString(),
    };

    it('should have correct structure', () => {
      expect(validSummary.totalAssets).toBe(15000);
      expect(validSummary.totalLiabilities).toBe(5000);
      expect(validSummary.netWorth).toBe(10000);
      expect(validSummary.totalAvailableCredit).toBe(7500);
      expect(validSummary.accounts).toEqual([]);
      expect(validSummary.currency).toBe('USD');
      expect(typeof validSummary.calculatedAt).toBe('string');
    });

    it('should calculate net worth correctly (assets - liabilities)', () => {
      expect(validSummary.netWorth).toBe(
        validSummary.totalAssets - validSummary.totalLiabilities
      );
    });

    it('should handle negative net worth', () => {
      const negativeNetWorth: FinancialSummary = {
        totalAssets: 5000,
        totalLiabilities: 15000,
        netWorth: -10000,
        totalAvailableCredit: 0,
        accounts: [],
        currency: 'USD',
        calculatedAt: new Date().toISOString(),
      };
      expect(negativeNetWorth.netWorth).toBeLessThan(0);
      expect(negativeNetWorth.netWorth).toBe(
        negativeNetWorth.totalAssets - negativeNetWorth.totalLiabilities
      );
    });

    it('should handle zero available credit', () => {
      const noCredit: FinancialSummary = {
        ...validSummary,
        totalAvailableCredit: 0,
      };
      expect(noCredit.totalAvailableCredit).toBe(0);
    });
  });

  describe('Type Guards', () => {
    describe('isNormalizedAccountBalance', () => {
      it('should return true for valid balance object', () => {
        const validBalance = {
          accountId: 'test-id',
          accountName: 'Test Account',
          accountType: 'CHECKING',
          accountNature: 'ASSET',
          currentBalance: 1000,
          displayAmount: 1000,
          displayLabel: 'Available',
          affectsNetWorth: 'positive',
          currency: 'USD',
        };
        expect(isNormalizedAccountBalance(validBalance)).toBe(true);
      });

      it('should return false for null/undefined', () => {
        expect(isNormalizedAccountBalance(null)).toBe(false);
        expect(isNormalizedAccountBalance(undefined)).toBe(false);
      });

      it('should return false for missing required fields', () => {
        const missingFields = {
          accountId: 'test-id',
          accountName: 'Test Account',
          // missing other required fields
        };
        expect(isNormalizedAccountBalance(missingFields)).toBe(false);
      });

      it('should return false for wrong types', () => {
        const wrongTypes = {
          accountId: 123, // should be string
          accountName: 'Test',
          accountType: 'CHECKING',
          accountNature: 'ASSET',
          currentBalance: '1000', // should be number
          displayAmount: 1000,
          displayLabel: 'Available',
          affectsNetWorth: 'positive',
          currency: 'USD',
        };
        expect(isNormalizedAccountBalance(wrongTypes)).toBe(false);
      });
    });

    describe('isFinancialSummary', () => {
      it('should return true for valid summary object', () => {
        const validSummary = {
          totalAssets: 15000,
          totalLiabilities: 5000,
          netWorth: 10000,
          totalAvailableCredit: 7500,
          accounts: [],
          currency: 'USD',
          calculatedAt: new Date().toISOString(),
        };
        expect(isFinancialSummary(validSummary)).toBe(true);
      });

      it('should return false for null/undefined', () => {
        expect(isFinancialSummary(null)).toBe(false);
        expect(isFinancialSummary(undefined)).toBe(false);
      });

      it('should return false for missing required fields', () => {
        const missingFields = {
          totalAssets: 15000,
          // missing other required fields
        };
        expect(isFinancialSummary(missingFields)).toBe(false);
      });
    });

    describe('isValidAccountType', () => {
      it('should return true for valid account types', () => {
        expect(isValidAccountType('CHECKING')).toBe(true);
        expect(isValidAccountType('SAVINGS')).toBe(true);
        expect(isValidAccountType('CREDIT_CARD')).toBe(true);
        expect(isValidAccountType('LOAN')).toBe(true);
        expect(isValidAccountType('INVESTMENT')).toBe(true);
        expect(isValidAccountType('MORTGAGE')).toBe(true);
        expect(isValidAccountType('OTHER')).toBe(true);
      });

      it('should return false for invalid account types', () => {
        expect(isValidAccountType('INVALID')).toBe(false);
        expect(isValidAccountType('checking')).toBe(false); // case sensitive
        expect(isValidAccountType('')).toBe(false);
        expect(isValidAccountType(null)).toBe(false);
      });
    });

    describe('isValidAccountNature', () => {
      it('should return true for valid account natures', () => {
        expect(isValidAccountNature('ASSET')).toBe(true);
        expect(isValidAccountNature('LIABILITY')).toBe(true);
      });

      it('should return false for invalid natures', () => {
        expect(isValidAccountNature('asset')).toBe(false); // case sensitive
        expect(isValidAccountNature('BOTH')).toBe(false);
        expect(isValidAccountNature('')).toBe(false);
      });
    });
  });

  describe('Utility Functions', () => {
    describe('getAccountNature', () => {
      it('should return ASSET for checking accounts', () => {
        expect(getAccountNature(AccountType.CHECKING)).toBe(AccountNature.ASSET);
      });

      it('should return ASSET for savings accounts', () => {
        expect(getAccountNature(AccountType.SAVINGS)).toBe(AccountNature.ASSET);
      });

      it('should return ASSET for investment accounts', () => {
        expect(getAccountNature(AccountType.INVESTMENT)).toBe(AccountNature.ASSET);
      });

      it('should return LIABILITY for credit card accounts', () => {
        expect(getAccountNature(AccountType.CREDIT_CARD)).toBe(AccountNature.LIABILITY);
      });

      it('should return LIABILITY for loan accounts', () => {
        expect(getAccountNature(AccountType.LOAN)).toBe(AccountNature.LIABILITY);
      });

      it('should return LIABILITY for mortgage accounts', () => {
        expect(getAccountNature(AccountType.MORTGAGE)).toBe(AccountNature.LIABILITY);
      });

      it('should return ASSET for OTHER accounts (default)', () => {
        expect(getAccountNature(AccountType.OTHER)).toBe(AccountNature.ASSET);
      });
    });
  });
});
