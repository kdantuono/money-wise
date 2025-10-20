# EPIC 2.1: Frontend Authentication UI

**Epic ID**: EPIC-2.1
**Priority**: CRITICAL
**Duration**: 1 week (5 days)
**Start Date**: Post-Prisma completion
**Dependencies**: Backend auth API (complete), Prisma migration (95% complete)
**Team**: Frontend specialist + UI/UX specialist

---

## Business Value

Enable users to create accounts, securely authenticate, and manage their profiles through a polished, responsive web interface. This is the gateway to all MoneyWise functionality.

## Success Criteria

- [ ] Users can register with email/password
- [ ] Users can login and maintain sessions
- [ ] Password reset flow works end-to-end
- [ ] Protected routes redirect unauthenticated users
- [ ] Mobile-responsive design (320px - 4K)
- [ ] Accessibility: WCAG 2.1 AA compliant
- [ ] Performance: < 2s initial load, < 100ms interactions
- [ ] 100% E2E test coverage for critical paths

---

## User Stories

### Story 2.1.1: Authentication Pages Layout
**Points**: 3
**Priority**: P0
**Duration**: 0.5 days

**Description**: Create the authentication layout wrapper with branding, responsive design, and animations.

**Acceptance Criteria**:
- [ ] Responsive layout component at `/app/(auth)/layout.tsx`
- [ ] MoneyWise branding (logo, colors, typography)
- [ ] Background pattern/gradient
- [ ] Loading states and transitions
- [ ] Error boundary implementation

**Technical Details**:
```typescript
// apps/web/app/(auth)/layout.tsx
- Use Radix UI components
- Tailwind CSS for styling
- Framer Motion for animations
- Support dark/light mode
```

---

### Story 2.1.2: Registration Page & Flow
**Points**: 5
**Priority**: P0
**Duration**: 1 day

**Description**: Implement complete user registration with form validation, error handling, and success feedback.

**Acceptance Criteria**:
- [ ] Registration form at `/app/(auth)/register/page.tsx`
- [ ] Email validation (format, uniqueness check)
- [ ] Password strength meter and requirements
- [ ] Confirm password field with matching validation
- [ ] Terms of Service checkbox (required)
- [ ] Server-side validation with detailed errors
- [ ] Success redirect to email verification pending
- [ ] Loading states during submission
- [ ] Proper error messages (user-friendly)

**API Integration**:
```typescript
POST /api/auth/register
{
  email: string,
  password: string,
  acceptTerms: boolean
}
```

---

### Story 2.1.3: Login Page & Session Management
**Points**: 5
**Priority**: P0
**Duration**: 1 day

**Description**: Implement login with JWT token management, remember me option, and session persistence.

**Acceptance Criteria**:
- [ ] Login form at `/app/(auth)/login/page.tsx`
- [ ] Email/password fields with validation
- [ ] "Remember me" checkbox (30-day session)
- [ ] "Forgot password" link
- [ ] OAuth buttons (Google - prepared, not functional)
- [ ] JWT token storage (httpOnly cookies)
- [ ] Automatic token refresh
- [ ] Redirect to dashboard after login
- [ ] Show last login location/time (security)
- [ ] Rate limiting feedback

**Token Management**:
```typescript
// Use next-auth or custom JWT handling
- Store access token (15min) in memory
- Store refresh token (7days) in httpOnly cookie
- Auto-refresh before expiration
- Handle 401 with refresh attempt
```

---

### Story 2.1.4: Password Reset Flow
**Points**: 3
**Priority**: P0
**Duration**: 0.5 days

**Description**: Complete forgot password flow with email verification and secure reset.

**Acceptance Criteria**:
- [ ] Request reset page at `/app/(auth)/forgot-password/page.tsx`
- [ ] Email input with validation
- [ ] Success message (always show success for security)
- [ ] Reset page at `/app/(auth)/reset-password/page.tsx`
- [ ] Token validation from URL
- [ ] New password form with requirements
- [ ] Expiry handling (1 hour tokens)
- [ ] Success redirect to login
- [ ] Invalid/expired token error handling

**Email Template**:
- Professional HTML email
- Clear CTA button
- Security notice about request
- Expiration time notice

---

### Story 2.1.5: Protected Route System
**Points**: 3
**Priority**: P0
**Duration**: 0.5 days

