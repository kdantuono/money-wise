# Authentication Setup Guide

This guide provides step-by-step instructions for setting up and developing with the MoneyWise authentication system.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [JWT Configuration](#jwt-configuration)
- [Development Setup](#development-setup)
- [Testing Authentication](#testing-authentication)
- [Frontend Integration](#frontend-integration)
- [Common Development Tasks](#common-development-tasks)

## Prerequisites

Before setting up authentication, ensure you have:

- Node.js 18+ installed
- PostgreSQL 13+ running
- Redis (optional, for caching)
- pnpm package manager
- Git

## Environment Configuration

### 1. Copy Environment Template

```bash
cp .env.example .env
```

### 2. Configure Authentication Variables

Update your `.env` file with authentication-specific variables:

```bash
# JWT Configuration - Generate secure secrets
JWT_ACCESS_SECRET=your_very_secure_access_secret_min_32_chars
JWT_REFRESH_SECRET=your_very_secure_refresh_secret_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_secure_password
DATABASE_NAME=moneywise

# Application Configuration
NODE_ENV=development
PORT=3001

# Optional: Email for verification (future feature)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email
EMAIL_PASSWORD=your_email_password
```

### 3. Generate Secure JWT Secrets

Use these commands to generate cryptographically secure secrets:

```bash
# Generate access token secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate refresh token secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Database Setup

### 1. Start PostgreSQL

```bash
# Using Docker (recommended for development)
docker-compose -f docker-compose.dev.yml up -d postgres

# Or start your local PostgreSQL service
sudo systemctl start postgresql
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql -h localhost -U postgres

# Create database
CREATE DATABASE moneywise;

# Create user (optional)
CREATE USER moneywise_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE moneywise TO moneywise_user;
```

### 3. Run Migrations

```bash
# Navigate to backend
cd apps/backend

# Install dependencies
pnpm install

# Run database migrations
pnpm run migration:run

# Verify tables created
pnpm run typeorm:show
```

## JWT Configuration

### Understanding JWT Configuration

The authentication system uses two types of JWT tokens:

1. **Access Token**: Short-lived (15 minutes), used for API authentication
2. **Refresh Token**: Long-lived (7 days), used to generate new access tokens

### Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_ACCESS_SECRET` | Required | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Required | Secret for signing refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Access token expiration time |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Refresh token expiration time |

### Security Best Practices

1. **Use Different Secrets**: Access and refresh tokens must use different secrets
2. **Secret Length**: Use at least 32 characters for secrets
3. **Environment Variables**: Never commit secrets to version control
4. **Rotation**: Rotate secrets regularly in production

## Development Setup

### 1. Install Dependencies

```bash
# From project root
pnpm install

# Verify backend dependencies
cd apps/backend && pnpm install
```

### 2. Start Development Services

```bash
# Start all services (database, redis, backend, frontend)
docker-compose -f docker-compose.dev.yml up -d

# Or start services individually
docker-compose -f docker-compose.dev.yml up -d postgres redis
pnpm run dev:backend
pnpm run dev:web
```

### 3. Verify Authentication Module

```bash
cd apps/backend

# Run authentication tests
pnpm run test auth

# Check authentication endpoints
curl http://localhost:3001/auth/health
```

## Testing Authentication

### 1. Manual Testing with cURL

**Register a new user:**

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Login:**

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

**Access protected endpoint:**

```bash
curl -X GET http://localhost:3001/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 2. Using Automated Tests

```bash
cd apps/backend

# Run all authentication tests
pnpm run test:auth

# Run specific test file
pnpm run test auth.service.spec.ts

# Run tests in watch mode
pnpm run test:watch auth
```

### 3. API Documentation (Swagger)

Access the interactive API documentation:

```
http://localhost:3001/api
```

The Swagger UI provides:
- Interactive testing of all endpoints
- Request/response examples
- Authentication testing with Bearer tokens

## Frontend Integration

### 1. Authentication Store (Zustand)

The frontend uses Zustand for state management. Key files:

```typescript
// apps/web/stores/auth-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Implementation details...
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);
```

### 2. Authentication Hooks

```typescript
// Custom hook for authentication
export const useAuth = () => {
  const { user, login, logout, register } = useAuthStore();

  return {
    user,
    isAuthenticated: !!user,
    login,
    logout,
    register,
  };
};
```

### 3. Protected Routes

```typescript
// components/ProtectedRoute.tsx
import { useAuth } from '@/hooks/useAuth';
import { redirect } from 'next/navigation';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    redirect('/login');
  }

  return <>{children}</>;
};
```

### 4. API Client Setup

```typescript
// lib/api-client.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/auth-store';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle token refresh logic
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          // Refresh token logic
        } catch (refreshError) {
          // Logout user if refresh fails
          useAuthStore.getState().logout();
        }
      }
    }
    return Promise.reject(error);
  }
);
```

## Common Development Tasks

### 1. Adding New Authentication Routes

1. **Create DTO** (Data Transfer Object):

```typescript
// apps/backend/src/auth/dto/forgot-password.dto.ts
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}
```

2. **Add Service Method**:

```typescript
// apps/backend/src/auth/auth.service.ts
async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
  // Implementation
}
```

3. **Add Controller Endpoint**:

```typescript
// apps/backend/src/auth/auth.controller.ts
@Public()
@Post('forgot-password')
@ApiOperation({ summary: 'Request password reset' })
async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<void> {
  return this.authService.forgotPassword(forgotPasswordDto);
}
```

### 2. Modifying User Model

1. **Create Migration**:

```bash
cd apps/backend
pnpm run migration:generate -- AddNewUserField
pnpm run migration:run
```

2. **Update Entity**:

```typescript
// apps/backend/src/core/database/entities/user.entity.ts
@Column({ nullable: true })
phoneNumber?: string;
```

### 3. Testing Authentication Changes

1. **Unit Tests**:

```typescript
// apps/backend/src/auth/auth.service.spec.ts
describe('AuthService', () => {
  it('should register a new user', async () => {
    // Test implementation
  });
});
```

2. **Integration Tests**:

```typescript
// apps/backend/test/auth.e2e-spec.ts
describe('Auth (e2e)', () => {
  it('/auth/register (POST)', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send(registerDto)
      .expect(201);
  });
});
```

### 4. Debugging Authentication Issues

1. **Enable Debug Logging**:

```bash
# In .env
LOG_LEVEL=debug
```

2. **Check JWT Token**:

```bash
# Decode JWT token (without verification)
node -e "console.log(JSON.stringify(JSON.parse(Buffer.from('YOUR_TOKEN'.split('.')[1], 'base64').toString()), null, 2))"
```

3. **Database Query Debugging**:

```bash
# In .env
TYPEORM_LOGGING=true
```

### 5. Performance Optimization

1. **Database Indexing**:

```typescript
// Ensure email field is indexed
@Index('IDX_USER_EMAIL')
@Column({ unique: true })
email: string;
```

2. **JWT Token Caching**:

```typescript
// Cache user data in Redis
const cachedUser = await this.cacheService.get(`user:${userId}`);
```

## Security Checklist

- [ ] JWT secrets are 32+ characters and cryptographically secure
- [ ] Different secrets for access and refresh tokens
- [ ] Environment variables are properly configured
- [ ] Database passwords are secure
- [ ] HTTPS is enabled in production
- [ ] Rate limiting is configured
- [ ] Password complexity requirements are met
- [ ] bcrypt salt rounds are set to 12+
- [ ] Tokens have appropriate expiration times
- [ ] Error messages don't leak sensitive information

## Troubleshooting

For common authentication issues and solutions, see [Authentication Troubleshooting Guide](../api/authentication.md#troubleshooting).

## Next Steps

After setting up authentication:

1. Configure email verification (see email setup guide)
2. Set up rate limiting and security headers
3. Implement password reset functionality
4. Add two-factor authentication (2FA)
5. Set up session management and logout
6. Configure CORS for frontend integration

## Additional Resources

- [Authentication API Documentation](../api/authentication.md)
- [Security Best Practices](../security/authentication-security.md)
- [JWT.io](https://jwt.io/) - JWT token decoder and information
- [NestJS Authentication Guide](https://docs.nestjs.com/techniques/authentication)
- [TypeORM Documentation](https://typeorm.io/)