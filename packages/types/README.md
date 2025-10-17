# @money-wise/types

Shared TypeScript type definitions for the MoneyWise application.

## Purpose

This package provides centralized type definitions used across all MoneyWise apps (backend, web, mobile). It ensures type consistency and enables compile-time type checking across the entire monorepo.

## Installation

This package is internal to the MoneyWise monorepo and is not published to npm.

```json
{
  "dependencies": {
    "@money-wise/types": "workspace:*"
  }
}
```

## Usage

### Importing Types

```typescript
// Import all types
import type { User, Transaction, Account } from '@money-wise/types';

// Import specific types
import type { UserRole } from '@money-wise/types/user';
import type { TransactionType } from '@money-wise/types/transaction';
```

### Example Types (Planned Structure)

```typescript
// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'user' | 'admin';

// Transaction types
export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: TransactionType;
  accountId: string;
  date: Date;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

// Account types
export interface Account {
  id: string;
  name: string;
  balance: number;
  currency: string;
  userId: string;
}
```

## Structure

```
packages/types/
├── src/
│   ├── index.ts          # Main entry point (barrel export)
│   ├── user.ts           # User-related types
│   ├── transaction.ts    # Transaction types
│   ├── account.ts        # Account types
│   ├── api/              # API request/response types
│   ├── common/           # Common utility types
│   └── enums/            # Enum definitions
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Build

```bash
# From root
pnpm build --filter @money-wise/types

# From package directory
cd packages/types
pnpm build
```

### Type Checking

```bash
# From root
pnpm typecheck --filter @money-wise/types

# From package directory
cd packages/types
pnpm typecheck
```

## Best Practices

### 1. Use Interfaces for Objects

```typescript
// Good
export interface User {
  id: string;
  name: string;
}

// Avoid (unless you need union types)
export type User = {
  id: string;
  name: string;
};
```

### 2. Use Type Aliases for Unions

```typescript
// Good
export type UserRole = 'user' | 'admin' | 'superadmin';

// Less flexible
export enum UserRole {
  User = 'user',
  Admin = 'admin',
  SuperAdmin = 'superadmin'
}
```

### 3. Export Everything from index.ts

```typescript
// src/index.ts
export * from './user';
export * from './transaction';
export * from './account';
```

### 4. Use Branded Types for IDs

```typescript
// Enhanced type safety for IDs
export type UserId = string & { readonly __brand: 'UserId' };
export type TransactionId = string & { readonly __brand: 'TransactionId' };
```

### 5. Provide Utility Types

```typescript
// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

## Guidelines

1. **No Runtime Code**: This package should contain ONLY type definitions
2. **No Dependencies**: Keep this package dependency-free for minimal overhead
3. **Clear Naming**: Use descriptive names that indicate purpose
4. **Documentation**: Document complex types with JSDoc comments
5. **Avoid Circular Dependencies**: Structure types to prevent circular imports

## Current Status

**Status**: Placeholder (empty implementation)

The package structure is established but types are not yet implemented. As the application develops, type definitions will be added incrementally.

## Roadmap

- [ ] Implement core entity types (User, Account, Transaction)
- [ ] Add API request/response types
- [ ] Create common utility types
- [ ] Implement enum definitions
- [ ] Add validation schemas (Zod integration)
- [ ] Document all exported types

## Contributing

When adding new types:

1. Create types in appropriate files (user.ts, transaction.ts, etc.)
2. Export from index.ts for easy importing
3. Add JSDoc comments for complex types
4. Ensure no runtime code is included
5. Run `pnpm typecheck` to verify

## Version

Current Version: 0.1.0 (Placeholder)

## License

MIT
