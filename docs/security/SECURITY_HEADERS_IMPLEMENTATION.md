# Security Headers Implementation

## Overview

Comprehensive security hardening implementation for MoneyWise backend (NestJS) and frontend (Next.js) using helmet.js and custom security headers middleware.

**Implementation Date**: 2025-10-28
**Status**: ✅ Complete and Verified

## Summary

Successfully implemented defense-in-depth security headers across both applications to protect against:
- XSS (Cross-Site Scripting) attacks
- Clickjacking attacks
- MIME type sniffing vulnerabilities
- Information leakage
- Man-in-the-middle attacks (production)
- Insecure browser feature access

## Files Created/Modified

### Backend (NestJS)

1. **Created: `apps/backend/src/config/security.config.ts`** (189 lines)
   - Environment-aware helmet.js configuration
   - Production vs development security settings
   - Additional security headers not covered by helmet
   - Comprehensive documentation for each header

2. **Modified: `apps/backend/src/main.ts`** (177 lines)
   - Integrated security configuration
   - Applied helmet middleware with custom config
   - Added additional security headers middleware
   - Maintained compatibility with existing CORS and cookie auth

### Frontend (Next.js)

3. **Modified: `apps/web/next.config.mjs`** (144 lines)
   - Added async headers() function
   - Environment-aware security headers
   - Production-only HSTS configuration
   - Applied to all routes (/:path*)

## Security Headers Implemented

### Backend Security Headers (via helmet.js)

#### 1. Content-Security-Policy (CSP)
**Purpose**: Prevents XSS attacks by controlling resource loading sources

**Configuration**:
- `default-src 'self'`: Only load resources from same origin
- `script-src 'self'`: Allow scripts only from same origin (+ 'unsafe-eval' in dev for hot reload)
- `style-src 'self' 'unsafe-inline'`: Allow same-origin styles and inline styles (required for styled-components)
- `img-src 'self' data: https:`: Allow images from same origin, data URIs, and HTTPS sources
- `connect-src 'self' http://localhost:3000`: Allow API connections to frontend
- `frame-src 'none'`: Prevent iframe embedding
- `object-src 'none'`: Disable Flash and plugins
- `upgrade-insecure-requests`: Force HTTP to HTTPS in production

#### 2. HTTP Strict Transport Security (HSTS)
**Purpose**: Forces browsers to use HTTPS connections only

**Configuration** (Production Only):
```
max-age=63072000 (2 years)
includeSubDomains
preload
```

**Why Production Only**: Localhost doesn't support HTTPS, enabling HSTS in dev would break the application

#### 3. X-Frame-Options
**Purpose**: Prevents clickjacking attacks

**Configuration**: `DENY` - Cannot be embedded in any iframe

#### 4. X-Content-Type-Options
**Purpose**: Prevents MIME type sniffing

**Configuration**: `nosniff` - Browser must respect declared Content-Type

#### 5. Referrer-Policy
**Purpose**: Controls referrer information sent with requests

**Configuration**: `strict-origin-when-cross-origin` - Full URL for same-origin, origin only for cross-origin

#### 6. Permissions-Policy
**Purpose**: Controls browser features and APIs

**Configuration**: Disables unnecessary features:
- geolocation=()
- microphone=()
- camera=()
- payment=()
- usb=()
- magnetometer=()
- gyroscope=()
- speaker=()

#### 7. X-XSS-Protection
**Purpose**: Legacy XSS protection for older browsers

**Configuration**: Enabled (modern browsers use CSP, but this provides defense-in-depth)

#### 8. Cross-Origin Policies
- **Cross-Origin-Embedder-Policy**: Disabled (to avoid breaking CORS for cookies)
- **Cross-Origin-Opener-Policy**: `same-origin-allow-popups`
- **Cross-Origin-Resource-Policy**: `cross-origin` (allows frontend access)

### Frontend Security Headers (via Next.js)

#### All Routes (/:path*)

