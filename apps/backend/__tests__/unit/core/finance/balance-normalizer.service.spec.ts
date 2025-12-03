/**
 * BalanceNormalizerService Unit Tests (TDD Approach)
 *
 * Test suite for balance normalization across different account types.
 * Written BEFORE implementation following Test-Driven Development methodology.
 *
 * PROBLEM STATEMENT:
 * Different banking providers report balances inconsistently:
 * - Some report credit card balance as positive (amount owed)
 * - Some report credit card balance as negative (amount owed)
 * - Asset accounts generally report positive = money available
 * - We need a consistent representation for UI display and calculations
 *
 * NORMALIZED BALANCE SPECIFICATION:
 * - For ASSET accounts (CHECKING, SAVINGS, INVESTMENT):
 *   - currentBalance: positive = money available
 *   - displayAmount: absolute value (always positive)
 *   - displayLabel: 'Available'
 *   - affectsNetWorth: 'positive'
 *
 * - For LIABILITY accounts (CREDIT_CARD, LOAN, MORTGAGE):
 *   - currentBalance: positive = amount owed
 *   - displayAmount: absolute value (always positive)
 *   - displayLabel: 'Owed'
 *   - affectsNetWorth: 'negative'
 *
 * Coverage Target: 90%+ for all metrics
 * Test Categories: Asset normalization, Liability normalization, Edge cases
 *
 * @phase Phase 0 - Schema Foundation
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import type { Account, AccountType } from '../../../../generated/prisma';
import {
  BalanceNormalizerService,
  NormalizedBalance,
  AccountNature,
} from '../../../../src/core/finance/balance-normalizer.service';

describe('BalanceNormalizerService', () => {
  let service: BalanceNormalizerService;

  /**
   * Test Data Factory - Create mock account
   */
  const createMockAccount = (overrides: Partial<Account> = {}): Account => ({
    id: 'a1234567-89ab-cdef-0123-456789abcdef',
    name: 'Test Account',
    type: 'CHECKING' as AccountType,
    status: 'ACTIVE' as any,
    source: 'MANUAL' as any,
    currentBalance: new Decimal('1000.00'),
    availableBalance: new Decimal('950.00'),
    creditLimit: null,
    currency: 'USD',
    institutionName: 'Test Bank',
    accountNumber: null,
    routingNumber: null,
    plaidAccountId: null,
    plaidItemId: null,
    plaidAccessToken: null,
    plaidMetadata: null,
    isActive: true,
    syncEnabled: true,
    lastSyncAt: null,
    syncError: null,
    settings: null,
    bankingProvider: null,
    saltEdgeAccountId: null,
    saltEdgeConnectionId: null,
    tinkAccountId: null,
    yalilyAccountId: null,
    syncStatus: 'PENDING' as any,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    userId: 'u1234567-89ab-cdef-0123-456789abcdef',
    familyId: null,
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BalanceNormalizerService],
    }).compile();

    service = module.get<BalanceNormalizerService>(BalanceNormalizerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // ACCOUNT NATURE DETERMINATION
  // ============================================================================

  describe('getAccountNature', () => {
    it('should return ASSET for CHECKING account', () => {
      expect(service.getAccountNature('CHECKING')).toBe(AccountNature.ASSET);
    });

    it('should return ASSET for SAVINGS account', () => {
      expect(service.getAccountNature('SAVINGS')).toBe(AccountNature.ASSET);
    });

    it('should return ASSET for INVESTMENT account', () => {
      expect(service.getAccountNature('INVESTMENT')).toBe(AccountNature.ASSET);
    });

    it('should return LIABILITY for CREDIT_CARD account', () => {
      expect(service.getAccountNature('CREDIT_CARD')).toBe(AccountNature.LIABILITY);
    });

    it('should return LIABILITY for LOAN account', () => {
      expect(service.getAccountNature('LOAN')).toBe(AccountNature.LIABILITY);
    });

    it('should return LIABILITY for MORTGAGE account', () => {
      expect(service.getAccountNature('MORTGAGE')).toBe(AccountNature.LIABILITY);
    });

    it('should return ASSET for OTHER account (default)', () => {
      expect(service.getAccountNature('OTHER')).toBe(AccountNature.ASSET);
    });
  });

  // ============================================================================
  // ASSET ACCOUNT NORMALIZATION
  // ============================================================================

  describe('normalizeBalance - Asset Accounts', () => {
    describe('CHECKING account', () => {
      it('should normalize positive balance correctly', () => {
        const account = createMockAccount({
          type: 'CHECKING' as AccountType,
          currentBalance: new Decimal('1500.00'),
        });

        const result = service.normalizeBalance(account);

        expect(result.currentBalance.toString()).toBe('1500');
        expect(result.displayAmount.toString()).toBe('1500');
        expect(result.displayLabel).toBe('Available');
        expect(result.affectsNetWorth).toBe('positive');
        expect(result.accountNature).toBe(AccountNature.ASSET);
      });

      it('should normalize zero balance correctly', () => {
        const account = createMockAccount({
          type: 'CHECKING' as AccountType,
          currentBalance: new Decimal('0.00'),
        });

        const result = service.normalizeBalance(account);

        expect(result.currentBalance.toString()).toBe('0');
        expect(result.displayAmount.toString()).toBe('0');
        expect(result.displayLabel).toBe('Available');
        expect(result.affectsNetWorth).toBe('positive');
      });

      it('should normalize negative balance (overdraft) correctly', () => {
        const account = createMockAccount({
          type: 'CHECKING' as AccountType,
          currentBalance: new Decimal('-150.00'),
        });

        const result = service.normalizeBalance(account);

        // Negative balance on asset = overdraft, still counts as negative net worth
        expect(result.currentBalance.toString()).toBe('-150');
        expect(result.displayAmount.toString()).toBe('150');
        expect(result.displayLabel).toBe('Overdrawn');
        expect(result.affectsNetWorth).toBe('negative');
      });
    });

    describe('SAVINGS account', () => {
      it('should normalize positive balance correctly', () => {
        const account = createMockAccount({
          type: 'SAVINGS' as AccountType,
          currentBalance: new Decimal('10000.00'),
        });

        const result = service.normalizeBalance(account);

        expect(result.currentBalance.toString()).toBe('10000');
        expect(result.displayAmount.toString()).toBe('10000');
        expect(result.displayLabel).toBe('Available');
        expect(result.affectsNetWorth).toBe('positive');
      });
    });

    describe('INVESTMENT account', () => {
      it('should normalize positive balance correctly', () => {
        const account = createMockAccount({
          type: 'INVESTMENT' as AccountType,
          currentBalance: new Decimal('50000.00'),
        });

        const result = service.normalizeBalance(account);

        expect(result.currentBalance.toString()).toBe('50000');
        expect(result.displayAmount.toString()).toBe('50000');
        expect(result.displayLabel).toBe('Available');
        expect(result.affectsNetWorth).toBe('positive');
      });

      it('should handle negative investment balance (margin)', () => {
        const account = createMockAccount({
          type: 'INVESTMENT' as AccountType,
          currentBalance: new Decimal('-5000.00'),
        });

        const result = service.normalizeBalance(account);

        expect(result.currentBalance.toString()).toBe('-5000');
        expect(result.displayAmount.toString()).toBe('5000');
        expect(result.displayLabel).toBe('Margin Debt');
        expect(result.affectsNetWorth).toBe('negative');
      });
    });
  });

  // ============================================================================
  // LIABILITY ACCOUNT NORMALIZATION
  // ============================================================================

  describe('normalizeBalance - Liability Accounts', () => {
    describe('CREDIT_CARD account', () => {
      it('should normalize positive balance (amount owed) correctly', () => {
        const account = createMockAccount({
          type: 'CREDIT_CARD' as AccountType,
          currentBalance: new Decimal('2500.00'),
        });

        const result = service.normalizeBalance(account);

        expect(result.currentBalance.toString()).toBe('2500');
        expect(result.displayAmount.toString()).toBe('2500');
        expect(result.displayLabel).toBe('Owed');
        expect(result.affectsNetWorth).toBe('negative');
        expect(result.accountNature).toBe(AccountNature.LIABILITY);
      });

      it('should normalize negative balance (provider reports as negative) correctly', () => {
        // Some providers report CC balance as negative
        const account = createMockAccount({
          type: 'CREDIT_CARD' as AccountType,
          currentBalance: new Decimal('-2500.00'),
        });

        const result = service.normalizeBalance(account);

        // We flip it to positive for our standard representation
        expect(result.currentBalance.toString()).toBe('2500');
        expect(result.displayAmount.toString()).toBe('2500');
        expect(result.displayLabel).toBe('Owed');
        expect(result.affectsNetWorth).toBe('negative');
      });

      it('should handle zero balance (paid off)', () => {
        const account = createMockAccount({
          type: 'CREDIT_CARD' as AccountType,
          currentBalance: new Decimal('0.00'),
        });

        const result = service.normalizeBalance(account);

        expect(result.currentBalance.toString()).toBe('0');
        expect(result.displayAmount.toString()).toBe('0');
        expect(result.displayLabel).toBe('Paid Off');
        expect(result.affectsNetWorth).toBe('neutral');
      });

      it('should handle credit (overpayment)', () => {
        // User overpaid their CC, now has credit
        // Some providers report negative balance meaning "you owe money"
        // Our normalization always converts to positive (amount owed)
        const account = createMockAccount({
          type: 'CREDIT_CARD' as AccountType,
          currentBalance: new Decimal('-50.00'),
        });

        // For credit cards, negative is flipped to positive (amount owed)
        // This handles providers that report debt as negative
        const result = service.normalizeBalance(account);

        // -50.00 becomes +50.00 (normalized to positive owed)
        expect(result.currentBalance.toString()).toBe('50');
        expect(result.displayAmount.toString()).toBe('50');
        expect(result.displayLabel).toBe('Owed');
        expect(result.affectsNetWorth).toBe('negative');
      });
    });

    describe('LOAN account', () => {
      it('should normalize positive balance (amount owed) correctly', () => {
        const account = createMockAccount({
          type: 'LOAN' as AccountType,
          currentBalance: new Decimal('15000.00'),
        });

        const result = service.normalizeBalance(account);

        expect(result.currentBalance.toString()).toBe('15000');
        expect(result.displayAmount.toString()).toBe('15000');
        expect(result.displayLabel).toBe('Owed');
        expect(result.affectsNetWorth).toBe('negative');
      });

      it('should handle paid off loan', () => {
        const account = createMockAccount({
          type: 'LOAN' as AccountType,
          currentBalance: new Decimal('0.00'),
        });

        const result = service.normalizeBalance(account);

        expect(result.currentBalance.toString()).toBe('0');
        expect(result.displayLabel).toBe('Paid Off');
        expect(result.affectsNetWorth).toBe('neutral');
      });
    });

    describe('MORTGAGE account', () => {
      it('should normalize positive balance (amount owed) correctly', () => {
        const account = createMockAccount({
          type: 'MORTGAGE' as AccountType,
          currentBalance: new Decimal('250000.00'),
        });

        const result = service.normalizeBalance(account);

        expect(result.currentBalance.toString()).toBe('250000');
        expect(result.displayAmount.toString()).toBe('250000');
        expect(result.displayLabel).toBe('Owed');
        expect(result.affectsNetWorth).toBe('negative');
      });
    });
  });

  // ============================================================================
  // OTHER ACCOUNT TYPE
  // ============================================================================

  describe('normalizeBalance - OTHER account type', () => {
    it('should treat OTHER as ASSET by default', () => {
      const account = createMockAccount({
        type: 'OTHER' as AccountType,
        currentBalance: new Decimal('500.00'),
      });

      const result = service.normalizeBalance(account);

      expect(result.currentBalance.toString()).toBe('500');
      expect(result.displayLabel).toBe('Available');
      expect(result.affectsNetWorth).toBe('positive');
      expect(result.accountNature).toBe(AccountNature.ASSET);
    });
  });

  // ============================================================================
  // DECIMAL PRECISION
  // ============================================================================

  describe('decimal precision', () => {
    it('should preserve decimal precision', () => {
      const account = createMockAccount({
        type: 'CHECKING' as AccountType,
        currentBalance: new Decimal('1234.56'),
      });

      const result = service.normalizeBalance(account);

      expect(result.currentBalance.toString()).toBe('1234.56');
      expect(result.displayAmount.toString()).toBe('1234.56');
    });

    it('should handle very large amounts', () => {
      const account = createMockAccount({
        type: 'SAVINGS' as AccountType,
        currentBalance: new Decimal('9999999999999.99'),
      });

      const result = service.normalizeBalance(account);

      expect(result.currentBalance.toString()).toBe('9999999999999.99');
    });

    it('should handle very small amounts', () => {
      const account = createMockAccount({
        type: 'CHECKING' as AccountType,
        currentBalance: new Decimal('0.01'),
      });

      const result = service.normalizeBalance(account);

      expect(result.currentBalance.toString()).toBe('0.01');
    });
  });

  // ============================================================================
  // NET WORTH CALCULATION HELPERS
  // ============================================================================

  describe('getNetWorthContribution', () => {
    it('should return positive value for asset account', () => {
      const account = createMockAccount({
        type: 'CHECKING' as AccountType,
        currentBalance: new Decimal('1000.00'),
      });

      const contribution = service.getNetWorthContribution(account);

      expect(contribution.toString()).toBe('1000');
    });

    it('should return negative value for liability account', () => {
      const account = createMockAccount({
        type: 'CREDIT_CARD' as AccountType,
        currentBalance: new Decimal('500.00'),
      });

      const contribution = service.getNetWorthContribution(account);

      expect(contribution.toString()).toBe('-500');
    });

    it('should return negative value for overdraft', () => {
      const account = createMockAccount({
        type: 'CHECKING' as AccountType,
        currentBalance: new Decimal('-200.00'),
      });

      const contribution = service.getNetWorthContribution(account);

      expect(contribution.toString()).toBe('-200');
    });

    it('should handle liability with negative provider value', () => {
      // Provider reports CC as -1000 (meaning $1000 owed)
      const account = createMockAccount({
        type: 'CREDIT_CARD' as AccountType,
        currentBalance: new Decimal('-1000.00'),
      });

      const contribution = service.getNetWorthContribution(account);

      // After normalization, this is $1000 owed, so -1000 for net worth
      expect(contribution.toString()).toBe('-1000');
    });
  });

  // ============================================================================
  // BATCH NORMALIZATION
  // ============================================================================

  describe('normalizeBalances (batch)', () => {
    it('should normalize multiple accounts', () => {
      const accounts = [
        createMockAccount({
          type: 'CHECKING' as AccountType,
          currentBalance: new Decimal('1000.00'),
        }),
        createMockAccount({
          type: 'CREDIT_CARD' as AccountType,
          currentBalance: new Decimal('500.00'),
        }),
        createMockAccount({
          type: 'SAVINGS' as AccountType,
          currentBalance: new Decimal('5000.00'),
        }),
      ];

      const results = service.normalizeBalances(accounts);

      expect(results).toHaveLength(3);
      expect(results[0].displayLabel).toBe('Available');
      expect(results[1].displayLabel).toBe('Owed');
      expect(results[2].displayLabel).toBe('Available');
    });

    it('should return empty array for empty input', () => {
      const results = service.normalizeBalances([]);

      expect(results).toEqual([]);
    });
  });

  // ============================================================================
  // CALCULATE TOTALS
  // ============================================================================

  describe('calculateTotals', () => {
    it('should calculate total assets, liabilities, and net worth', () => {
      const accounts = [
        createMockAccount({
          type: 'CHECKING' as AccountType,
          currentBalance: new Decimal('2000.00'),
        }),
        createMockAccount({
          type: 'SAVINGS' as AccountType,
          currentBalance: new Decimal('8000.00'),
        }),
        createMockAccount({
          type: 'CREDIT_CARD' as AccountType,
          currentBalance: new Decimal('1500.00'),
        }),
        createMockAccount({
          type: 'LOAN' as AccountType,
          currentBalance: new Decimal('5000.00'),
        }),
      ];

      const totals = service.calculateTotals(accounts);

      expect(totals.totalAssets.toString()).toBe('10000');
      expect(totals.totalLiabilities.toString()).toBe('6500');
      expect(totals.netWorth.toString()).toBe('3500');
    });

    it('should handle accounts with overdraft', () => {
      const accounts = [
        createMockAccount({
          type: 'CHECKING' as AccountType,
          currentBalance: new Decimal('-100.00'),
        }),
        createMockAccount({
          type: 'SAVINGS' as AccountType,
          currentBalance: new Decimal('1000.00'),
        }),
      ];

      const totals = service.calculateTotals(accounts);

      // Overdraft counts against assets (or as liability)
      expect(totals.totalAssets.toString()).toBe('1000');
      expect(totals.totalLiabilities.toString()).toBe('100');
      expect(totals.netWorth.toString()).toBe('900');
    });

    it('should return zeros for empty accounts', () => {
      const totals = service.calculateTotals([]);

      expect(totals.totalAssets.toString()).toBe('0');
      expect(totals.totalLiabilities.toString()).toBe('0');
      expect(totals.netWorth.toString()).toBe('0');
    });

    it('should handle negative net worth', () => {
      const accounts = [
        createMockAccount({
          type: 'CHECKING' as AccountType,
          currentBalance: new Decimal('1000.00'),
        }),
        createMockAccount({
          type: 'CREDIT_CARD' as AccountType,
          currentBalance: new Decimal('5000.00'),
        }),
      ];

      const totals = service.calculateTotals(accounts);

      expect(totals.totalAssets.toString()).toBe('1000');
      expect(totals.totalLiabilities.toString()).toBe('5000');
      expect(totals.netWorth.toString()).toBe('-4000');
    });
  });

  // ============================================================================
  // AVAILABLE BALANCE WITH CREDIT LIMIT
  // ============================================================================

  describe('getAvailableCredit', () => {
    it('should calculate available credit for credit card', () => {
      const account = createMockAccount({
        type: 'CREDIT_CARD' as AccountType,
        currentBalance: new Decimal('2000.00'),
        creditLimit: new Decimal('5000.00'),
      });

      const available = service.getAvailableCredit(account);

      expect(available?.toString()).toBe('3000');
    });

    it('should return null for account without credit limit', () => {
      const account = createMockAccount({
        type: 'CHECKING' as AccountType,
        currentBalance: new Decimal('1000.00'),
        creditLimit: null,
      });

      const available = service.getAvailableCredit(account);

      expect(available).toBeNull();
    });

    it('should handle maxed out credit card', () => {
      const account = createMockAccount({
        type: 'CREDIT_CARD' as AccountType,
        currentBalance: new Decimal('5000.00'),
        creditLimit: new Decimal('5000.00'),
      });

      const available = service.getAvailableCredit(account);

      expect(available?.toString()).toBe('0');
    });

    it('should handle over-limit credit card', () => {
      const account = createMockAccount({
        type: 'CREDIT_CARD' as AccountType,
        currentBalance: new Decimal('5500.00'),
        creditLimit: new Decimal('5000.00'),
      });

      const available = service.getAvailableCredit(account);

      expect(available?.toString()).toBe('-500');
    });
  });
});
