# Cookie-Based Authentication Migration

## Overview

The MoneyWise frontend has been migrated from localStorage JWT token authentication to **HttpOnly cookie-based authentication with CSRF protection**. This provides enhanced security by preventing XSS attacks from accessing authentication tokens.

## Architecture Changes

### Before (JWT in localStorage)

```
┌─────────┐                 ┌─────────┐
│ Browser │────Login────────▶│ Backend │
│         │◀───Tokens────────│         │
└─────────┘                 └─────────┘
     │
     ▼
localStorage:
  - accessToken
  - refreshToken
  - user

Protected Request:
  Authorization: Bearer {accessToken}
```

### After (HttpOnly Cookies + CSRF)

```
┌─────────┐                 ┌─────────┐
│ Browser │────Login────────▶│ Backend │
│         │◀───Set-Cookie────│         │
│         │   (HttpOnly)     │         │
│         │◀───CSRF Token────│         │
└─────────┘                 └─────────┘
     │
     ▼
localStorage:
  - csrfToken (NOT HttpOnly)
  - user

Protected Request:
  Cookie: accessToken=... (automatic)
  X-CSRF-Token: {csrfToken}
```

## Key Benefits

1. **XSS Protection**: HttpOnly cookies cannot be accessed by JavaScript
2. **CSRF Protection**: CSRF tokens prevent cross-site request forgery
3. **Automatic Token Management**: Browser handles cookie lifecycle
4. **Simplified Refresh**: Backend handles token rotation via cookies
5. **Better Security Posture**: Defense in depth with multiple layers

## Implementation Details

### 1. CSRF Utilities (`src/utils/csrf.ts`)

New utility module for CSRF token management:

```typescript
// Get CSRF token from localStorage
getCsrfToken(): string | null

// Store CSRF token
setCsrfToken(token: string): void

// Clear CSRF token
clearCsrfToken(): void

// Refresh CSRF token from backend
refreshCsrfToken(apiBaseUrl: string): Promise<string>

// Check if HTTP method requires CSRF token
requiresCsrf(method?: string): boolean

// Check if error is CSRF-related
isCsrfError(error: unknown): boolean
```

### 2. Updated API Client (`lib/auth.ts`)

**Key Changes:**

- **Removed**: axios dependency, JWT token interceptors
- **Added**: Native fetch with cookie support, CSRF handling
- **Changed**: AuthResponse interface (no tokens, added csrfToken)

**New Request Pattern:**

```typescript
const response = await fetch(endpoint, {
  credentials: 'include', // ✅ Enable cookies
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCsrfToken(), // ✅ CSRF for mutations
  },
});
```

**CSRF Error Handling:**

```typescript
if (response.status === 403 && isCsrfError(error)) {
  // Refresh CSRF token
  await refreshCsrfToken();
  // Retry request
}
```

### 3. Updated Auth Store (`src/stores/auth-store.ts`)

**Removed from State:**
- `accessToken` and `refreshToken` (handled by cookies)
- `refreshAccessToken()` method (backend auto-refreshes)

**Updated Actions:**

```typescript
// Login - stores CSRF token
login: async (email, password) => {
  const { user, csrfToken } = await authService.login({ email, password });
  localStorage.setItem('user', JSON.stringify(user));
  // csrfToken stored by authService.login
}

// Logout - clears CSRF token
logout: async () => {
  await authService.logout(); // Backend clears cookies
  clearCsrfToken();
  clearAuthStorage();
}

// Session validation - uses cookies
validateSession: async () => {
  const user = await authService.getProfile(); // Cookie sent automatically
  return true;
}
```

### 4. Updated API Mocks (`__mocks__/api/handlers.ts`)

Mock responses now match cookie-based auth:

```typescript
// Login/Register responses
{
  user: { /* user data */ },
  csrfToken: 'mock-csrf-token'
}

// CSRF token refresh endpoint
GET /api/auth/csrf-token
→ { csrfToken: 'new-token' }
```

## Migration Checklist

### Completed

- [x] Created CSRF utilities module
- [x] Updated API client with cookie support
- [x] Updated auth response interfaces
- [x] Removed JWT token storage logic
- [x] Updated auth store actions
- [x] Added CSRF token management
- [x] Updated API mocks for testing
- [x] Verified TypeScript compilation
- [x] Tests passing

### Testing Requirements

#### Manual Testing

1. **Login Flow**
   ```bash
   # Open browser DevTools → Application → Cookies
   # After login, verify:
   - HttpOnly cookie: accessToken ✓
   - HttpOnly cookie: refreshToken ✓
   - localStorage: csrfToken ✓
   - localStorage: user ✓
   ```

2. **Protected Requests**
   ```bash
   # Open DevTools → Network → Select API request → Headers
   # Verify:
   - Cookie header includes accessToken ✓
   - Request header X-CSRF-Token present ✓
   ```

3. **Logout Flow**
   ```bash
   # After logout, verify:
   - Cookies cleared ✓
   - localStorage cleared ✓
   - User redirected to login ✓
   ```

4. **Session Persistence**
   ```bash
   # Steps:
   1. Login
   2. Refresh page
   3. Verify user still authenticated ✓
   4. Close browser
   5. Reopen and navigate to app
   6. Session restored ✓
   ```

