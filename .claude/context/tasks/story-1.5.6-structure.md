# Task: Project Structure Optimization

**Issue**: #108
**Story**: STORY-1.5.6
**Domain**: architecture/backend/frontend
**Assigned To**: architect-agent, senior-backend-dev, ui-ux-specialist
**Branch**: feature/story-1.5.6-project-structure
**Status**: assigned
**Dependencies**: STORY-1.5.4 (configuration must be consolidated first)

## Full Context (Self-Contained)

### Objective

Optimize the monorepo structure by consolidating duplicate code, establishing clear package boundaries, implementing proper import aliases, and ensuring all shared code lives in the appropriate packages. This will improve maintainability, reduce duplication, and speed up build times.

### Current State Analysis

**Monorepo Structure**:
```
money-wise/
├── apps/
│   ├── backend/      # NestJS API
│   ├── web/         # Next.js frontend
│   └── mobile/      # React Native app
├── packages/
│   ├── ui/          # Shared UI components
│   ├── database/    # Database entities
│   ├── test-utils/  # Testing utilities
│   ├── types/       # TypeScript types (underutilized)
│   └── utils/       # Shared utilities (needs expansion)
```

**Problems Identified**:
1. Type definitions duplicated across apps
2. Common utilities repeated in each app
3. Import paths are relative and fragile
4. No clear separation of concerns between packages
5. Build takes too long due to poor structure
6. Circular dependencies may exist

### Requirements

1. **Consolidate Shared Types** with objective acceptance criteria:
   - All shared interfaces/types in @money-wise/types
   - Zero duplicate type definitions
   - Proper exports from index.ts
   - Type-only imports where applicable

2. **Optimize Import Paths** with objective acceptance criteria:
   - All imports use TypeScript path aliases
   - No relative imports crossing package boundaries
   - Consistent alias naming (@app/, @shared/, etc.)
   - VSCode IntelliSense working with aliases

3. **Package Organization** with objective acceptance criteria:
   - Clear responsibility for each package
   - No circular dependencies between packages
   - Proper peer/dev dependency management
   - Each package has its own tsconfig.json

4. **Build Optimization** with objective acceptance criteria:
   - Build time < 2 minutes for full monorepo
   - Incremental builds working properly
   - TypeScript project references configured
   - Turbo cache hitting on unchanged packages

### Technical Specifications

#### 1. Shared Types Package Structure

```typescript
// packages/types/src/index.ts
export * from './auth';
export * from './user';
export * from './account';
export * from './transaction';
export * from './category';
export * from './api';
export * from './common';

// packages/types/src/user.ts
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  name: string;
  password: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
}

// packages/types/src/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ResponseMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ResponseMetadata {
  timestamp: number;
  requestId: string;
  version: string;
}

// packages/types/src/common.ts
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type DeepPartial<T> = /* implementation */;
export type DeepRequired<T> = /* implementation */;

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
```

#### 2. Shared Utils Package

```typescript
// packages/utils/src/index.ts
export * from './validation';
export * from './formatting';
export * from './date';
export * from './crypto';
export * from './errors';

// packages/utils/src/validation.ts
import { z } from 'zod';

export const emailSchema = z.string().email();
export const passwordSchema = z.string().min(8).max(100);
export const uuidSchema = z.string().uuid();

export function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function isValidUUID(id: string): boolean {
  return uuidSchema.safeParse(id).success;
}

// packages/utils/src/formatting.ts
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatPercentage(
  value: number,
  decimals: number = 2
): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// packages/utils/src/date.ts
import { format, parseISO, isValid } from 'date-fns';

export function formatDate(
  date: Date | string,
  formatString: string = 'yyyy-MM-dd'
): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj) ? format(dateObj, formatString) : '';
}

export function getDateRange(period: 'day' | 'week' | 'month' | 'year') {
  // Implementation
}
```

#### 3. TypeScript Path Configuration

```json
// tsconfig.base.json (root)
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@money-wise/types": ["packages/types/src/index"],
      "@money-wise/types/*": ["packages/types/src/*"],
      "@money-wise/utils": ["packages/utils/src/index"],
      "@money-wise/utils/*": ["packages/utils/src/*"],
      "@money-wise/database": ["packages/database/src/index"],
      "@money-wise/database/*": ["packages/database/src/*"],
      "@money-wise/ui": ["packages/ui/src/index"],
      "@money-wise/ui/*": ["packages/ui/src/*"],
      "@money-wise/test-utils": ["packages/test-utils/src/index"],
      "@money-wise/test-utils/*": ["packages/test-utils/src/*"]
    }
  }
}

// apps/backend/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@app/*": ["apps/backend/src/*"],
      "@config/*": ["apps/backend/src/config/*"],
      "@modules/*": ["apps/backend/src/modules/*"],
      "@core/*": ["apps/backend/src/core/*"],
      // Include base paths
      "@money-wise/types": ["packages/types/src/index"],
      "@money-wise/utils": ["packages/utils/src/index"],
      "@money-wise/database": ["packages/database/src/index"]
    }
  },
  "references": [
    { "path": "../../packages/types" },
    { "path": "../../packages/utils" },
    { "path": "../../packages/database" }
  ]
}
```

