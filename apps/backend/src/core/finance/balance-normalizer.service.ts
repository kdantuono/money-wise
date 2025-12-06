/**
 * BalanceNormalizerService - Normalize account balances for consistent display
 *
 * PROBLEM STATEMENT:
 * Different banking providers report balances inconsistently:
 * - Some report credit card balance as positive (amount owed)
 * - Some report credit card balance as negative (amount owed)
 * - Asset accounts generally report positive = money available
 * - We need a consistent representation for UI display and calculations
 *
 * NORMALIZATION RULES:
 * - ASSET accounts (CHECKING, SAVINGS, INVESTMENT):
 *   - Positive balance = money available → displayLabel: 'Available'
 *   - Negative balance = overdraft → displayLabel: 'Overdrawn'
 *
 * - LIABILITY accounts (CREDIT_CARD, LOAN, MORTGAGE):
 *   - Balance normalized to positive (amount owed)
 *   - Zero balance → displayLabel: 'Paid Off'
 *   - Positive balance → displayLabel: 'Owed'
 *
 * @phase Phase 0 - Schema Foundation
 */

import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import type { Account, AccountType } from '../../../generated/prisma';

/**
 * Account nature classification
 */
export enum AccountNature {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
}

/**
 * Display label for balance amounts
 */
export type DisplayLabel = 'Available' | 'Owed' | 'Paid Off' | 'Overdrawn' | 'Margin Debt';

/**
 * Net worth impact classification
 */
export type NetWorthImpact = 'positive' | 'negative' | 'neutral';

/**
 * Normalized balance result
 */
export interface NormalizedBalance {
  /** Normalized current balance (positive for liabilities means owed) */
  currentBalance: Decimal;
  /** Always positive amount for display purposes */
  displayAmount: Decimal;
  /** Human-readable label for the balance */
  displayLabel: DisplayLabel;
  /** How this balance affects net worth calculation */
  affectsNetWorth: NetWorthImpact;
  /** Classification of account type */
  accountNature: AccountNature;
  /** Original account ID for reference */
  accountId: string;
}

/**
 * Financial totals summary
 */
export interface FinancialTotals {
  /** Total value of all asset accounts (positive) */
  totalAssets: Decimal;
  /** Total value of all liability accounts (positive) */
  totalLiabilities: Decimal;
  /** Net worth = assets - liabilities */
  netWorth: Decimal;
}

/**
 * Account types that are considered liabilities
 */
const LIABILITY_ACCOUNT_TYPES: AccountType[] = ['CREDIT_CARD', 'LOAN', 'MORTGAGE'];

@Injectable()
export class BalanceNormalizerService {
  /**
   * Determine whether an account type is an asset or liability
   */
  getAccountNature(accountType: AccountType): AccountNature {
    if (LIABILITY_ACCOUNT_TYPES.includes(accountType)) {
      return AccountNature.LIABILITY;
    }
    return AccountNature.ASSET;
  }

  /**
   * Normalize a single account's balance for consistent display
   *
   * @param account - Account with balance to normalize
   * @returns Normalized balance information
   */
  normalizeBalance(account: Account): NormalizedBalance {
    const nature = this.getAccountNature(account.type);
    const rawBalance = new Decimal(account.currentBalance.toString());

    if (nature === AccountNature.ASSET) {
      return this.normalizeAssetBalance(account, rawBalance);
    } else {
      return this.normalizeLiabilityBalance(account, rawBalance);
    }
  }

  /**
   * Normalize an asset account's balance
   */
  private normalizeAssetBalance(account: Account, rawBalance: Decimal): NormalizedBalance {
    const isNegative = rawBalance.lessThan(0);
    const isZero = rawBalance.equals(0);

    let displayLabel: DisplayLabel;
    let affectsNetWorth: NetWorthImpact;

    if (isNegative) {
      // Overdraft on checking/savings or margin debt on investment
      displayLabel = account.type === 'INVESTMENT' ? 'Margin Debt' : 'Overdrawn';
      affectsNetWorth = 'negative';
    } else if (isZero) {
      displayLabel = 'Available';
      affectsNetWorth = 'positive';
    } else {
      displayLabel = 'Available';
      affectsNetWorth = 'positive';
    }

    return {
      currentBalance: rawBalance,
      displayAmount: rawBalance.abs(),
      displayLabel,
      affectsNetWorth,
      accountNature: AccountNature.ASSET,
      accountId: account.id,
    };
  }

