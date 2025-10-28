# Security Migration Plan: HttpOnly Cookies + CSRF Protection

**Status:** In Progress
**Priority:** CRITICAL - Production Blocker
**Estimated Time:** 8-10 hours
**Started:** 2025-10-28

---

## Executive Summary

This plan addresses two CRITICAL security vulnerabilities identified in the comprehensive validation:

1. **CRITICAL**: localStorage XSS vulnerability (OWASP A07:2021, CWE-522)
2. **CRITICAL**: Missing CSRF protection (OWASP A01:2021, CWE-352)

**Current Risk:** Complete account takeover possible via XSS + CSRF attacks
**Solution:** Migrate to HttpOnly cookies + implement CSRF tokens

---

## Current Architecture (INSECURE)

### Token Storage
```typescript
// ❌ VULNERABLE: Tokens in localStorage (XSS accessible)
localStorage.setItem('accessToken', token);
localStorage.setItem('refreshToken', token);
```

### Request Pattern
```typescript
// ❌ NO CSRF PROTECTION
fetch('/api/auth/login', {
  headers: { 'Authorization': `Bearer ${token}` },
  credentials: 'include'
})
```

**Vulnerabilities:**
- Any XSS vulnerability → Token theft → Account takeover
- No CSRF protection → Users tricked into unwanted actions
- Refresh tokens stored client-side → Long-term session hijacking

---

## Target Architecture (SECURE)

### Token Storage
```typescript
// ✅ SECURE: HttpOnly cookies (not accessible to JavaScript)
// Backend sets cookies:
res.cookie('accessToken', token, {
  httpOnly: true,      // No JS access
  secure: true,        // HTTPS only
  sameSite: 'strict',  // CSRF mitigation
  maxAge: 15 * 60 * 1000 // 15 minutes
});
```

### Request Pattern
```typescript
// ✅ CSRF PROTECTED
fetch('/api/auth/login', {
  headers: { 'X-CSRF-Token': csrfToken },
  credentials: 'include' // Send cookies
})
```

**Security Benefits:**
- XSS cannot steal HttpOnly cookies
- CSRF tokens prevent cross-site attacks
- SameSite=Strict provides additional CSRF protection
- Refresh tokens never exposed to client-side code

---

## Implementation Plan

### Phase 1: Backend - Cookie Infrastructure (2 hours)

#### 1.1 Install Dependencies
```bash
pnpm add cookie-parser @types/cookie-parser
pnpm add csurf @types/csurf  # CSRF middleware
```

#### 1.2 Update main.ts
```typescript
import cookieParser from 'cookie-parser';
import csurf from 'csurf';

app.use(cookieParser(process.env.SESSION_SECRET));
app.use(csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
}));
```

#### 1.3 Environment Variables
```env
# Add to .env
COOKIE_SECRET=<64-char-secret>
CSRF_SECRET=<64-char-secret>
SESSION_SECRET=<64-char-secret>
```

---

### Phase 2: Backend - Auth Service Updates (3 hours)

#### 2.1 Update AuthController

**File:** `src/auth/controllers/auth.controller.ts`

```typescript
@Post('login')
async login(
  @Body() loginDto: LoginDto,
  @Res({ passthrough: true }) res: Response
) {
  const result = await this.authService.login(loginDto);

  // ✅ Set HttpOnly cookies instead of returning tokens
  res.cookie('accessToken', result.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // Return user data + CSRF token (NOT tokens)
  return {
    user: result.user,
    csrfToken: req.csrfToken()
  };
}
```

#### 2.2 Create CSRF Endpoint

```typescript
@Get('csrf-token')
@Public() // Allow unauthenticated access
getCsrfToken(@Req() req: Request) {
  return { csrfToken: req.csrfToken() };
}
```

#### 2.3 Update JWT Strategy

Extract tokens from cookies instead of Authorization header:

```typescript
// jwt.strategy.ts
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req.cookies?.accessToken, // ✅ From cookie
      ]),
      secretOrKey: configService.get('JWT_ACCESS_SECRET'),
    });
  }
}
```

---

### Phase 3: Frontend - Auth Store Migration (2 hours)

#### 3.1 Remove localStorage Usage

**File:** `apps/web/src/stores/auth-store.ts`

```typescript
// ❌ REMOVE all localStorage calls
// localStorage.setItem('accessToken', token);
// localStorage.setItem('refreshToken', token);
// localStorage.getItem('accessToken');

// ✅ REPLACE with CSRF token storage only
const [csrfToken, setCsrfToken] = useState<string | null>(null);
```

#### 3.2 Update API Calls

