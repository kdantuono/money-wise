/**
 * Repository Module for MoneyWise Application
 * Provides dependency injection for all repository interfaces and implementations
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Import entities
import { User } from '../entities/user.entity';
import { Account } from '../entities/account.entity';
import { Category } from '../entities/category.entity';
import { Transaction } from '../entities/transaction.entity';

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
  ],
  providers: [
    // User Repository
    {
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
  ],
})
export class RepositoryModule {}

// Export interfaces for type safety
export { IUserRepository } from './interfaces/user.repository.interface';
export { IAccountRepository } from './interfaces/account.repository.interface';
export { ICategoryRepository } from './interfaces/category.repository.interface';
export { ITransactionRepository } from './interfaces/transaction.repository.interface';
export { IBaseRepository } from './interfaces/base.repository.interface';