import { faker } from '@faker-js/faker';
import { AccountType, AccountSource, AccountStatus, Prisma } from '../../../generated/prisma';
import { CreateAccountDto } from '../../../src/accounts/dto/create-account.dto';
import { UpdateAccountDto } from '../../../src/accounts/dto/update-account.dto';

/**
 * AccountFactory - Test data factory for Account entities and DTOs
 *
 * Purpose: Eliminate hard-coded test data and provide realistic, randomized test values
 * Pattern: Builder pattern with faker.js integration
 *
 * Usage:
 *   const account = AccountFactory.build(); // Full entity
 *   const dto = AccountFactory.buildCreateDto(); // CreateAccountDto
 *   const accounts = AccountFactory.buildMany(5); // Array of 5 accounts
 */
export class AccountFactory {
  /**
   * Build a complete Account entity (as returned from database)
   */
  static build(overrides: Partial<any> = {}): any {
    const baseAccount = {
      id: faker.string.uuid(),
      name: `${faker.company.name()} Account`,
      type: AccountType.CHECKING,
      status: AccountStatus.ACTIVE,
      source: AccountSource.MANUAL,
      currentBalance: new Prisma.Decimal(parseFloat(faker.finance.amount({ min: 100, max: 10000 }))),
      availableBalance: null,
      creditLimit: null,
      currency: 'USD',
      institutionName: null,
      accountNumber: null,
      routingNumber: null,
      plaidAccountId: null,
      plaidItemId: null,
      plaidAccessToken: null,
      plaidMetadata: null,
      syncEnabled: true,
      lastSyncedAt: null,
      userId: faker.string.uuid(),
      familyId: null,
      settings: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    return baseAccount;
  }

  /**
   * Build CreateAccountDto (for create operations)
   */
  static buildCreateDto(overrides: Partial<CreateAccountDto> = {}): CreateAccountDto {
    const dto: CreateAccountDto = {
      name: `${faker.company.name()} Account`,
      type: AccountType.CHECKING,
      source: AccountSource.MANUAL,
      currentBalance: parseFloat(faker.finance.amount({ min: 100, max: 10000 })),
      currency: 'USD',
      syncEnabled: true,
      ...overrides,
    };

    return dto;
  }

  /**
   * Build UpdateAccountDto (for update operations)
   */
  static buildUpdateDto(overrides: Partial<UpdateAccountDto> = {}): UpdateAccountDto {
    return {
      name: `${faker.company.name()} Account`,
      ...overrides,
    };
  }

  /**
   * Build array of multiple accounts
   */
  static buildMany(count: number, overrides: Partial<any> = {}): any[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  /**
   * Build checking account
   */
  static buildChecking(overrides: Partial<any> = {}): any {
    return this.build({
      type: AccountType.CHECKING,
      name: `${faker.company.name()} Checking`,
      currentBalance: new Prisma.Decimal(parseFloat(faker.finance.amount({ min: 500, max: 5000 }))),
      ...overrides,
    });
  }

  /**
   * Build savings account
   */
  static buildSavings(overrides: Partial<any> = {}): any {
    return this.build({
      type: AccountType.SAVINGS,
      name: `${faker.company.name()} Savings`,
      currentBalance: new Prisma.Decimal(parseFloat(faker.finance.amount({ min: 1000, max: 20000 }))),
      ...overrides,
    });
  }

  /**
   * Build credit card account
   */
  static buildCredit(overrides: Partial<any> = {}): any {
    return this.build({
      type: AccountType.CREDIT_CARD,
      name: `${faker.company.name()} Credit Card`,
      currentBalance: new Prisma.Decimal(parseFloat(faker.finance.amount({ min: -5000, max: 0 }))), // Negative = debt
      creditLimit: new Prisma.Decimal(parseFloat(faker.finance.amount({ min: 5000, max: 25000 }))),
      ...overrides,
    });
  }

  /**
   * Build investment account
   */
  static buildInvestment(overrides: Partial<any> = {}): any {
    return this.build({
      type: AccountType.INVESTMENT,
      name: `${faker.company.name()} Investment`,
      currentBalance: new Prisma.Decimal(parseFloat(faker.finance.amount({ min: 5000, max: 100000 }))),
      ...overrides,
    });
  }

  /**
   * Build loan account
   */
  static buildLoan(overrides: Partial<any> = {}): any {
    return this.build({
      type: AccountType.LOAN,
      name: `${faker.company.name()} Loan`,
      currentBalance: new Prisma.Decimal(parseFloat(faker.finance.amount({ min: -50000, max: 0 }))), // Negative = debt
      ...overrides,
    });
  }

  /**
   * Build Plaid-linked account
   */
  static buildPlaidAccount(overrides: Partial<any> = {}): any {
    return this.build({
      source: AccountSource.PLAID,
      plaidAccountId: `plaid_acc_${faker.string.alphanumeric(20)}`,
      plaidItemId: `plaid_item_${faker.string.alphanumeric(20)}`,
      plaidAccessToken: `access-${faker.string.alphanumeric(30)}`,
      institutionName: faker.company.name(),
      accountNumber: faker.finance.accountNumber(4),
      syncEnabled: true,
      lastSyncedAt: faker.date.recent(),
      ...overrides,
    });
  }

  /**
   * Build SaltEdge-linked account
   */
  static buildSaltEdgeAccount(overrides: Partial<any> = {}): any {
    return this.build({
      source: AccountSource.SALTEDGE,
      saltEdgeAccountId: `saltedge_acc_${faker.string.alphanumeric(20)}`,
      saltEdgeConnectionId: `saltedge_conn_${faker.string.alphanumeric(20)}`,
      institutionName: faker.company.name(),
      accountNumber: faker.finance.accountNumber(4),
      syncEnabled: true,
      lastSyncedAt: faker.date.recent(),
      ...overrides,
    });
  }

  /**
   * Build hidden SaltEdge account (revoked connection)
   */
  static buildHiddenSaltEdgeAccount(overrides: Partial<any> = {}): any {
    return this.buildSaltEdgeAccount({
      status: AccountStatus.HIDDEN,
      ...overrides,
    });
  }

  /**
   * Build family account
   */
  static buildFamilyAccount(overrides: Partial<any> = {}): any {
    return this.build({
      userId: null,
      familyId: faker.string.uuid(),
      name: `Family ${faker.company.name()} Account`,
      ...overrides,
    });
  }

  /**
   * Build account with zero balance
   */
  static buildZeroBalance(overrides: Partial<any> = {}): any {
    return this.build({
      currentBalance: 0,
      ...overrides,
    });
  }

  /**
   * Build inactive account
   */
  static buildInactive(overrides: Partial<any> = {}): any {
    return this.build({
      status: AccountStatus.INACTIVE,
      ...overrides,
    });
  }

  /**
   * Build account with specific balance
   */
  static buildWithBalance(balance: number, overrides: Partial<any> = {}): any {
    return this.build({
      currentBalance: balance,
      ...overrides,
    });
  }

  /**
   * Build account for specific user
   */
  static buildForUser(userId: string, overrides: Partial<any> = {}): any {
    return this.build({
      userId,
      familyId: null,
      ...overrides,
    });
  }

  /**
   * Build account for specific family
   */
  static buildForFamily(familyId: string, overrides: Partial<any> = {}): any {
    return this.build({
      userId: null,
      familyId,
      ...overrides,
    });
  }
}
