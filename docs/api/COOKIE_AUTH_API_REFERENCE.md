# Cookie Authentication API Reference

## Overview

This document provides detailed API reference for all cookie-based authentication endpoints in the MoneyWise application.

**Base URL**: `http://localhost:3001/api` (development)
**Authentication Method**: HttpOnly cookies + CSRF tokens
**Protocol**: REST
**Content-Type**: `application/json`

---

## Table of Contents

1. [Authentication Flow](#authentication-flow)
2. [Public Endpoints](#public-endpoints)
3. [Protected Endpoints](#protected-endpoints)
4. [Error Responses](#error-responses)
5. [Cookie Reference](#cookie-reference)
6. [CSRF Token Reference](#csrf-token-reference)
7. [Request Examples](#request-examples)

---

## Authentication Flow

### Standard Authentication Flow

```
┌─────────┐                          ┌─────────┐
│ Client  │                          │ Server  │
└────┬────┘                          └────┬────┘
     │                                    │
     │  1. POST /auth/login               │
     │  { email, password }               │
     │───────────────────────────────────>│
     │                                    │
     │  2. Set-Cookie: accessToken        │
     │     Set-Cookie: refreshToken       │
     │     { user, csrfToken }            │
     │<───────────────────────────────────│
     │                                    │
     │  localStorage.setItem(csrfToken)   │
     │                                    │
     │  3. POST /api/protected             │
     │  Cookie: accessToken               │
     │  X-CSRF-Token: <token>             │
     │───────────────────────────────────>│
     │                                    │
     │  4. { data }                       │
     │<───────────────────────────────────│
     │                                    │
     │  5. POST /auth/logout               │
     │  Cookie: accessToken               │
     │  X-CSRF-Token: <token>             │
     │───────────────────────────────────>│
     │                                    │
     │  6. Clear cookies                  │
     │<───────────────────────────────────│
     └                                    └
```

### CSRF Token Refresh Flow

```
┌─────────┐                          ┌─────────┐
│ Client  │                          │ Server  │
└────┬────┘                          └────┬────┘
     │                                    │
     │  1. POST /api/protected             │
     │  X-CSRF-Token: <expired>           │
     │───────────────────────────────────>│
     │                                    │
     │  2. 403 CSRF_TOKEN_INVALID         │
     │<───────────────────────────────────│
     │                                    │
     │  3. GET /auth/csrf-token            │
     │  Cookie: accessToken               │
     │───────────────────────────────────>│
     │                                    │
     │  4. { csrfToken: <new> }           │
     │<───────────────────────────────────│
     │                                    │
     │  localStorage.setItem(csrfToken)   │
     │                                    │
     │  5. POST /api/protected (retry)     │
     │  X-CSRF-Token: <new>               │
     │───────────────────────────────────>│
     │                                    │
     │  6. { data }                       │
     │<───────────────────────────────────│
     └                                    └
```

---

## Public Endpoints

### POST /api/auth/register

Register a new user account.

**URL**: `/api/auth/register`
**Method**: `POST`
**Auth Required**: No
**CSRF Required**: No

#### Request

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Validation Rules**:
- `email`: Valid email format, unique
- `password`: Min 8 chars, contains uppercase, lowercase, number, special char
- `firstName`: 1-50 characters
- `lastName`: 1-50 characters

#### Success Response

**Code**: `201 Created`

**Cookies Set**:
```
Set-Cookie: accessToken=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900
Set-Cookie: refreshToken=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800
```

**Body**:
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "emailVerified": false,
    "role": "user",
    "createdAt": "2025-10-28T12:00:00.000Z",
    "updatedAt": "2025-10-28T12:00:00.000Z"
  },
  "csrfToken": "a1b2c3d4e5f6...789.1730123456789.e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2"
}
```

#### Error Responses

**Code**: `400 Bad Request`
```json
{
  "statusCode": 400,
  "message": [
    "email must be a valid email",
    "password must be at least 8 characters long"
  ],
  "error": "Bad Request"
}
```

**Code**: `409 Conflict`
```json
{
  "statusCode": 409,
  "message": "Email already exists",
  "error": "Conflict"
}
```

---

### POST /api/auth/login

Authenticate user and create session.

**URL**: `/api/auth/login`
**Method**: `POST`
**Auth Required**: No
**CSRF Required**: No

#### Request

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Success Response

**Code**: `200 OK`

**Cookies Set**:
```
Set-Cookie: accessToken=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900
Set-Cookie: refreshToken=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800
```

**Body**:
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "isActive": true,
    "emailVerified": true,
    "role": "user",
    "createdAt": "2025-10-28T12:00:00.000Z",
    "updatedAt": "2025-10-28T12:00:00.000Z"
  },
  "csrfToken": "a1b2c3d4e5f6...789.1730123456789.e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2"
}
```

**Important Notes**:
- `accessToken` and `refreshToken` are NOT included in response body
- Tokens are only available in HttpOnly cookies
- `csrfToken` must be stored client-side (localStorage) for subsequent requests

#### Error Responses

**Code**: `401 Unauthorized`
```json
{
  "statusCode": 401,
  "message": "Invalid credentials",
  "error": "Unauthorized"
}
```

**Code**: `403 Forbidden` (Account inactive or email not verified)
```json
{
  "statusCode": 403,
  "message": "Account is not active. Please verify your email.",
  "error": "Forbidden"
}
```

---

### POST /api/auth/forgot-password

Request password reset email.

**URL**: `/api/auth/forgot-password`
**Method**: `POST`
**Auth Required**: No
**CSRF Required**: No

#### Request

**Headers**:
```
Content-Type: application/json
```

**Body**:
```json
{
  "email": "user@example.com"
}
```

#### Success Response

**Code**: `200 OK`

```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

**Note**: Always returns success message to prevent email enumeration attacks.

---

## Protected Endpoints

### GET /api/auth/profile

Get current user profile.

**URL**: `/api/auth/profile`
**Method**: `GET`
**Auth Required**: Yes (Cookie)
**CSRF Required**: No (Safe method)

#### Request

**Headers**:
```
Cookie: accessToken=<jwt>
```

#### Success Response

**Code**: `200 OK`

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "isActive": true,
  "emailVerified": true,
  "role": "user",
  "createdAt": "2025-10-28T12:00:00.000Z",
  "updatedAt": "2025-10-28T12:00:00.000Z"
}
```

#### Error Responses

**Code**: `401 Unauthorized`
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

### POST /api/auth/logout

Logout user and clear session.

**URL**: `/api/auth/logout`
**Method**: `POST`
**Auth Required**: Yes (Cookie)
**CSRF Required**: Yes

#### Request

**Headers**:
```
Cookie: accessToken=<jwt>
X-CSRF-Token: <csrf-token>
```

#### Success Response

**Code**: `200 OK`

**Cookies Cleared**:
```
Set-Cookie: accessToken=; Max-Age=0; Path=/
Set-Cookie: refreshToken=; Max-Age=0; Path=/
```

**Body**:
```json
{
  "message": "Logged out successfully"
}
```

#### Error Responses

**Code**: `401 Unauthorized`
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**Code**: `403 Forbidden` (Missing or invalid CSRF token)
```json
{
  "statusCode": 403,
  "message": "CSRF token missing",
  "error": "CSRF_TOKEN_MISSING",
  "hint": "Include X-CSRF-Token header in your request"
}
```

---

### POST /api/auth/change-password

Change user password.

**URL**: `/api/auth/change-password`
**Method**: `POST`
**Auth Required**: Yes (Cookie)
**CSRF Required**: Yes

#### Request

**Headers**:
```
Cookie: accessToken=<jwt>
X-CSRF-Token: <csrf-token>
Content-Type: application/json
```

**Body**:
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewSecurePassword456!"
}
```

**Validation Rules**:
- `currentPassword`: Must match existing password
- `newPassword`: Min 8 chars, contains uppercase, lowercase, number, special char
- `newPassword`: Must be different from `currentPassword`

#### Success Response

**Code**: `200 OK`

```json
{
  "message": "Password changed successfully"
}
```

#### Error Responses

**Code**: `400 Bad Request` (Validation error)
```json
{
  "statusCode": 400,
  "message": "New password must be different from current password",
  "error": "Bad Request"
}
```

**Code**: `401 Unauthorized` (Wrong current password)
```json
{
  "statusCode": 401,
  "message": "Current password is incorrect",
  "error": "Unauthorized"
}
```

**Code**: `403 Forbidden` (CSRF error)
```json
{
  "statusCode": 403,
  "message": "CSRF token invalid or expired",
  "error": "CSRF_TOKEN_INVALID"
}
```

---

### POST /api/auth/resend-verification

Resend email verification link.

**URL**: `/api/auth/resend-verification`
**Method**: `POST`
**Auth Required**: Yes (Cookie)
**CSRF Required**: Yes

#### Request

**Headers**:
```
Cookie: accessToken=<jwt>
X-CSRF-Token: <csrf-token>
```

#### Success Response

**Code**: `200 OK`

```json
{
  "message": "Verification email sent successfully"
}
```

#### Error Responses

**Code**: `400 Bad Request` (Already verified)
```json
{
  "statusCode": 400,
  "message": "Email is already verified",
  "error": "Bad Request"
}
```

**Code**: `429 Too Many Requests` (Rate limit)
```json
{
  "statusCode": 429,
  "message": "Please wait before requesting another verification email",
  "error": "Too Many Requests"
}
```

---

### GET /api/auth/csrf-token

Get a new CSRF token.

**URL**: `/api/auth/csrf-token`
**Method**: `GET`
**Auth Required**: Yes (Cookie)
**CSRF Required**: No (Safe method)

#### Request

**Headers**:
```
Cookie: accessToken=<jwt>
```

#### Success Response

**Code**: `200 OK`

```json
{
  "csrfToken": "a1b2c3d4e5f6...789.1730123456789.e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2"
}
```

**Usage**:
- Call this endpoint when CSRF token expires (24 hours)
- Call this endpoint after receiving `CSRF_TOKEN_INVALID` error
- Store returned token in localStorage

---

## Error Responses

### Standard Error Format

All errors follow this structure:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Error Type"
}
```

### Common HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 400 | Bad Request | Validation errors, malformed JSON |
| 401 | Unauthorized | Missing/invalid credentials, expired token |
| 403 | Forbidden | CSRF token missing/invalid, account inactive |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate email, resource already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

### CSRF-Specific Errors

#### CSRF Token Missing

```json
{
  "statusCode": 403,
  "message": "CSRF token missing",
  "error": "CSRF_TOKEN_MISSING",
  "hint": "Include X-CSRF-Token header in your request"
}
```

**Client Action**: Get new CSRF token from `/api/auth/csrf-token`

#### CSRF Token Invalid

```json
{
  "statusCode": 403,
  "message": "CSRF token invalid or expired",
  "error": "CSRF_TOKEN_INVALID"
}
```

**Client Action**: Refresh CSRF token and retry request

#### CSRF Token Expired

CSRF tokens expire after 24 hours. Same error as `CSRF_TOKEN_INVALID`.

---

## Cookie Reference

### Access Token Cookie

**Name**: `accessToken`

**Attributes**:
```
HttpOnly: true          # JavaScript cannot access
Secure: true           # HTTPS only (production)
SameSite: Strict       # CSRF protection
Path: /                # Available app-wide
Max-Age: 900           # 15 minutes (900 seconds)
```

**JWT Payload**:
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "role": "user",
  "iat": 1730123456,
  "exp": 1730124356
}
```

### Refresh Token Cookie

**Name**: `refreshToken`

**Attributes**:
```
HttpOnly: true          # JavaScript cannot access
Secure: true           # HTTPS only (production)
SameSite: Strict       # CSRF protection
Path: /                # Available app-wide
Max-Age: 604800        # 7 days (604,800 seconds)
```

**JWT Payload**:
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "type": "refresh",
  "iat": 1730123456,
  "exp": 1730728256
}
```

### Cookie Clearing (Logout)

On logout, cookies are cleared by setting `Max-Age=0`:

```
Set-Cookie: accessToken=; Max-Age=0; Path=/
Set-Cookie: refreshToken=; Max-Age=0; Path=/
```

---

## CSRF Token Reference

### Token Format

CSRF tokens use this format:
```
{randomToken}.{timestamp}.{signature}
```

**Example**:
```
a1b2c3d4e5f6789.1730123456789.e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2
```

**Components**:
- `randomToken`: 64 hex characters (256 bits of entropy)
- `timestamp`: Unix timestamp in milliseconds
- `signature`: HMAC-SHA256(randomToken + timestamp)

### Token Validation

The server validates CSRF tokens by:
1. Parsing the token into 3 parts
2. Checking timestamp is within 24 hours
3. Verifying HMAC signature
4. Using constant-time comparison (timing attack prevention)

### Token Lifecycle

```
┌──────────────┐
│ Login/       │
│ Register     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Server       │
│ generates    │
│ CSRF token   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Client       │
│ stores in    │
│ localStorage │
└──────┬───────┘
       │
       │  [Valid for 24 hours]
       │
       ▼
┌──────────────┐
│ Token        │
│ expires      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Client       │
│ refreshes    │
│ from /csrf-  │
│ token        │
└──────────────┘
```

### When to Include CSRF Token

**Required** for:
- POST requests
- PUT requests
- PATCH requests
- DELETE requests

**NOT Required** for:
- GET requests
- HEAD requests
- OPTIONS requests

---

## Request Examples

### JavaScript/TypeScript (fetch)

#### Login
```typescript
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',  // ✅ Send and receive cookies
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!',
  }),
});

const data = await response.json();

// Store CSRF token
localStorage.setItem('csrfToken', data.csrfToken);
```

#### Protected POST Request
```typescript
const csrfToken = localStorage.getItem('csrfToken');

const response = await fetch('http://localhost:3001/api/auth/change-password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,  // ✅ Include CSRF token
  },
  credentials: 'include',  // ✅ Send cookies
  body: JSON.stringify({
    currentPassword: 'OldPassword123!',
    newPassword: 'NewSecurePassword456!',
  }),
});
```

#### Protected GET Request
```typescript
const response = await fetch('http://localhost:3001/api/auth/profile', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',  // ✅ Send cookies (no CSRF needed for GET)
});

const user = await response.json();
```

#### Logout
```typescript
const csrfToken = localStorage.getItem('csrfToken');

const response = await fetch('http://localhost:3001/api/auth/logout', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,  // ✅ Include CSRF token
  },
  credentials: 'include',  // ✅ Send cookies
});

// Clear CSRF token
localStorage.removeItem('csrfToken');
```

### cURL Examples

#### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePassword123!"}' \
  -c cookies.txt  # Save cookies to file
```

#### Protected Request
```bash
curl -X GET http://localhost:3001/api/auth/profile \
  -b cookies.txt  # Load cookies from file
```

#### Protected POST with CSRF
```bash
# First, extract CSRF token from login response
CSRF_TOKEN="a1b2c3d4e5f6...789.1730123456789.e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2"

curl -X POST http://localhost:3001/api/auth/logout \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -b cookies.txt
```

---

## Rate Limiting

### Current Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| /auth/login | 5 requests | 15 minutes |
| /auth/register | 3 requests | 1 hour |
| /auth/forgot-password | 3 requests | 15 minutes |
| /auth/resend-verification | 3 requests | 1 hour |

### Rate Limit Response

**Code**: `429 Too Many Requests`

```json
{
  "statusCode": 429,
  "message": "Too many requests from this IP, please try again later",
  "error": "Too Many Requests"
}
```

**Headers**:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1730124356
Retry-After: 900
```

---

## Security Best Practices

### Client-Side

1. **Always use `credentials: 'include'`**
   ```typescript
   fetch(url, { credentials: 'include' });
   ```

2. **Store CSRF token securely**
   ```typescript
   // ✅ Good: localStorage
   localStorage.setItem('csrfToken', token);

   // ❌ Bad: Plain variable (lost on refresh)
   let csrfToken = token;
   ```

3. **Include CSRF token for mutations**
   ```typescript
   if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
     headers['X-CSRF-Token'] = getCsrfToken();
   }
   ```

4. **Handle CSRF errors gracefully**
   ```typescript
   if (response.status === 403 && error.error === 'CSRF_TOKEN_INVALID') {
     // Refresh CSRF token
     await refreshCsrfToken();
     // Retry request
     return fetch(url, options);
   }
   ```

5. **Never log cookies or tokens**
   ```typescript
   // ❌ Bad
   console.log('Cookie:', document.cookie);  // Empty anyway
   console.log('CSRF Token:', csrfToken);

   // ✅ Good
   console.log('Authentication successful');
   ```

### Server-Side

1. **Cookies are HttpOnly** (enforced by backend)
2. **CSRF tokens have 24-hour expiry** (enforced by backend)
3. **Rate limiting on auth endpoints** (enforced by backend)
4. **Constant-time CSRF comparison** (timing attack prevention)

---

## Changelog

### Version 1.0.0 (2025-10-28)

- Initial cookie-based authentication API
- CSRF protection for all mutations
- HttpOnly cookie configuration
- Dual JWT extraction support
- Comprehensive error handling

---

**Last Updated**: 2025-10-28
**API Version**: 1.0.0
**Status**: Production Ready
