# Authentication Troubleshooting Guide

This guide provides solutions to common authentication issues, code examples, and debugging techniques for the MoneyWise authentication system.

## Table of Contents

- [Common Issues](#common-issues)
- [Error Codes Reference](#error-codes-reference)
- [Code Examples](#code-examples)
- [Debugging Techniques](#debugging-techniques)
- [Testing Scenarios](#testing-scenarios)
- [Performance Issues](#performance-issues)
- [Configuration Problems](#configuration-problems)

## Common Issues

### 1. Invalid Credentials Error

**Problem**: Users receive "Invalid email or password" error with correct credentials.

**Possible Causes:**
- Password hashing inconsistency
- Database connection issues
- User account status problems
- Case sensitivity in email

**Solutions:**

```typescript
// Debug password verification
async debugLogin(email: string, password: string) {
  console.log('Debug: Attempting login for:', email);

  const user = await this.userRepository.findOne({
    where: { email: email.toLowerCase() }, // Ensure case insensitivity
    select: ['id', 'email', 'passwordHash', 'status']
  });

  if (!user) {
    console.log('Debug: User not found');
    throw new UnauthorizedException('Invalid email or password');
  }

  console.log('Debug: User found, status:', user.status);

  if (user.status !== UserStatus.ACTIVE) {
    console.log('Debug: User not active');
    throw new UnauthorizedException('Account is not active');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  console.log('Debug: Password valid:', isPasswordValid);

  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid email or password');
  }

  return user;
}
```

**Quick Fix:**
```bash
# Check user in database
psql -d moneywise -c "SELECT email, status, created_at FROM users WHERE email = 'user@example.com';"

# Verify password hash format
psql -d moneywise -c "SELECT LENGTH(password_hash), SUBSTRING(password_hash, 1, 7) FROM users WHERE email = 'user@example.com';"
```

### 2. JWT Token Validation Errors

**Problem**: "Invalid token" or "Access token required" errors.

**Possible Causes:**
- Expired tokens
- Incorrect JWT secrets
- Malformed Authorization header
- Clock skew between servers

**Solutions:**

```typescript
// Debug JWT token validation
import * as jwt from 'jsonwebtoken';

function debugJwtToken(token: string) {
  try {
    // Decode without verification to see payload
    const decoded = jwt.decode(token, { complete: true });
    console.log('Token header:', decoded?.header);
    console.log('Token payload:', decoded?.payload);

    // Check expiration
    const payload = decoded?.payload as any;
    if (payload?.exp) {
      const expirationDate = new Date(payload.exp * 1000);
      const now = new Date();
      console.log('Token expires at:', expirationDate);
      console.log('Current time:', now);
      console.log('Token expired:', expirationDate < now);
    }

    // Verify with secret
    const verified = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    console.log('Token verified successfully:', verified);

  } catch (error) {
    console.log('Token validation error:', error.message);

    if (error.name === 'TokenExpiredError') {
      console.log('Token expired at:', error.expiredAt);
    } else if (error.name === 'JsonWebTokenError') {
      console.log('Token malformed or invalid signature');
    }
  }
}

// Usage in auth guard
@Injectable()
export class DebugJwtAuthGuard extends JwtAuthGuard {
  handleRequest(err: any, user: any, info: any, context: any, status?: any) {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.replace('Bearer ', '');

    if (info || err) {
      console.log('JWT Auth Debug:', {
        error: err?.message,
        info: info?.message,
        tokenPresent: !!token,
        tokenLength: token?.length
      });

      if (token) {
        debugJwtToken(token);
      }
    }

    return super.handleRequest(err, user, info, context, status);
  }
}
```

### 3. Refresh Token Issues

**Problem**: Refresh token fails with "Invalid refresh token" error.

**Possible Causes:**
- Using access token secret for refresh token
- Refresh token expired
- Token rotation not properly handled

**Solutions:**

```typescript
// Debug refresh token flow
async debugRefreshToken(refreshToken: string) {
  console.log('Debug: Attempting token refresh');

  try {
    // Verify with correct secret
    const payload = this.jwtService.verify(refreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    });
    console.log('Debug: Refresh token payload:', payload);

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      console.log('Debug: User not found for refresh token');
      throw new UnauthorizedException('Invalid refresh token');
    }

    console.log('Debug: User found, generating new tokens');
    return this.generateAuthResponse(user);

  } catch (error) {
    console.log('Debug: Refresh token error:', error.message);

    // Check if using wrong secret
    try {
      this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      console.log('Debug: Token verified with ACCESS secret - using wrong secret!');
    } catch {
      console.log('Debug: Token not valid with access secret either');
    }

    throw new UnauthorizedException('Invalid refresh token');
  }
}
```

### 4. CORS Errors

**Problem**: CORS errors when calling authentication endpoints from frontend.

**Solutions:**

```typescript
// Proper CORS configuration
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const corsOptions: CorsOptions = {
  origin: function (origin, callback) {
    // Allow requests from frontend URLs
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.enableCors(corsOptions);
```

### 5. Password Validation Failures

**Problem**: Password validation errors with valid passwords.

**Solutions:**

```typescript
// Debug password validation
function debugPasswordValidation(password: string) {
  const requirements = {
    minLength: password.length >= 8,
    maxLength: password.length <= 100,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[@$!%*?&]/.test(password)
  };

  console.log('Password requirements check:', requirements);

  const allValid = Object.values(requirements).every(req => req);
  console.log('Password valid:', allValid);

  return allValid;
}

// Custom password validator
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'passwordComplexity', async: false })
export class PasswordComplexityValidator implements ValidatorConstraintInterface {
  validate(password: string, args: ValidationArguments) {
    const requirements = {
      minLength: password.length >= 8,
      maxLength: password.length <= 100,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[@$!%*?&]/.test(password)
    };

    return Object.values(requirements).every(req => req);
  }

  defaultMessage(args: ValidationArguments) {
    const password = args.value;
    const issues = [];

    if (password.length < 8) issues.push('at least 8 characters');
    if (password.length > 100) issues.push('no more than 100 characters');
    if (!/[A-Z]/.test(password)) issues.push('at least one uppercase letter');
    if (!/[a-z]/.test(password)) issues.push('at least one lowercase letter');
    if (!/\d/.test(password)) issues.push('at least one number');
    if (!/[@$!%*?&]/.test(password)) issues.push('at least one special character (@$!%*?&)');

    return `Password must contain ${issues.join(', ')}`;
  }
}
```

## Error Codes Reference

### Authentication Error Codes

| Status | Error Code | Message | Cause | Solution |
|--------|------------|---------|-------|----------|
| 400 | `VALIDATION_ERROR` | Validation failed | Invalid input data | Check request body format |
| 401 | `INVALID_CREDENTIALS` | Invalid email or password | Wrong login credentials | Verify email and password |
| 401 | `ACCOUNT_INACTIVE` | Account is not active | User account disabled | Contact support or verify email |
| 401 | `TOKEN_EXPIRED` | Token has expired | JWT token expired | Refresh token or login again |
| 401 | `TOKEN_INVALID` | Invalid token | Malformed or wrong secret | Check token format and secrets |
| 401 | `TOKEN_MISSING` | Access token required | No Authorization header | Include Bearer token |
| 409 | `USER_EXISTS` | User with this email already exists | Duplicate registration | Use different email or login |
| 429 | `RATE_LIMITED` | Too many requests | Exceeded rate limit | Wait before retrying |

### JWT Error Types

```typescript
// JWT specific error handling
export class JwtErrorHandler {
  static handleJwtError(error: any): never {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Token has expired',
        error: 'TOKEN_EXPIRED',
        expiredAt: error.expiredAt
      });
    }

    if (error.name === 'JsonWebTokenError') {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Invalid token',
        error: 'TOKEN_INVALID',
        details: error.message
      });
    }

    if (error.name === 'NotBeforeError') {
      throw new UnauthorizedException({
        statusCode: 401,
        message: 'Token not active yet',
        error: 'TOKEN_NOT_ACTIVE',
        date: error.date
      });
    }

    throw new UnauthorizedException({
      statusCode: 401,
      message: 'Token validation failed',
      error: 'TOKEN_VALIDATION_ERROR'
    });
  }
}
```

## Code Examples

### 1. Complete Authentication Flow

```typescript
// Frontend authentication service
class AuthService {
  private apiClient = axios.create({
    baseURL: 'http://localhost:3001',
    timeout: 10000,
  });

  async register(userData: RegisterData) {
    try {
      const response = await this.apiClient.post('/auth/register', userData);
      this.setTokens(response.data);
      return response.data;
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  async login(credentials: LoginCredentials) {
    try {
      const response = await this.apiClient.post('/auth/login', credentials);
      this.setTokens(response.data);
      return response.data;
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await this.apiClient.post('/auth/refresh', {
        refreshToken
      });
      this.setTokens(response.data);
      return response.data;
    } catch (error) {
      this.clearTokens();
      throw error;
    }
  }

  private setTokens(authData: AuthResponse) {
    localStorage.setItem('accessToken', authData.accessToken);
    localStorage.setItem('refreshToken', authData.refreshToken);
    localStorage.setItem('user', JSON.stringify(authData.user));
  }

  private clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  private handleAuthError(error: any) {
    if (error.response?.status === 401) {
      this.clearTokens();
      window.location.href = '/login';
    }
    throw error;
  }
}
```

### 2. Automatic Token Refresh

```typescript
// Axios interceptor for automatic token refresh
class ApiClient {
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor() {
    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            const response = await this.client.post('/auth/refresh', {
              refreshToken
            });

            const { accessToken } = response.data;
            localStorage.setItem('accessToken', accessToken);

            this.processQueue(null, accessToken);

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return this.client(originalRequest);

          } catch (refreshError) {
            this.processQueue(refreshError, null);
            localStorage.clear();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private processQueue(error: any, token: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }
}
```

### 3. React Authentication Hook

```typescript
// Custom React hook for authentication
import { useState, useEffect, useContext, createContext } from 'react';

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const initializeAuth = async () => {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        try {
          const response = await fetch('/auth/profile', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            localStorage.clear();
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          localStorage.clear();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const authData = await response.json();
      localStorage.setItem('accessToken', authData.accessToken);
      localStorage.setItem('refreshToken', authData.refreshToken);
      setUser(authData.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  const value = {
    user,
    login,
    register: async (data: RegisterData) => { /* implementation */ },
    logout,
    isLoading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

## Debugging Techniques

### 1. Environment Variables Check

```bash
# Create debug script
#!/bin/bash
echo "=== Environment Variables Check ==="
echo "NODE_ENV: $NODE_ENV"
echo "JWT_ACCESS_SECRET set: ${JWT_ACCESS_SECRET:+YES}"
echo "JWT_REFRESH_SECRET set: ${JWT_REFRESH_SECRET:+YES}"
echo "JWT_ACCESS_EXPIRES_IN: $JWT_ACCESS_EXPIRES_IN"
echo "JWT_REFRESH_EXPIRES_IN: $JWT_REFRESH_EXPIRES_IN"
echo "DATABASE_HOST: $DATABASE_HOST"
echo "DATABASE_NAME: $DATABASE_NAME"
echo "================================"
```

### 2. Database Connection Test

```typescript
// Database connection test
async function testDatabaseConnection() {
  try {
    const connection = await createConnection({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT),
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });

    console.log('Database connection successful');

    const userCount = await connection.query('SELECT COUNT(*) FROM users');
    console.log('Users table accessible, count:', userCount[0].count);

    await connection.close();
  } catch (error) {
    console.error('Database connection failed:', error.message);
  }
}
```

### 3. JWT Token Debug Tool

```typescript
// JWT debug utility
export class JwtDebugger {
  static analyzeToken(token: string) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { error: 'Invalid JWT format' };
      }

      const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

      const now = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp && payload.exp < now;
      const timeToExpire = payload.exp ? payload.exp - now : null;

      return {
        header,
        payload,
        isExpired,
        timeToExpire,
        expiresAt: payload.exp ? new Date(payload.exp * 1000) : null,
        issuedAt: payload.iat ? new Date(payload.iat * 1000) : null
      };
    } catch (error) {
      return { error: 'Failed to decode token', details: error.message };
    }
  }

  static validateTokenStructure(token: string): boolean {
    const analysis = this.analyzeToken(token);
    if (analysis.error) return false;

    const payload = analysis.payload;
    return !!(payload.sub && payload.email && payload.iat && payload.exp);
  }
}
```

## Testing Scenarios

### 1. Authentication E2E Tests

```typescript
// E2E authentication tests
describe('Authentication E2E', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body.accessToken).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      expect(response.body.user.email).toBe(registerDto.email);

      // Verify user in database
      const user = await userRepository.findOne({
        where: { email: registerDto.email }
      });
      expect(user).toBeDefined();
      expect(user.status).toBe(UserStatus.ACTIVE);
    });

    it('should reject duplicate email registration', async () => {
      // Create existing user
      await userRepository.save({
        email: 'existing@example.com',
        passwordHash: 'hashedPassword',
        firstName: 'Existing',
        lastName: 'User',
        status: UserStatus.ACTIVE
      });

      const registerDto = {
        email: 'existing@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);
    });
  });

  describe('Token Refresh Flow', () => {
    it('should refresh tokens successfully', async () => {
      // Register user first
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'refresh@example.com',
          password: 'TestPassword123!',
          firstName: 'Refresh',
          lastName: 'User'
        });

      const { refreshToken } = registerResponse.body;

      // Wait a moment to ensure different iat
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Refresh tokens
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body.accessToken).toBeDefined();
      expect(refreshResponse.body.refreshToken).toBeDefined();
      expect(refreshResponse.body.accessToken).not.toBe(registerResponse.body.accessToken);
    });
  });
});
```

### 2. Unit Test Examples

```typescript
// Unit tests for AuthService
describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useClass: Repository,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('validateUser', () => {
    it('should return user for valid payload', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        status: UserStatus.ACTIVE,
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);

      const payload = {
        sub: 'user-id',
        email: 'test@example.com',
        role: 'user',
      };

      const result = await service.validateUser(payload);
      expect(result).toBe(mockUser);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        status: UserStatus.INACTIVE,
      };

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser as User);

      const payload = {
        sub: 'user-id',
        email: 'test@example.com',
        role: 'user',
      };

      await expect(service.validateUser(payload)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });
});
```

## Performance Issues

### 1. Slow Authentication Response

**Symptoms:**
- Login/register taking >2 seconds
- High CPU usage during authentication

**Diagnosis:**

```typescript
// Add timing middleware
@Injectable()
export class TimingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        if (duration > 1000) {
          console.warn(`Slow request: ${request.method} ${request.url} took ${duration}ms`);
        }
      })
    );
  }
}
```

**Solutions:**

```typescript
// Optimize bcrypt performance
const saltRounds = process.env.NODE_ENV === 'production' ? 12 : 10;

