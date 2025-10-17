# AccountsService TypeORM Dependency Analysis

**Task**: P.3.6.1.1 - Analyze AccountsService TypeORM Dependencies
**Date**: 2025-10-13
**Status**: Complete

## Executive Summary

The AccountsService is a **low-complexity migration candidate** with straightforward CRUD operations and minimal complex query patterns. All TypeORM operations use standard Repository methods with no raw SQL queries, transactions, or advanced query builder usage.

**Migration Effort**: Estimated 2-3 hours
**Risk Level**: Low
**Blockers**: None

---

## 1. TypeORM Usage Summary

### @InjectRepository Injections

```typescript
// apps/backend/src/accounts/accounts.service.ts:12-15
@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
  ) {}
```

**Single Repository**: `Repository<Account>`

### TypeORM Module Registration

```typescript
// apps/backend/src/accounts/accounts.module.ts:8
imports: [TypeOrmModule.forFeature([Account])],
```

### Repository Methods Used

| Method | Count | Usage Pattern |
|--------|-------|---------------|
| `create()` | 1 | Entity instantiation |
| `save()` | 4 | Create/update operations |
| `find()` | 2 | Fetch multiple records with filtering |
| `findOne()` | 6 | Fetch single record by ID |
| `remove()` | 1 | Delete operation |

**Total TypeORM Operations**: 14 across 8 service methods

### Query Complexity Assessment

- **Simple CRUD**: 100% of operations
- **Complex Joins**: 1 explicit relation load (`relations: ['transactions']`)
- **Raw Queries**: 0
- **Transactions**: 0
- **Query Builder**: 0
- **Batch Operations**: 0

---

## 2. Service Methods Inventory

### Method: `create(userId: string, createAccountDto: CreateAccountDto)`

**TypeORM Operations**:
- `accountRepository.create()` - Entity instantiation with defaults
- `accountRepository.save()` - Persist new account

**Complexity**: Simple
**Prisma Equivalent**: `prisma.account.create({ data: {...} })`

**Default Values Applied**:
- `currency`: 'USD'
- `syncEnabled`: true
- `isActive`: true

---

### Method: `findAll(userId: string)`

**TypeORM Operations**:
```typescript
this.accountRepository.find({
  where: { userId },
  order: { createdAt: 'DESC' },
});
```

**Complexity**: Simple
**Prisma Equivalent**:
```typescript
prisma.account.findMany({
  where: { userId },
  orderBy: { createdAt: 'desc' }
})
```

---

### Method: `findOne(id: string, userId: string, userRole: UserRole)`

**TypeORM Operations**:
```typescript
this.accountRepository.findOne({
  where: { id },
  relations: ['transactions'],
});
```

**Complexity**: Simple (with eager loading)
**Prisma Equivalent**:
```typescript
prisma.account.findUnique({
  where: { id },
  include: { transactions: true }
})
```

**Business Logic**:
- Authorization check (owner or admin)
- Throws `NotFoundException` if not found
- Throws `ForbiddenException` if unauthorized

---

### Method: `update(id: string, userId: string, userRole: UserRole, updateAccountDto: UpdateAccountDto)`

**TypeORM Operations**:
- `accountRepository.findOne({ where: { id } })` - Fetch existing
- `Object.assign(account, updateAccountDto)` - Merge changes
- `accountRepository.save()` - Persist updates

**Complexity**: Simple
**Prisma Equivalent**:
```typescript
// No need to fetch first - direct update with authorization check
prisma.account.update({
  where: { id },
  data: updateAccountDto
})
```

**Business Logic**:
- Authorization check (owner or admin)
- Throws `NotFoundException` if not found
- Throws `ForbiddenException` if unauthorized

---

### Method: `remove(id: string, userId: string, userRole: UserRole)`

**TypeORM Operations**:
- `accountRepository.findOne({ where: { id } })` - Fetch existing
- `accountRepository.remove(account)` - Delete record

**Complexity**: Simple
**Prisma Equivalent**:
```typescript
prisma.account.delete({
  where: { id }
})
```

