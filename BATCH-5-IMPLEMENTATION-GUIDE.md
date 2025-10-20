# Batch 5 - Implementation Guide

## Quick Reference: File-by-File Fixes

### File 1: users.service.ts (4 fixes)

**Status**: Low-hanging fruit - enum fixes are straightforward

```typescript
// FIX 1: Line 52
- if (id !== requestingUserId && requestingUserRole as any !== 'ADMIN') {
+ if (id !== requestingUserId && requestingUserRole !== UserRole.ADMIN) {

// FIX 2: Line 77
- if (requestingUserRole as any !== 'ADMIN') {
+ if (requestingUserRole !== UserRole.ADMIN) {

// FIX 3: Line 88 (requires DTO fix first)
// Update update-user.dto.ts to have:
export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}
- status: updateStatusDto.status as any,
+ status: updateStatusDto.status,

// FIX 4: Lines 96, 120, 121 (requires DTO fix first)
// Update user-response.dto.ts to use enums directly:
export class UserResponseDto {
  role: UserRole;  // NOT string
  status: UserStatus;  // NOT string
}
- if (requestingUserRole as any !== 'ADMIN') {
+ if (requestingUserRole !== UserRole.ADMIN) {

- role: user.role as any,
+ role: user.role,

- status: user.status as any,
+ status: user.status,
```

**Blocks**: auth-security.service.ts fixes, auth.service.ts fixes

---

### File 2: user-response.dto.ts (new type fix)

**Status**: Must fix before users.service.ts cleanup

Create/Update this file to properly type enum fields:

```typescript
import { UserRole, UserStatus } from '@prisma/client';

export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;  // Use enum, not string
  status: UserStatus;  // Use enum, not string
  avatar: string | null;
  timezone: string | null;
  currency: string;
  preferences: Record<string, any> | null;
  lastLoginAt: Date | null;
  emailVerifiedAt: Date | null;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

### File 3: auth-security.service.ts (3 fixes)

**Status**: Depends on users.service.ts and DTO fixes

```typescript
// FIX 1: Line 152 - Remove unnecessary cast
- status: UserStatus.INACTIVE as any,
+ status: UserStatus.INACTIVE,

// FIX 2: Line 687 - Create typed enrichment function
// Update enrichUserWithVirtuals() to return typed object

// Before:
const enrichedUser = enrichUserWithVirtuals(user as any);

// After - Define return type:
interface EnrichedUser extends User {
  fullName: string;
  isEmailVerified: boolean;
  isActive: boolean;
}

function enrichUserWithVirtuals(user: User): EnrichedUser {
  return {
    ...user,
    fullName: `${user.firstName} ${user.lastName}`,
    isEmailVerified: user.emailVerifiedAt !== null,
    isActive: user.status === UserStatus.ACTIVE,
  };
}

// Then:
const enrichedUser = enrichUserWithVirtuals(user);  // No cast needed

// FIX 3: Line 715 - Build proper DTO response
// Instead of:
const userWithoutPassword = { ... } as any;

// Build it type-safe:
const userWithoutPassword: AuthResponseDto['user'] = {
  id: enrichedUser.id,
  email: enrichedUser.email,
  firstName: enrichedUser.firstName,
  lastName: enrichedUser.lastName,
  role: enrichedUser.role,
  status: enrichedUser.status,
  avatar: enrichedUser.avatar,
  timezone: enrichedUser.timezone,
  currency: enrichedUser.currency,
  preferences: enrichedUser.preferences,
  lastLoginAt: enrichedUser.lastLoginAt,
  emailVerifiedAt: enrichedUser.emailVerifiedAt,
  createdAt: enrichedUser.createdAt,
  updatedAt: enrichedUser.updatedAt,
  fullName: enrichedUser.fullName,
  isEmailVerified: enrichedUser.isEmailVerified,
  isActive: enrichedUser.isActive,
};

return {
  accessToken,
  refreshToken,
  user: userWithoutPassword,  // No cast needed
  expiresIn: 15 * 60,
};
```

---

### File 4: auth.service.ts (1 fix)

**Status**: Same as auth-security.service.ts

```typescript
// Line 302 - Same fix pattern as auth-security.service.ts
- user: userWithoutPassword as any,
+ user: userWithoutPassword,  // After DTO fixes
```

---

### File 5: password-security.service.ts (1 fix)

**Status**: Low priority, audit metadata

```typescript
// Line 501 - Define audit metadata type
// In a types file or at top of file:
type AuditMetadata = Record<string, unknown>;

// Then:
- metadata: metadata as any,
+ metadata: metadata as AuditMetadata,
```

---

### File 6: prisma-test-data.factory.ts (8 fixes)

**Status**: Requires metadata type definitions first

**Step 1**: Create metadata types file
Create: `/home/nemesi/dev/money-wise/apps/backend/src/core/database/types/metadata.types.ts`

```typescript
import { Prisma } from '@prisma/client';

