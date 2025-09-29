// Transaction Factory for Testing
// TASK-003-003: Setup Test Factories

import { faker } from '@faker-js/faker';
import { Transaction } from '../../src/core/database/entities/transaction.entity';

export class TransactionFactory {
  static create(overrides: Partial<Transaction> = {}): Partial<Transaction> {
    const isIncome = faker.datatype.boolean();
    const amount = faker.number.float({ min: 1, max: 1000, precision: 0.01 });

    return {
      id: faker.string.uuid(),
      amount: isIncome ? amount : -amount,
      description: faker.lorem.sentence(),
      date: faker.date.recent({ days: 30 }),
      type: isIncome ? 'income' : 'expense',
      pending: faker.datatype.boolean({ probability: 0.1 }),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static createMany(count: number, overrides: Partial<Transaction> = {}): Partial<Transaction>[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static build(overrides: Partial<Transaction> = {}): Transaction {
    const transactionData = this.create(overrides);
    const transaction = new Transaction();
    Object.assign(transaction, transactionData);
    return transaction;
  }

  static buildMany(count: number, overrides: Partial<Transaction> = {}): Transaction[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  static createIncome(overrides: Partial<Transaction> = {}): Partial<Transaction> {
    return this.create({
      type: 'income',
      amount: Math.abs(faker.number.float({ min: 1, max: 5000, precision: 0.01 })),
      ...overrides
    });
  }

  static createExpense(overrides: Partial<Transaction> = {}): Partial<Transaction> {
    return this.create({
      type: 'expense',
      amount: -Math.abs(faker.number.float({ min: 1, max: 1000, precision: 0.01 })),
      ...overrides
    });
  }
}