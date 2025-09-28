# Authentication API

This document provides comprehensive API documentation for the MoneyWise authentication system.

## Table of Contents

- [Overview](#overview)
- [Authentication Endpoints](#authentication-endpoints)
- [JWT Token Structure](#jwt-token-structure)
- [Authentication Headers](#authentication-headers)
- [Error Responses](#error-responses)
- [Rate Limiting](#rate-limiting)
- [Security Considerations](#security-considerations)

## Overview

MoneyWise uses JWT (JSON Web Token) based authentication with refresh tokens for secure API access. The authentication system supports:

- User registration with email verification
- Secure login with bcrypt password hashing
- JWT access tokens (15 minutes default)
- JWT refresh tokens (7 days default)
- Role-based access control
- Account status management

## Authentication Endpoints

### POST /auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Validation Rules:**
- `email`: Must be a valid email address
- `firstName`: 2-50 characters
- `lastName`: 2-50 characters
- `password`: 8-100 characters with:
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&)

**Success Response (201):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "user": {
    "id": "uuid-user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "role": "user",
    "status": "active",
    "avatar": null,
    "timezone": null,
    "currency": null,
    "preferences": {},
    "lastLoginAt": null,
    "emailVerifiedAt": null,
    "isEmailVerified": false,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "accounts": []
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input data
- `409 Conflict`: User with email already exists

### POST /auth/login

Authenticate user and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "user": {
    "id": "uuid-user-id",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "role": "user",
    "status": "active",
    "lastLoginAt": "2024-01-01T00:00:00.000Z",
    // ... other user fields
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid email or password
- `401 Unauthorized`: Account is not active

### POST /auth/refresh

Refresh the access token using a valid refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "user": {
    // ... user data
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid refresh token
- `401 Unauthorized`: User not found or inactive

### GET /auth/profile

Get the current user's profile information.

**Authentication Required:** Yes (Bearer token)

**Success Response (200):**
```json
{
  "id": "uuid-user-id",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "role": "user",
  "status": "active",
  "avatar": null,
  "timezone": "UTC",
  "currency": "USD",
  "preferences": {
    "theme": "light",
    "notifications": true
  },
  "lastLoginAt": "2024-01-01T00:00:00.000Z",
  "emailVerifiedAt": "2024-01-01T00:00:00.000Z",
  "isEmailVerified": true,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "accounts": []
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token

### POST /auth/logout

Logout the current user.

**Authentication Required:** Yes (Bearer token)

**Success Response (204):** No content

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token

**Note:** Since JWT tokens are stateless, logout only returns success. Clients should remove tokens from storage.

## JWT Token Structure

### Access Token Payload

```json
{
  "sub": "uuid-user-id",
  "email": "user@example.com",
  "role": "user",
  "iat": 1640995200,
  "exp": 1640996100
}
```

### Refresh Token Payload

```json
{
  "sub": "uuid-user-id",
  "email": "user@example.com",
  "role": "user",
  "iat": 1640995200,
  "exp": 1641600000
}
```

### Token Properties

- **Access Token**: Short-lived (15 minutes default)
- **Refresh Token**: Long-lived (7 days default)
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Issuer**: MoneyWise API
- **Subject**: User ID (UUID)

## Authentication Headers

### Authorization Header

For protected endpoints, include the access token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Content-Type Header

For POST requests with JSON body:

```http
Content-Type: application/json
```

## Error Responses

### Standard Error Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    {
      "field": "password",
      "message": "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"
    }
  ]
}
```

### Common Error Codes

| Status Code | Description | Common Causes |
|-------------|-------------|---------------|
| 400 | Bad Request | Invalid input data, validation errors |
| 401 | Unauthorized | Invalid credentials, expired/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 409 | Conflict | User already exists |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

### Authentication-Specific Errors

| Error Message | Status | Description |
|---------------|--------|-------------|
| "Invalid email or password" | 401 | Login credentials are incorrect |
| "User with this email already exists" | 409 | Registration with existing email |
| "Account is not active" | 401 | User account is disabled/suspended |
| "Invalid refresh token" | 401 | Refresh token is expired or invalid |
| "Access token required" | 401 | Missing or invalid access token |
| "Invalid token" | 401 | JWT token is malformed or expired |

## Rate Limiting

The authentication endpoints implement rate limiting to prevent abuse:

- **Login**: 5 attempts per 15 minutes per IP
- **Registration**: 3 attempts per hour per IP
- **Refresh**: 10 attempts per 5 minutes per IP

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1640996100
```

## Security Considerations

### Password Security

- Passwords are hashed using bcrypt with 12 salt rounds
- Minimum 8 characters with complexity requirements
- Passwords are never stored in plain text
- Passwords are never returned in API responses

### Token Security

- JWT secrets are stored as environment variables
- Separate secrets for access and refresh tokens
- Tokens include expiration times
- Token validation occurs on every protected request
- Refresh tokens are rotated on each refresh

### Account Security

- User accounts can be activated/deactivated
- Account status is checked on each authentication
- Email verification tracking (preparation for email verification)
- Last login timestamp tracking

### HTTPS Requirements

- All authentication endpoints require HTTPS in production
- Tokens should never be transmitted over unencrypted connections
- Store tokens securely in client applications (httpOnly cookies or secure storage)

## Environment Configuration

Required environment variables for authentication:

```bash
# JWT Configuration
JWT_ACCESS_SECRET=your_access_token_secret_here
JWT_REFRESH_SECRET=your_refresh_token_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Database (for user storage)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_db_password
DATABASE_NAME=moneywise
```

For detailed setup instructions, see [Authentication Setup Guide](../development/authentication-setup.md).