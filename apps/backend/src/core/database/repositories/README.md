# Repository Pattern Implementation

This directory contains a complete implementation of the Repository Pattern for the MoneyWise application, providing a clean separation between business logic and data access layer.

## 📁 Directory Structure

```
repositories/
├── interfaces/           # Repository interface definitions
│   ├── base-repository.interface.ts
│   ├── user-repository.interface.ts
│   ├── account-repository.interface.ts
│   ├── category-repository.interface.ts
│   ├── transaction-repository.interface.ts
│   └── index.ts
├── impl/                # Concrete repository implementations
│   ├── base.repository.ts
│   ├── user.repository.ts
│   ├── account.repository.ts
│   ├── category.repository.ts
│   ├── transaction.repository.ts
│   └── index.ts
├── __tests__/           # Unit tests
│   ├── base.repository.spec.ts
│   ├── user.repository.spec.ts
│   └── ...
├── repository.module.ts # NestJS module for dependency injection
├── index.ts            # Main exports
└── README.md           # This file
```

## 🏗️ Architecture Overview

### Base Repository Pattern

All repositories extend from `BaseRepository<T>` which provides:

- **Type-safe CRUD operations** - Generic methods work with any entity type
- **Consistent error handling** - Standardized error messages and logging
- **Comprehensive logging** - Debug information for all operations
- **TypeORM integration** - Direct access to TypeORM features when needed

### Interface-First Design

Each entity has both an interface and implementation:

```typescript
// Interface defines the contract
interface IUserRepository extends IBaseRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  // ... other domain-specific methods
}

// Implementation provides the actual logic
class UserRepository extends BaseRepository<User> implements IUserRepository {
  async findByEmail(email: string): Promise<User | null> {
    // Implementation details
  }
}
```

## 🚀 Usage Examples

### Basic Usage in Services

```typescript
import { Injectable } from '@nestjs/common';
import { InjectUserRepository } from '../repositories';
import { IUserRepository } from '../repositories/interfaces';

@Injectable()
export class UserService {
  constructor(
    @InjectUserRepository()
    private readonly userRepository: IUserRepository,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    return this.userRepository.create(userData);
  }
}
```

### Advanced Queries

```typescript
// Find users with pagination and filtering
const [users, total] = await userRepository.findAndCount({
  where: { status: UserStatus.ACTIVE },
  order: { createdAt: 'DESC' },
  take: 10,
  skip: 0,
});

// Complex account queries
const accounts = await accountRepository.findAccountsNeedingSync(2); // 2 hours threshold
const balanceSummary = await accountRepository.getAccountBalancesSummary(userId);

// Transaction analytics
const stats = await transactionRepository.getTransactionStats(
  userId,
  startDate,
  endDate
);
```

### Bulk Operations

```typescript
// Create multiple entities
const users = await userRepository.createBulk([
  { email: 'user1@example.com', firstName: 'User1', lastName: 'Test' },
  { email: 'user2@example.com', firstName: 'User2', lastName: 'Test' },
]);

// Bulk balance updates
await accountRepository.bulkUpdateBalances([
  { accountId: 'acc1', currentBalance: 1000.50 },
  { accountId: 'acc2', currentBalance: 2500.75 },
]);
```

## 🔧 Configuration

### Module Setup

Add `RepositoryModule` to your module imports:

```typescript
import { Module } from '@nestjs/common';
import { RepositoryModule } from './database/repositories';

@Module({
  imports: [RepositoryModule],
  // ... other module configuration
})
export class AppModule {}
```

### Dependency Injection

Use the provided injection decorators:

```typescript
import {
  InjectUserRepository,
  InjectAccountRepository,
  InjectCategoryRepository,
  InjectTransactionRepository,
} from './database/repositories';

@Injectable()
export class MyService {
  constructor(
    @InjectUserRepository()
    private readonly userRepo: IUserRepository,

    @InjectAccountRepository()
    private readonly accountRepo: IAccountRepository,
  ) {}
}
```

## 📊 Repository Features by Entity

### UserRepository

