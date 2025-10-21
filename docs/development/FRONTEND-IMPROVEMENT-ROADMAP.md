# MoneyWise Frontend Improvement Roadmap

## Quick Reference: Top Issues by Severity

| Severity | Issue | Impact | Effort | Files |
|----------|-------|--------|--------|-------|
| 🔴 CRITICAL | TypeScript `strict: false` | Type safety compromised | 2hrs | tsconfig.json |
| 🔴 CRITICAL | Tokens in localStorage | XSS vulnerability | 3hrs | auth-store.ts, auth.ts |
| 🟠 HIGH | Touch targets <44px | WCAG AA failure | 1hr | dashboard-page.tsx |
| 🟠 HIGH | No keyboard navigation | WCAG AA failure | 2hrs | protected-route.tsx, button.tsx |
| 🟠 HIGH | Focus indicators weak | WCAG AA failure | 1hr | globals.css |
| 🟡 MEDIUM | No code splitting | Performance: LCP 3.2s | 3hrs | next.config.mjs |
| 🟡 MEDIUM | Empty packages/ui | Shared components missing | 4hrs | packages/ui/src |

---

## Phase 1: Type Safety (2 hours)

### Task 1.1: Enable TypeScript Strict Mode

**Current:** `/home/nemesi/dev/money-wise/apps/web/tsconfig.json`
```json
{
  "compilerOptions": {
    "strict": false,
    "allowJs": true,
    "skipLibCheck": true
  }
}
```

**Target:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": false,
    "allowJs": false
  }
}
```

**Expected Issues to Fix:**
- 15-20 `any` type violations in auth.ts
- 8-10 optional chaining errors in stores
- 5 unused variables

---

### Task 1.2: Create Type-Safe Error Types

**New File:** `/home/nemesi/dev/money-wise/apps/web/lib/error-types.ts`

```typescript
/**
 * Type-safe error handling for the application
 * Provides discriminated unions for API and application errors
 */

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Discriminated union for API responses
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

export interface ApiError {
  code: 'INVALID_CREDENTIALS' | 'SERVER_ERROR' | 'NETWORK_ERROR' | 'VALIDATION_ERROR';
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

// Auth-specific results
export type AuthResult = ApiResult<{
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}>;

// Error guard functions
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isApiError(error: unknown): error is ApiError {
  if (typeof error !== 'object' || error === null) return false;
  return 'code' in error && 'message' in error && 'statusCode' in error;
}

// Error factory functions
export const createAuthError = (
  code: 'INVALID_CREDENTIALS' | 'SERVER_ERROR',
  message: string,
  statusCode: number
): AppError => {
  return new AppError(code, message, statusCode);
};

export const createNetworkError = (message: string): AppError => {
  return new AppError('NETWORK_ERROR', message, undefined, { type: 'network' });
};
```

**Update:** `/home/nemesi/dev/money-wise/apps/web/lib/auth.ts`

```typescript
// Before
catch (error: any) {
  set({
    isLoading: false,
    error: error.response?.data?.message || 'Login failed',
  })
  throw error
}

// After
catch (error: unknown) {
  const apiError = isApiError(error) ? error : {
    message: 'An unexpected error occurred',
    code: 'SERVER_ERROR' as const,
    statusCode: 500
  };

  set({
    isLoading: false,
    error: apiError.message,
  })
  throw createAuthError(apiError.code, apiError.message, apiError.statusCode)
}
```

---

## Phase 2: Security - Move Tokens to httpOnly Cookies (3 hours)

### Task 2.1: Create Server Action for Token Management

**New File:** `/home/nemesi/dev/money-wise/apps/web/lib/auth-actions.ts`

```typescript
'use server'

import { cookies } from 'next/headers';
import type { AuthResponse } from './auth';

const COOKIE_OPTIONS = {
  httpOnly: true,      // Prevents client-side JavaScript access (XSS protection)
  secure: true,        // Only sent over HTTPS
  sameSite: 'strict' as const,  // CSRF protection
  maxAge: 7 * 24 * 60 * 60,     // 7 days
  path: '/',
};

/**
 * Set authentication cookies securely on the server
 * Called after successful login/register
 */
export async function setAuthCookies(authResponse: AuthResponse) {
  const cookieStore = await cookies();

  cookieStore.set('auth-token', authResponse.accessToken, COOKIE_OPTIONS);
  cookieStore.set(
    'refresh-token',
    authResponse.refreshToken,
    {
      ...COOKIE_OPTIONS,
      maxAge: 30 * 24 * 60 * 60, // 30 days for refresh token
    }
  );

  // Optional: Store user info in a non-secure cookie for quick access
  cookieStore.set(
    'user-info',
    JSON.stringify({
      id: authResponse.user.id,
      email: authResponse.user.email,
      name: authResponse.user.fullName,
    }),
    {
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
      // NO httpOnly: allows client-side access for non-sensitive data
    }
  );
}

/**
 * Clear authentication cookies (logout)
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
  cookieStore.delete('refresh-token');
  cookieStore.delete('user-info');
}

/**
 * Get auth token from cookies (server-side only)
 */
export async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('auth-token')?.value;
}
```

### Task 2.2: Update API Client to Use Cookies

**Update:** `/home/nemesi/dev/money-wise/apps/web/lib/auth.ts`

```typescript
// Remove localStorage usage
// Before:
authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// After: Cookies are sent automatically (browser handles this)
// No interceptor needed - axios includes cookies by default