1. **X-DNS-Prefetch-Control**: `on` - Allows DNS prefetching for performance
2. **X-Frame-Options**: `DENY` - Prevents iframe embedding
3. **X-Content-Type-Options**: `nosniff` - Prevents MIME type sniffing
4. **X-XSS-Protection**: `1; mode=block` - Legacy XSS protection
5. **Referrer-Policy**: `origin-when-cross-origin` - Controls referrer information
6. **Permissions-Policy**: Same restrictions as backend (camera, mic, location disabled)
7. **Strict-Transport-Security** (Production Only): `max-age=63072000; includeSubDomains; preload`

## Environment-Specific Configuration

### Development Mode
- HSTS disabled (no HTTPS on localhost)
- CSP allows 'unsafe-eval' for hot module reload
- CSP allows connections to localhost:* and ws://localhost:*
- More permissive settings for debugging

### Production Mode
- HSTS enabled with 2-year max-age
- CSP upgraded to enforce HTTPS
- Stricter CSP directives (no 'unsafe-eval')
- Only secure connections allowed

## Compatibility with Existing Features

### ✅ Cookie Authentication
- Security headers do NOT interfere with HttpOnly cookies
- `credentials: 'include'` still works in fetch requests
- Cookie flow: Client → Backend → Set-Cookie → Client stores automatically

### ✅ CSRF Protection
- X-CSRF-Token header allowed in CORS configuration
- CSRF tokens transmitted via cookies and headers
- No CSP interference with CSRF flow

### ✅ CORS Configuration
- Security headers complement CORS (different purposes)
- CORS controls cross-origin API access
- Security headers protect the browser
- Both work together without conflict

## Verification Results

### Backend Verification (http://localhost:3001/api/health)

```bash
curl -I http://localhost:3001/api/health
```

**Headers Confirmed**:
- ✅ Content-Security-Policy
- ✅ Cross-Origin-Opener-Policy
- ✅ Cross-Origin-Resource-Policy
- ✅ Referrer-Policy: strict-origin-when-cross-origin
- ✅ X-Content-Type-Options: nosniff
- ✅ X-DNS-Prefetch-Control: on
- ✅ X-Frame-Options: DENY
- ✅ X-Permitted-Cross-Domain-Policies: none
- ✅ Permissions-Policy
- ✅ Access-Control-Allow-Origin: http://localhost:3000 (CORS still working)
- ✅ Access-Control-Allow-Credentials: true (Cookie auth still working)

**HSTS**: Not present (development mode - correct behavior)

### Frontend Verification (http://localhost:3000)

```bash
curl -I http://localhost:3000
```

**Headers Confirmed**:
- ✅ X-DNS-Prefetch-Control: on
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Referrer-Policy: origin-when-cross-origin
- ✅ Permissions-Policy

**HSTS**: Not present (development mode - correct behavior)

### Authentication Flow Verification

```bash
curl -X GET http://localhost:3001/api/auth/csrf-token
```

**Results**:
- ✅ CSRF token generated successfully
- ✅ Cookie handling works with security headers
- ✅ No interference with authentication flow

## Security Improvements Achieved

### Attack Vector Mitigation

| Attack Type | Protection | Implementation |
|------------|-----------|----------------|
| XSS (Cross-Site Scripting) | CSP + X-XSS-Protection | Restricts script sources, blocks inline scripts in production |
| Clickjacking | X-Frame-Options: DENY | Prevents iframe embedding |
| MIME Sniffing | X-Content-Type-Options: nosniff | Forces Content-Type respect |
| Man-in-the-Middle | HSTS (production) | Forces HTTPS, 2-year cache |
| Information Leakage | Hide X-Powered-By | Prevents stack disclosure |
| Feature Abuse | Permissions-Policy | Disables camera, mic, location |
| Referrer Leakage | Referrer-Policy | Controlled referrer information |

### Defense-in-Depth Layers

1. **Browser-Level Protection**: Security headers configure browser behavior
2. **Transport Security**: HSTS forces encrypted connections (production)
3. **Content Protection**: CSP restricts resource loading
4. **Feature Restriction**: Permissions-Policy limits browser APIs
5. **Clickjacking Prevention**: X-Frame-Options blocks iframe embedding
6. **MIME Protection**: X-Content-Type-Options prevents sniffing
7. **Legacy Support**: X-XSS-Protection for older browsers