  /**
   * Normalize a liability account's balance
   *
   * For liabilities, we always want:
   * - currentBalance = positive amount owed
   * - Some providers report as negative (flip sign)
   * - Zero = Paid Off
   */
  private normalizeLiabilityBalance(account: Account, rawBalance: Decimal): NormalizedBalance {
    // Normalize: If provider sent negative value, flip to positive
    // (meaning amount owed should be positive in our representation)
    const normalizedBalance = rawBalance.lessThan(0) ? rawBalance.abs() : rawBalance;
    const isZero = normalizedBalance.equals(0);

    let displayLabel: DisplayLabel;
    let affectsNetWorth: NetWorthImpact;

    if (isZero) {
      displayLabel = 'Paid Off';
      affectsNetWorth = 'neutral';
    } else {
      displayLabel = 'Owed';
      affectsNetWorth = 'negative';
    }

    return {
      currentBalance: normalizedBalance,
      displayAmount: normalizedBalance.abs(),
      displayLabel,
      affectsNetWorth,
      accountNature: AccountNature.LIABILITY,
      accountId: account.id,
    };
  }

  /**
   * Normalize multiple accounts at once
   *
   * @param accounts - Array of accounts to normalize
   * @returns Array of normalized balance information
   */
  normalizeBalances(accounts: Account[]): NormalizedBalance[] {
    return accounts.map((account) => this.normalizeBalance(account));
  }

  /**
   * Get the net worth contribution of a single account
   *
   * @param account - Account to evaluate
   * @returns Decimal representing contribution (positive for assets, negative for liabilities)
   */
  getNetWorthContribution(account: Account): Decimal {
    const nature = this.getAccountNature(account.type);
    const rawBalance = new Decimal(account.currentBalance.toString());

    if (nature === AccountNature.ASSET) {
      // Asset: positive = adds to net worth, negative (overdraft) = subtracts
      return rawBalance;
    } else {
      // Liability: amount owed (we normalize to positive, then negate for net worth)
      const normalizedOwed = rawBalance.lessThan(0) ? rawBalance.abs() : rawBalance;
      return normalizedOwed.negated();
    }
  }

  /**
   * Calculate total assets, liabilities, and net worth
   *
   * @param accounts - Array of accounts
   * @returns Financial totals
   */
  calculateTotals(accounts: Account[]): FinancialTotals {
    let totalAssets = new Decimal(0);
    let totalLiabilities = new Decimal(0);

    for (const account of accounts) {
      const nature = this.getAccountNature(account.type);
      const rawBalance = new Decimal(account.currentBalance.toString());

      if (nature === AccountNature.ASSET) {
        if (rawBalance.greaterThanOrEqualTo(0)) {
          // Positive asset balance adds to assets
          totalAssets = totalAssets.plus(rawBalance);
        } else {
          // Negative asset balance (overdraft) is treated as a liability
          totalLiabilities = totalLiabilities.plus(rawBalance.abs());
        }
      } else {
        // Liability: normalize to positive (amount owed)
        const normalizedOwed = rawBalance.lessThan(0) ? rawBalance.abs() : rawBalance;
        totalLiabilities = totalLiabilities.plus(normalizedOwed);
      }
    }

    const netWorth = totalAssets.minus(totalLiabilities);

    return {
      totalAssets,
      totalLiabilities,
      netWorth,
    };
  }

  /**
   * Get available credit for accounts with credit limits
   *
   * @param account - Account with potential credit limit
   * @returns Available credit amount, or null if no credit limit
   */
  getAvailableCredit(account: Account): Decimal | null {
    if (!account.creditLimit) {
      return null;
    }

    const creditLimit = new Decimal(account.creditLimit.toString());
    const rawBalance = new Decimal(account.currentBalance.toString());

    // Normalize balance for liability accounts
    const normalizedBalance = this.getAccountNature(account.type) === AccountNature.LIABILITY
      ? (rawBalance.lessThan(0) ? rawBalance.abs() : rawBalance)
      : rawBalance;

    // Available credit = limit - current balance used
    return creditLimit.minus(normalizedBalance);
  }
}