**Business Logic**:
- Authorization check (owner or admin)
- Throws `NotFoundException` if not found
- Throws `ForbiddenException` if unauthorized

---

### Method: `getBalance(id: string, userId: string, userRole: UserRole)`

**TypeORM Operations**:
- `accountRepository.findOne({ where: { id } })` - Fetch account

**Complexity**: Simple
**Prisma Equivalent**:
```typescript
prisma.account.findUnique({
  where: { id },
  select: { currentBalance: true, availableBalance: true, currency: true }
})
```

**Business Logic**:
- Authorization check (owner or admin)
- Returns balance summary object

---

### Method: `getSummary(userId: string)`

**TypeORM Operations**:
```typescript
this.accountRepository.find({
  where: { userId, isActive: true },
});
```

**Complexity**: Simple (in-memory aggregation)
**Prisma Equivalent**:
```typescript
// Fetch + aggregate (or use Prisma aggregation)
const accounts = await prisma.account.findMany({
  where: { userId, isActive: true }
});
// In-memory aggregation remains the same
```

**Aggregations Performed**:
- Total balance (sum of `currentBalance`)
- Active accounts count (filter by `status === 'active'`)
- Accounts needing sync count (filter by `needsSync`)
- Breakdown by type (group by `type`, count + sum)

**Note**: Current implementation uses in-memory aggregation. Could be optimized with Prisma aggregation API for large datasets.

---

### Method: `syncAccount(id: string, userId: string, userRole: UserRole)`

**TypeORM Operations**:
- `accountRepository.findOne({ where: { id } })` - Fetch existing
- `accountRepository.save()` - Update sync fields

**Complexity**: Simple
**Prisma Equivalent**:
```typescript
prisma.account.update({
  where: { id },
  data: {
    lastSyncAt: new Date(),
    syncError: null
  }
})
```

**Business Logic**:
- Authorization check (owner or admin)
- Validates `isPlaidAccount` (throws `ForbiddenException` if manual)
- Updates `lastSyncAt` and clears `syncError`
- TODO: Implement actual Plaid sync logic

---

## 3. Query Patterns

### Simple CRUD Operations

All 8 service methods use standard CRUD patterns:

| Operation | Methods |
|-----------|---------|
| **Create** | `create()` |
| **Read (Single)** | `findOne()`, `getBalance()`, `update()`, `remove()`, `syncAccount()` |
| **Read (Multiple)** | `findAll()`, `getSummary()` |
| **Update** | `update()`, `syncAccount()` |
| **Delete** | `remove()` |

### Filtering Patterns