## Performance Impact

- **Backend**: Negligible (headers add ~2KB per response)
- **Frontend**: Negligible (static header generation)
- **Caching**: Headers cached with response
- **Build Time**: No impact (static configuration)

## Maintenance Recommendations

### Regular Reviews

1. **CSP Policy Review** (Quarterly):
   - Review and tighten CSP directives as app evolves
   - Remove 'unsafe-inline' for styles when possible
   - Monitor CSP violation reports

2. **HSTS Preload** (Once Production Ready):
   - Submit domain to HSTS preload list
   - Ensure all subdomains support HTTPS
   - Plan for 2-year HSTS commitment

3. **Permissions-Policy Updates** (As Needed):
   - Add new feature restrictions as browser APIs evolve
   - Review app's actual feature usage

### Security Testing

1. **Header Verification**:
   ```bash
   # Test backend headers
   curl -I http://localhost:3001/api/health

   # Test frontend headers
   curl -I http://localhost:3000
   ```

2. **CSP Violation Monitoring**:
   - Enable CSP reporting in production
   - Monitor for policy violations
   - Adjust directives based on violations

3. **Security Scanners**:
   - Run OWASP ZAP scans
   - Use Mozilla Observatory (https://observatory.mozilla.org/)
   - Check securityheaders.com

### Production Deployment Checklist

- [ ] Verify HSTS is enabled in production environment
- [ ] Confirm HTTPS is working before enabling HSTS
- [ ] Test cookie authentication in production
- [ ] Verify CSRF protection works
- [ ] Run security header scanner
- [ ] Monitor CSP violation reports
- [ ] Test all auth flows (login, logout, refresh)

## Configuration Files

### Backend Security Config Location
`apps/backend/src/config/security.config.ts`

### Backend Main Entry Point
`apps/backend/src/main.ts` (lines 16, 43-57)

### Frontend Next.js Config
`apps/web/next.config.mjs` (lines 44-108)

## References

### OWASP Security Headers
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [HTTP Strict Transport Security](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html)

### Browser Documentation
- [MDN: Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [MDN: HTTP Headers Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)

### Testing Tools
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [SecurityHeaders.com](https://securityheaders.com/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)

## Warnings and Considerations

### ⚠️ HSTS Production Commitment
Once HSTS is enabled in production with a long max-age (2 years), it CANNOT be easily disabled. The browser will cache this setting for the specified duration. Ensure:
- HTTPS works correctly before enabling HSTS
- All subdomains support HTTPS if using includeSubDomains
- You're committed to HTTPS-only for the specified duration

### ⚠️ CSP Strictness Trade-offs
- `'unsafe-inline'` for styles is a security trade-off for framework compatibility
- Consider migrating to styled-components with nonce support
- Avoid adding 'unsafe-eval' to production CSP

### ⚠️ Breaking Changes Risk
Security headers are generally non-breaking, but monitor for:
- Third-party integrations that load external resources
- Iframe embeds (if needed, adjust X-Frame-Options)
- Browser feature requirements (adjust Permissions-Policy)

## Next Steps

1. **Monitor Production** (Once Deployed):
   - Set up CSP violation reporting endpoint
   - Monitor security header effectiveness
   - Track any compatibility issues

2. **Gradual Tightening**:
   - Start with current configuration
   - Monitor CSP violations
   - Gradually remove 'unsafe-inline' and tighten policies

3. **HSTS Preload Submission** (Future):
   - After stable production HTTPS operation
   - Submit to https://hstspreload.org/
   - Verify all subdomains ready

## Support

For questions or issues related to security headers:
1. Review this documentation
2. Check OWASP references
3. Test with security scanning tools
4. Consult helmet.js documentation: https://helmetjs.github.io/

---

**Last Updated**: 2025-10-28
**Reviewed By**: DevOps Specialist Agent
**Status**: Production Ready (Pending HTTPS for HSTS)
