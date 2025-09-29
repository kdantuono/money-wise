<<<<<<< HEAD
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Account, Category, Transaction } from '../entities';
import {
  UserRepository,
  AccountRepository,
  CategoryRepository,
  TransactionRepository,
} from './impl';
import {
  IUserRepository,
  IAccountRepository,
  ICategoryRepository,
  ITransactionRepository,
} from './interfaces';

/**
 * Repository module providing dependency injection for all repositories
 *
 * This module:
 * - Registers TypeORM entities
 * - Provides repository implementations as services
 * - Sets up proper dependency injection tokens
 * - Exports repositories for use in other modules
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Account, Category, Transaction]),
=======
/**
 * Repository Module for MoneyWise Application
 * Provides dependency injection for all repository interfaces and implementations
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import entities
import { User } from '../entities';
import { Account } from '../entities';
import { Category } from '../entities';
import { Transaction } from '../entities';

// Import repository implementations
import { UserRepository } from './impl/user.repository';
import { AccountRepository } from './impl/account.repository';
// Note: CategoryRepository and TransactionRepository will be implemented in next commits

// Repository injection tokens
export const USER_REPOSITORY_TOKEN = 'USER_REPOSITORY';
export const ACCOUNT_REPOSITORY_TOKEN = 'ACCOUNT_REPOSITORY';
export const CATEGORY_REPOSITORY_TOKEN = 'CATEGORY_REPOSITORY';
export const TRANSACTION_REPOSITORY_TOKEN = 'TRANSACTION_REPOSITORY';

// Custom decorators for dependency injection
export const InjectUserRepository = () => Inject(USER_REPOSITORY_TOKEN);
export const InjectAccountRepository = () => Inject(ACCOUNT_REPOSITORY_TOKEN);
export const InjectCategoryRepository = () => Inject(CATEGORY_REPOSITORY_TOKEN);
export const InjectTransactionRepository = () => Inject(TRANSACTION_REPOSITORY_TOKEN);

// Import Inject decorator
import { Inject } from '@nestjs/common';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Account,
      Category,
      Transaction,
    ]),
>>>>>>> origin/epic/milestone-1-foundation
  ],
  providers: [
    // User Repository
    {
<<<<<<< HEAD
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    {
      provide: UserRepository,
      useClass: UserRepository,
    },

    // Account Repository
    {
      provide: 'IAccountRepository',
      useClass: AccountRepository,
    },
    {
      provide: AccountRepository,
      useClass: AccountRepository,
    },

    // Category Repository
    {
      provide: 'ICategoryRepository',
      useClass: CategoryRepository,
    },
    {
      provide: CategoryRepository,
      useClass: CategoryRepository,
    },

    // Transaction Repository
    {
      provide: 'ITransactionRepository',
      useClass: TransactionRepository,
    },
    {
      provide: TransactionRepository,
      useClass: TransactionRepository,
    },
  ],
  exports: [
    // Export both interface tokens and concrete classes
    'IUserRepository',
    'IAccountRepository',
    'ICategoryRepository',
    'ITransactionRepository',
    UserRepository,
    AccountRepository,
    CategoryRepository,
    TransactionRepository,
    TypeOrmModule,
=======
      provide: USER_REPOSITORY_TOKEN,
      useClass: UserRepository,
    },
    // Account Repository
    {
      provide: ACCOUNT_REPOSITORY_TOKEN,
      useClass: AccountRepository,
    },
    // TODO: Add CategoryRepository and TransactionRepository in subsequent commits
    // {
    //   provide: CATEGORY_REPOSITORY_TOKEN,
    //   useClass: CategoryRepository,
    // },
    // {
    //   provide: TRANSACTION_REPOSITORY_TOKEN,
    //   useClass: TransactionRepository,
    // },
  ],
  exports: [
    USER_REPOSITORY_TOKEN,
    ACCOUNT_REPOSITORY_TOKEN,
    // CATEGORY_REPOSITORY_TOKEN,
    // TRANSACTION_REPOSITORY_TOKEN,
>>>>>>> origin/epic/milestone-1-foundation
  ],
})
export class RepositoryModule {}

<<<<<<< HEAD
// Convenience decorator for injecting repositories by interface
export const InjectUserRepository = () => {
  const Inject = require('@nestjs/common').Inject;
  return Inject('IUserRepository');
};

export const InjectAccountRepository = () => {
  const Inject = require('@nestjs/common').Inject;
  return Inject('IAccountRepository');
};

export const InjectCategoryRepository = () => {
  const Inject = require('@nestjs/common').Inject;
  return Inject('ICategoryRepository');
};

export const InjectTransactionRepository = () => {
  const Inject = require('@nestjs/common').Inject;
  return Inject('ITransactionRepository');
};
=======
// Export interfaces for type safety
export { IUserRepository } from './interfaces/user.repository.interface';
export { IAccountRepository } from './interfaces/account.repository.interface';
export { ICategoryRepository } from './interfaces/category.repository.interface';
export { ITransactionRepository } from './interfaces/transaction.repository.interface';
export { IBaseRepository } from './interfaces/base.repository.interface';
>>>>>>> origin/epic/milestone-1-foundation