// Configure axios to include credentials
export const authApi = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,  // Include cookies in requests
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Task 2.3: Refactor Auth Store

**Update:** `/home/nemesi/dev/money-wise/apps/web/stores/auth-store.ts`

```typescript
'use client'

import { create } from 'zustand'
import type { User, LoginCredentials, RegisterCredentials } from '@/lib/auth'
import { authService } from '@/lib/auth'
import { setAuthCookies, clearAuthCookies } from '@/lib/auth-actions'

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
  refreshAuth: () => Promise<void>
  // NO localStorage access here
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null })

    try {
      const response = await authService.login(credentials)

      // Securely set cookies on server
      await setAuthCookies(response)

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      set({
        isLoading: false,
        error: message,
      })
      throw error
    }
  },

  logout: async () => {
    try {
      await authService.logout()
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      await clearAuthCookies()
      set({
        user: null,
        isAuthenticated: false,
        error: null,
      })
    }
  },

  // ... other methods updated similarly
}))
```

---

## Phase 3: Accessibility - WCAG AA Compliance (4 hours)

### Task 3.1: Fix Touch Targets in Dashboard

**Update:** `/home/nemesi/dev/money-wise/apps/web/app/dashboard/page.tsx`

```typescript
// Before: 32px buttons (too small)
<button className="flex flex-col items-center p-4 rounded-lg border">

// After: 44×44px minimum (WCAG AA requirement)
<button
  className="flex flex-col items-center justify-center w-12 h-12 rounded-lg border hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
  aria-label="Add Account"
>
  <PiggyBank className="h-6 w-6" />
</button>

// Or use semantic button component
<QuickActionButton
  icon={PiggyBank}
  label="Add Account"
  onClick={handleAddAccount}
/>
```

### Task 3.2: Create Accessible Form Components

**New File:** `/home/nemesi/dev/money-wise/apps/web/components/ui/form-input.tsx`

```typescript
'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ id, label, error, hint, className, ...props }, ref) => {
    const inputId = id || `input-${Math.random()}`
    const errorId = error ? `${inputId}-error` : undefined
    const hintId = hint ? `${inputId}-hint` : undefined

    return (
      <div className="space-y-2">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-foreground"
        >
          {label}
        </label>
        <Input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={[errorId, hintId].filter(Boolean).join(' ')}
          className={cn(error && 'border-destructive', className)}
          {...props}
        />
        {error && (
          <p
            id={errorId}
            className="text-sm text-destructive flex items-center gap-1"
            role="alert"
          >
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={hintId} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    )
  }
)
FormInput.displayName = 'FormInput'
```

### Task 3.3: Add Reduced Motion Support

**Update:** `/home/nemesi/dev/money-wise/apps/web/app/globals.css`

```css
/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* Enhanced focus indicators */
:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}

button:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: -2px;
}
```

---

## Phase 4: Performance - Code Splitting (3 hours)

### Task 4.1: Enable Route-Based Code Splitting

**Update:** `/home/nemesi/dev/money-wise/apps/web/next.config.mjs`