// User preferences
export type UserPreferences = {
  theme?: 'light' | 'dark';
  language?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    categories?: boolean;
    budgets?: boolean;
  };
  [key: string]: unknown;
};

// Account settings
export type AccountSettings = {
  autoSync?: boolean;
  syncFrequency?: 'hourly' | 'daily' | 'weekly';
  notifications?: boolean;
  budgetIncluded?: boolean;
  [key: string]: unknown;
};

// Plaid account metadata
export type PlaidAccountMetadata = {
  mask?: string;
  subtype?: string;
  officialName?: string;
  persistentAccountId?: string;
  [key: string]: unknown;
};

// Plaid transaction metadata
export type PlaidTransactionMetadata = {
  categoryId?: string[];
  categoryConfidenceLevel?: string;
  transactionCode?: string;
  transactionType?: string;
  personalFinanceCategory?: {
    primary?: string;
    detailed?: string;
    confidence_level?: string;
  };
  [key: string]: unknown;
};

// Transaction location
export type TransactionLocation = {
  address?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
  lat?: number;
  lon?: number;
  [key: string]: unknown;
};

// Category rules
export type CategoryRules = {
  keywords?: string[];
  merchantPatterns?: string[];
  autoAssign?: boolean;
  confidence?: number;
  [key: string]: unknown;
};

// Category metadata
export type CategoryMetadata = {
  budgetEnabled?: boolean;
  monthlyLimit?: number;
  taxDeductible?: boolean;
  businessExpense?: boolean;
  [key: string]: unknown;
};

// Budget settings
export type BudgetSettings = {
  rollover?: boolean;
  includeSubcategories?: boolean;
  [key: string]: unknown;
};
```

**Step 2**: Update factory file

```typescript
import {
  UserPreferences,
  AccountSettings,
  PlaidAccountMetadata,
  PlaidTransactionMetadata,
  TransactionLocation,
  CategoryRules,
  CategoryMetadata,
  BudgetSettings,
} from '../types/metadata.types';

// FIX 1: Line 167
- preferences: data.preferences as any,
+ preferences: data.preferences as Prisma.InputJsonValue,

// FIX 2: Line 282
- settings: data.settings as any,
+ settings: data.settings as Prisma.InputJsonValue,

// FIX 3: Line 286
- plaidMetadata: data.plaidMetadata as any,
+ plaidMetadata: data.plaidMetadata as Prisma.InputJsonValue,

// FIX 4: Line 392
- rules: data.rules as any,
+ rules: data.rules as Prisma.InputJsonValue,

// FIX 5: Line 393
- metadata: data.metadata as any,
+ metadata: data.metadata as Prisma.InputJsonValue,

// FIX 6: Line 514
- location: data.location as any,
+ location: data.location as Prisma.InputJsonValue | null,

// FIX 7: Line 517
- plaidMetadata: data.plaidMetadata as any,
+ plaidMetadata: data.plaidMetadata as Prisma.InputJsonValue,

// FIX 8: Line 635
- settings: data.settings as any,
+ settings: data.settings as Prisma.InputJsonValue,
```

---

### File 7: test-data.factory.ts (1 fix)

**Status**: Low priority, test code

```typescript
// Line 313 - Replace dynamic property assignment with safe merge

// OLD CODE:
Object.keys(overrides).forEach(key => {
  if (key !== 'parent' && key !== 'parentId') {
    (category as any)[key] = overrides[key as keyof Category];
  }
});

// NEW CODE:
const safeOverrides = Object.entries(overrides)
  .filter(([key]) => key !== 'parent' && key !== 'parentId')
  .reduce((acc, [key, value]) => ({
    ...acc,
    [key]: value,
  }), {} as Partial<Category>);

