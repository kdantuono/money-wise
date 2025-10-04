# Authentication Security Best Practices

This document outlines security best practices implemented in the MoneyWise authentication system and provides guidelines for maintaining secure authentication in production environments.

## Table of Contents

1. [Security Principles](#security-principles)
2. [Password Security](#password-security)
3. [JWT Security](#jwt-security)
4. [Session Management](#session-management)
5. [Attack Prevention](#attack-prevention)
6. [Data Protection](#data-protection)
7. [Production Security](#production-security)
8. [Monitoring and Auditing](#monitoring-and-auditing)
9. [Compliance and Standards](#compliance-and-standards)

## Security Principles

### Defense in Depth

Our authentication system implements multiple layers of security:

```
┌─────────────────────────────────────────────────────────────┐
│                    Client-Side Security                     │
│  • Input validation                                         │
│  • Secure token storage                                     │
│  • HTTPS enforcement                                        │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Transport Security                        │
│  • TLS 1.3 encryption                                      │
│  • Certificate validation                                   │
│  • HSTS headers                                            │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Application Security                       │
│  • JWT validation                                          │
│  • Rate limiting                                           │
│  • Input sanitization                                      │
│  • Authorization checks                                     │
└─────────────────────────────────────────────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Security                           │
│  • Password hashing                                        │
│  • Database encryption                                     │
│  • Secret management                                       │
└─────────────────────────────────────────────────────────────┘
```

### Zero Trust Architecture

- Never trust, always verify
- Validate all inputs and requests
- Implement least privilege access
- Continuous authentication validation

### Principle of Least Privilege

```typescript
// Role-based access control
export enum Permission {
  READ_OWN_PROFILE = 'read:own:profile',
  UPDATE_OWN_PROFILE = 'update:own:profile',
  READ_ALL_USERS = 'read:all:users',
  MANAGE_USERS = 'manage:users',
}

export const RolePermissions = {
  [UserRole.USER]: [
    Permission.READ_OWN_PROFILE,
    Permission.UPDATE_OWN_PROFILE,
  ],
  [UserRole.ADMIN]: [
    Permission.READ_OWN_PROFILE,
    Permission.UPDATE_OWN_PROFILE,
    Permission.READ_ALL_USERS,
    Permission.MANAGE_USERS,
  ],
};
```

## Password Security

### Password Requirements

MoneyWise enforces strong password requirements:

```typescript
// Password validation regex
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  maxLength: 100,
  requireLowercase: true,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '@$!%*?&',
};
```

**Requirements:**
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (@$!%*?&)
- Maximum 100 characters to prevent DoS attacks

### Password Hashing

```typescript
import * as bcrypt from 'bcryptjs';

// Use high salt rounds (OWASP recommended: 10-12)
const SALT_ROUNDS = 12;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const verifyPassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};
```

**Security Features:**
- bcrypt with 12 salt rounds (OWASP recommended)
- Automatic salt generation
- Timing attack resistance
- Rainbow table protection

### Password Storage

```typescript
// Never store plaintext passwords
@Entity('users')
export class User {
  @Column({ type: 'varchar', length: 255 })
  @Exclude() // Exclude from serialization
  passwordHash: string;

  // Password field should never be stored
  @ValidateNested()
  @Type(() => String)
  password?: string; // Temporary field for validation only
}
```

**Best Practices:**
- Never store plaintext passwords
- Use `@Exclude()` decorator to prevent serialization
- Store only bcrypt hashes
- Use separate field for temporary password validation

## JWT Security

### Token Configuration

```typescript
// Environment variables for JWT security
export const JWT_CONFIG = {
  ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,     // 256+ bit secret
  REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,   // Different 256+ bit secret
  ACCESS_EXPIRES_IN: '15m',                         // Short-lived
  REFRESH_EXPIRES_IN: '7d',                         // Longer-lived
  ALGORITHM: 'HS256',                               // HMAC SHA-256
  ISSUER: 'moneywise',                             // Token issuer
  AUDIENCE: 'moneywise-app',                       // Token audience
};
```

### Secret Management

```bash
# Generate strong secrets (256 bits minimum)
openssl rand -base64 32

# Environment variables
JWT_ACCESS_SECRET=your-strong-secret-here-256-bits-minimum
JWT_REFRESH_SECRET=different-strong-secret-here-256-bits-minimum

# Never commit secrets to version control
echo "*.env*" >> .gitignore
```

### Token Validation

```typescript
export const validateJWT = async (token: string, secret: string): Promise<JwtPayload> => {
  try {
    // Verify signature and expiration
    const payload = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE,
      clockTolerance: 30, // 30 seconds tolerance for clock skew
    }) as JwtPayload;

    // Additional payload validation
    if (!payload.sub || !payload.email || !payload.role) {
      throw new Error('Invalid payload structure');
    }

    return payload;
  } catch (error) {
    throw new UnauthorizedException('Invalid token');
  }
};
```

### Token Storage Security

#### Client-Side Options

```typescript
// Option 1: Memory storage (most secure)
class SecureTokenStorage {
  private static accessToken: string | null = null;

  static setToken(token: string): void {
    this.accessToken = token;
  }

  static getToken(): string | null {
    return this.accessToken;
  }

  static clearToken(): void {
    this.accessToken = null;
  }
}

// Option 2: Encrypted localStorage
class EncryptedStorage {
  private static encrypt(data: string): string {
    // Use crypto-js or similar for encryption
    return CryptoJS.AES.encrypt(data, 'encryption-key').toString();
  }

  private static decrypt(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, 'encryption-key');
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  static setToken(token: string): void {
    const encrypted = this.encrypt(token);
    localStorage.setItem('auth_token', encrypted);
  }

  static getToken(): string | null {
    const encrypted = localStorage.getItem('auth_token');
    return encrypted ? this.decrypt(encrypted) : null;
  }
}
```

## Session Management

### Token Lifecycle Management

```typescript
export class TokenManager {
  private static readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  static async getValidToken(): Promise<string> {
    const token = this.getStoredToken();

    if (!token) {
      throw new Error('No token available');
    }

    if (this.isTokenExpiringSoon(token)) {
      return this.refreshToken();
    }

    return token;
  }

  private static isTokenExpiringSoon(token: string): boolean {
    try {
      const payload = jwt.decode(token) as JwtPayload;
      const expiresAt = payload.exp * 1000;
      const now = Date.now();

      return (expiresAt - now) < this.REFRESH_THRESHOLD;
    } catch {
      return true;
    }
  }

  private static async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await api.post('/auth/refresh', { refreshToken });
      this.storeTokens(response.data.accessToken, response.data.refreshToken);
      return response.data.accessToken;
    } catch (error) {
      this.clearTokens();
      throw new Error('Token refresh failed');
    }
  }
}
```

### Session Timeout

```typescript
// Implement session timeout
export class SessionManager {
  private static sessionTimeout: NodeJS.Timeout | null = null;
  private static readonly TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes

  static resetSessionTimeout(): void {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }

    this.sessionTimeout = setTimeout(() => {
      this.handleSessionTimeout();
    }, this.TIMEOUT_DURATION);
  }

  private static handleSessionTimeout(): void {
    // Clear tokens
    TokenManager.clearTokens();

    // Redirect to login
    window.location.href = '/login?reason=session_timeout';
  }

  static clearSessionTimeout(): void {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
  }
}
```

## Attack Prevention

### Brute Force Protection

```typescript
// Rate limiting implementation
import rateLimit from 'express-rate-limit';

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many login attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Store in Redis for distributed systems
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:auth:',
  }),
});

// Apply to auth endpoints
app.use('/auth/login', authRateLimit);
app.use('/auth/register', authRateLimit);
```

### Timing Attack Prevention

```typescript
// Constant-time comparison for security
export const secureLogin = async (email: string, password: string) => {
  const user = await userRepository.findOne({ where: { email } });

  // Always perform hash comparison to prevent timing attacks
  const hashToCompare = user?.passwordHash || '$2a$12$dummy.hash.to.prevent.timing.attacks';
  const isPasswordValid = await bcrypt.compare(password, hashToCompare);

  if (!user || !isPasswordValid || user.status !== UserStatus.ACTIVE) {
    // Generic error message
    throw new UnauthorizedException('Invalid email or password');
  }

  return user;
};
```

### SQL Injection Prevention

```typescript
// Use parameterized queries with TypeORM
export const findUserByEmail = async (email: string): Promise<User | null> => {
  // TypeORM automatically sanitizes inputs
  return userRepository.findOne({
    where: { email }, // Safely parameterized
    select: ['id', 'email', 'passwordHash', 'role', 'status'],
  });
};

// Manual query (if needed) - use parameters
export const customUserQuery = async (email: string): Promise<User[]> => {
  return userRepository.query(
    'SELECT * FROM users WHERE email = $1 AND status = $2',
    [email, UserStatus.ACTIVE] // Parameterized values
  );
};
```

### XSS Prevention

```typescript
// Input sanitization
import DOMPurify from 'dompurify';
import { escape } from 'html-escaper';

export const sanitizeInput = (input: string): string => {
  // Remove HTML tags and escape special characters
  return escape(DOMPurify.sanitize(input, { ALLOWED_TAGS: [] }));
};

// Apply to user inputs
export const createUser = async (userData: CreateUserDto) => {
  const sanitizedUser = {
    ...userData,
    firstName: sanitizeInput(userData.firstName),
    lastName: sanitizeInput(userData.lastName),
    email: userData.email.toLowerCase().trim(),
  };

  return userRepository.save(sanitizedUser);
};
```

### CSRF Protection

```typescript
// CSRF protection for state-changing operations
import csrf from 'csurf';

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  },
});

// Apply to state-changing endpoints
app.use('/auth/register', csrfProtection);
app.use('/auth/login', csrfProtection);
app.use('/auth/logout', csrfProtection);
```

## Data Protection

### Sensitive Data Handling

```typescript
// Data classification
export enum DataClassification {
  PUBLIC = 'public',
  INTERNAL = 'internal',
  CONFIDENTIAL = 'confidential',
  RESTRICTED = 'restricted',
}

// Secure data transformers
export class UserTransformer {
  static toPublic(user: User): PublicUserDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      // Exclude sensitive fields
    };
  }

  static toProfile(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      preferences: user.preferences,
      // Include profile data but exclude passwordHash
    };
  }
}
```

### Encryption at Rest

```typescript
// Database encryption for sensitive fields
import { createCipher, createDecipher } from 'crypto';

@Entity('users')
export class User {
  @Column({
    type: 'varchar',
    transformer: {
      to: (value: string) => encrypt(value),
      from: (value: string) => decrypt(value),
    },
  })
  encryptedField: string;
}

const encrypt = (text: string): string => {
  const cipher = createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

const decrypt = (encryptedText: string): string => {
  const decipher = createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
```

### Audit Logging

```typescript
// Security event logging
export class SecurityLogger {
  static logAuthEvent(event: AuthEvent): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event: event.type,
      userId: event.userId,
      ip: event.ipAddress,
      userAgent: event.userAgent,
      success: event.success,
      metadata: event.metadata,
    };

    // Log to secure audit system
    logger.security(logEntry);

    // Alert on security events
    if (event.type === 'FAILED_LOGIN' && event.metadata?.attemptCount > 3) {
      SecurityAlerts.triggerAlert('BRUTE_FORCE_ATTEMPT', logEntry);
    }
  }
}

// Usage in auth service
await SecurityLogger.logAuthEvent({
  type: 'USER_LOGIN',
  userId: user.id,
  ipAddress: req.ip,
  userAgent: req.get('User-Agent'),
  success: true,
  metadata: { loginMethod: 'password' },
});
```

## Production Security

### HTTPS Configuration

```typescript
// Express HTTPS configuration
import https from 'https';
import fs from 'fs';

const httpsOptions = {
  key: fs.readFileSync(process.env.SSL_KEY_PATH),
  cert: fs.readFileSync(process.env.SSL_CERT_PATH),
  // Use strong cipher suites
  ciphers: [
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-SHA256',
    'ECDHE-RSA-AES256-SHA384',
  ].join(':'),
  honorCipherOrder: true,
};

const server = https.createServer(httpsOptions, app);
```

### Security Headers

```typescript
import helmet from 'helmet';

// Security headers middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

### Environment Security

```typescript
// Secure environment configuration
export const validateEnvironment = (): void => {
  const requiredVars = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'DATABASE_URL',
    'ENCRYPTION_KEY',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate secret strength
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (accessSecret.length < 32 || refreshSecret.length < 32) {
    throw new Error('JWT secrets must be at least 32 characters long');
  }

  if (accessSecret === refreshSecret) {
    throw new Error('JWT access and refresh secrets must be different');
  }
};
```

## Monitoring and Auditing

### Security Metrics

```typescript
// Security monitoring
export class SecurityMetrics {
  static async recordAuthMetric(metric: string, value: number, tags: Record<string, string>): Promise<void> {
    await metricsClient.gauge(metric, value, tags);
  }

  static async recordAuthEvent(event: string, tags: Record<string, string>): Promise<void> {
    await metricsClient.increment(`auth.${event}`, 1, tags);
  }
}

// Usage
await SecurityMetrics.recordAuthEvent('login.success', { method: 'password' });
await SecurityMetrics.recordAuthEvent('login.failed', { reason: 'invalid_password' });
await SecurityMetrics.recordAuthMetric('active_sessions', sessionCount, { server: 'web-1' });
```

### Anomaly Detection

```typescript
// Detect suspicious authentication patterns
export class AnomalyDetector {
  static async checkLoginPattern(userId: string, ipAddress: string): Promise<boolean> {
    const recentLogins = await getRecentLogins(userId, '24h');

    // Check for multiple IPs
    const uniqueIPs = new Set(recentLogins.map(login => login.ipAddress));
    if (uniqueIPs.size > 5) {
      await SecurityAlerts.triggerAlert('MULTIPLE_IP_LOGIN', { userId, ips: Array.from(uniqueIPs) });
      return false;
    }

    // Check for geographic anomalies
    const locations = await Promise.all(
      Array.from(uniqueIPs).map(ip => getLocationForIP(ip))
    );

    const countries = new Set(locations.map(loc => loc.country));
    if (countries.size > 2) {
      await SecurityAlerts.triggerAlert('GEOGRAPHIC_ANOMALY', { userId, countries: Array.from(countries) });
      return false;
    }

    return true;
  }
}
```

### Compliance Logging

```typescript
// GDPR/SOX compliant audit logging
export class ComplianceLogger {
  static async logDataAccess(userId: string, dataType: string, operation: string): Promise<void> {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      userId,
      dataType,
      operation,
      requestId: generateRequestId(),
      ipAddress: getCurrentIPAddress(),
      userAgent: getCurrentUserAgent(),
    };

    // Store in immutable audit log
    await auditDatabase.insert('data_access_log', auditEntry);

    // Index for compliance queries
    await searchIndex.index('audit', auditEntry);
  }

  static async logUserAction(userId: string, action: string, details: any): Promise<void> {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      userId,
      action,
      details: sanitizeForLogging(details),
      requestId: generateRequestId(),
    };

    await auditDatabase.insert('user_action_log', auditEntry);
  }
}
```

## Compliance and Standards

### OWASP Guidelines

Our implementation follows OWASP Top 10 guidelines:

1. **A01:2021 – Broken Access Control**
   - Role-based access control implemented
   - Principle of least privilege enforced
   - Path traversal protection

2. **A02:2021 – Cryptographic Failures**
   - TLS 1.3 for data in transit
   - AES-256 for data at rest
   - bcrypt for password hashing

3. **A03:2021 – Injection**
   - Parameterized queries
   - Input validation and sanitization
   - SQL injection prevention

4. **A04:2021 – Insecure Design**
   - Threat modeling implemented
   - Security by design principles
   - Defense in depth strategy

5. **A05:2021 – Security Misconfiguration**
   - Secure defaults
   - Regular security updates
   - Configuration validation

### Industry Standards

#### ISO 27001 Compliance
- Information security management system
- Risk assessment and treatment
- Continuous improvement process

#### SOC 2 Compliance
- Security controls implementation
- Availability monitoring
- Confidentiality protection
- Processing integrity validation

#### GDPR Compliance
```typescript
// GDPR data protection implementation
export class GDPRService {
  static async exportUserData(userId: string): Promise<UserDataExport> {
    const user = await userRepository.findOne({ where: { id: userId } });
    const transactions = await transactionRepository.find({ where: { userId } });
    const sessions = await sessionRepository.find({ where: { userId } });

    return {
      personal_data: {
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        created_at: user.createdAt,
      },
      transaction_data: transactions.map(t => ({
        id: t.id,
        amount: t.amount,
        date: t.date,
        description: t.description,
      })),
      session_data: sessions.map(s => ({
        login_time: s.createdAt,
        ip_address: s.ipAddress,
        user_agent: s.userAgent,
      })),
    };
  }

  static async deleteUserData(userId: string, reason: string): Promise<void> {
    // Log deletion request
    await ComplianceLogger.logUserAction(userId, 'DATA_DELETION_REQUESTED', { reason });

    // Soft delete user data
    await userRepository.update(userId, {
      status: UserStatus.DELETED,
      deletedAt: new Date(),
      deletionReason: reason,
    });

    // Anonymize related data
    await transactionRepository.update(
      { userId },
      { userId: null, anonymized: true }
    );

    // Log completion
    await ComplianceLogger.logUserAction(userId, 'DATA_DELETION_COMPLETED', { reason });
  }
}
```

### Security Certifications

- **ISO 27001**: Information Security Management
- **SOC 2 Type II**: Security and Availability
- **PCI DSS**: Payment Card Industry Data Security Standard
- **GDPR**: General Data Protection Regulation compliance

---

This security guide provides comprehensive coverage of authentication security best practices. Regular security reviews and updates ensure continued protection against evolving threats.