```javascript
export default {
  // ... existing config

  // Enable experimental features for better code splitting
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      'lucide-react',
    ],
  },

  // Enable turbo for faster builds
  turbotrace: {
    logLevel: 'error',
    logDetail: false,
  },
};
```

### Task 4.2: Optimize Page Structure for React Server Components

**Update:** `/home/nemesi/dev/money-wise/apps/web/app/auth/login/page.tsx`

```typescript
// Before: Client component
'use client'
export default function LoginPage() { ... }

// After: Server component with client form
// app/auth/login/page.tsx (Server Component)
import { LoginForm } from './components/LoginForm'
import { Suspense } from 'react'
import { LoginSkeleton } from './components/LoginSkeleton'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Suspense fallback={<LoginSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}

// app/auth/login/components/LoginForm.tsx (Client Component - only what's needed)
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { FormInput } from '@/components/ui/form-input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  // ... minimal client logic
}
```

### Task 4.3: Optimize Dashboard with React.memo

**Update:** `/home/nemesi/dev/money-wise/apps/web/app/dashboard/page.tsx`

```typescript
// Extract card components
const StatsCard = React.memo(({ title, value, icon: Icon, trend }: StatsCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{trend}</p>
    </CardContent>
  </Card>
), (prev, next) => {
  return (
    prev.title === next.title &&
    prev.value === next.value &&
    prev.trend === next.trend
  );
});

// Use in dashboard
export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard title="Total Balance" value="$12,345.67" ... />
      {/* ... */}
    </div>
  )
}
```

---

## Phase 5: Testing - Add Accessibility Tests (2 hours)

### Task 5.1: Install Testing Libraries

```bash
pnpm add -D @axe-core/react jest-axe
```

### Task 5.2: Create Accessibility Test Template

**New File:** `/home/nemesi/dev/money-wise/apps/web/__tests__/components/ui/button.a11y.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Button } from '@/components/ui/button'

expect.extend(toHaveNoViolations)

describe('Button - Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('has proper focus indicators', () => {
    const { getByRole } = render(<Button>Click</Button>)
    const button = getByRole('button')
    expect(button).toHaveClass('focus-visible:ring-2')
  })

  it('touch target is at least 44x44px', () => {
    const { getByRole } = render(<Button size="default">Click</Button>)
    const button = getByRole('button')
    expect(button).toHaveClass('h-10')  // 40px - update to 44px
  })
})
```

---

## Phase 6: Architecture - Setup Storybook (2 hours)

### Task 6.1: Install Storybook

```bash
cd packages/ui
pnpm dlx storybook@latest init
```

### Task 6.2: Create Component Story Template

**New File:** `/home/nemesi/dev/money-wise/packages/ui/src/button/button.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
    disabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Button',
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-2 flex-wrap">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
}
```

---

## Implementation Timeline

### Week 1: Critical Fixes
- Mon-Tue: Phase 1 - TypeScript strict mode
- Tue-Wed: Phase 2 - Move tokens to cookies
- Wed-Thu: Phase 3.1 - Touch target fixes
- Thu-Fri: Phase 3.2 - Accessible form components

### Week 2: UX & Performance
- Mon-Tue: Phase 3.3 - Reduced motion support
- Tue-Wed: Phase 4 - Code splitting setup
- Thu-Fri: Phase 5 - Accessibility testing

### Week 3: Documentation
- Mon-Tue: Phase 6 - Storybook setup
- Wed-Thu: Documentation & guides
- Thu-Fri: Testing & QA

---

## Verification Checklist

After each phase, verify:

- [ ] All tests pass: `pnpm test`
- [ ] TypeScript compiles: `pnpm typecheck`
- [ ] No console errors: `pnpm dev`
- [ ] Accessibility audit passes: `npm run test:a11y`
- [ ] Bundle size check: `pnpm build && pnpm analyze`

---

## Quick Commands

```bash
# Run all checks
pnpm run validate

# Type checking
pnpm typecheck

# Full test suite
pnpm test:coverage

# Accessibility tests (Phase 5)
pnpm test:a11y

# Bundle analysis
pnpm run analyze

# Storybook (Phase 6)
pnpm storybook

# Build for production
pnpm build
```
