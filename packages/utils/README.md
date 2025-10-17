# @money-wise/utils

Shared utility functions for the MoneyWise application.

## Purpose

This package provides reusable utility functions used across all MoneyWise apps (backend, web, mobile). It centralizes common logic for formatting, validation, date manipulation, and other helper functions.

## Installation

This package is internal to the MoneyWise monorepo and is not published to npm.

```json
{
  "dependencies": {
    "@money-wise/utils": "workspace:*"
  }
}
```

## Usage

### Importing Utilities

```typescript
// Import all utilities
import { formatCurrency, validateEmail, parseDate } from '@money-wise/utils';

// Import from specific categories
import { formatCurrency, formatPercentage } from '@money-wise/utils/formatting';
import { isValidEmail, isValidPassword } from '@money-wise/utils/validation';
import { addDays, formatRelativeTime } from '@money-wise/utils/date';
```

## Planned Utilities

### Formatting Utilities

```typescript
// Currency formatting
formatCurrency(1234.56, 'USD'); // "$1,234.56"
formatCurrency(1234.56, 'EUR'); // "€1,234.56"

// Number formatting
formatNumber(1234567); // "1,234,567"
formatPercentage(0.1556); // "15.56%"

// Text utilities
truncate('Long text...', 20); // "Long text..."
capitalize('hello world'); // "Hello world"
```

### Validation Utilities

```typescript
// Email validation
isValidEmail('user@example.com'); // true

// Password validation
isValidPassword('SecureP@ss123'); // true

// Phone number validation
isValidPhone('+1234567890'); // true

// Credit card validation
isValidCardNumber('4111111111111111'); // true
```

### Date Utilities

```typescript
// Date manipulation
addDays(new Date(), 7); // Date 7 days from now
subtractMonths(new Date(), 3); // Date 3 months ago

// Formatting
formatDate(new Date(), 'MMM dd, yyyy'); // "Jan 15, 2024"
formatRelativeTime(pastDate); // "2 days ago"

// Comparison
isSameDay(date1, date2); // boolean
isWithinRange(date, startDate, endDate); // boolean
```

### Array Utilities

```typescript
// Array operations
groupBy(transactions, 'category'); // Group by property
sortBy(items, 'date', 'desc'); // Sort by property
chunk(array, 10); // Split into chunks of 10

// Deduplication
unique([1, 2, 2, 3]); // [1, 2, 3]
uniqueBy(users, 'email'); // Unique by property
```

### Object Utilities

```typescript
// Deep operations
deepClone(obj); // Deep copy
deepMerge(obj1, obj2); // Deep merge

// Property access
get(obj, 'user.address.city'); // Safe property access
set(obj, 'user.name', 'John'); // Safe property setting

// Transformation
pick(obj, ['id', 'name']); // { id, name }
omit(obj, ['password']); // Object without password
```

## Structure

```
packages/utils/
├── src/
│   ├── index.ts          # Main entry point
│   ├── formatting/       # Formatting utilities
│   │   ├── currency.ts
│   │   ├── number.ts
│   │   └── text.ts
│   ├── validation/       # Validation functions
│   │   ├── email.ts
│   │   ├── password.ts
│   │   └── phone.ts
│   ├── date/             # Date utilities
│   │   ├── format.ts
│   │   ├── manipulation.ts
│   │   └── comparison.ts
│   ├── array/            # Array utilities
│   ├── object/           # Object utilities
│   └── async/            # Async utilities (debounce, throttle)
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Build

```bash
# From root
pnpm build --filter @money-wise/utils

# From package directory
cd packages/utils
pnpm build
```

### Testing

```bash
# From root
pnpm test --filter @money-wise/utils

# From package directory
cd packages/utils
pnpm test
```

### Type Checking

```bash
# From root
pnpm typecheck --filter @money-wise/utils

# From package directory
cd packages/utils
pnpm typecheck
```

## Best Practices

### 1. Pure Functions

```typescript
// Good: Pure function
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Avoid: Mutating inputs
export function addDaysMutate(date: Date, days: number): Date {
  date.setDate(date.getDate() + days); // Mutates input
  return date;
}
```

### 2. Type Safety

```typescript
// Good: Strongly typed
export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

// Avoid: Weak types
export function formatCurrency(amount: any, currency: any): any {
  // ...
}
```

### 3. Error Handling

```typescript
// Good: Clear error messages
export function parseDate(dateString: string): Date {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  return date;
}

// Avoid: Silent failures
export function parseDate(dateString: string): Date | null {
  try {
    return new Date(dateString);
  } catch {
    return null; // Loses error context
  }
}
```

### 4. Tree-Shakeable Exports

```typescript
// Good: Named exports (tree-shakeable)
export function formatCurrency(...) { }
export function formatPercentage(...) { }

// Avoid: Default exports (not tree-shakeable)
export default {
  formatCurrency,
  formatPercentage,
};
```

## Guidelines

1. **No Side Effects**: All functions should be pure
2. **Platform Agnostic**: Works in Node.js, browsers, and React Native
3. **Well Tested**: 80%+ code coverage required
4. **Minimal Dependencies**: Keep dependency count low
5. **TypeScript First**: Fully typed with strict mode
6. **Documentation**: JSDoc comments for all public functions

## Performance Considerations

- Use memoization for expensive operations
- Avoid unnecessary array/object copies
- Leverage native APIs when available
- Consider algorithmic complexity (O(n) vs O(n²))

## Current Status

**Status**: Placeholder (empty implementation)

The package structure is established but utilities are not yet implemented. As the application develops, utility functions will be added incrementally based on actual needs.

## Roadmap

- [ ] Implement currency formatting utilities
- [ ] Add validation functions (email, password, phone)
- [ ] Create date manipulation utilities
- [ ] Add array/object helper functions
- [ ] Implement debounce/throttle for async operations
- [ ] Add comprehensive test suite
- [ ] Document all exported functions

## Testing

```typescript
// Example test structure
import { formatCurrency } from '../formatting/currency';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  it('handles different currencies', () => {
    expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56');
    expect(formatCurrency(1234.56, 'GBP')).toBe('£1,234.56');
  });

  it('throws on invalid input', () => {
    expect(() => formatCurrency(NaN, 'USD')).toThrow();
  });
});
```

## Contributing

When adding new utilities:

1. Create utility in appropriate category folder
2. Export from category index and main index
3. Add JSDoc comments with examples
4. Write comprehensive tests
5. Ensure platform compatibility
6. Run `pnpm test` and `pnpm typecheck`

## Version

Current Version: 0.1.0 (Placeholder)

## License

MIT
