/**
 * Repository Pattern Exports for MoneyWise Application
 * Centralized exports for all repository interfaces, implementations, and dependency injection tokens
 */

// Export interfaces
export { IBaseRepository } from './interfaces/base.repository.interface';
export { IUserRepository } from './interfaces/user.repository.interface';
export { IAccountRepository } from './interfaces/account.repository.interface';
export { ICategoryRepository } from './interfaces/category.repository.interface';
export { ITransactionRepository } from './interfaces/transaction.repository.interface';

// Export implementations
export { BaseRepository } from './impl/base.repository';
export { UserRepository } from './impl/user.repository';
export { AccountRepository } from './impl/account.repository';

// Export module and injection tokens
export {
  RepositoryModule,
  USER_REPOSITORY_TOKEN,
  ACCOUNT_REPOSITORY_TOKEN,
  CATEGORY_REPOSITORY_TOKEN,
  TRANSACTION_REPOSITORY_TOKEN,
  InjectUserRepository,
  InjectAccountRepository,
  InjectCategoryRepository,
  InjectTransactionRepository,
} from './repository.module';