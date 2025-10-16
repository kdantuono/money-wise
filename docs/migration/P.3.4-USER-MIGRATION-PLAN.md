# P.3.4 User Entity Migration Plan: TypeORM → Prisma

**Phase**: 3.4 - User Service Layer Migration
**Epic**: Database Layer Modernization
**Status**: Pre-Migration Preparation
**Created**: 2025-10-12
**Author**: Architecture Team

---

## Table of Contents

1. [Section A: PrismaUserService API Analysis](#section-a-prismauserservice-api-analysis)
2. [Section B: TypeORM → Prisma Migration Patterns](#section-b-typeorm--prisma-migration-patterns)
3. [Section C: Virtual Property Handling](#section-c-virtual-property-handling)
4. [Section D: Migration State Tracking](#section-d-migration-state-tracking)
5. [Section E: Rollback Strategy](#section-e-rollback-strategy)
6. [Section F: Risk Assessment](#section-f-risk-assessment)

---

## Section A: PrismaUserService API Analysis

### Complete Method Inventory

The `PrismaUserService` located at `apps/backend/src/core/database/prisma/services/user.service.ts` provides a comprehensive API surface for User entity operations:

#### 1. CRUD Operations

| Method | Signature | Purpose | Returns |
|--------|-----------|---------|---------|
| `create` | `create(dto: CreateUserDto): Promise<User>` | Create new user with password hashing | User entity |
| `findOne` | `findOne(id: string): Promise<User \| null>` | Find by ID (no relations) | User or null |
| `findByEmail` | `findByEmail(email: string): Promise<User \| null>` | Find by email (case-insensitive) | User or null |
| `findOneWithRelations` | `findOneWithRelations(id: string, relations: RelationOptions): Promise<UserWithRelations \| null>` | Find with optional relations | User with relations or null |
| `findAll` | `findAll(options?: FindAllOptions): Promise<User[]>` | Find all with pagination/filtering | User array |
| `update` | `update(id: string, dto: UpdateUserDto): Promise<User>` | Update user fields | Updated user |
| `delete` | `delete(id: string): Promise<void>` | Hard delete with cascades | void |
| `exists` | `exists(id: string): Promise<boolean>` | Check existence by ID | boolean |

#### 2. Authentication-Specific Methods

| Method | Signature | Purpose | Security Notes |
|--------|-----------|---------|----------------|
| `verifyPassword` | `verifyPassword(userId: string, password: string): Promise<boolean>` | Verify plain password against hash | Uses bcrypt.compare (constant-time) |
| `updatePassword` | `updatePassword(userId: string, newPassword: string): Promise<void>` | Update password with validation | Validates 8-char minimum, auto-hashes |
| `updateLastLogin` | `updateLastLogin(userId: string): Promise<void>` | Update lastLoginAt timestamp | Silent operation |
| `verifyEmail` | `verifyEmail(userId: string): Promise<void>` | Mark email as verified | Sets emailVerifiedAt to now |

#### 3. Family Relationship Methods

| Method | Signature | Purpose |
|--------|-----------|---------|
| `findByFamily` | `findByFamily(familyId: string, options?: {role?: UserRole; status?: UserStatus}): Promise<User[]>` | Find all users in family with filters |

#### 4. Relation Loading Capabilities

**RelationOptions Interface**:
```typescript
interface RelationOptions {
  family?: boolean;           // Load user's Family
  accounts?: boolean;         // Load user's Accounts
  userAchievements?: boolean; // Load user's UserAchievements
}
```

**Usage Example**:
```typescript
const userWithFamily = await prismaUserService.findOneWithRelations(
  userId,
  { family: true, accounts: true }
);
```

#### 5. FindAllOptions Support

**Pagination**:
- `skip`: Offset for pagination
- `take`: Page size

**Filtering**:
- `where.familyId`: Filter by family membership
- `where.role`: Filter by UserRole (ADMIN, MEMBER, VIEWER)
- `where.status`: Filter by UserStatus (ACTIVE, INACTIVE, SUSPENDED)

**Ordering**:
- `orderBy.createdAt`: 'asc' | 'desc'
- `orderBy.email`: 'asc' | 'desc'

### Key Architectural Differences from TypeORM

#### Password Hashing

**PrismaUserService (Bcrypt)**:
```typescript
// Uses bcrypt with salt rounds 10
const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
```

**TypeORM Services (Argon2 + Bcrypt)**:
```typescript
// Auth services use Argon2 as default (PasswordSecurityService)
const passwordHash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 2 ** 16,
  timeCost: 3,
  parallelism: 1,
});
```

**⚠️ CRITICAL COMPATIBILITY ISSUE**:
- PrismaUserService: Bcrypt (salt rounds 10)
- Auth services: Argon2 (default) + Bcrypt (legacy support)
- Migration must preserve existing password hashes
- `verifyPassword` in PrismaUserService auto-detects algorithm

#### Email Case Handling

**Both implementations**: Auto-lowercase and trim email addresses
```typescript
const normalizedEmail = email.trim().toLowerCase();
```

#### Error Handling

**PrismaUserService**:
- BadRequestException: Invalid input (UUID, immutable fields)
- ConflictException: Unique constraint (P2002)
- NotFoundException: Entity not found (P2025)

**TypeORM Services**:
- Same exception types
- Manual error mapping from database errors

### Gaps and Missing Functionality

#### 1. Advanced Query Methods (Present in TypeORM, Missing in Prisma)

**Missing from PrismaUserService**:

1. **Query Builder Patterns**:
   ```typescript
   // TypeORM (email-verification.service.ts:324-329)
   const recentVerifications = await this.userRepository
     .createQueryBuilder('user')
     .where('user.emailVerifiedAt > :since', {
       since: new Date(Date.now() - 24 * 60 * 60 * 1000)
     })
     .getCount();
   ```

   **Prisma Equivalent** (needs to be added):
   ```typescript
   const recentVerifications = await this.prisma.user.count({
     where: {
       emailVerifiedAt: {
         gt: new Date(Date.now() - 24 * 60 * 60 * 1000)
       }
     }
   });
   ```

2. **Flexible Where Conditions**:
   ```typescript
   // TypeORM (account-lockout.service.ts:280)
   const isEmail = identifier.includes('@');
   const whereCondition = isEmail ? { email: identifier } : { id: identifier };

   const user = await this.userRepository.findOne({
     where: whereCondition,
   });
   ```

   **Gap**: PrismaUserService has separate `findOne(id)` and `findByEmail(email)` but no unified lookup method.

   **Solution**: Add helper method:
   ```typescript
   async findByIdentifier(identifier: string): Promise<User | null> {
     const isEmail = identifier.includes('@');
     return isEmail
       ? this.findByEmail(identifier)
       : this.findOne(identifier);
   }
   ```

3. **Partial Field Selection**:
   ```typescript
   // TypeORM (auth.service.ts:146)
   const user = await this.userRepository.findOne({
     where: { email },
     select: ['id', 'email', 'firstName', 'lastName', 'passwordHash', 'role', 'status', 'updatedAt'],
   });
   ```

   **Gap**: PrismaUserService always returns full User entity.

   **Impact**: Minor performance difference, not blocking for migration.

4. **Update by Where Clause**:
   ```typescript
   // TypeORM (auth.service.ts:222-224)
   await this.userRepository.update(user.id, {
     lastLoginAt: new Date(),
   });
   ```

   **Prisma Equivalent** (already exists):
   ```typescript
   await this.prisma.user.update({
     where: { id: userId },
     data: { lastLoginAt: new Date() }
   });
   ```

   **Status**: ✅ Already supported via `update()` method.

#### 2. Statistical/Aggregation Methods

**Missing from PrismaUserService** (used by users.service.ts:112-121):

```typescript
async getStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  suspended: number
}> {
  const [total, active, inactive, suspended] = await Promise.all([
    this.userRepository.count(),
    this.userRepository.count({ where: { status: UserStatus.ACTIVE } }),
    this.userRepository.count({ where: { status: UserStatus.INACTIVE } }),
    this.userRepository.count({ where: { status: UserStatus.SUSPENDED } }),
  ]);
  return { total, active, inactive, suspended };
}
```

**Solution**: Add to PrismaUserService:
```typescript
async countByStatus(): Promise<Record<UserStatus, number>> {
  const [active, inactive, suspended] = await Promise.all([
    this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
    this.prisma.user.count({ where: { status: UserStatus.INACTIVE } }),
    this.prisma.user.count({ where: { status: UserStatus.SUSPENDED } }),
  ]);

  return {
    [UserStatus.ACTIVE]: active,
    [UserStatus.INACTIVE]: inactive,
    [UserStatus.SUSPENDED]: suspended,
  };
}

async count(where?: { familyId?: string; role?: UserRole; status?: UserStatus }): Promise<number> {
  return this.prisma.user.count({ where });
}
```

#### 3. Pagination Metadata

**TypeORM** (users.service.ts:15-33):
```typescript
const [users, total] = await this.userRepository.findAndCount({
  skip,
  take: limit,
  order: { createdAt: 'DESC' },
});

return {
  users: users.map(user => this.toResponseDto(user)),
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
};
```

**Gap**: PrismaUserService `findAll` returns only users, no total count.

**Solution**: Add method:
```typescript
async findAllWithCount(options?: FindAllOptions): Promise<{
  users: User[];
  total: number;
}> {
  const [users, total] = await Promise.all([
    this.findAll(options),
    this.prisma.user.count({ where: options?.where }),
  ]);

  return { users, total };
}
```

### Recommended Additions to PrismaUserService

Before migration, add these methods to PrismaUserService:

1. ✅ **Priority 1 (Blocking)**:
   - `findByIdentifier(identifier: string)` - Used by account-lockout.service
   - `countByStatus()` - Used by users.service
   - `count(where?)` - General statistics
   - `findAllWithCount(options?)` - Pagination with totals

2. ⚠️ **Priority 2 (Non-blocking, can adapt)**:
   - Date range queries (for email verification stats)
   - Batch operations (if needed)

3. ℹ️ **Priority 3 (Nice-to-have)**:
   - Partial field selection (optimize performance)
   - Transaction support (if multi-step operations needed)

---

## Section B: TypeORM → Prisma Migration Patterns

### 1. Repository Injection Replacement

**Pattern**: Replace TypeORM repository injection with PrismaUserService

#### Before (TypeORM)
```typescript
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../core/database/entities/user.entity';

@Injectable()
export class SomeService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}
}
```

#### After (Prisma)
```typescript
import { PrismaUserService } from '../../core/database/prisma/services/user.service';

@Injectable()
export class SomeService {
  constructor(
    private readonly prismaUserService: PrismaUserService,
  ) {}
}
```

**Notes**:
- Remove `@InjectRepository` decorator
- Remove TypeORM imports
- Change property name from `userRepository` to `prismaUserService`
- Add `readonly` modifier (best practice)

---

### 2. Query Pattern Mappings

#### Pattern 2.1: Find By ID

**TypeORM**:
```typescript
const user = await this.userRepository.findOne({
  where: { id },
});
```

**Prisma**:
```typescript
const user = await this.prismaUserService.findOne(id);
```

**Notes**:
- Prisma service validates UUID format
- Returns `null` if not found (same behavior)
- No `where` clause needed

---

#### Pattern 2.2: Find By Email

**TypeORM**:
```typescript
const user = await this.userRepository.findOne({
  where: { email },
});
```

**Prisma**:
```typescript
const user = await this.prismaUserService.findByEmail(email);
```

**Notes**:
- Auto-lowercases and trims email
- Case-insensitive search (same behavior)

---

#### Pattern 2.3: Find By Identifier (Email or ID)

**TypeORM**:
```typescript
const isEmail = identifier.includes('@');
const whereCondition = isEmail ? { email: identifier } : { id: identifier };

const user = await this.userRepository.findOne({
  where: whereCondition,
});
```

**Prisma** (requires new helper method):
```typescript
// Add to PrismaUserService first:
async findByIdentifier(identifier: string): Promise<User | null> {
  const isEmail = identifier.includes('@');
  return isEmail
    ? this.findByEmail(identifier)
    : this.findOne(identifier);
}

// Then use in services:
const user = await this.prismaUserService.findByIdentifier(identifier);
```

---

#### Pattern 2.4: Find With Relations

**TypeORM**:
```typescript
const user = await this.userRepository.findOne({
  where: { id },
  relations: ['accounts'],
});
```

**Prisma**:
```typescript
const user = await this.prismaUserService.findOneWithRelations(
  id,
  { accounts: true }
);
```

**Notes**:
- Prisma uses explicit relation options
- Available relations: `family`, `accounts`, `userAchievements`

---

#### Pattern 2.5: Find With Partial Field Selection

**TypeORM**:
```typescript
const user = await this.userRepository.findOne({
  where: { id },
  select: ['id', 'email', 'passwordHash', 'status'],
});
```

**Prisma** (direct Prisma client usage - not in service yet):
```typescript
// Option 1: Use service method (returns full entity)
const user = await this.prismaUserService.findOne(id);

// Option 2: Add specialized method to PrismaUserService
async findForAuthentication(id: string): Promise<Pick<User, 'id' | 'email' | 'passwordHash' | 'status'> | null> {
  return this.prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, passwordHash: true, status: true },
  });
}
```

**Migration Strategy**:
- For auth.service.ts migration, consider adding specialized methods to PrismaUserService
- Performance impact of full entity load is minimal for single-user queries
- Can optimize later if needed

---

#### Pattern 2.6: Create User

**TypeORM**:
```typescript
const user = this.userRepository.create({
  email,
  firstName,
  lastName,
  passwordHash,
  status: UserStatus.ACTIVE,
});

const savedUser = await this.userRepository.save(user);
```

**Prisma**:
```typescript
const user = await this.prismaUserService.create({
  email,
  password, // Plain text - service handles hashing
  firstName,
  lastName,
  familyId, // REQUIRED in Prisma
  status: UserStatus.ACTIVE,
});
```

**⚠️ CRITICAL DIFFERENCES**:
1. **familyId is REQUIRED** in Prisma (business rule)
2. **password (plain text)** in DTO, not `passwordHash`
3. **Automatic hashing** by service (bcrypt with salt rounds 10)
4. **No separate save step** - create returns saved entity

**Migration Handling for Registration**:
```typescript
// TypeORM (auth.service.ts:89-97)
const user = this.userRepository.create({
  email,
  firstName,
  lastName,
  passwordHash, // Already hashed by PasswordSecurityService
  status: UserStatus.ACTIVE,
});

// Prisma requires plain password - CONFLICT!
// Solution: Add createWithHash method to PrismaUserService

async createWithHash(dto: {
  email: string;
  passwordHash: string; // Pre-hashed
  firstName?: string;
  lastName?: string;
  familyId: string;
  role?: UserRole;
  status?: UserStatus;
}): Promise<User> {
  // Validate but skip hashing (already done)
  const email = dto.email.trim().toLowerCase();

  const user = await this.prisma.user.create({
    data: {
      email,
      passwordHash: dto.passwordHash, // Use provided hash
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      familyId: dto.familyId,
      role: dto.role ?? UserRole.MEMBER,
      status: dto.status ?? UserStatus.ACTIVE,
    },
  });

  return user;
}
```

---

#### Pattern 2.7: Update User

**TypeORM** (partial updates):
```typescript
await this.userRepository.update(userId, {
  lastLoginAt: new Date(),
});
```

**Prisma**:
```typescript
// PrismaUserService already has this capability
await this.prismaUserService.update(userId, {
  lastLoginAt: new Date(),
});
```

**TypeORM** (full object updates):
```typescript
Object.assign(user, updateDto);
const updatedUser = await this.userRepository.save(user);
```

**Prisma**:
```typescript
const updatedUser = await this.prismaUserService.update(userId, updateDto);
```

**Notes**:
- Prisma `update` is more explicit (requires ID + data)
- TypeORM `save` can upsert, Prisma `update` only updates existing
- Both throw NotFoundException (P2025) if user doesn't exist

---

#### Pattern 2.8: Update Email Verification

**TypeORM**:
```typescript
await this.userRepository.update(userId, {
  emailVerifiedAt: new Date(),
  status: UserStatus.ACTIVE,
});
```

**Prisma** (dedicated method):
```typescript
await this.prismaUserService.verifyEmail(userId);
// Automatically sets emailVerifiedAt to now
```

**Or** (if need to update status too):
```typescript
await this.prismaUserService.update(userId, {
  emailVerifiedAt: new Date(),
  status: UserStatus.ACTIVE,
});
```

---

#### Pattern 2.9: Count Operations

**TypeORM**:
```typescript
const total = await this.userRepository.count();
const activeUsers = await this.userRepository.count({
  where: { status: UserStatus.ACTIVE }
});
```

**Prisma** (needs to be added):
```typescript
// Add to PrismaUserService:
async count(where?: {
  familyId?: string;
  role?: UserRole;
  status?: UserStatus
}): Promise<number> {
  return this.prisma.user.count({ where });
}

// Usage:
const total = await this.prismaUserService.count();
const activeUsers = await this.prismaUserService.count({
  where: { status: UserStatus.ACTIVE }
});
```

---

#### Pattern 2.10: Pagination with Total Count

**TypeORM**:
```typescript
const [users, total] = await this.userRepository.findAndCount({
  skip,
  take: limit,
  order: { createdAt: 'DESC' },
});
```

**Prisma** (needs to be added):
```typescript
// Add to PrismaUserService:
async findAllWithCount(options?: FindAllOptions): Promise<{
  users: User[];
  total: number;
}> {
  const [users, total] = await Promise.all([
    this.findAll(options),
    this.count({ ...options?.where }),
  ]);

  return { users, total };
}

// Usage:
const { users, total } = await this.prismaUserService.findAllWithCount({
  skip,
  take: limit,
  orderBy: { createdAt: 'desc' },
});
```

---

#### Pattern 2.11: Password Verification

**TypeORM** (via PasswordSecurityService):
```typescript
const isPasswordValid = await this.passwordSecurityService.verifyPassword(
  password,
  user.passwordHash
);
```

**Prisma** (via PrismaUserService):
```typescript
const isPasswordValid = await this.prismaUserService.verifyPassword(
  userId,
  password
);
```

**⚠️ KEY DIFFERENCE**:
- TypeORM: Requires passwordHash from user object
- Prisma: Only requires userId (service fetches hash internally)

**Migration Implications**:
- More secure (hash never leaves service)
- Requires userId instead of hash
- Auto-detects bcrypt vs argon2

---

#### Pattern 2.12: Password Update

**TypeORM** (via PasswordSecurityService + Repository):
```typescript
// 1. Hash password
const newPasswordHash = await this.passwordSecurityService.hashPassword(
  newPassword,
  HashingAlgorithm.ARGON2
);

// 2. Update user
await this.userRepository.update(userId, {
  passwordHash: newPasswordHash,
  updatedAt: new Date(),
});
```

**Prisma** (single service call):
```typescript
await this.prismaUserService.updatePassword(userId, newPassword);
```

**Notes**:
- Prisma combines validation + hashing + update
- Validates 8-char minimum
- Uses bcrypt (not argon2) - compatibility consideration

---

### 3. Transaction Handling

**TypeORM**:
```typescript
await this.userRepository.manager.transaction(async (transactionalEntityManager) => {
  await transactionalEntityManager.save(User, user);
  await transactionalEntityManager.save(PasswordHistory, historyRecord);
});
```

**Prisma** (requires direct PrismaService usage):
```typescript
// In service that needs transactions:
constructor(
  private readonly prismaUserService: PrismaUserService,
  private readonly prisma: PrismaService, // Add for transactions
) {}

// Use transaction:
await this.prisma.$transaction(async (tx) => {
  await tx.user.update({ where: { id: userId }, data: { ... } });
  await tx.passwordHistory.create({ data: { ... } });
});
```

**Notes**:
- PrismaUserService methods don't support transactions directly
- For multi-table operations, use PrismaService directly
- Most single-user operations don't need transactions

---

## Section C: Virtual Property Handling

### TypeORM Virtual Properties Analysis

The TypeORM User entity (`apps/backend/src/core/database/entities/user.entity.ts`) defines **3 virtual properties** using ES6 getters:

```typescript
// Virtual properties (lines 112-124)
get fullName(): string {
  return `${this.firstName} ${this.lastName}`;
}

get isEmailVerified(): boolean {
  return this.emailVerifiedAt !== null;
}

get isActive(): boolean {
  return this.status === UserStatus.ACTIVE;
}
```

### Virtual Properties in Prisma Context

**Key Problem**: Prisma schema doesn't support virtual properties like TypeORM getters.

**Solution**: Compute virtual properties at **service layer** or **DTO layer**.

---

### Strategy 1: Service-Layer Computation (Recommended)

Create a **UserWithVirtuals** type and helper function:

```typescript
// In PrismaUserService or shared types file
export interface UserWithVirtuals extends User {
  fullName: string;
  isEmailVerified: boolean;
  isActive: boolean;
}

export function enrichUserWithVirtuals(user: User): UserWithVirtuals {
  return {
    ...user,
    fullName: `${user.firstName} ${user.lastName}`,
    isEmailVerified: user.emailVerifiedAt !== null,
    isActive: user.status === UserStatus.ACTIVE,
  };
}
```

**Usage in Response DTOs**:
```typescript
// In users.service.ts
private toResponseDto(user: User): UserResponseDto {
  const enriched = enrichUserWithVirtuals(user);

  return {
    id: enriched.id,
    email: enriched.email,
    firstName: enriched.firstName,
    lastName: enriched.lastName,
    fullName: enriched.fullName, // Virtual property
    role: enriched.role,
    status: enriched.status,
    isEmailVerified: enriched.isEmailVerified, // Virtual property
    isActive: enriched.isActive, // Virtual property
    // ... other fields
  };
}
```

**Usage in auth.service.ts** (generateAuthResponse):
```typescript
private async generateAuthResponse(user: User): Promise<AuthResponseDto> {
  const enriched = enrichUserWithVirtuals(user);

  // Create user object with virtual properties
  const userWithoutPassword = {
    id: enriched.id,
    email: enriched.email,
    firstName: enriched.firstName,
    lastName: enriched.lastName,
    fullName: enriched.fullName, // Virtual
    isEmailVerified: enriched.isEmailVerified, // Virtual
    isActive: enriched.isActive, // Virtual
    // ... rest
  };

  return {
    accessToken,
    refreshToken,
    user: userWithoutPassword,
    expiresIn: 15 * 60,
  };
}
```

---

### Strategy 2: DTO Layer Computation (Alternative)

Compute virtuals only when constructing DTOs:

```typescript
export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;

  // Computed in constructor
  fullName: string;
  isEmailVerified: boolean;
  isActive: boolean;

  // ... other fields

  constructor(user: User) {
    this.id = user.id;
    this.email = user.email;
    this.firstName = user.firstName;
    this.lastName = user.lastName;

    // Virtual properties
    this.fullName = `${user.firstName} ${user.lastName}`;
    this.isEmailVerified = user.emailVerifiedAt !== null;
    this.isActive = user.status === UserStatus.ACTIVE;

    // ... assign other fields
  }
}
```

---

### Strategy 3: PrismaUserService Extension Methods

Add methods to PrismaUserService that return enriched users:

```typescript
// In PrismaUserService
async findOneEnriched(id: string): Promise<UserWithVirtuals | null> {
  const user = await this.findOne(id);
  return user ? enrichUserWithVirtuals(user) : null;
}

async findByEmailEnriched(email: string): Promise<UserWithVirtuals | null> {
  const user = await this.findByEmail(email);
  return user ? enrichUserWithVirtuals(user) : null;
}
```

**Trade-offs**:
- ✅ Centralized logic
- ❌ Doubles API surface
- ❌ Clients must choose between enriched/raw

---

### Recommended Approach

**Use Strategy 1** (Service-Layer Computation) with these guidelines:

1. **PrismaUserService**: Returns raw Prisma User entities (no virtuals)
2. **Helper Function**: `enrichUserWithVirtuals(user)` in shared utilities
3. **Service Layer**: Consumer services apply enrichment when needed
4. **DTO Layer**: Response DTOs use enriched virtuals

**Why This Approach?**:
- ✅ Separation of concerns (database vs business logic)
- ✅ Prisma service stays focused on CRUD
- ✅ Consumers decide when to compute virtuals
- ✅ Easy to test (pure function)
- ✅ Type-safe with TypeScript

**Implementation File**: `apps/backend/src/core/database/prisma/utils/user-virtuals.ts`

```typescript
import { User, UserStatus } from '../../../../generated/prisma';

export interface UserWithVirtuals extends User {
  fullName: string;
  isEmailVerified: boolean;
  isActive: boolean;
}

export function enrichUserWithVirtuals(user: User): UserWithVirtuals {
  return {
    ...user,
    fullName: `${user.firstName} ${user.lastName}`,
    isEmailVerified: user.emailVerifiedAt !== null,
    isActive: user.status === UserStatus.ACTIVE,
  };
}

export function enrichUsersWithVirtuals(users: User[]): UserWithVirtuals[] {
  return users.map(enrichUserWithVirtuals);
}
```

---

## Section D: Migration State Tracking

### Migration Progress JSON Structure

**File Location**: `docs/migration/.migration-state.json`

```json
{
  "phase": "P.3.4",
  "entity": "User",
  "startedAt": "2025-10-12T14:30:00.000Z",
  "completedAt": null,
  "status": "in_progress",
  "prismaService": {
    "file": "apps/backend/src/core/database/prisma/services/user.service.ts",
    "status": "completed",
    "createdAt": "2025-10-08T12:00:00.000Z",
    "testCoverage": {
      "statements": 100,
      "branches": 100,
      "functions": 100,
      "lines": 100
    }
  },
  "services": [
    {
      "id": "P.3.4.1",
      "file": "apps/backend/src/users/users.service.ts",
      "description": "Pure CRUD operations - lowest risk",
      "priority": 1,
      "status": "pending",
      "dependencies": [],
      "typeormInjections": [
        "@InjectRepository(User) private userRepository: Repository<User>"
      ],
      "methodsMigrated": [],
      "estimatedComplexity": "low",
      "tests": {
        "before": 0,
        "after": null,
        "new": null
      },
      "migration": {
        "startedAt": null,
        "completedAt": null,
        "commitHash": null,
        "branch": "feature/p.3.4.1-users-service-migration"
      }
    },
    {
      "id": "P.3.4.2",
      "file": "apps/backend/src/auth/services/password-security.service.ts",
      "description": "Password hashing/validation - medium risk",
      "priority": 2,
      "status": "pending",
      "dependencies": ["P.3.4.1"],
      "typeormInjections": [
        "@InjectRepository(User) private userRepository: Repository<User>",
        "@InjectRepository(PasswordHistory) private passwordHistoryRepository: Repository<PasswordHistory>",
        "@InjectRepository(AuditLog) private auditLogRepository: Repository<AuditLog>"
      ],
      "methodsMigrated": [],
      "estimatedComplexity": "medium",
      "notes": [
        "Uses Argon2 hashing - PrismaUserService uses bcrypt",
        "Must handle password hash compatibility",
        "PasswordHistory and AuditLog stay TypeORM (out of scope)"
      ],
      "tests": {
        "before": 0,
        "after": null,
        "new": null
      },
      "migration": {
        "startedAt": null,
        "completedAt": null,
        "commitHash": null,
        "branch": "feature/p.3.4.2-password-security-migration"
      }
    },
    {
      "id": "P.3.4.3",
      "file": "apps/backend/src/auth/auth-security.service.ts",
      "description": "Security checks - if exists",
      "priority": 3,
      "status": "pending",
      "dependencies": ["P.3.4.2"],
      "typeormInjections": [],
      "methodsMigrated": [],
      "estimatedComplexity": "low",
      "tests": {
        "before": 0,
        "after": null,
        "new": null
      },
      "migration": {
        "startedAt": null,
        "completedAt": null,
        "commitHash": null,
        "branch": "feature/p.3.4.3-auth-security-migration"
      }
    },
    {
      "id": "P.3.4.4",
      "file": "apps/backend/src/auth/services/account-lockout.service.ts",
      "description": "Account lockout logic - Redis + User status updates",
      "priority": 4,
      "status": "pending",
      "dependencies": ["P.3.4.3"],
      "typeormInjections": [
        "@InjectRepository(User) private userRepository: Repository<User>"
      ],
      "methodsMigrated": [],
      "estimatedComplexity": "medium",
      "notes": [
        "Uses findByIdentifier pattern (email or ID)",
        "Updates user status (SUSPENDED)",
        "Must add findByIdentifier to PrismaUserService"
      ],
      "tests": {
        "before": 0,
        "after": null,
        "new": null
      },
      "migration": {
        "startedAt": null,
        "completedAt": null,
        "commitHash": null,
        "branch": "feature/p.3.4.4-account-lockout-migration"
      }
    },
    {
      "id": "P.3.4.5",
      "file": "apps/backend/src/auth/services/email-verification.service.ts",
      "description": "Email verification flow - Redis + User updates",
      "priority": 5,
      "status": "pending",
      "dependencies": ["P.3.4.4"],
      "typeormInjections": [
        "@InjectRepository(User) private userRepository: Repository<User>"
      ],
      "methodsMigrated": [],
      "estimatedComplexity": "medium",
      "notes": [
        "Updates emailVerifiedAt timestamp",
        "Uses query builder for stats (needs count method)",
        "Must add count with date filters to PrismaUserService"
      ],
      "tests": {
        "before": 0,
        "after": null,
        "new": null
      },
      "migration": {
        "startedAt": null,
        "completedAt": null,
        "commitHash": null,
        "branch": "feature/p.3.4.5-email-verification-migration"
      }
    },
    {
      "id": "P.3.4.6",
      "file": "apps/backend/src/auth/services/password-reset.service.ts",
      "description": "Password reset flow - if exists",
      "priority": 6,
      "status": "pending",
      "dependencies": ["P.3.4.5"],
      "typeormInjections": [],
      "methodsMigrated": [],
      "estimatedComplexity": "medium",
      "tests": {
        "before": 0,
        "after": null,
        "new": null
      },
      "migration": {
        "startedAt": null,
        "completedAt": null,
        "commitHash": null,
        "branch": "feature/p.3.4.6-password-reset-migration"
      }
    },
    {
      "id": "P.3.4.7",
      "file": "apps/backend/src/auth/services/two-factor-auth.service.ts",
      "description": "2FA logic - if exists",
      "priority": 7,
      "status": "pending",
      "dependencies": ["P.3.4.6"],
      "typeormInjections": [],
      "methodsMigrated": [],
      "estimatedComplexity": "medium",
      "tests": {
        "before": 0,
        "after": null,
        "new": null
      },
      "migration": {
        "startedAt": null,
        "completedAt": null,
        "commitHash": null,
        "branch": "feature/p.3.4.7-two-factor-auth-migration"
      }
    },
    {
      "id": "P.3.4.8",
      "file": "apps/backend/src/auth/auth.service.ts",
      "description": "Core auth service - HIGHEST RISK",
      "priority": 8,
      "status": "pending",
      "dependencies": [
        "P.3.4.1",
        "P.3.4.2",
        "P.3.4.3",
        "P.3.4.4",
        "P.3.4.5",
        "P.3.4.6",
        "P.3.4.7"
      ],
      "typeormInjections": [
        "@InjectRepository(User) private userRepository: Repository<User>",
        "@InjectRepository(AuditLog) private auditLogRepository: Repository<AuditLog>"
      ],
      "methodsMigrated": [],
      "estimatedComplexity": "high",
      "notes": [
        "CRITICAL PATH - affects all authentication",
        "Uses virtual properties (fullName, isEmailVerified, isActive)",
        "Complex password verification with PasswordSecurityService",
        "Must migrate LAST after all dependencies",
        "Requires extensive testing (unit + integration + E2E)",
        "Consider feature flag for gradual rollout"
      ],
      "tests": {
        "before": 0,
        "after": null,
        "new": null
      },
      "migration": {
        "startedAt": null,
        "completedAt": null,
        "commitHash": null,
        "branch": "feature/p.3.4.8-auth-service-migration"
      }
    }
  ],
  "prerequisites": [
    {
      "id": "PREREQ-1",
      "description": "Add findByIdentifier method to PrismaUserService",
      "status": "pending",
      "priority": "critical"
    },
    {
      "id": "PREREQ-2",
      "description": "Add count and countByStatus methods to PrismaUserService",
      "status": "pending",
      "priority": "critical"
    },
    {
      "id": "PREREQ-3",
      "description": "Add findAllWithCount method to PrismaUserService",
      "status": "pending",
      "priority": "critical"
    },
    {
      "id": "PREREQ-4",
      "description": "Add createWithHash method to PrismaUserService (for auth.service)",
      "status": "pending",
      "priority": "critical"
    },
    {
      "id": "PREREQ-5",
      "description": "Create enrichUserWithVirtuals utility function",
      "status": "pending",
      "priority": "high"
    }
  ],
  "risks": [
    {
      "id": "RISK-1",
      "severity": "high",
      "description": "Password hash algorithm mismatch (Argon2 vs Bcrypt)",
      "mitigation": "PrismaUserService.verifyPassword auto-detects algorithm",
      "status": "mitigated"
    },
    {
      "id": "RISK-2",
      "severity": "critical",
      "description": "auth.service.ts is critical path - failure blocks all authentication",
      "mitigation": "Migrate last, extensive testing, feature flag rollout",
      "status": "open"
    },
    {
      "id": "RISK-3",
      "severity": "medium",
      "description": "Virtual properties no longer computed automatically",
      "mitigation": "Use enrichUserWithVirtuals helper in DTOs",
      "status": "planned"
    },
    {
      "id": "RISK-4",
      "severity": "medium",
      "description": "familyId is required in Prisma but may be null in TypeORM during registration",
      "mitigation": "Use createWithHash for auth registration flow",
      "status": "planned"
    }
  ],
  "testingStrategy": {
    "unitTests": {
      "target": "100% coverage for migrated services",
      "framework": "Jest",
      "focus": [
        "Method signature compatibility",
        "Error handling parity",
        "Virtual property computation",
        "Password verification"
      ]
    },
    "integrationTests": {
      "target": "Cover all authentication flows",
      "framework": "Jest + Supertest",
      "focus": [
        "Registration flow",
        "Login flow",
        "Email verification flow",
        "Password reset flow",
        "Account lockout flow"
      ]
    },
    "e2eTests": {
      "target": "Full user journey",
      "framework": "Playwright",
      "focus": [
        "User registration",
        "Login with valid/invalid credentials",
        "Email verification",
        "Password change",
        "Account lockout scenarios"
      ]
    }
  }
}
```

### How to Update State

**After completing a service migration**:

1. Update service status to `"completed"`
2. Add `completedAt` timestamp
3. Add `commitHash` from git
4. Update test counts
5. Add `methodsMigrated` array with migrated method names

**Example**:
```json
{
  "id": "P.3.4.1",
  "status": "completed",
  "methodsMigrated": [
    "findAll",
    "findOne",
    "findByEmail",
    "update",
    "updateStatus",
    "remove",
    "getStats"
  ],
  "tests": {
    "before": 0,
    "after": 24,
    "new": 24
  },
  "migration": {
    "startedAt": "2025-10-12T15:00:00.000Z",
    "completedAt": "2025-10-12T16:30:00.000Z",
    "commitHash": "abc123def456",
    "branch": "feature/p.3.4.1-users-service-migration"
  }
}
```

---

## Section E: Rollback Strategy

### Atomic Commit Per Service Requirement

**Golden Rule**: Each service migration = **1 atomic commit** that can be reverted independently.

#### Commit Structure

```bash
# Commit message format:
feat(prisma): migrate [ServiceName] from TypeORM to Prisma (P.3.4.X)

- Replace @InjectRepository(User) with PrismaUserService
- Update method calls: findOne, findByEmail, update, etc.
- Add virtual property enrichment using enrichUserWithVirtuals
- Update tests: [X] unit tests added/updated
- BREAKING: None (drop-in replacement)
- Status: ✅ All tests passing (unit + integration)

Scope: P.3.4.X [ServiceName] migration
Dependencies: [list prerequisite tasks]
```

**Example**:
```bash
feat(prisma): migrate UsersService from TypeORM to Prisma (P.3.4.1)

- Replace @InjectRepository(User) with PrismaUserService
- Update method calls: findAll → findAllWithCount, findOne, findByEmail
- Add virtual property enrichment using enrichUserWithVirtuals
- Update tests: 24 unit tests added (100% coverage)
- BREAKING: None (drop-in replacement)
- Status: ✅ All tests passing (unit + integration)

Scope: P.3.4.1 UsersService migration
Dependencies: PREREQ-2 (countByStatus), PREREQ-3 (findAllWithCount), PREREQ-5 (virtuals)
```

---

### How to Revert a Migration

#### Scenario 1: Revert Single Service

If `P.3.4.5` (email-verification.service) fails in production:

```bash
# 1. Identify commit hash
git log --oneline --grep="P.3.4.5"
# Output: abc123d feat(prisma): migrate EmailVerificationService (P.3.4.5)

# 2. Revert specific commit
git revert abc123d

# 3. Commit revert
git commit -m "revert(prisma): rollback EmailVerificationService migration (P.3.4.5)

Reason: [describe production issue]
Impact: EmailVerificationService back to TypeORM User repository
Status: All services still functional (mixed TypeORM/Prisma state)
"

# 4. Push revert
git push origin feature/epic-1.5-completion
```

**Result**:
- ✅ email-verification.service uses TypeORM
- ✅ Other services (P.3.4.1-P.3.4.4) still use Prisma
- ✅ Application continues to function

---

#### Scenario 2: Revert All Migrations (Nuclear Option)

If critical failure requires full rollback:

```bash
# 1. Find all P.3.4.X commits
git log --oneline --grep="P.3.4"

# 2. Revert in reverse order (LIFO - Last In, First Out)
git revert abc123h  # P.3.4.8 (auth.service)
git revert abc123g  # P.3.4.7 (two-factor)
git revert abc123f  # P.3.4.6 (password-reset)
git revert abc123e  # P.3.4.5 (email-verification)
git revert abc123d  # P.3.4.4 (account-lockout)
git revert abc123c  # P.3.4.3 (auth-security)
git revert abc123b  # P.3.4.2 (password-security)
git revert abc123a  # P.3.4.1 (users.service)

# 3. Single commit for mass revert
git commit -m "revert(prisma): rollback entire P.3.4 User migration

Reason: [critical failure description]
Impact: All services back to TypeORM User repository
Status: PrismaUserService unused but preserved for future migration
"

# 4. Push
git push origin feature/epic-1.5-completion
```

---

### Mixed-State Acceptance Criteria

**Principle**: Services can exist in mixed TypeORM/Prisma state indefinitely.

#### Valid Mixed States

| State | TypeORM Services | Prisma Services | Status |
|-------|------------------|-----------------|--------|
| Initial | All (8 services) | None | ✅ Valid |
| Partial-1 | 7 services | P.3.4.1 (users.service) | ✅ Valid |
| Partial-4 | 4 services | P.3.4.1-P.3.4.4 (users, password-security, auth-security, account-lockout) | ✅ Valid |
| Complete | None | All (8 services) | ✅ Valid |

**Validation Rules**:
1. ✅ AuditLog can stay TypeORM while User is Prisma (different entities)
2. ✅ PasswordHistory can stay TypeORM while User is Prisma (different entities)
3. ✅ Services can use TypeORM for some entities, Prisma for others
4. ❌ Cannot have same service with BOTH TypeORM and Prisma for User (must choose one)

---

### AuditLog Handling

**Decision**: AuditLog stays TypeORM during P.3.4 User migration.

**Rationale**:
- AuditLog is a separate entity (not part of User migration scope)
- auth.service.ts uses AuditLog for logging (P.3.4.8)
- Migrating AuditLog is out of scope for P.3.4
- Will be migrated in separate phase (P.3.5 or later)

**Code Pattern**:
```typescript
// auth.service.ts after User migration
@Injectable()
export class AuthService {
  constructor(
    // User: Prisma
    private readonly prismaUserService: PrismaUserService,

    // AuditLog: TypeORM (stays)
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,

    // Other services...
    private jwtService: JwtService,
    private passwordSecurityService: PasswordSecurityService,
  ) {}

  // Use PrismaUserService for User operations
  const user = await this.prismaUserService.findByEmail(email);

  // Use TypeORM repository for AuditLog
  await this.auditLogRepository.save(auditLog);
}
```

**Status**: ✅ Valid mixed state (Prisma User + TypeORM AuditLog)

---

### Rollback Testing

**Before Migration Day**:
```bash
# 1. Test revert on feature branch
git checkout -b test/p.3.4-rollback

# 2. Complete migration
# ... migrate all services ...

# 3. Revert P.3.4.8 (auth.service)
git revert HEAD

# 4. Run tests
pnpm test

# 5. Verify auth still works
pnpm test:e2e

# 6. Clean up test branch
git checkout feature/epic-1.5-completion
git branch -D test/p.3.4-rollback
```

**Result**: Confirm rollback process works before production migration.

---

## Section F: Risk Assessment

### Critical Path Analysis

**Highest Risk Service**: `auth.service.ts` (P.3.4.8)

**Impact of Failure**:
- ❌ Complete authentication system outage
- ❌ Users cannot log in
- ❌ Registration broken
- ❌ Token generation failed
- ❌ Application unusable

**Dependencies**: ALL previous migrations (P.3.4.1 through P.3.4.7)

---

### Risk Matrix

| Service | Risk Level | Impact | Complexity | Dependencies | Mitigation |
|---------|-----------|--------|------------|--------------|------------|
| users.service.ts | 🟢 LOW | User CRUD only | Low | None | Start here |
| password-security.service.ts | 🟡 MEDIUM | Password operations | Medium | P.3.4.1 | Hash compatibility testing |
| auth-security.service.ts | 🟢 LOW | Security checks | Low | P.3.4.2 | May not exist |
| account-lockout.service.ts | 🟡 MEDIUM | Lockout logic | Medium | P.3.4.3 | Add findByIdentifier first |
| email-verification.service.ts | 🟡 MEDIUM | Verification flow | Medium | P.3.4.4 | Add count methods first |
| password-reset.service.ts | 🟡 MEDIUM | Reset flow | Medium | P.3.4.5 | May not exist |
| two-factor-auth.service.ts | 🟡 MEDIUM | 2FA logic | Medium | P.3.4.6 | May not exist |
| auth.service.ts | 🔴 HIGH | **ENTIRE AUTH SYSTEM** | High | P.3.4.1-7 | **MIGRATE LAST** |

---

### Security Validation Requirements

#### Password Hashing Compatibility

**Issue**: TypeORM services use **Argon2**, PrismaUserService uses **Bcrypt**.

**Test Case 1: Verify Existing Passwords**
```typescript
// Test: Users with Argon2 hashes can still log in after migration
it('should verify argon2 passwords after migration', async () => {
  // Setup: User with Argon2 hash (created before migration)
  const argon2Hash = await argon2.hash('SecurePass123', {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });

  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      passwordHash: argon2Hash, // Argon2 hash
      firstName: 'Test',
      lastName: 'User',
      familyId: testFamilyId,
    },
  });

  // Test: PrismaUserService.verifyPassword auto-detects Argon2
  const isValid = await prismaUserService.verifyPassword(
    user.id,
    'SecurePass123'
  );

  expect(isValid).toBe(true);
});
```

**Test Case 2: New Passwords Use Bcrypt**
```typescript
// Test: New passwords created via PrismaUserService use Bcrypt
it('should use bcrypt for new passwords', async () => {
  const user = await prismaUserService.create({
    email: 'new@example.com',
    password: 'SecurePass123',
    firstName: 'New',
    lastName: 'User',
    familyId: testFamilyId,
  });

  // Bcrypt hashes start with $2b$10$
  expect(user.passwordHash).toMatch(/^\$2b\$10\$/);
});
```

**Status**: ✅ RESOLVED - PrismaUserService `verifyPassword` auto-detects algorithm (lines 128-152)

---

#### JWT Token Generation

**Risk**: Token payload changes breaking existing sessions.

**Test Case**:
```typescript
// Test: JWT tokens contain same payload after migration
it('should generate JWT tokens with same payload', async () => {
  // Before migration (TypeORM)
  const typeormUser = await userRepository.findOne({ where: { email: 'test@example.com' } });
  const typeormPayload = {
    sub: typeormUser.id,
    email: typeormUser.email,
    role: typeormUser.role,
  };

  // After migration (Prisma)
  const prismaUser = await prismaUserService.findByEmail('test@example.com');
  const prismaPayload = {
    sub: prismaUser.id,
    email: prismaUser.email,
    role: prismaUser.role,
  };

  expect(prismaPayload).toEqual(typeormPayload);
});
```

---

#### Virtual Properties in Auth Response

**Risk**: Frontend expects `fullName`, `isEmailVerified`, `isActive` in auth response.

**Test Case**:
```typescript
// Test: Auth response includes virtual properties
it('should include virtual properties in auth response', async () => {
  const response = await authService.login({
    email: 'test@example.com',
    password: 'SecurePass123',
  });

  expect(response.user).toHaveProperty('fullName');
  expect(response.user).toHaveProperty('isEmailVerified');
  expect(response.user).toHaveProperty('isActive');

  // Validate computed values
  expect(response.user.fullName).toBe('Test User');
  expect(response.user.isEmailVerified).toBe(true);
  expect(response.user.isActive).toBe(true);
});
```

---

### Performance Considerations

#### Query Performance Comparison

**TypeORM**:
```typescript
// Partial field selection (optimized)
const user = await this.userRepository.findOne({
  where: { email },
  select: ['id', 'email', 'passwordHash', 'status'],
});
```

**Prisma**:
```typescript
// Full entity load (less optimized)
const user = await this.prismaUserService.findByEmail(email);
```

**Impact**:
- 🟡 Minor performance difference (negligible for single-user queries)
- ✅ Can optimize later with specialized methods if needed
- ✅ Database indexes more important than field selection

**Measurement**:
```typescript
// Performance test
it('should query user in under 50ms', async () => {
  const start = Date.now();
  await prismaUserService.findByEmail('test@example.com');
  const duration = Date.now() - start;

  expect(duration).toBeLessThan(50);
});
```

---

#### Virtual Property Computation Overhead

**Cost**: 3 simple computations per user:
```typescript
fullName: `${firstName} ${lastName}` // String concatenation
isEmailVerified: emailVerifiedAt !== null // Null check
isActive: status === UserStatus.ACTIVE // Enum comparison
```

**Impact**:
- ✅ Negligible (microseconds)
- ✅ Trade-off acceptable for clean architecture

---

### Testing Requirements Per Service

#### users.service.ts (P.3.4.1)

**Unit Tests**:
- ✅ findAll pagination
- ✅ findOne by ID
- ✅ update user fields
- ✅ updateStatus (admin only)
- ✅ remove user (cascade check)
- ✅ getStats (count by status)

**Integration Tests**:
- ✅ CRUD operations end-to-end
- ✅ Authorization checks
- ✅ Virtual properties in response

---

#### auth.service.ts (P.3.4.8)

**Unit Tests**:
- ✅ register with password hashing
- ✅ login with valid credentials
- ✅ login with invalid credentials
- ✅ login with expired password
- ✅ refreshToken validation
- ✅ JWT payload generation
- ✅ Virtual properties in auth response

**Integration Tests**:
- ✅ Registration flow (create user → hash password → generate tokens)
- ✅ Login flow (verify password → rate limit → update lastLogin → generate tokens)
- ✅ Refresh token flow
- ✅ Password expiry warning

**E2E Tests**:
- ✅ User registration via API
- ✅ Login via API
- ✅ Token refresh via API
- ✅ Rate limiting (5 failed attempts)
- ✅ Account lockout

---

### Migration Readiness Checklist

#### Prerequisites (Must Complete BEFORE Any Migration)

- [ ] **PREREQ-1**: Add `findByIdentifier(identifier)` to PrismaUserService
- [ ] **PREREQ-2**: Add `count(where?)` to PrismaUserService
- [ ] **PREREQ-3**: Add `countByStatus()` to PrismaUserService
- [ ] **PREREQ-4**: Add `findAllWithCount(options?)` to PrismaUserService
- [ ] **PREREQ-5**: Add `createWithHash(dto)` to PrismaUserService (for auth.service)
- [ ] **PREREQ-6**: Create `enrichUserWithVirtuals(user)` utility
- [ ] **PREREQ-7**: Create `enrichUsersWithVirtuals(users)` utility

#### Testing Infrastructure

- [ ] Unit test templates for each service
- [ ] Integration test environment (test database)
- [ ] E2E test scenarios for auth flows
- [ ] Performance benchmarks baseline

#### Documentation

- [ ] Migration patterns documented (TYPEORM-PRISMA-PATTERNS.md)
- [ ] State tracking file created (.migration-state.json)
- [ ] Rollback procedures documented (this document)

#### Team Readiness

- [ ] Team reviewed migration plan
- [ ] Rollback procedure tested
- [ ] On-call schedule during migration
- [ ] Monitoring alerts configured

---

### Success Criteria

**Per Service**:
- ✅ All unit tests passing (100% coverage)
- ✅ All integration tests passing
- ✅ No TypeORM User repository imports
- ✅ Virtual properties computed correctly
- ✅ Performance within acceptable range (<50ms queries)

**Overall Phase (P.3.4)**:
- ✅ All 8 services migrated to PrismaUserService
- ✅ Zero authentication failures
- ✅ Zero production incidents
- ✅ All E2E tests passing
- ✅ TypeORM User repository fully removed

---

## Summary

**Phase P.3.4** migrates 8 services from TypeORM User repository to PrismaUserService:

1. **users.service.ts** (LOW risk, start here)
2. **password-security.service.ts** (MEDIUM risk, hash compatibility)
3. **auth-security.service.ts** (LOW risk, may not exist)
4. **account-lockout.service.ts** (MEDIUM risk, needs findByIdentifier)
5. **email-verification.service.ts** (MEDIUM risk, needs count methods)
6. **password-reset.service.ts** (MEDIUM risk, may not exist)
7. **two-factor-auth.service.ts** (MEDIUM risk, may not exist)
8. **auth.service.ts** (HIGH risk, migrate LAST)

**Prerequisites**: 7 methods/utilities must be added before migration
**Rollback**: Each service = 1 atomic commit, revertable independently
**Risks**: Password hash compatibility (resolved), auth.service criticality (extensive testing required)

**Status**: Ready for execution after prerequisites completed.