// Add database indexing
@Entity('users')
@Index('IDX_USER_EMAIL', ['email'])
@Index('IDX_USER_STATUS', ['status'])
export class User {
  // entity definition
}

// Optimize user queries
async findUserForAuth(email: string): Promise<User | null> {
  return this.userRepository.findOne({
    where: { email },
    select: ['id', 'email', 'passwordHash', 'role', 'status'], // Only select needed fields
    cache: 30000, // Cache for 30 seconds
  });
}
```

### 2. Memory Leaks in JWT Verification

**Solution:**

```typescript
// Implement JWT token caching
@Injectable()
export class JwtCacheService {
  private cache = new Map<string, { user: User; expiry: number }>();

  async verifyAndCache(token: string): Promise<User> {
    const cached = this.cache.get(token);
    if (cached && cached.expiry > Date.now()) {
      return cached.user;
    }

    const user = await this.verifyToken(token);

    // Cache for 5 minutes
    this.cache.set(token, {
      user,
      expiry: Date.now() + 5 * 60 * 1000
    });

    // Clean up expired entries
    this.cleanupCache();

    return user;
  }

  private cleanupCache() {
    const now = Date.now();
    for (const [token, cached] of this.cache.entries()) {
      if (cached.expiry <= now) {
        this.cache.delete(token);
      }
    }
  }
}
```

## Configuration Problems

### 1. Environment Variable Issues

**Check Script:**

```bash
#!/bin/bash
# check-auth-config.sh