5. **CSRF Protection**
   ```bash
   # Steps:
   1. Login
   2. Clear csrfToken from localStorage
   3. Attempt mutation (POST/PUT/DELETE)
   4. Verify 403 error with CSRF message ✓
   5. Token auto-refreshes and retry succeeds ✓
   ```

#### Automated Testing

```bash
cd apps/web
pnpm test
```

Expected results:
- All auth-related tests pass
- Mocks return correct response format
- Store state updates correctly

### Deployment Considerations

#### Environment Variables

Ensure these are set correctly:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api  # Development
# or
NEXT_PUBLIC_API_URL=https://api.moneywise.app/api  # Production
```

#### CORS Configuration

Backend must allow credentials:

```typescript
// Backend CORS config
{
  origin: process.env.FRONTEND_URL,
  credentials: true, // ✅ Required for cookies
}
```

#### Cookie Configuration

Backend cookie settings:

```typescript
// Production
{
  httpOnly: true,
  secure: true,      // HTTPS only
  sameSite: 'strict',
  domain: '.moneywise.app',
  maxAge: 15 * 60 * 1000, // 15 minutes
}
```

#### Security Headers

Ensure these headers are set:

```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Strict-Transport-Security: max-age=31536000
```

## Troubleshooting

### Issue: Cookies not being sent

**Symptoms:**
- 401 errors on protected routes
- Cookies visible in DevTools but not sent

**Solutions:**
1. Verify `credentials: 'include'` in fetch requests
2. Check CORS `credentials: true` on backend
3. Ensure frontend and backend on same domain/subdomain
4. Check SameSite cookie attribute

### Issue: CSRF token errors

**Symptoms:**
- 403 errors on mutations
- Error message: "CSRF token invalid"

**Solutions:**
1. Check `X-CSRF-Token` header in requests
2. Verify CSRF token in localStorage
3. Try manual refresh: `authService.refreshCsrfToken()`
4. Check backend CSRF validation logic

### Issue: Session not persisting

**Symptoms:**
- User logged out after page refresh
- Cookies disappear

**Solutions:**
1. Check cookie `maxAge` setting (backend)
2. Verify browser not blocking cookies
3. Ensure `HttpOnly` and `Secure` flags correct
4. Check cookie domain matches current domain

### Issue: CORS preflight failures

**Symptoms:**
- OPTIONS requests failing
- "Access-Control-Allow-Credentials" error

**Solutions:**
1. Backend must return correct CORS headers for OPTIONS
2. Verify `Access-Control-Allow-Credentials: true`
3. Check `Access-Control-Allow-Headers` includes `X-CSRF-Token`
4. Ensure origin matches exactly (no trailing slash)

## Testing Checklist

Before deploying to production:

- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials fails gracefully
- [ ] Registration creates new user and sets cookies
- [ ] Protected routes accessible after login
- [ ] Protected routes redirect when not authenticated
- [ ] Logout clears cookies and redirects
- [ ] Session persists across page reloads
- [ ] Session persists when browser reopened (if remember me)
- [ ] CSRF tokens refresh on 403 errors
- [ ] Mutation requests include CSRF token
- [ ] GET requests work without CSRF token
- [ ] Token refresh happens automatically (backend)
- [ ] Multiple tabs share authentication state
- [ ] No tokens visible in localStorage (except CSRF)
- [ ] Cookies are HttpOnly and Secure (production)
- [ ] Error messages are user-friendly
- [ ] Loading states display correctly
- [ ] Network errors handled gracefully

## Files Modified

### New Files

1. **`src/utils/csrf.ts`** - CSRF token management utilities

### Modified Files

1. **`lib/auth.ts`** - API client with cookie support
2. **`src/stores/auth-store.ts`** - Zustand store without token storage
3. **`__mocks__/api/handlers.ts`** - Mock responses for cookie auth
4. **`.env.local`** - Environment configuration (verify URL)

### Unchanged Files

- UI components (login, register forms)
- Protected route wrapper
- User profile pages
- Navigation components

## Performance Impact

**Positive:**
- Simplified state management (no token refresh logic)
- Fewer localStorage operations
- Automatic browser cookie management

**Neutral:**
- Network overhead same (cookies vs. headers similar size)
- CSRF token refresh adds one extra request (rare)

**Monitoring:**
- Track CSRF refresh frequency
- Monitor 403 error rates
- Check session validation times

## Security Improvements

1. **XSS Mitigation**: Tokens inaccessible to JavaScript
2. **CSRF Protection**: Double-submit cookie pattern
3. **Token Rotation**: Backend handles automatically
4. **SameSite Cookies**: Prevents cross-site attacks
5. **Secure Flag**: HTTPS-only in production
6. **HttpOnly Flag**: No client-side access

## Next Steps

1. **Testing**: Complete manual testing checklist
2. **Monitoring**: Set up logging for CSRF failures
3. **Documentation**: Update API documentation
4. **Training**: Brief team on new auth flow
5. **Deployment**: Stage → Production rollout

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN: HTTP Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
- [NestJS CSRF Protection](https://docs.nestjs.com/security/csrf)

---

**Migration completed**: 2025-10-28
**Tested by**: Claude Code
**Status**: ✅ Ready for testing
