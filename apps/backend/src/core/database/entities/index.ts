// Export all entities for TypeORM and general use
export { User, UserRole, UserStatus } from './user.entity';
export { Account, AccountType, AccountStatus, AccountSource } from './account.entity';
export { Category, CategoryType, CategoryStatus } from './category.entity';
export { Transaction, TransactionType, TransactionStatus, TransactionSource } from './transaction.entity';

// Entity array for TypeORM configuration
import { User } from './user.entity';
import { Account } from './account.entity';
import { Category } from './category.entity';
import { Transaction } from './transaction.entity';

export const entities = [User, Account, Category, Transaction];

// Default export for convenience
export default entities;