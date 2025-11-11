# JWT Implementation Guide

This guide provides detailed information about the JWT (JSON Web Token) implementation in the MoneyWise authentication system.

## Table of Contents

1. [JWT Overview](#jwt-overview)
2. [Token Types](#token-types)
3. [Token Structure](#token-structure)
4. [Token Lifecycle](#token-lifecycle)
5. [Security Considerations](#security-considerations)
6. [Implementation Details](#implementation-details)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## JWT Overview

JWT (JSON Web Token) is a compact, URL-safe means of representing claims to be transferred between two parties. In MoneyWise, we use JWTs for stateless authentication, eliminating the need for server-side session storage.

### Why JWT?

- **Stateless**: No server-side session storage required
- **Scalable**: Can be validated by any server instance
- **Secure**: Cryptographically signed to prevent tampering
- **Compact**: Small size suitable for HTTP headers and URLs
- **Self-contained**: Contains all necessary information

## Token Types

MoneyWise implements a dual-token system for enhanced security:

### Access Token
- **Purpose**: API authentication and authorization
- **Lifetime**: 15 minutes (short-lived)
- **Usage**: Included in Authorization header for API requests
- **Security**: Frequent expiration reduces impact of token compromise

### Refresh Token
- **Purpose**: Obtaining new access tokens
- **Lifetime**: 7 days (long-lived)
- **Usage**: Exchanged for new access/refresh token pairs
- **Security**: Longer lifetime but limited to token refresh endpoint

## Token Structure

### JWT Components

A JWT consists of three parts separated by dots (`.`):

```
header.payload.signature
```

#### Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

#### Payload (Claims)
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "user",
  "iat": 1701345600,
  "exp": 1701349200
}
```

#### Signature
```
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret
)
```

### MoneyWise JWT Payload

Our JWT tokens contain the following claims:

| Claim | Description | Type | Example |
|-------|-------------|------|---------|
| `sub` | Subject (User ID) | string | "123e4567-e89b-12d3-a456-426614174000" |
| `email` | User email address | string | "user@example.com" |
| `role` | User role | string | "user" or "admin" |
| `iat` | Issued at (timestamp) | number | 1701345600 |
| `exp` | Expires at (timestamp) | number | 1701349200 |

### Standard Claims

- **`sub` (Subject)**: Unique user identifier (UUID)
- **`iat` (Issued At)**: Token creation timestamp
- **`exp` (Expiration Time)**: Token expiration timestamp

### Custom Claims

- **`email`**: User's email address for identification
- **`role`**: User's role for authorization decisions

## Token Lifecycle

### 1. Token Generation

```typescript
// Access Token
const accessPayload = {
  sub: user.id,
  email: user.email,
  role: user.role,
};

const accessToken = this.jwtService.sign(accessPayload, {
  secret: process.env.JWT_ACCESS_SECRET,
  expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
});

// Refresh Token
const refreshToken = this.jwtService.sign(accessPayload, {
  secret: process.env.JWT_REFRESH_SECRET,
  expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
});
```

### 2. Token Validation

```typescript
// Validate Access Token
try {
  const payload = this.jwtService.verify(token, {
    secret: process.env.JWT_ACCESS_SECRET,
  });

  // Additional validation
  const user = await this.validateUser(payload);
  return user;
} catch (error) {
  throw new UnauthorizedException('Invalid token');
}
```

### 3. Token Refresh Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthService
    participant Database

    Client->>API: Request with expired access token
    API->>Client: 401 Unauthorized
    Client->>API: POST /auth/refresh with refresh token
    API->>AuthService: Validate refresh token
    AuthService->>Database: Verify user exists and is active
    Database->>AuthService: User data
    AuthService->>API: Generate new token pair
    API->>Client: New access + refresh tokens
    Client->>API: Retry original request with new access token
    API->>Client: Success response
```

### 4. Token Expiration Handling

```typescript
// Client-side token refresh logic
const refreshTokenIfNeeded = async () => {
  const token = localStorage.getItem('accessToken');

  if (!token) return null;

  try {
    // Decode token to check expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;

    // Refresh if token expires in next 5 minutes
    if (payload.exp - now < 300) {
      await refreshAccessToken();
    }

    return localStorage.getItem('accessToken');
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
};
```

## Security Considerations

### Token Secrets

```typescript
// Environment configuration
JWT_ACCESS_SECRET=your-256-bit-secret-for-access-tokens
JWT_REFRESH_SECRET=your-different-256-bit-secret-for-refresh-tokens
```

**Requirements:**
- Minimum 256 bits (32 characters) of randomness
- Different secrets for access and refresh tokens
- Never commit secrets to version control
- Rotate secrets periodically in production

### Token Storage

#### Client-Side Options

| Storage Method | Security | Persistence | Pros | Cons |
|---------------|----------|-------------|------|------|
| `localStorage` | Medium | Yes | Simple, survives tab close | Vulnerable to XSS |
| `sessionStorage` | Medium | No | Cleared on tab close | Vulnerable to XSS |
| `httpOnly Cookie` | High | Yes | XSS protection | CSRF vulnerability |
| `Memory only` | High | No | Most secure | Lost on refresh |

**Recommended Approach:**
```typescript
// Store access token in memory
let accessToken: string | null = null;

// Store refresh token in httpOnly cookie (server-side)
// Or use secure localStorage with XSS protection
```

### Token Validation Security

```typescript
// Always validate token on server side
const validateToken = async (token: string) => {
  try {
    // 1. Verify signature
    const payload = this.jwtService.verify(token, {
      secret: process.env.JWT_ACCESS_SECRET,
    });

    // 2. Check expiration (automatically handled by verify)

    // 3. Validate user still exists and is active
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  } catch (error) {
    throw new UnauthorizedException('Invalid token');
  }
};
```

### Preventing Token Attacks

#### 1. Token Replay Attacks
- Short token lifetime (15 minutes for access tokens)
- Token rotation on refresh
- Secure token storage

#### 2. Token Tampering
- Cryptographic signature verification
- Secret key protection
- Payload validation

#### 3. Token Theft
- HTTPS enforcement
- Secure storage practices
- Token binding (optional)

## Implementation Details

### JWT Service Configuration

```typescript
// jwt.module.ts
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m'
      },
    }),
  ],
})
export class JwtAuthModule {}
```

### Custom JWT Strategy

```typescript
// jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    try {
      return await this.authService.validateUser(payload);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

### JWT Auth Guard

```typescript
// jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: any, status?: any): any {
    if (err || !user) {
      throw err || new UnauthorizedException('Access token required');
    }
    return user;
  }
}
```

### Token Generation Service

```typescript
// auth.service.ts
private async generateAuthResponse(user: User): Promise<AuthResponseDto> {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = this.jwtService.sign(payload, {
    secret: process.env.JWT_ACCESS_SECRET,
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });

  const refreshToken = this.jwtService.sign(payload, {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

  return {
    accessToken,
    refreshToken,
    user: this.sanitizeUser(user),
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}
```

## Best Practices

### 1. Token Lifetime Management

```typescript
// Configure appropriate lifetimes
const TOKEN_CONFIG = {
  ACCESS_TOKEN_LIFETIME: '15m',    // Short for security
  REFRESH_TOKEN_LIFETIME: '7d',    // Longer for convenience
  ROTATION_THRESHOLD: '5m',        // Refresh before expiry
};
```

### 2. Error Handling

```typescript
// Generic error messages to prevent information leakage
const handleAuthError = (error: any) => {
  if (error.name === 'TokenExpiredError') {
    throw new UnauthorizedException('Token expired');
  }

  if (error.name === 'JsonWebTokenError') {
    throw new UnauthorizedException('Invalid token');
  }

  throw new UnauthorizedException('Authentication failed');
};
```

### 3. Token Validation Middleware

```typescript
// Validate tokens in middleware
export const validateTokenMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = extractTokenFromHeader(req);

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
```

### 4. Client-Side Best Practices

```typescript
// Automatic token refresh
class TokenManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;

  async getValidToken(): Promise<string> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    if (this.isTokenExpiringSoon(this.accessToken)) {
      return this.refreshTokenIfNeeded();
    }

    return this.accessToken;
  }

  private async refreshTokenIfNeeded(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private isTokenExpiringSoon(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      return payload.exp - now < 300; // 5 minutes
    } catch {
      return true;
    }
  }
}
```

## Troubleshooting

### Common Issues

#### 1. "Token expired" Error

**Cause**: Access token has exceeded its 15-minute lifetime
**Solution**: Implement automatic token refresh

```typescript
// Axios interceptor for automatic refresh
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await refreshToken();
        const newToken = getAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

#### 2. "Invalid signature" Error

**Cause**: Token signed with different secret or token tampering
**Solutions**:
- Verify JWT secrets match between environments
- Check for token corruption during transmission
- Ensure consistent secret configuration

#### 3. Clock Skew Issues

**Cause**: Server time differences causing premature expiration
**Solution**: Add clock tolerance

```typescript
// Add clock tolerance (30 seconds)
const payload = this.jwtService.verify(token, {
  secret: process.env.JWT_ACCESS_SECRET,
  clockTolerance: 30,
});
```

#### 4. CORS Issues with Authorization Header

**Cause**: CORS configuration not allowing Authorization header
**Solution**: Configure CORS properly

```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

### Debugging JWT Issues

#### 1. Token Inspection

```bash
# Decode JWT payload (header.payload.signature)
echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" | cut -d. -f2 | base64 -d
```

#### 2. Token Validation Testing

```typescript
// Test token validation
const testToken = async (token: string) => {
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    console.log('Token valid:', payload);
  } catch (error) {
    console.error('Token invalid:', error.message);
  }
};
```

#### 3. Environment Verification

```typescript
// Verify JWT configuration
const verifyJwtConfig = () => {
  console.log('JWT Access Secret length:', process.env.JWT_ACCESS_SECRET?.length);
  console.log('JWT Refresh Secret length:', process.env.JWT_REFRESH_SECRET?.length);
  console.log('Access token expiry:', process.env.JWT_ACCESS_EXPIRES_IN);
  console.log('Refresh token expiry:', process.env.JWT_REFRESH_EXPIRES_IN);
};
```

### Performance Considerations

#### 1. Token Size Optimization

```typescript
// Keep payload minimal
const payload = {
  sub: user.id,        // Required
  email: user.email,   // For display
  role: user.role,     // For authorization
  // Avoid: user profile data, preferences, etc.
};
```

#### 2. Caching Strategy

```typescript
// Cache user data to avoid database lookups
const validateUserWithCache = async (payload: JwtPayload) => {
  const cacheKey = `user:${payload.sub}`;
  let user = await redis.get(cacheKey);

  if (!user) {
    user = await this.userRepository.findOne({ where: { id: payload.sub } });
    await redis.setex(cacheKey, 300, JSON.stringify(user)); // 5 min cache
  }

  return JSON.parse(user);
};
```

#### 3. Connection Pooling

```typescript
// Use connection pooling for database validation
const typeOrmConfig = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  extra: {
    max: 20,              // Maximum connections
    min: 5,               // Minimum connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
};
```

---

This guide provides comprehensive information about JWT implementation in MoneyWise. For additional questions or advanced configurations, refer to the main authentication documentation or consult the development team.