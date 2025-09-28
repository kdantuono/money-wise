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
  ],
  providers: [
    // User Repository
    {
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
  ],
})
export class RepositoryModule {}

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