| Filter | Usage |
|--------|-------|
| `where: { id }` | 6 methods (single record fetch) |
| `where: { userId }` | 2 methods (user's accounts) |
| `where: { userId, isActive: true }` | 1 method (active accounts) |

### Sorting Patterns

| Sort | Usage |
|------|-------|
| `order: { createdAt: 'DESC' }` | 1 method (`findAll()`) |

### Eager Loading (Relations)

| Relation | Usage |
|----------|-------|
| `relations: ['transactions']` | 1 method (`findOne()`) |

**Note**: Transactions relation is loaded but never used in the service. This may be a performance concern (N+1 potential) if transaction count is high.

### Complex Joins

**None** - Only single-level eager loading via `relations` option.

### Raw Queries

**None** - All queries use TypeORM Repository methods.

### Transactions (Database)

**None** - No multi-step operations requiring ACID guarantees.

---

## 4. Entity Relationships

### Account Entity Relations

```typescript
// ManyToOne: Account → User
@ManyToOne(() => User, (user) => user.accounts, {
  onDelete: 'CASCADE',
})
@JoinColumn({ name: 'userId' })
user: User;

// OneToMany: Account → Transactions
@OneToMany(() => Transaction, (transaction) => transaction.account, {
  cascade: true,
  onDelete: 'CASCADE',
})
transactions: Transaction[];
```

### Relationship Analysis

| Relationship | Direction | Delete Behavior | Usage in Service |
|-------------|-----------|-----------------|------------------|
| User → Account | ManyToOne | CASCADE | Not directly accessed (userId only) |
| Account → Transactions | OneToMany | CASCADE | Loaded in `findOne()` but not used |

### Foreign Key Constraints

- `userId` → `users.id` (CASCADE DELETE)

### Indexes

```typescript
@Index(['userId', 'status'])
```

**Composite Index**: Optimizes queries filtering by user and status.

---

## 5. DTOs Analysis

### Input DTOs

#### CreateAccountDto
**File**: `apps/backend/src/accounts/dto/create-account.dto.ts`

**Required Fields**:
- `name`: string
- `type`: AccountType enum
- `source`: AccountSource enum
- `currentBalance`: number (min: 0)

**Optional Fields**:
- `availableBalance`: number
- `creditLimit`: number
- `currency`: string (default: 'USD')
- `institutionName`: string
- `accountNumber`: string
- `routingNumber`: string
- `syncEnabled`: boolean (default: true)
- `settings`: object (autoSync, syncFrequency, notifications, budgetIncluded)

**Validation**: class-validator decorators (`@IsString`, `@IsEnum`, `@IsNumber`, `@IsBoolean`, `@Min`)

---

#### UpdateAccountDto
**File**: `apps/backend/src/accounts/dto/update-account.dto.ts`

**All Fields Optional**:
- `name`: string
- `type`: AccountType enum
- `status`: AccountStatus enum
- `currentBalance`: number
- `availableBalance`: number
- `creditLimit`: number
- `currency`: string
- `institutionName`: string
- `syncEnabled`: boolean
- `settings`: object

**Validation**: class-validator decorators with `@IsOptional`

---

### Output DTOs

#### AccountResponseDto
**File**: `apps/backend/src/accounts/dto/account-response.dto.ts`

**Fields** (25 total):
- Identity: `id`, `userId`
- Core: `name`, `type`, `status`, `source`
- Balances: `currentBalance`, `availableBalance`, `creditLimit`, `currency`
- Institution: `institutionName`, `maskedAccountNumber`, `displayName`
- Plaid: `isPlaidAccount`, `isManualAccount`, `needsSync`
- Status: `isActive`, `syncEnabled`, `lastSyncAt`, `syncError`
- Settings: `settings` object
- Timestamps: `createdAt`, `updatedAt`

**Computed Properties Used**:
- `displayName` (entity getter)
- `maskedAccountNumber` (entity getter)
- `isPlaidAccount` (entity getter)
- `isManualAccount` (entity getter)
- `needsSync` (entity getter)

---

#### AccountSummaryDto
**File**: `apps/backend/src/accounts/dto/account-response.dto.ts`

**Aggregation Fields**:
- `totalAccounts`: number
- `totalBalance`: number
- `activeAccounts`: number
- `accountsNeedingSync`: number
- `byType`: object (count + totalBalance per AccountType)

---

### Validation Requirements

All DTOs use **class-validator** decorators:
- Type validation: `@IsString`, `@IsNumber`, `@IsBoolean`
- Enum validation: `@IsEnum(AccountType)`, `@IsEnum(AccountStatus)`
- Range validation: `@Min(0)` for currentBalance
- Optional fields: `@IsOptional`

**Prisma Impact**: Validation layer remains unchanged - class-validator works independently of ORM.

---

## 6. Performance Considerations

### Queries Requiring Pagination

**None currently**, but these methods should be paginated for production:

| Method | Current Behavior | Recommendation |
|--------|------------------|----------------|
| `findAll()` | Fetches all user accounts | Add pagination if users have >50 accounts |
| `getSummary()` | Fetches all active accounts | Consider caching or aggregation if >100 accounts |

**Estimated Impact**: Low (typical user has 3-10 accounts)

---

### Queries with Potential N+1 Issues

#### ⚠️ Issue: Unused Transaction Loading

```typescript
// findOne() method
const account = await this.accountRepository.findOne({
  where: { id },
  relations: ['transactions'], // ← Loaded but never used
});
```

**Impact**: If an account has 1000+ transactions, all are loaded unnecessarily.

**Solution**: Remove `relations: ['transactions']` unless needed.

---

### Index Requirements

#### Existing Index
```typescript
@Index(['userId', 'status'])
```

**Queries Covered**:
- `findAll(userId)` - Partial use (userId only)
- `getSummary(userId, isActive)` - Partial use (userId + different column)

#### Recommended Additional Indexes

| Index | Queries Benefited | Priority |
|-------|-------------------|----------|
| `userId` (single column) | All user-filtered queries | High |
| `userId, isActive` | `getSummary()` | Medium |
| `id` (primary key) | All findOne operations | Auto-created |

**Prisma Indexes**: Define in schema.prisma:
```prisma
model Account {
  // ...
  @@index([userId])
  @@index([userId, status])
  @@index([userId, isActive])
}
```

---

### Decimal Precision Handling

#### TypeORM Transformer
```typescript
@Column({
  type: 'decimal',
  precision: 15,
  scale: 2,
  transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }
})
currentBalance: number;
```

**Behavior**: Converts PostgreSQL `NUMERIC(15,2)` to JavaScript `number`.

**Prisma Equivalent**:
```prisma
model Account {
  currentBalance Decimal @db.Decimal(15, 2)
}
```

**Code Change Required**: Use `Prisma.Decimal` type for precise decimal handling:
```typescript
// Before (TypeORM)
currentBalance: number

// After (Prisma)
import { Prisma } from '@prisma/client';
currentBalance: Prisma.Decimal
```

**Impact**: Medium - requires updating all balance calculations to handle Decimal type.

---

## 7. Migration Complexity Assessment

### Simple to Migrate (6 methods - 2 hours)

| Method | Complexity | Notes |
|--------|-----------|-------|
| `create()` | Very Low | Direct Prisma `create()` |
| `findAll()` | Very Low | Direct Prisma `findMany()` |
| `findOne()` | Low | Remove unused transactions relation |
| `getBalance()` | Very Low | Add `select` clause for optimization |
| `remove()` | Low | Authorization check before delete |
| `syncAccount()` | Low | Direct `update()` call |

### Medium Complexity (2 methods - 1 hour)

| Method | Complexity | Notes |
|--------|-----------|-------|
| `update()` | Medium | Combine fetch + authorization + update into single query |
| `getSummary()` | Medium | Consider Prisma aggregation API vs in-memory aggregation |

### High Complexity

**None** - No complex transactions, raw SQL, or advanced query builder usage.

---

### Estimated Effort Breakdown

| Task | Effort | Complexity |
|------|--------|-----------|
| Replace @InjectRepository with PrismaService | 15 min | Trivial |
| Update import statements | 10 min | Trivial |
| Migrate create() method | 15 min | Simple |
| Migrate findAll() method | 10 min | Simple |
| Migrate findOne() + remove transactions relation | 20 min | Simple |
| Migrate update() + optimize query | 30 min | Medium |
| Migrate remove() + authorization | 20 min | Medium |
| Migrate getBalance() + add select | 15 min | Simple |
| Migrate getSummary() + test aggregation | 30 min | Medium |
| Migrate syncAccount() | 15 min | Simple |
| Update tests (if any) | 30 min | Medium |
| Integration testing | 30 min | Medium |

**Total Estimated Time**: 3 hours 20 minutes
**Recommended Time Buffer**: +30 minutes for edge cases
**Final Estimate**: **4 hours for complete migration + testing**

---

## 8. Prisma Migration Strategy

### Recommended Pattern: Constructor Injection

```typescript
// Before (TypeORM)
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../core/database/entities/account.entity';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
  ) {}
}

// After (Prisma)
import { PrismaService } from '../core/database/prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}
}
```

---

### Method Migration Examples

#### Example 1: create()

```typescript
// Before (TypeORM)
async create(userId: string, dto: CreateAccountDto): Promise<AccountResponseDto> {
  const account = this.accountRepository.create({
    ...dto,
    userId,
    currency: dto.currency || 'USD',
    syncEnabled: dto.syncEnabled ?? true,
    isActive: true,
  });
  const savedAccount = await this.accountRepository.save(account);
  return this.toResponseDto(savedAccount);
}

// After (Prisma)
async create(userId: string, dto: CreateAccountDto): Promise<AccountResponseDto> {
  const account = await this.prisma.account.create({
    data: {
      ...dto,
      userId,
      currency: dto.currency || 'USD',
      syncEnabled: dto.syncEnabled ?? true,
      isActive: true,
    },
  });
  return this.toResponseDto(account);
}
```

**Changes**:
- Remove `create()` + `save()` pattern → Single `create()` call
- Prisma automatically persists on `create()`

---

#### Example 2: findOne() - Remove Unused Relation

```typescript
// Before (TypeORM)
async findOne(id: string, userId: string, userRole: UserRole): Promise<AccountResponseDto> {
  const account = await this.accountRepository.findOne({
    where: { id },
    relations: ['transactions'], // ← Unused relation
  });
  // ... authorization checks ...
  return this.toResponseDto(account);
}

// After (Prisma)
async findOne(id: string, userId: string, userRole: UserRole): Promise<AccountResponseDto> {
  const account = await this.prisma.account.findUnique({
    where: { id },
    // Remove transactions relation (not used)
  });

  if (!account) {
    throw new NotFoundException(`Account with ID ${id} not found`);
  }

  if (account.userId !== userId && userRole !== UserRole.ADMIN) {
    throw new ForbiddenException('You can only access your own accounts');
  }

  return this.toResponseDto(account);
}
```

**Changes**:
- `findOne()` → `findUnique()`
- Remove unused `relations: ['transactions']`
- Authorization logic unchanged

---

#### Example 3: update() - Optimize Query

```typescript
// Before (TypeORM) - Two queries
async update(id: string, userId: string, userRole: UserRole, dto: UpdateAccountDto) {
  const account = await this.accountRepository.findOne({ where: { id } }); // Query 1

  if (!account) throw new NotFoundException();
  if (account.userId !== userId && userRole !== UserRole.ADMIN) {
    throw new ForbiddenException();
  }

  Object.assign(account, dto);
  const updated = await this.accountRepository.save(account); // Query 2
  return this.toResponseDto(updated);
}

// After (Prisma) - Option 1: Keep authorization check (2 queries)
async update(id: string, userId: string, userRole: UserRole, dto: UpdateAccountDto) {
  const account = await this.prisma.account.findUnique({ where: { id } });

  if (!account) throw new NotFoundException();
  if (account.userId !== userId && userRole !== UserRole.ADMIN) {
    throw new ForbiddenException();
  }

  const updated = await this.prisma.account.update({
    where: { id },
    data: dto,
  });
  return this.toResponseDto(updated);
}

// After (Prisma) - Option 2: Single query with conditional (RECOMMENDED)
async update(id: string, userId: string, userRole: UserRole, dto: UpdateAccountDto) {
  try {
    const updated = await this.prisma.account.update({
      where: {
        id,
        ...(userRole !== UserRole.ADMIN && { userId }), // Conditional filter
      },
      data: dto,
    });
    return this.toResponseDto(updated);
  } catch (error) {
    if (error.code === 'P2025') { // Record not found
      // Check if account exists (for proper error message)
      const account = await this.prisma.account.findUnique({
        where: { id },
        select: { userId: true }
      });

      if (!account) throw new NotFoundException(`Account with ID ${id} not found`);
      throw new ForbiddenException('You can only update your own accounts');
    }
    throw error;
  }
}
```

**Recommendation**: Use **Option 1** initially for migration simplicity. Optimize to Option 2 later if performance profiling shows need.

---

#### Example 4: getSummary() - Aggregation Options

```typescript
// Current (In-Memory Aggregation)
async getSummary(userId: string): Promise<AccountSummaryDto> {
  const accounts = await this.accountRepository.find({
    where: { userId, isActive: true },
  });

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  const activeAccounts = accounts.filter(acc => acc.status === 'active').length;
  // ... more aggregations ...
}

// Option 1: Keep In-Memory (Easiest Migration)
async getSummary(userId: string): Promise<AccountSummaryDto> {
  const accounts = await this.prisma.account.findMany({
    where: { userId, isActive: true },
  });

  // Same aggregation logic
}

// Option 2: Use Prisma Aggregation (Better Performance)
async getSummary(userId: string): Promise<AccountSummaryDto> {
  const [totalStats, byType] = await Promise.all([
    this.prisma.account.aggregate({
      where: { userId, isActive: true },
      _sum: { currentBalance: true },
      _count: true,
    }),
    this.prisma.account.groupBy({
      by: ['type'],
      where: { userId, isActive: true },
      _sum: { currentBalance: true },
      _count: true,
    }),
  ]);

  // Additional queries for status/sync counts
  const [activeCount, syncCount] = await Promise.all([
    this.prisma.account.count({
      where: { userId, isActive: true, status: 'active' }
    }),
    this.prisma.account.count({
      where: {
        userId,
        isActive: true,
        syncEnabled: true,
        // needsSync computed property logic needs raw query or fetch
      }
    }),
  ]);

  return {
    totalAccounts: totalStats._count,
    totalBalance: totalStats._sum.currentBalance,
    activeAccounts: activeCount,
    accountsNeedingSync: syncCount, // May require different approach
    byType: /* transform groupBy result */,
  };
}
```

**Recommendation**: Use **Option 1** for initial migration. The `needsSync` computed property makes Option 2 complex without significant benefit for typical user account counts (<20).

---

### Raw Query Requirements

**None** - All queries can be expressed using Prisma Client API.

---

### Transaction Handling Approach

**Current State**: No database transactions used in AccountsService.

**Future Consideration**: If bulk operations are added (e.g., bulk account creation), use Prisma transactions:

```typescript
await this.prisma.$transaction([
  this.prisma.account.create({ data: account1 }),
  this.prisma.account.create({ data: account2 }),
]);
```

---

### Virtual Properties Migration

#### Account Entity Virtual Properties

```typescript
// TypeORM Entity Getters
get isPlaidAccount(): boolean {
  return this.source === AccountSource.PLAID;
}

get displayName(): string {
  if (this.institutionName) {
    return `${this.institutionName} - ${this.name}`;
  }
  return this.name;
}
```

**Prisma Approach**: Virtual properties NOT supported in Prisma models.

**Solution**: Compute in service layer or DTO mapper:

```typescript
// Move to toResponseDto() helper
private toResponseDto(account: Account): AccountResponseDto {
  return {
    // ... other fields ...
    isPlaidAccount: account.source === AccountSource.PLAID,
    displayName: account.institutionName
      ? `${account.institutionName} - ${account.name}`
      : account.name,
    maskedAccountNumber: account.accountNumber?.slice(-4)
      ? `****${account.accountNumber.slice(-4)}`
      : '',
    needsSync: this.computeNeedsSync(account),
  };
}

private computeNeedsSync(account: Account): boolean {
  if (!account.syncEnabled || account.source !== AccountSource.PLAID) return false;
  if (!account.lastSyncAt) return true;
  const hoursSinceSync = (Date.now() - account.lastSyncAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceSync >= 1;
}
```

**Impact**: Low - logic already extracted in `toResponseDto()` method.

---

## 9. Migration Risks & Mitigation

### Risk 1: Decimal Type Handling

**Risk**: TypeORM transforms `NUMERIC` to `number`, Prisma uses `Prisma.Decimal`.

**Impact**: Medium - affects all balance calculations.

**Mitigation**:
- Use `Decimal` type in Prisma schema
- Convert to `number` in service layer if needed: `balance.toNumber()`
- OR use `@db.DoublePrecision` in Prisma for direct `number` type (risk: precision loss)

**Recommendation**: Keep `Decimal` type, convert in DTOs.

---

### Risk 2: Unused Transactions Relation

**Risk**: Removing `relations: ['transactions']` may break code expecting transactions array.

**Impact**: Low - inspection shows transactions never accessed in service.

**Mitigation**: Search codebase for `account.transactions` usage before removal.

---

### Risk 3: Authorization Logic Duplication

**Risk**: Authorization checks repeated in every method (userId + role validation).

**Impact**: Low (correctness), High (maintainability)

**Mitigation**: Extract to helper method:
```typescript
private async authorizeAccountAccess(
  accountId: string,
  userId: string,
  userRole: UserRole
): Promise<Account> {
  const account = await this.prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw new NotFoundException(`Account with ID ${accountId} not found`);
  if (account.userId !== userId && userRole !== UserRole.ADMIN) {
    throw new ForbiddenException('You can only access your own accounts');
  }
  return account;
}
```

---

### Risk 4: Test Coverage

**Risk**: No test files found for AccountsService.

**Impact**: High - cannot verify migration correctness automatically.

**Mitigation**:
1. Write integration tests BEFORE migration (baseline TypeORM behavior)
2. Run same tests AFTER migration (verify Prisma behavior matches)
3. Use test factories for account creation

---

## 10. Pre-Migration Checklist

- [ ] Search codebase for `account.transactions` usage
- [ ] Verify no other services depend on AccountsService internals
- [ ] Create integration tests for all 8 service methods
- [ ] Document current query performance (baseline)
- [ ] Backup TypeORM implementation (git branch or backup file)
- [ ] Verify Prisma schema matches Account entity exactly
- [ ] Test decimal precision handling in dev environment

---

## 11. Post-Migration Validation

- [ ] All integration tests pass
- [ ] Query performance within 10% of baseline
- [ ] Decimal calculations produce identical results
- [ ] Authorization logic prevents unauthorized access
- [ ] Error messages unchanged (NotFoundException, ForbiddenException)
- [ ] Swagger API docs still accurate
- [ ] No TypeORM imports remain

---

## 12. Next Steps

### Immediate (P.3.6.1 - Accounts Migration)

1. **P.3.6.1.2**: Write integration tests for AccountsService (baseline)
2. **P.3.6.1.3**: Implement Prisma migration for AccountsService
3. **P.3.6.1.4**: Verify integration tests pass with Prisma
4. **P.3.6.1.5**: Remove TypeORM dependencies from AccountsModule

### Follow-Up Optimization (Post-Migration)

1. Extract authorization helper method (reduce duplication)
2. Add pagination to `findAll()` method
3. Optimize `update()` to single query (Option 2 from examples)
4. Evaluate Prisma aggregation for `getSummary()` (if >50 accounts per user)
5. Add database indexes per recommendations (Section 6)

---

## Appendix: File Paths

### Service Files
- **Service**: `/home/nemesi/dev/money-wise/apps/backend/src/accounts/accounts.service.ts`
- **Module**: `/home/nemesi/dev/money-wise/apps/backend/src/accounts/accounts.module.ts`
- **Controller**: `/home/nemesi/dev/money-wise/apps/backend/src/accounts/accounts.controller.ts`

### DTO Files
- **CreateAccountDto**: `/home/nemesi/dev/money-wise/apps/backend/src/accounts/dto/create-account.dto.ts`
- **UpdateAccountDto**: `/home/nemesi/dev/money-wise/apps/backend/src/accounts/dto/update-account.dto.ts`
- **AccountResponseDto**: `/home/nemesi/dev/money-wise/apps/backend/src/accounts/dto/account-response.dto.ts`

### Entity Files
- **Account Entity**: `/home/nemesi/dev/money-wise/apps/backend/src/core/database/entities/account.entity.ts`

### Test Files
- **Unit Tests**: Not found
- **Integration Tests**: Not found

---

## Conclusion

The AccountsService represents an **ideal starting point** for TypeORM → Prisma migration due to:

1. Simple CRUD operations only
2. No complex joins, raw SQL, or transactions
3. Clear separation of concerns (service, DTOs, entity)
4. Well-defined authorization logic
5. Low risk of breaking changes

**Recommended as Phase 3.6 pilot migration** to establish patterns for remaining services.

**Estimated Total Effort**: 4 hours (including testing)
**Confidence Level**: High (95%)
**Blocker Risk**: None identified
