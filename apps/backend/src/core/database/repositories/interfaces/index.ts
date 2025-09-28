// Base repository interface
export { IBaseRepository } from './base-repository.interface';

// Entity-specific repository interfaces
export { IUserRepository } from './user-repository.interface';
export { IAccountRepository } from './account-repository.interface';
export { ICategoryRepository } from './category-repository.interface';
export { ITransactionRepository } from './transaction-repository.interface';

// Convenience type for all repositories
export interface IRepositories {
  userRepository: IUserRepository;
  accountRepository: IAccountRepository;
  categoryRepository: ICategoryRepository;
  transactionRepository: ITransactionRepository;
}