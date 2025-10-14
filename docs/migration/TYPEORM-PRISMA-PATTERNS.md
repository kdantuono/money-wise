# TypeORM → Prisma Migration Patterns (Quick Reference)

**Entity**: User
**Phase**: P.3.4
**Target Service**: PrismaUserService

---

## Table of Contents

1. [Injection & Imports](#injection--imports)
2. [Basic CRUD Operations](#basic-crud-operations)
3. [Query Patterns](#query-patterns)
4. [Authentication Operations](#authentication-operations)
5. [Advanced Patterns](#advanced-patterns)
6. [Virtual Properties](#virtual-properties)
7. [Error Handling](#error-handling)

---

## Injection & Imports

### Before (TypeORM)

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../core/database/entities/user.entity';

@Injectable()
export class SomeService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}
}
```

### After (Prisma)

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaUserService } from '../core/database/prisma/services/user.service';
import { User, UserRole, UserStatus } from '../../generated/prisma';

@Injectable()
export class SomeService {
  constructor(
    private readonly prismaUserService: PrismaUserService,
  ) {}
}
```

**Changes**:
- ❌ Remove `@InjectRepository(User)` decorator
- ❌ Remove `Repository<User>` type
- ❌ Remove TypeORM imports
- ✅ Inject `PrismaUserService` directly
- ✅ Import Prisma types from generated client
- ✅ Add `readonly` modifier (best practice)

---

## Basic CRUD Operations

### Pattern 1: Find By ID

#### TypeORM
```typescript
const user = await this.userRepository.findOne({
  where: { id },
});
```

#### Prisma
```typescript
const user = await this.prismaUserService.findOne(id);
```

**Returns**: `User | null`

---

### Pattern 2: Find By Email (Case-Insensitive)

#### TypeORM
```typescript
const user = await this.userRepository.findOne({
  where: { email },
});
```

#### Prisma
```typescript
const user = await this.prismaUserService.findByEmail(email);
```

**Notes**:
- ✅ Auto-lowercases email
- ✅ Auto-trims whitespace
- ✅ Case-insensitive search

---

### Pattern 3: Find By Identifier (Email OR ID)

#### TypeORM
```typescript
const isEmail = identifier.includes('@');
const whereCondition = isEmail ? { email: identifier } : { id: identifier };

const user = await this.userRepository.findOne({
  where: whereCondition,
});
```

#### Prisma (requires new method)
```typescript
// Add to PrismaUserService first:
async findByIdentifier(identifier: string): Promise<User | null> {
  const isEmail = identifier.includes('@');
  return isEmail
    ? this.findByEmail(identifier)
    : this.findOne(identifier);
}

// Usage:
const user = await this.prismaUserService.findByIdentifier(identifier);
```

**Status**: ⚠️ Must add to PrismaUserService before migration

---

### Pattern 4: Create User

#### TypeORM (Manual Hashing)
```typescript
// Hash password separately
const passwordHash = await this.passwordSecurityService.hashPassword(
  password,
  HashingAlgorithm.ARGON2
);

// Create entity
const user = this.userRepository.create({
  email,
  firstName,
  lastName,
  passwordHash,
  status: UserStatus.ACTIVE,
});

// Save
const savedUser = await this.userRepository.save(user);
```

#### Prisma (Auto-Hashing with Plain Password)
```typescript
const user = await this.prismaUserService.create({
  email,
  password, // Plain text - service hashes it
  firstName,
  lastName,
  familyId, // REQUIRED in Prisma
  status: UserStatus.ACTIVE,
});
```

**⚠️ CRITICAL DIFFERENCE**: Prisma `create` expects **plain password**, not hash!

#### For Pre-Hashed Passwords (Auth Registration)

```typescript
// Add to PrismaUserService:
async createWithHash(dto: {
  email: string;
  passwordHash: string; // Already hashed
  firstName?: string;
  lastName?: string;
  familyId: string;
  role?: UserRole;
  status?: UserStatus;
}): Promise<User> {
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

// Usage in auth.service.ts:
const passwordHash = await this.passwordSecurityService.hashPassword(
  password,
  HashingAlgorithm.ARGON2
);

const user = await this.prismaUserService.createWithHash({
  email,
  passwordHash,
  firstName,
  lastName,
  familyId: defaultFamilyId,
  status: UserStatus.ACTIVE,
});
```

---

### Pattern 5: Update User

#### TypeORM (Object Assign)
```typescript
Object.assign(user, updateDto);
const updatedUser = await this.userRepository.save(user);
```

#### TypeORM (Partial Update)
```typescript
await this.userRepository.update(userId, {
  lastLoginAt: new Date(),
});
```

#### Prisma (Always Explicit Update)
```typescript
const updatedUser = await this.prismaUserService.update(userId, {
  lastLoginAt: new Date(),
});
```

**Notes**:
- ✅ Prisma validates UUID format
- ✅ Throws `NotFoundException` if user doesn't exist (P2025)
- ✅ Throws `BadRequestException` if trying to update `familyId` or `password`
- ✅ Auto-updates `updatedAt` timestamp

---

### Pattern 6: Delete User

#### TypeORM
```typescript
const user = await this.userRepository.findOne({ where: { id } });
await this.userRepository.remove(user);
```

#### Prisma
```typescript
await this.prismaUserService.delete(id);
```

**Cascade Behavior** (same in both):
- ✅ Deletes related Accounts
- ✅ Deletes related UserAchievements
- ✅ Deletes related Transactions (via Account cascade)

---

### Pattern 7: Check Existence

#### TypeORM
```typescript
const count = await this.userRepository.count({ where: { id } });
const exists = count > 0;
```

#### Prisma
```typescript
const exists = await this.prismaUserService.exists(id);
```

**Returns**: `boolean`

---

## Query Patterns

### Pattern 8: Find With Relations

#### TypeORM
```typescript
const user = await this.userRepository.findOne({
  where: { id },
  relations: ['accounts', 'family'],
});
```

#### Prisma
```typescript
const user = await this.prismaUserService.findOneWithRelations(
  id,
  { accounts: true, family: true }
);
```

**Available Relations**:
- `family`: User's Family
- `accounts`: User's Accounts
- `userAchievements`: User's UserAchievements

---

### Pattern 9: Find All With Pagination

#### TypeORM
```typescript
const skip = (page - 1) * limit;

const users = await this.userRepository.find({
  skip,
  take: limit,
  order: {
    createdAt: 'DESC',
  },
});
```

#### Prisma
```typescript
const skip = (page - 1) * limit;

const users = await this.prismaUserService.findAll({
  skip,
  take: limit,
  orderBy: {
    createdAt: 'desc', // lowercase in Prisma
  },
});
```

---

### Pattern 10: Find With Count (Pagination Metadata)

#### TypeORM
```typescript
const [users, total] = await this.userRepository.findAndCount({
  skip,
  take: limit,
  order: { createdAt: 'DESC' },
});

return {
  users,
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
};
```

#### Prisma (requires new method)
```typescript
// Add to PrismaUserService:
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

// Usage:
const { users, total } = await this.prismaUserService.findAllWithCount({
  skip,
  take: limit,
  orderBy: { createdAt: 'desc' },
});

return {
  users,
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
};
```

**Status**: ⚠️ Must add to PrismaUserService before migration

---

### Pattern 11: Count Operations

#### TypeORM
```typescript
const total = await this.userRepository.count();
const activeUsers = await this.userRepository.count({
  where: { status: UserStatus.ACTIVE }
});
```

#### Prisma (requires new methods)
```typescript
// Add to PrismaUserService:
async count(where?: {
  familyId?: string;
  role?: UserRole;
  status?: UserStatus;
}): Promise<number> {
  return this.prisma.user.count({ where });
}

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

// Usage:
const total = await this.prismaUserService.count();
const activeUsers = await this.prismaUserService.count({
  status: UserStatus.ACTIVE
});

const stats = await this.prismaUserService.countByStatus();
// { ACTIVE: 150, INACTIVE: 25, SUSPENDED: 5 }
```

**Status**: ⚠️ Must add to PrismaUserService before migration

---

### Pattern 12: Find By Family

#### TypeORM
```typescript
const users = await this.userRepository.find({
  where: { familyId, role: UserRole.ADMIN },
});
```

#### Prisma
```typescript
const users = await this.prismaUserService.findByFamily(
  familyId,
  { role: UserRole.ADMIN }
);
```

**Available Filters**:
- `role`: UserRole (ADMIN, MEMBER, VIEWER)
- `status`: UserStatus (ACTIVE, INACTIVE, SUSPENDED)

---

### Pattern 13: Query Builder (Date Ranges)

#### TypeORM
```typescript
const recentVerifications = await this.userRepository
  .createQueryBuilder('user')
  .where('user.emailVerifiedAt > :since', {
    since: new Date(Date.now() - 24 * 60 * 60 * 1000)
  })
  .getCount();
```

#### Prisma
```typescript
// Direct Prisma client usage (not in PrismaUserService yet)
const recentVerifications = await this.prisma.user.count({
  where: {
    emailVerifiedAt: {
      gt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    }
  }
});

// Or add specialized method to PrismaUserService:
async countRecentlyVerified(hoursAgo: number): Promise<number> {
  return this.prisma.user.count({
    where: {
      emailVerifiedAt: {
        gt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000)
      }
    }
  });
}
```

---

## Authentication Operations

### Pattern 14: Password Verification

#### TypeORM (via PasswordSecurityService)
```typescript
// 1. Fetch user with passwordHash
const user = await this.userRepository.findOne({
  where: { email },
  select: ['id', 'email', 'passwordHash', 'status'],
});

// 2. Verify password separately
const isPasswordValid = await this.passwordSecurityService.verifyPassword(
  password,
  user.passwordHash
);
```

#### Prisma (Single Service Call)
```typescript
// 1. Fetch user
const user = await this.prismaUserService.findByEmail(email);

// 2. Verify password (service fetches hash internally)
const isPasswordValid = await this.prismaUserService.verifyPassword(
  user.id,
  password
);
```

**⚠️ KEY DIFFERENCE**:
- TypeORM: Requires `passwordHash` from user object
- Prisma: Only requires `userId` (more secure)

**Algorithm Support**:
- ✅ Auto-detects Bcrypt (`$2b$10$...`)
- ✅ Auto-detects Argon2 (`$argon2...`)

---

### Pattern 15: Password Update

#### TypeORM (Multi-Step)
```typescript
// 1. Hash new password
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

#### Prisma (Single Call)
```typescript
await this.prismaUserService.updatePassword(userId, newPassword);
```

**Built-In Validations**:
- ✅ Minimum 8 characters
- ✅ User existence check
- ✅ Auto-hashing with bcrypt

---

### Pattern 16: Email Verification

#### TypeORM
```typescript
await this.userRepository.update(userId, {
  emailVerifiedAt: new Date(),
  status: UserStatus.ACTIVE,
});
```

#### Prisma (Dedicated Method)
```typescript
await this.prismaUserService.verifyEmail(userId);
```

**Or** (if need to update other fields):
```typescript
await this.prismaUserService.update(userId, {
  emailVerifiedAt: new Date(),
  status: UserStatus.ACTIVE,
});
```

---

### Pattern 17: Update Last Login

#### TypeORM
```typescript
await this.userRepository.update(userId, {
  lastLoginAt: new Date(),
});
```

#### Prisma (Dedicated Method)
```typescript
await this.prismaUserService.updateLastLogin(userId);
```

**Or** (via update):
```typescript
await this.prismaUserService.update(userId, {
  lastLoginAt: new Date(),
});
```

---

## Advanced Patterns

### Pattern 18: Partial Field Selection

#### TypeORM
```typescript
const user = await this.userRepository.findOne({
  where: { id },
  select: ['id', 'email', 'passwordHash', 'status'],
});
```

#### Prisma (Not in Service Yet)

**Option 1**: Accept full entity (minor performance impact)
```typescript
const user = await this.prismaUserService.findOne(id);
// Use only needed fields
```

**Option 2**: Add specialized method to PrismaUserService
```typescript
async findForAuthentication(
  id: string
): Promise<Pick<User, 'id' | 'email' | 'passwordHash' | 'status'> | null> {
  return this.prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      status: true,
    },
  });
}
```

**Recommendation**: Use Option 1 initially, optimize later if needed.

---

### Pattern 19: Transactions (Multi-Table)

#### TypeORM
```typescript
await this.userRepository.manager.transaction(async (manager) => {
  await manager.save(User, user);
  await manager.save(PasswordHistory, historyRecord);
  await manager.save(AuditLog, auditLog);
});
```

#### Prisma (Requires PrismaService)
```typescript
// In service constructor:
constructor(
  private readonly prismaUserService: PrismaUserService,
  private readonly prisma: PrismaService, // Add for transactions
) {}

// Use transaction:
await this.prisma.$transaction(async (tx) => {
  await tx.user.update({
    where: { id: userId },
    data: { passwordHash }
  });

  await tx.passwordHistory.create({
    data: { userId, passwordHash: oldHash }
  });

  await tx.auditLog.create({
    data: { userId, eventType: 'PASSWORD_CHANGED' }
  });
});
```

**Note**: PrismaUserService methods don't support transactions directly. Use PrismaService for multi-table operations.

---

### Pattern 20: Batch Operations

#### TypeORM
```typescript
await this.userRepository.update(
  { status: UserStatus.INACTIVE },
  { status: UserStatus.SUSPENDED }
);
```

#### Prisma
```typescript
// Not in PrismaUserService - use PrismaService directly
await this.prisma.user.updateMany({
  where: { status: UserStatus.INACTIVE },
  data: { status: UserStatus.SUSPENDED },
});
```

---

## Virtual Properties

### TypeORM Virtual Properties

```typescript
// In TypeORM User entity
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

### Prisma Approach (Compute in Service Layer)

**Step 1**: Create helper function

```typescript
// apps/backend/src/core/database/prisma/utils/user-virtuals.ts
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

**Step 2**: Use in services

```typescript
import { enrichUserWithVirtuals } from '../core/database/prisma/utils/user-virtuals';

// In service method
private toResponseDto(user: User): UserResponseDto {
  const enriched = enrichUserWithVirtuals(user);

  return {
    id: enriched.id,
    email: enriched.email,
    firstName: enriched.firstName,
    lastName: enriched.lastName,
    fullName: enriched.fullName, // Virtual
    role: enriched.role,
    status: enriched.status,
    isEmailVerified: enriched.isEmailVerified, // Virtual
    isActive: enriched.isActive, // Virtual
    // ... rest
  };
}
```

**Step 3**: Use in auth responses

```typescript
// In auth.service.ts
private async generateAuthResponse(user: User): Promise<AuthResponseDto> {
  const enriched = enrichUserWithVirtuals(user);

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

## Error Handling

### TypeORM Errors vs Prisma Errors

| Scenario | TypeORM | Prisma |
|----------|---------|--------|
| User not found | Returns `null` or `undefined` | Returns `null` or throws `NotFoundException` |
| Duplicate email | Database error (catch generic) | `ConflictException` (P2002) |
| Invalid UUID | Queries database (returns null) | `BadRequestException` (validated before query) |
| Foreign key violation | Database error | `BadRequestException` (P2003) |
| Record not found on update | Silent (no error) | `NotFoundException` (P2025) |

### Prisma Error Codes

```typescript
// PrismaUserService handles these automatically:
- P2002: Unique constraint violation → ConflictException
- P2003: Foreign key constraint failed → BadRequestException
- P2025: Record not found → NotFoundException
```

### Migration Error Handling

**Before (TypeORM)**:
```typescript
try {
  const user = await this.userRepository.findOne({ where: { email } });
  if (!user) {
    throw new NotFoundException('User not found');
  }
} catch (error) {
  // Generic error handling
  throw new InternalServerErrorException('Database error');
}
```

**After (Prisma)**:
```typescript
const user = await this.prismaUserService.findByEmail(email);
if (!user) {
  throw new NotFoundException('User not found');
}
// PrismaUserService handles Prisma errors internally
```

---

## Checklist for Each Service Migration

### Pre-Migration

- [ ] Identify all TypeORM User repository usages
- [ ] Check for custom query builders
- [ ] Check for virtual property usages
- [ ] Check for transaction requirements
- [ ] Verify prerequisite methods exist in PrismaUserService

### Migration Steps

- [ ] Replace `@InjectRepository(User)` with `PrismaUserService`
- [ ] Update imports (TypeORM → Prisma)
- [ ] Replace `userRepository.*` calls with `prismaUserService.*`
- [ ] Add virtual property enrichment (if needed)
- [ ] Update error handling (if needed)
- [ ] Update method signatures (if needed)

### Post-Migration

- [ ] Remove TypeORM imports
- [ ] Remove unused TypeORM code
- [ ] Run unit tests (100% passing)
- [ ] Run integration tests (100% passing)
- [ ] Verify virtual properties in responses
- [ ] Performance check (queries <50ms)
- [ ] Commit with atomic message

---

## Quick Reference Card

| Operation | TypeORM | Prisma |
|-----------|---------|--------|
| Find by ID | `findOne({ where: { id } })` | `findOne(id)` |
| Find by email | `findOne({ where: { email } })` | `findByEmail(email)` |
| Create | `save(create(dto))` | `create(dto)` |
| Update | `update(id, dto)` | `update(id, dto)` |
| Delete | `remove(entity)` | `delete(id)` |
| Count | `count({ where })` | `count(where)` ⚠️ |
| Exists | `count({ where: { id } }) > 0` | `exists(id)` |
| With relations | `findOne({ relations: [...] })` | `findOneWithRelations(id, {...})` |
| Pagination | `find({ skip, take })` | `findAll({ skip, take })` |
| Verify password | `passwordService.verify(pwd, hash)` | `verifyPassword(userId, pwd)` |

⚠️ = Must add to PrismaUserService before migration

---

**Last Updated**: 2025-10-12
**Phase**: P.3.4 User Entity Migration
**Status**: Reference Guide Complete