echo "Checking authentication configuration..."

# Check required variables
REQUIRED_VARS="JWT_ACCESS_SECRET JWT_REFRESH_SECRET DATABASE_HOST DATABASE_NAME"

for var in $REQUIRED_VARS; do
  if [ -z "${!var}" ]; then
    echo "❌ $var is not set"
  else
    echo "✅ $var is set"
  fi
done

# Check JWT secret lengths
if [ ${#JWT_ACCESS_SECRET} -lt 32 ]; then
  echo "⚠️  JWT_ACCESS_SECRET should be at least 32 characters"
fi

if [ ${#JWT_REFRESH_SECRET} -lt 32 ]; then
  echo "⚠️  JWT_REFRESH_SECRET should be at least 32 characters"
fi

# Check if secrets are different
if [ "$JWT_ACCESS_SECRET" = "$JWT_REFRESH_SECRET" ]; then
  echo "❌ JWT_ACCESS_SECRET and JWT_REFRESH_SECRET should be different"
fi

echo "Configuration check complete."
```

### 2. Database Configuration Issues

**Debug Connection:**

```typescript
// database-debug.ts
import { DataSource } from 'typeorm';

async function testDatabaseConfig() {
  console.log('Testing database configuration...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT) || 5432,
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    entities: [User],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection successful');

    const queryRunner = dataSource.createQueryRunner();
    const tables = await queryRunner.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    console.log('✅ Available tables:', tables.map(t => t.table_name));

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

testDatabaseConfig();
```

---

**Remember**: Always test authentication changes in a development environment first, and never commit secrets to version control!