#### 4. Package.json Updates

```json
// packages/types/package.json
{
  "name": "@money-wise/types",
  "version": "1.0.0",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./*": {
      "types": "./dist/*.d.ts",
      "default": "./dist/*.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist"
  }
}

// packages/utils/package.json
{
  "name": "@money-wise/utils",
  "version": "1.0.0",
  "dependencies": {
    "date-fns": "^2.30.0",
    "zod": "^3.22.0"
  },
  "peerDependencies": {
    "@money-wise/types": "workspace:*"
  }
}
```

### Files to Create/Modify

**Create New Packages**:
- `/packages/types/src/` - All shared TypeScript interfaces
- `/packages/utils/src/` - All shared utility functions
- `/packages/constants/src/` - All shared constants
- `/packages/errors/src/` - Custom error classes

**Migrate Code**:
- Move duplicate interfaces to @money-wise/types
- Move utility functions to @money-wise/utils
- Update all imports to use new packages

**Update Configuration**:
- `/tsconfig.base.json` - Add path mappings
- All `tsconfig.json` files - Extend base, add references
- All `package.json` files - Update dependencies
- `/turbo.json` - Update pipeline for new packages

**Update Imports** (examples):
```typescript
// Before:
import { User } from '../../../types/user';
import { formatCurrency } from '../../utils/formatting';

// After:
import { User } from '@money-wise/types';
import { formatCurrency } from '@money-wise/utils';
```

### Migration Strategy

**Step 1: Create Package Structure**
```bash
# Create new packages
mkdir -p packages/types/src packages/utils/src packages/constants/src

# Initialize packages
cd packages/types && pnpm init
cd packages/utils && pnpm init
cd packages/constants && pnpm init
```

**Step 2: Identify and Move Duplicates**
```bash
# Find duplicate type definitions
grep -r "export interface User" --include="*.ts"
grep -r "export type Transaction" --include="*.ts"

# Find duplicate utilities
grep -r "formatCurrency\|formatDate" --include="*.ts"
```

**Step 3: Update Import Statements**
```bash
# Use automated refactoring in VSCode
# Or use a script to update imports
find apps -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/\.\.\/.*\/types/\@money-wise\/types/g'
```

**Step 4: Validate No Circular Dependencies**
```bash
# Install madge for dependency analysis
pnpm add -D madge

# Check for circular dependencies
npx madge --circular --extensions ts,tsx apps/backend/src
npx madge --circular --extensions ts,tsx apps/web/src
```

### Definition of Done

- [ ] All shared types in @money-wise/types package
- [ ] All shared utils in @money-wise/utils package
- [ ] Zero duplicate type definitions (verified by grep)
- [ ] All imports using path aliases (no ../ imports)
- [ ] No circular dependencies (verified by madge)
- [ ] Build time < 2 minutes
- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] VSCode IntelliSense working with aliases

### Integration Notes

This structure optimization will:
- Make STORY-1.5.7 (testing) easier with shared test utils
- Improve developer experience with better imports
- Speed up builds with proper caching
- Enable better code sharing between apps
- Prepare for future microservices if needed

### Commands for Agent

```bash
# Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/story-1.5.6-project-structure

# Create package directories
mkdir -p packages/{types,utils,constants,errors}/src

# Initialize packages
cd packages/types && pnpm init -y
cd ../utils && pnpm init -y
cd ../constants && pnpm init -y
cd ../errors && pnpm init -y

# Install dependencies for utils
cd packages/utils
pnpm add date-fns zod

# Build new packages
cd ../..
pnpm build:packages

# Check for circular dependencies
npx madge --circular --extensions ts,tsx .

# Run tests to ensure nothing broke
pnpm test

# Commit changes
git add .
git commit -m "refactor(structure): consolidate shared code into packages"
git push -u origin feature/story-1.5.6-project-structure

# Create PR
gh pr create \
  --title "refactor(structure): STORY-1.5.6 - Project Structure Optimization" \
  --body "Closes #108 - Optimizes monorepo structure with shared packages" \
  --base develop
```

### Build Performance Metrics

**Before Optimization**:
```bash
time pnpm build
# Expected: > 3 minutes
```

**After Optimization**:
```bash
time pnpm build
# Target: < 2 minutes

# With cache:
time pnpm build
# Target: < 30 seconds for unchanged packages
```

### Risk Mitigation

1. **Import Errors**: Use TypeScript compiler to catch all issues
2. **Missing Exports**: Add comprehensive index.ts files
3. **Breaking Changes**: Update imports incrementally, test each step
4. **IDE Issues**: Restart TypeScript service in VSCode after changes
5. **Build Failures**: Keep old code until new packages verified

---

**Agent Instructions**: Focus on creating a clean, well-organized monorepo structure. Start by creating the shared packages, then systematically migrate duplicate code. Ensure all imports are updated to use the new structure and verify no circular dependencies exist. The goal is faster builds and better code organization.