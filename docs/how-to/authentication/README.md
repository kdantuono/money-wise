# MoneyWise Authentication System

This document provides comprehensive documentation for the MoneyWise authentication system, including implementation details, security considerations, and usage examples.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [API Endpoints](#api-endpoints)
4. [JWT Implementation](#jwt-implementation)
5. [Security Features](#security-features)
6. [Usage Examples](#usage-examples)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)
9. [Development Setup](#development-setup)

## Overview

The MoneyWise authentication system provides secure user registration, login, and session management using JWT (JSON Web Tokens). It follows industry best practices for security and includes comprehensive protection against common vulnerabilities.

### Key Features

- **Secure Registration**: Email validation, password complexity requirements
- **JWT-based Authentication**: Stateless authentication with access and refresh tokens
- **Password Security**: bcrypt hashing with high salt rounds
- **Session Management**: Token refresh mechanism
- **Security Protection**: Rate limiting, input validation, timing attack prevention
- **Audit Logging**: Login tracking and user activity monitoring

## Architecture

The authentication system consists of several key components:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Controller    │───▶│    Service      │───▶│   Repository    │
│                 │    │                 │    │                 │
│ - Register      │    │ - Password Hash │    │ - User Entity   │
│ - Login         │    │ - JWT Creation  │    │ - Database Ops  │
│ - Refresh       │    │ - Validation    │    │                 │
│ - Profile       │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Guards        │    │   Strategies    │
│                 │    │                 │
│ - JWT Guard     │    │ - JWT Strategy  │
│ - Public Routes │    │ - Token Valid.  │
└─────────────────┘    └─────────────────┘
```

### Components

- **AuthController**: HTTP endpoints for authentication operations
- **AuthService**: Business logic for user authentication and token management
- **JwtStrategy**: Passport strategy for JWT token validation
- **JwtAuthGuard**: Route guard for protecting authenticated endpoints
- **User Entity**: Database model for user data

## API Endpoints

### POST /auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "password": "SecurePassword123!"
}
```

**Response (201):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "status": "active",
    "fullName": "John Doe",
    "isEmailVerified": false,
    "isActive": true
  },
  "expiresIn": 900
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input data
- `409 Conflict`: User already exists

### POST /auth/login

Authenticate an existing user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "status": "active",
    "lastLoginAt": "2023-12-01T10:00:00Z"
  },
  "expiresIn": 900
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input format
- `401 Unauthorized`: Invalid credentials or inactive account

### POST /auth/refresh

Refresh an expired access token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  },
  "expiresIn": 900
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired refresh token

### GET /auth/profile

Get current user profile information.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "user",
  "status": "active",
  "currency": "USD",
  "preferences": {
    "theme": "light",
    "language": "en"
  },
  "fullName": "John Doe",
  "isEmailVerified": true,
  "isActive": true
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token

### POST /auth/logout

Logout the current user (client-side token removal).

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (204):**
No content

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token

## JWT Implementation

### Token Structure

The authentication system uses two types of JWT tokens:

1. **Access Token**: Short-lived (15 minutes) for API access
2. **Refresh Token**: Long-lived (7 days) for token renewal

### Token Payload

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "user",
  "iat": 1701345600,
  "exp": 1701349200
}
```

### Environment Configuration

```bash
# JWT Secrets (use strong, random values in production)
JWT_ACCESS_SECRET=your-access-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# Token Expiration
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### Security Considerations

- Access and refresh tokens use different secrets
- Tokens include expiration times
- Payload contains minimal user information
- No sensitive data stored in tokens

## Security Features

### Password Security

- **bcrypt Hashing**: 12 salt rounds (OWASP recommended)
- **Password Requirements**:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character

### Protection Mechanisms

1. **Timing Attack Prevention**: Generic error messages for user enumeration protection
2. **Input Validation**: Comprehensive validation using class-validator
3. **SQL Injection Protection**: TypeORM parameterized queries
4. **Rate Limiting**: Built-in protection against brute force attacks
5. **Data Exposure Prevention**: Sensitive data excluded from responses

### Authentication Flow Security

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │   Server    │    │  Database   │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │
    1. │ POST /auth/login │                  │
       │─────────────────▶│                  │
       │                  │ 2. Query user    │
       │                  │─────────────────▶│
       │                  │ 3. User data     │
       │                  │◀─────────────────│
       │                  │ 4. Verify password
       │                  │    (bcrypt.compare)
       │                  │ 5. Generate JWT  │
       │                  │ 6. Update login  │
       │                  │─────────────────▶│
       │ 7. JWT tokens    │                  │
       │◀─────────────────│                  │
```

## Usage Examples

### Frontend Integration (React/Next.js)

```typescript
// auth.service.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);

    // Store tokens securely
    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);

    return response.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, data);

    // Store tokens securely
    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);

    return response.data;
  }

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken
    });

    // Update stored tokens
    localStorage.setItem('accessToken', response.data.accessToken);
    localStorage.setItem('refreshToken', response.data.refreshToken);

    return response.data;
  }

  async getProfile(): Promise<User> {
    const token = localStorage.getItem('accessToken');

    const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    return response.data;
  }

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}