**Core Features:**
- Email-based user lookup with case insensitivity
- User status and role management
- Email verification tracking
- User statistics and analytics

**Key Methods:**
```typescript
findByEmail(email: string): Promise<User | null>
isEmailTaken(email: string, excludeUserId?: string): Promise<boolean>
updateLastLogin(userId: string): Promise<boolean>
markEmailAsVerified(userId: string): Promise<boolean>
getUserStats(): Promise<UserStatsDto>
```

### AccountRepository

**Core Features:**
- Multi-source account management (Plaid, Manual)
- Balance tracking and synchronization
- Institution-based grouping
- Account health monitoring

**Key Methods:**
```typescript
findByUserId(userId: string, includeInactive?: boolean): Promise<Account[]>
findAccountsNeedingSync(hoursThreshold?: number): Promise<Account[]>
updateBalance(accountId: string, currentBalance: number): Promise<Account | null>
getAccountBalancesSummary(userId: string): Promise<BalanceSummaryDto>
```

### CategoryRepository

**Core Features:**
- Hierarchical category trees
- Auto-categorization rules
- Usage analytics
- Default category management

**Key Methods:**
```typescript
findCategoryTree(parentId?: string, maxDepth?: number): Promise<Category[]>
findMatchingCategories(merchantName?: string, description?: string): Promise<Category[]>
getCategoryUsageStats(categoryId: string): Promise<UsageStatsDto>
createDefaultCategories(): Promise<Category[]>
```

### TransactionRepository

**Core Features:**
- Advanced transaction search and filtering
- Financial analytics and reporting
- Duplicate detection
- Categorization management

**Key Methods:**
```typescript
findByUserId(userId: string, options?: FindOptions): Promise<Transaction[]>
searchTransactions(userId: string, searchTerm: string): Promise<Transaction[]>
getTransactionStats(userId: string, startDate: Date, endDate: Date): Promise<StatsDto>
findDuplicates(accountId: string, options?: DuplicateOptions): Promise<Transaction[][]>
```

## 🧪 Testing

### Running Tests

```bash
# Run all repository tests
npm test -- --testPathPattern=repositories

# Run specific repository tests
npm test -- user.repository.spec.ts
npm test -- base.repository.spec.ts
```

### Test Structure

Tests follow a consistent pattern:

1. **Setup** - Mock dependencies and create test instances
2. **Arrange** - Prepare test data and configure mocks
3. **Act** - Execute the method under test
4. **Assert** - Verify results and interactions

### Example Test

```typescript
describe('UserRepository', () => {
  it('should find user by email successfully', async () => {
    // Arrange
    const email = 'test@example.com';
    const mockUser = createMockUser({ email });
    mockRepository.findOne.mockResolvedValue(mockUser);

    // Act
    const result = await userRepository.findByEmail(email);

    // Assert
    expect(result).toEqual(mockUser);
    expect(mockRepository.findOne).toHaveBeenCalledWith({
      where: { email: email.toLowerCase() },
    });
  });
});
```

## 🔍 Error Handling

### Consistent Error Format

All repositories follow the same error handling pattern:

```typescript
try {
  this.logger.debug('Operation starting...');
  const result = await this.repository.someOperation();
  this.logger.debug('Operation completed successfully');
  return result;
} catch (error) {
  this.logger.error('Operation failed:', error);
  throw new Error(`Failed to perform operation: ${error.message}`);
}
```

### Error Types

- **Validation Errors** - Input validation failures
- **Database Errors** - Connection, constraint, or query failures
- **Business Logic Errors** - Domain-specific validation failures
- **Not Found Errors** - Entity not found scenarios

## 📈 Performance Considerations

### Query Optimization

- **Selective Loading** - Use `select` to limit fields
- **Eager Loading** - Use `relations` for related entities
- **Pagination** - Always use `limit` and `offset` for large datasets
- **Indexing** - Leverage database indexes for common queries

### Caching Strategy