Object.assign(category, safeOverrides);
```

---

### File 8: category.service.ts (3 return type fixes)

**Status**: Highest priority - blocks other queries

```typescript
// FIX 1: Line 240 - Add explicit return type
- async findOneWithRelations(id: string): Promise<any> {
+ async findOneWithRelations(id: string): Promise<
+   (Category & { parent: Category | null; children: Category[] }) | null
+ > {

// FIX 2: Line 291 - Add explicit return type
- async findByFamilyId(...): Promise<any[]> {
+ async findByFamilyId(...): Promise<Category[]> {

// Alternative if relations included:
+ async findByFamilyId(..., options?: { include?: { parent?: boolean; children?: boolean } }): Promise<
+   (Category & { parent?: Category | null; children?: Category[] })[]
+ > {

// FIX 3: Line 366 - Add explicit return type
- async findChildren(...): Promise<any[]> {
+ async findChildren(...): Promise<
+   (Category & { children?: Category[] })[]
+ > {
```

---

### File 9: budget.service.ts (1 return type fix)

**Status**: Medium priority

```typescript
// FIX 1: Line 229 - Add explicit return type
- async findOneWithRelations(id: string): Promise<any> {
+ async findOneWithRelations(id: string): Promise<
+   (Budget & { category: Category; family: Family }) | null
+ > {
```

---

### File 10: transaction.service.ts (2 fixes)

**Status**: Critical - parameter type

```typescript
// FIX 1: Line 47 - Use Prisma type directly
- async create(data: any) {
+ async create(data: Prisma.TransactionCreateInput) {

// FIX 2: Line 92 - Add explicit return type
- async findOne(id: string) {
+ async findOne(id: string): Promise<Transaction | null> {
```

---

## Implementation Checklist

```
Phase 1: Type Definitions (15 min)
  [ ] Create metadata.types.ts
  [ ] Update user-response.dto.ts
  [ ] Define EnrichedUser interface

Phase 2: Enum Fixes (20 min)
  [ ] Fix users.service.ts lines 52, 77, 96
  [ ] Fix auth-security.service.ts line 152
  [ ] Verify enum imports

Phase 3: DTO Response Fixes (30 min)
  [ ] Update auth-security.service.ts lines 687, 715
  [ ] Update auth.service.ts line 302
  [ ] Test auth flow

Phase 4: Factory Updates (30 min)
  [ ] Import metadata types in prisma-test-data.factory.ts
  [ ] Replace all 8 any-casts with Prisma.InputJsonValue
  [ ] Fix test-data.factory.ts dynamic assignment
  [ ] Test factory runs without errors

Phase 5: Service Return Types (25 min)
  [ ] Add return types to category.service.ts
  [ ] Add return types to budget.service.ts
  [ ] Fix transaction.service.ts parameter and return types
  [ ] Run type checking: npx tsc --noEmit

Phase 6: Verification (10 min)
  [ ] Run linter: pnpm lint
  [ ] Run tests: pnpm test
  [ ] Check for remaining any-casts: grep -r "as any" src/
  [ ] Verify all files compile
```

---

## Testing Checklist

After each phase, verify:

1. **Compilation**: `npx tsc --noEmit` passes with no errors
2. **Linting**: `pnpm lint` passes with no warnings
3. **Type Coverage**: `pnpm type:coverage` shows improvement
4. **Tests Pass**: `pnpm test` all tests green
5. **No Regressions**: `grep -r "as any" src/ | wc -l` shows reduction

---

## Commit Strategy

Recommended commit order (one per phase):

```bash
# After Phase 1
git commit -m "types: add metadata type definitions for JSON fields

- Create metadata.types.ts with strict types for JSON fields
- Update user-response.dto.ts with proper enum types
- Define EnrichedUser interface for user enrichment pattern"

# After Phase 2
git commit -m "refactor: fix UserRole/UserStatus enum usage

- Replace string comparisons with enum values (users.service.ts)
- Remove unnecessary enum casts (auth-security.service.ts)
- Use UserRole.ADMIN instead of 'ADMIN' string literal"

# After Phase 3
git commit -m "refactor: fix auth response DTO type safety

- Remove any-casts from auth response building
- Create typed enrichment for virtual properties
- Build DTO responses with explicit shape"

# After Phase 4
git commit -m "refactor: fix factory JSON field types

- Replace any-casts with Prisma.InputJsonValue
- Use metadata types for type safety
- Fix dynamic property assignment in test factories"

# After Phase 5
git commit -m "refactor: add explicit return types to service methods

- Fix category.service.ts with proper typed returns
- Fix budget.service.ts return types
- Fix transaction.service.ts parameter and return types"
```

---

## Estimated Effort

- **Total Time**: 5 hours
  - Setup & review: 30 min
  - Implementation: 3.5 hours
  - Testing & verification: 1 hour

- **By Complexity**:
  - Easy (enum fixes): 1 hour
  - Medium (DTO fixes): 1.5 hours
  - Hard (type system): 2 hours
  - Testing: 0.5 hours

---

## Rollback Plan

If issues arise:

1. **Phase 1 (types)**: Safe - no runtime changes
2. **Phase 2 (enums)**: Safe - just using enum values correctly
3. **Phase 3 (DTOs)**: Safe - same runtime behavior
4. **Phase 4 (factories)**: Safe - Prisma.InputJsonValue compatible
5. **Phase 5 (return types)**: Safe - type annotations only

To rollback: `git reset --soft HEAD~<N>` then fix issues

---

## Success Criteria

✅ All 19 any-casts resolved
✅ No new type warnings
✅ All tests passing
✅ Compilation succeeds without errors
✅ Linting passes without warnings
✅ Code review approved