```typescript
const authenticatedFetch = async (endpoint: string, options: RequestInit = {}) => {
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // ✅ Send cookies
    headers: {
      ...options.headers,
      'X-CSRF-Token': csrfToken, // ✅ CSRF protection
      'Content-Type': 'application/json',
    },
  });
};
```

#### 3.3 Initialize CSRF Token

```typescript
// On app init, fetch CSRF token
useEffect(() => {
  const initCsrf = async () => {
    const response = await fetch(`${API_BASE_URL}/api/auth/csrf-token`, {
      credentials: 'include'
    });
    const { csrfToken } = await response.json();
    setCsrfToken(csrfToken);
  };

  initCsrf();
}, []);
```

---

### Phase 4: Testing (2 hours)

#### 4.1 Integration Tests

```typescript
describe('Cookie-based Auth', () => {
  it('should set HttpOnly cookies on login', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password123!' });

    expect(response.headers['set-cookie']).toBeDefined();
    expect(response.headers['set-cookie'][0]).toContain('httpOnly');
    expect(response.body).not.toHaveProperty('accessToken'); // ✅ Not in response
    expect(response.body).toHaveProperty('csrfToken');
  });

  it('should require CSRF token for protected routes', async () => {
    const response = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies); // Has valid auth cookie
    // Missing CSRF token

    expect(response.status).toBe(403); // CSRF validation failed
  });
});
```

#### 4.2 Manual Testing Checklist

- [ ] Login sets HttpOnly cookies
- [ ] CSRF token returned in login response
- [ ] Protected routes require CSRF token
- [ ] Logout clears cookies
- [ ] Token refresh works with cookies
- [ ] XSS cannot access tokens (check devtools)
- [ ] CSRF attacks blocked

---

### Phase 5: Documentation (1 hour)

#### Update Files:
- `COMPREHENSIVE_VALIDATION_REPORT.md` - Mark issues as resolved
- `SECURITY.md` - Document new security architecture
- `README.md` - Update authentication section
- `apps/web/README.md` - Frontend auth changes

---

## Migration Strategy

### Deployment Approach: **Backward Compatible**

1. **Phase 1**: Deploy backend with BOTH cookie + header auth support
2. **Phase 2**: Deploy frontend with cookie-based auth
3. **Phase 3**: Monitor for 1 week
4. **Phase 4**: Remove header-based auth from backend

This ensures zero downtime during migration.

---

## Security Validation

### Pre-Deployment Checks

- [ ] All tokens in HttpOnly cookies
- [ ] No tokens in localStorage
- [ ] CSRF token validation on all state-changing operations
- [ ] Secure flag enabled in production
- [ ] SameSite=Strict configured
- [ ] Session secrets are 64+ characters
- [ ] Integration tests pass
- [ ] Manual security testing complete

### Post-Deployment Monitoring

- [ ] No XSS vulnerabilities detected
- [ ] CSRF attacks blocked successfully
- [ ] Auth flow metrics normal
- [ ] No increased error rates
- [ ] User sessions stable

---

## Rollback Plan

**If issues occur during deployment:**

1. **Immediate**: Revert frontend to localStorage version
2. **Backend**: Keep cookie auth enabled (backward compatible)
3. **Investigate**: Review logs, error reports
4. **Fix**: Address issues identified
5. **Retry**: Redeploy after fixes validated

**Rollback Time:** < 15 minutes (frontend only)

---

## Risk Assessment

### Risks Mitigated
- ✅ XSS token theft → **ELIMINATED** (HttpOnly cookies)
- ✅ CSRF attacks → **BLOCKED** (CSRF tokens)
- ✅ Session hijacking → **REDUCED** (shorter token lifetimes)

### New Considerations
- ⚠️ Cookie-based auth requires careful CORS configuration
- ⚠️ CSRF tokens add slight complexity to frontend
- ⚠️ HttpOnly cookies not accessible for debugging (use server logs)

**Net Result:** Significantly improved security posture

---

## Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Backend Cookie Infrastructure | 2h | T+0 | T+2 |
| Backend Auth Service Updates | 3h | T+2 | T+5 |
| Frontend Auth Store Migration | 2h | T+5 | T+7 |
| Testing | 2h | T+7 | T+9 |
| Documentation | 1h | T+9 | T+10 |

**Total:** 10 hours

---

## Success Criteria

- [ ] ✅ Zero tokens in localStorage
- [ ] ✅ All auth operations use HttpOnly cookies
- [ ] ✅ CSRF protection on all state-changing requests
- [ ] ✅ Integration tests pass (100%)
- [ ] ✅ Manual security testing complete
- [ ] ✅ Documentation updated
- [ ] ✅ Code review approved
- [ ] ✅ Production deployment successful

---

**Status:** Ready to implement
**Next Step:** Phase 1 - Backend Cookie Infrastructure