```typescript
// Example: Cache frequently accessed data
@Injectable()
export class UserService {
  constructor(
    @InjectUserRepository()
    private readonly userRepository: IUserRepository,
    private readonly cacheManager: Cache,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const cacheKey = `user:email:${email.toLowerCase()}`;

    let user = await this.cacheManager.get<User>(cacheKey);
    if (!user) {
      user = await this.userRepository.findByEmail(email);
      if (user) {
        await this.cacheManager.set(cacheKey, user, { ttl: 300 }); // 5 minutes
      }
    }

    return user;
  }
}
```

### Bulk Operations

Use bulk operations for better performance:

```typescript
// ❌ Avoid: Individual operations in loops
for (const userData of usersData) {
  await userRepository.create(userData);
}

// ✅ Prefer: Bulk operations
await userRepository.createBulk(usersData);
```

## 🔄 Best Practices

### 1. Interface Segregation

Keep interfaces focused and cohesive:

```typescript
// ✅ Good: Focused interface
interface IUserAuthRepository {
  findByEmail(email: string): Promise<User | null>;
  updatePassword(userId: string, hash: string): Promise<boolean>;
  markEmailAsVerified(userId: string): Promise<boolean>;
}

// ❌ Avoid: Overly broad interfaces
interface IUserEverythingRepository extends IBaseRepository<User> {
  // ... 50+ methods for every possible user operation
}
```

### 2. Method Naming

Use clear, intention-revealing names:

```typescript
// ✅ Good: Clear intentions
findActiveUsersByRole(role: UserRole): Promise<User[]>
findAccountsNeedingSync(hoursThreshold: number): Promise<Account[]>
getMonthlySpendingByCategory(userId: string, year: number, month: number): Promise<SpendingData[]>

// ❌ Avoid: Vague names
findUsers(params: any): Promise<User[]>
getAccounts(options: object): Promise<Account[]>
```

### 3. Error Context

Provide meaningful error context:

```typescript
// ✅ Good: Contextual errors
throw new Error(`Failed to find user by email ${email}: ${error.message}`);

// ❌ Avoid: Generic errors
throw new Error('Database error');
```

### 4. Logging Strategy

Log at appropriate levels:

```typescript
// Debug: Detailed operation info
this.logger.debug(`Finding transactions for user ${userId} with filters:`, filters);

// Info: Important business events
this.logger.log(`User ${userId} email verified successfully`);

// Warn: Recoverable issues
this.logger.warn(`Duplicate transaction detected for account ${accountId}`);

// Error: Failures requiring attention
this.logger.error(`Failed to sync account ${accountId}:`, error);
```

## 🚀 Future Enhancements

### Planned Features

1. **Read Replicas** - Separate read/write operations for better performance
2. **Event Sourcing** - Track all changes for audit and replay capabilities
3. **Soft Delete** - Implement soft delete across all entities
4. **Optimistic Locking** - Prevent concurrent update conflicts
5. **Query Builder Extensions** - Domain-specific query builders

### Extension Points

The repository pattern is designed to be easily extensible:

```typescript
// Add new methods to interfaces
interface IUserRepository extends IBaseRepository<User> {
  // Existing methods...

  // New methods
  findUsersByPreference(preference: string, value: any): Promise<User[]>;
  bulkUpdatePreferences(updates: UserPreferenceUpdate[]): Promise<number>;
}

// Implement in concrete classes
class UserRepository extends BaseRepository<User> implements IUserRepository {
  async findUsersByPreference(preference: string, value: any): Promise<User[]> {
    return this.createQueryBuilder('user')
      .where(`user.preferences->>'${preference}' = :value`, { value: JSON.stringify(value) })
      .getMany();
  }
}
```

## 📚 Additional Resources

- [TypeORM Documentation](https://typeorm.io/)
- [NestJS Database Guide](https://docs.nestjs.com/techniques/database)
- [Repository Pattern Explained](https://martinfowler.com/eaaCatalog/repository.html)
- [Domain-Driven Design](https://www.domainlanguage.com/ddd/)

---

*This implementation provides a solid foundation for data access in the MoneyWise application while maintaining flexibility for future enhancements and scalability requirements.*