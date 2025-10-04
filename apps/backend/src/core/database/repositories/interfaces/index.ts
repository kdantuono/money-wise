// Base repository interface
export { IBaseRepository } from './base-repository.interface';

// Entity-specific repository interfaces
export type { IUserRepository } from './user-repository.interface';
export type { IAccountRepository } from './account-repository.interface';
export type { ICategoryRepository } from './category-repository.interface';
export type { ITransactionRepository } from './transaction-repository.interface';

// Import for internal use
import type { IUserRepository } from './user-repository.interface';
import type { IAccountRepository } from './account-repository.interface';
import type { ICategoryRepository } from './category-repository.interface';
import type { ITransactionRepository } from './transaction-repository.interface';

// Convenience type for all repositories
export interface IRepositories {
  userRepository: IUserRepository;
  accountRepository: IAccountRepository;
  categoryRepository: ICategoryRepository;
  transactionRepository: ITransactionRepository;
}