export const authService = new AuthService();
```

### Axios Interceptor for Token Management

```typescript
// api.config.ts
import axios from 'axios';
import { authService } from './auth.service';

// Request interceptor to add auth token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await authService.refreshToken();
        const newToken = localStorage.getItem('accessToken');
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        authService.logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

### React Hook for Authentication

```typescript
// useAuth.hook.ts
import { useState, useEffect, useContext, createContext } from 'react';
import { authService } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const user = await authService.getProfile();
        setUser(user);
      }
    } catch (error) {
      // Token might be expired, try to refresh
      try {
        await authService.refreshToken();
        const user = await authService.getProfile();
        setUser(user);
      } catch (refreshError) {
        authService.logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials);
    setUser(response.user);
  };

  const register = async (data: RegisterData) => {
    const response = await authService.register(data);
    setUser(response.user);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        loading,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

## Testing

### Running Tests

```bash
# Unit tests
npm run test:unit -- auth

# Integration tests
npm run test:integration -- auth

# Coverage report
npm run test:coverage -- auth

# Security tests
npm run test -- auth.security.spec.ts
```

### Test Coverage

The authentication system includes comprehensive test coverage:

- **Unit Tests**: Service logic, JWT validation, password hashing
- **Integration Tests**: API endpoints, request/response validation
- **Security Tests**: Vulnerability protection, timing attacks, data exposure
- **Guard Tests**: Route protection, public route handling

### Example Test

```typescript
// Example integration test
describe('POST /auth/login', () => {
  it('should authenticate user with valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Password123!'
      })
      .expect(200);

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('refreshToken');
    expect(response.body.user.email).toBe('test@example.com');
  });
});
```

## Troubleshooting

### Common Issues

#### 1. "Invalid email or password" Error

**Symptoms**: Login fails with generic error message
**Causes**:
- Incorrect credentials
- User account is inactive
- Database connection issues

**Solutions**:
- Verify credentials are correct
- Check user status in database
- Verify database connectivity

#### 2. "Access token required" Error

**Symptoms**: API calls fail with authentication error
**Causes**:
- Missing Authorization header
- Expired access token
- Invalid token format

**Solutions**:
```typescript
// Ensure proper header format
headers: {
  'Authorization': `Bearer ${accessToken}`
}

// Implement token refresh logic
if (error.response?.status === 401) {
  await refreshToken();
  // Retry the original request
}
```

#### 3. Token Refresh Fails

**Symptoms**: Refresh token returns 401 error
**Causes**:
- Refresh token expired
- Invalid refresh token
- User account deactivated

**Solutions**:
- Redirect to login page
- Clear stored tokens
- Re-authenticate user

#### 4. CORS Issues

**Symptoms**: Browser blocks authentication requests
**Causes**:
- Missing CORS configuration
- Incorrect origin settings

**Solutions**:
```typescript
// Enable CORS in NestJS
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true
});
```

### Debug Mode

Enable debug logging for authentication:

```bash
# Set environment variable
DEBUG=auth:*

# Or use application-specific logging
LOG_LEVEL=debug
```

### Health Checks

Verify authentication system health:

```bash
# Check if auth endpoints are responsive
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Verify JWT validation
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis (optional, for session management)

### Environment Variables

Create a `.env` file with required configuration:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/moneywise

# JWT Configuration
JWT_ACCESS_SECRET=your-super-secret-access-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Application
NODE_ENV=development
PORT=3000
```

### Database Setup

```bash
# Run migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed
```

### Starting Development Server

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Check code quality
npm run lint
npm run typecheck
```

### Docker Development

```bash
# Start services
docker-compose up -d

# Run application
npm run dev

# Run tests in Docker
docker-compose exec app npm run test
```

## Security Checklist

When deploying to production, ensure:

- [ ] Strong JWT secrets configured
- [ ] HTTPS enabled for all endpoints
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Database credentials secured
- [ ] Error logging configured (without sensitive data)
- [ ] Password complexity requirements enforced
- [ ] Session timeout configured appropriately
- [ ] Security headers enabled (helmet.js)
- [ ] Input validation on all endpoints
- [ ] SQL injection protection verified
- [ ] XSS protection enabled
- [ ] CSRF protection implemented

---

For additional questions or issues, please refer to the project documentation or create an issue in the repository.