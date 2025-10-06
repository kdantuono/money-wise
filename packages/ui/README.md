# @money-wise/ui

Shared UI components for the MoneyWise application.

## Purpose

This package provides reusable React components used across web and mobile apps. It ensures UI consistency, reduces code duplication, and provides a single source of truth for design system components.

## Installation

This package is internal to the MoneyWise monorepo and is not published to npm.

```json
{
  "dependencies": {
    "@money-wise/ui": "workspace:*"
  }
}
```

## Usage

### Importing Components

```typescript
// Import specific components
import { Button, Card, Input } from '@money-wise/ui';

// Import from specific categories
import { Button, IconButton } from '@money-wise/ui/buttons';
import { TextField, Select } from '@money-wise/ui/forms';
import { Card, Modal } from '@money-wise/ui/layout';
```

### Example Usage

```typescript
import { Button, Card, Input } from '@money-wise/ui';

export function LoginForm() {
  return (
    <Card>
      <Input
        label="Email"
        type="email"
        placeholder="Enter your email"
      />
      <Input
        label="Password"
        type="password"
        placeholder="Enter your password"
      />
      <Button variant="primary" size="large">
        Sign In
      </Button>
    </Card>
  );
}
```

## Planned Components

### Buttons

```typescript
// Primary button
<Button variant="primary">Save</Button>

// Secondary button
<Button variant="secondary">Cancel</Button>

// Icon button
<IconButton icon={<PlusIcon />} aria-label="Add item" />

// Loading state
<Button loading={true}>Saving...</Button>
```

### Forms

```typescript
// Text input
<Input
  label="Email"
  type="email"
  error="Invalid email"
/>

// Select dropdown
<Select
  label="Currency"
  options={[
    { value: 'USD', label: 'US Dollar' },
    { value: 'EUR', label: 'Euro' }
  ]}
/>

// Checkbox
<Checkbox label="Remember me" checked={true} />
```

### Layout

```typescript
// Card container
<Card title="Summary" footer={<Button>View Details</Button>}>
  Card content here
</Card>

// Modal dialog
<Modal open={true} onClose={() => {}}>
  Modal content
</Modal>

// Grid layout
<Grid columns={3} gap={4}>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
</Grid>
```

### Data Display

```typescript
// Table
<Table
  columns={columns}
  data={transactions}
  onRowClick={(row) => {}}
/>

// List
<List
  items={accounts}
  renderItem={(account) => <AccountItem account={account} />}
/>

// Badge
<Badge variant="success">Active</Badge>
```

### Feedback

```typescript
// Alert
<Alert severity="error">Transaction failed</Alert>

// Toast notification
toast.success('Account created successfully');

// Loading spinner
<Spinner size="large" />

// Progress bar
<ProgressBar value={75} max={100} />
```

## Structure

```
packages/ui/
├── src/
│   ├── index.ts            # Main entry point
│   ├── components/
│   │   ├── buttons/
│   │   │   ├── Button.tsx
│   │   │   ├── IconButton.tsx
│   │   │   └── index.ts
│   │   ├── forms/
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Checkbox.tsx
│   │   │   └── index.ts
│   │   ├── layout/
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Grid.tsx
│   │   │   └── index.ts
│   │   ├── data-display/
│   │   ├── feedback/
│   │   └── navigation/
│   ├── hooks/              # Shared React hooks
│   ├── theme/              # Theme configuration
│   └── utils/              # Component utilities
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

## Development

### Build

```bash
# From root
pnpm build --filter @money-wise/ui

# From package directory
cd packages/ui
pnpm build
```

### Testing

```bash
# From root
pnpm test --filter @money-wise/ui

# From package directory
cd packages/ui
pnpm test
```

### Type Checking

```bash
# From root
pnpm typecheck --filter @money-wise/ui

# From package directory
cd packages/ui
pnpm typecheck
```

## Design System

### Theme Configuration

```typescript
// theme/index.ts
export const theme = {
  colors: {
    primary: '#3B82F6',
    secondary: '#64748B',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
    },
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
  },
};
```

## Best Practices

### 1. Component Composition

```typescript
// Good: Composable components
export function Card({ children, title, footer }) {
  return (
    <div className="card">
      {title && <CardHeader>{title}</CardHeader>}
      <CardBody>{children}</CardBody>
      {footer && <CardFooter>{footer}</CardFooter>}
    </div>
  );
}

// Avoid: Monolithic components
export function Card({
  showHeader,
  headerText,
  showFooter,
  footerButtons
}) {
  // Too many props, hard to customize
}
```

### 2. Accessibility

```typescript
// Good: Accessible components
export function Button({ children, ...props }) {
  return (
    <button
      type="button"
      role="button"
      aria-label={props['aria-label']}
      {...props}
    >
      {children}
    </button>
  );
}

// Include ARIA attributes
<IconButton icon={<PlusIcon />} aria-label="Add transaction" />
```

### 3. TypeScript Props

```typescript
// Good: Well-typed props
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({
  variant = 'primary',
  size = 'medium',
  ...props
}: ButtonProps) {
  // ...
}
```

### 4. Styling Strategy

```typescript
// Option 1: Tailwind CSS classes
<button className="px-4 py-2 bg-blue-500 text-white rounded">
  Button
</button>

// Option 2: CSS Modules
import styles from './Button.module.css';
<button className={styles.button}>Button</button>

// Option 3: Styled components (if using)
const StyledButton = styled.button`
  padding: 0.5rem 1rem;
  background: var(--color-primary);
`;
```

## Platform Compatibility

### Web (React)

Components are React components that work in Next.js web app.

```typescript
import { Button } from '@money-wise/ui';

export default function Page() {
  return <Button>Click me</Button>;
}
```

### Mobile (React Native)

Components should be platform-agnostic or have platform-specific implementations.

```typescript
// ui/components/Button.tsx (shared logic)
// ui/components/Button.web.tsx (web-specific)
// ui/components/Button.native.tsx (React Native-specific)
```

## Guidelines

1. **Consistent API**: Similar components should have similar props
2. **Accessibility First**: WCAG 2.1 AA compliance
3. **Performance**: Use React.memo for expensive components
4. **Responsive**: Components should work on all screen sizes
5. **Testable**: Write tests for all public components
6. **Documented**: Storybook documentation (planned)

## Testing

```typescript
// Example test
import { render, screen } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    screen.getByText('Click me').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<Button loading={true}>Save</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

## Current Status

**Status**: Placeholder (empty implementation)

The package structure is established but components are not yet implemented. UI components will be added incrementally as the application develops.

## Roadmap

- [ ] Implement core button components
- [ ] Add form input components
- [ ] Create layout components (Card, Modal, Grid)
- [ ] Implement data display components
- [ ] Add feedback components (Alert, Toast, Spinner)
- [ ] Set up Storybook for component documentation
- [ ] Add comprehensive test suite
- [ ] Implement dark mode support

## Storybook (Planned)

```bash
# Start Storybook development server
pnpm storybook

# Build Storybook for deployment
pnpm build-storybook
```

## Contributing

When adding new components:

1. Create component in appropriate category folder
2. Add TypeScript types for all props
3. Export from category index and main index
4. Write component tests
5. Add accessibility attributes
6. Document usage with JSDoc
7. Run `pnpm test` and `pnpm typecheck`

## Version

Current Version: 0.1.0 (Placeholder)

## License

MIT