**Description**: Implement authentication guards and middleware for protected routes.

**Acceptance Criteria**:
- [ ] Middleware at `/app/middleware.ts`
- [ ] Check authentication on protected routes
- [ ] Redirect to login with return URL
- [ ] Role-based access control (prepare structure)
- [ ] Loading state while checking auth
- [ ] Preserve deep links after login
- [ ] Handle expired sessions gracefully

**Route Protection**:
```typescript
// Protect patterns:
/dashboard/* - require auth
/accounts/* - require auth
/settings/* - require auth
/(auth)/* - redirect if authenticated
```

---

### Story 2.1.6: User Profile & Settings UI
**Points**: 5
**Priority**: P1
**Duration**: 1 day

**Description**: Basic user profile management and account settings interface.

**Acceptance Criteria**:
- [ ] Profile page at `/app/settings/profile/page.tsx`
- [ ] Display current user information
- [ ] Edit profile form (name, phone, timezone)
- [ ] Avatar upload (prepare UI, no backend yet)
- [ ] Change password section
- [ ] Email preferences toggles
- [ ] Account deletion option (with confirmation)
- [ ] Export data button (GDPR compliance)
- [ ] Settings sidebar navigation

---

### Story 2.1.7: Auth State Management
**Points**: 3
**Priority**: P0
**Duration**: 0.5 days

**Description**: Implement Zustand store for authentication state and user data.

**Acceptance Criteria**:
- [ ] Auth store at `/lib/stores/auth.store.ts`
- [ ] User data state
- [ ] Authentication status
- [ ] Token management functions
- [ ] Persist state to localStorage
- [ ] Hydration handling
- [ ] Actions: login, logout, refresh, update

**Store Structure**:
```typescript
interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}
```

---

### Story 2.1.8: E2E Tests & Documentation
**Points**: 2
**Priority**: P0
**Duration**: 0.5 days

**Description**: Comprehensive E2E tests for all authentication flows.

**Acceptance Criteria**:
- [ ] Registration flow test
- [ ] Login flow test
- [ ] Password reset flow test
- [ ] Session expiry test
- [ ] Protected route test
- [ ] Profile update test
- [ ] API documentation updates
- [ ] User guide documentation

**Test Coverage**:
```typescript
// apps/web/tests/e2e/auth.spec.ts
- Happy paths for all flows
- Error scenarios
- Edge cases (expired tokens, etc.)
- Mobile viewport tests
```

---

## Technical Architecture

### Component Structure
```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── settings/
│   │   ├── layout.tsx
│   │   └── profile/page.tsx
│   └── middleware.ts
├── components/
│   ├── auth/
│   │   ├── login-form.tsx
│   │   ├── register-form.tsx
│   │   ├── password-strength.tsx
│   │   └── oauth-buttons.tsx
│   └── ui/
│       └── [Radix UI components]
├── lib/
│   ├── stores/
│   │   └── auth.store.ts
│   └── api/
│       └── auth.api.ts
└── tests/
    └── e2e/
        └── auth.spec.ts
```

### API Endpoints Used
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/forgot-password` - Request reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/users/me` - Get current user
- `PATCH /api/users/me` - Update profile

### Security Considerations
- XSS protection via React's default escaping
- CSRF protection via SameSite cookies
- Rate limiting feedback to user
- Secure password requirements
- Email verification before activation
- Audit logging for auth events

---

## Dependencies & Blockers

### Dependencies
- ✅ Backend Auth API (complete)
- ✅ JWT implementation (complete)
- ⏳ Prisma migration (95% - not blocking)

### Potential Blockers
- Email service configuration (can mock initially)
- OAuth app registration (defer to Epic 2.4)
- Avatar storage solution (defer to Epic 2.4)

---

## Definition of Done

- [ ] All stories completed and tested
- [ ] E2E tests passing (100% for auth flows)
- [ ] Responsive design verified (320px - 4K)
- [ ] Accessibility audit passed
- [ ] Performance targets met
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Code reviewed and merged
- [ ] Deployed to staging environment

---

## Metrics to Track

- Registration conversion rate
- Login success rate
- Password reset completion rate
- Session duration
- Authentication errors
- Page load performance
- Time to interactive (TTI)

---

**Epic Owner**: Frontend Specialist
**Reviewers**: UI/UX Specialist, Security Specialist
**Estimated Completion**: 5 working days