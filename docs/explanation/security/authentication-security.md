# Authentication Security Guide

This document outlines security best practices, features, and considerations for the MoneyWise authentication system.

## Table of Contents

- [Security Architecture](#security-architecture)
- [Password Security](#password-security)
- [JWT Token Security](#jwt-token-security)
- [Account Protection](#account-protection)
- [Rate Limiting](#rate-limiting)
- [Security Headers](#security-headers)
- [Environmental Security](#environmental-security)
- [Vulnerability Prevention](#vulnerability-prevention)
- [Security Monitoring](#security-monitoring)
- [Compliance Considerations](#compliance-considerations)

## Security Architecture

### Defense in Depth

MoneyWise implements multiple layers of security:

1. **Transport Layer**: HTTPS encryption for all communications
2. **Authentication Layer**: JWT-based stateless authentication
3. **Authorization Layer**: Role-based access control (RBAC)
4. **Application Layer**: Input validation and sanitization
5. **Database Layer**: Encrypted password storage with bcrypt
6. **Infrastructure Layer**: Rate limiting and DDoS protection

### Zero Trust Principles

- **Verify Everything**: All requests require valid authentication
- **Least Privilege**: Users receive minimum necessary permissions
- **Assume Breach**: Tokens have short lifespans with refresh capability
- **Continuous Verification**: Account status checked on each request

## Password Security

### Hashing Implementation

```typescript
// Password hashing with bcrypt
const saltRounds = 12; // High security salt rounds
const passwordHash = await bcrypt.hash(password, saltRounds);

// Password verification
const isValid = await bcrypt.compare(password, user.passwordHash);
```

### Password Requirements

**Minimum Requirements:**
- 8 characters minimum length
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one digit (0-9)
- At least one special character (@$!%*?&)

**Implementation:**
```typescript
@Matches(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
  },
)
password: string;
```

### Password Storage Security

- **Never store passwords in plain text**
- **Use bcrypt with 12 salt rounds** (computationally expensive)
- **Salt is automatically generated** per password
- **Password hashes are never returned** in API responses
- **Passwords are excluded** from query selections by default

### Password Recommendations

**For Users:**
- Use unique passwords for each service
- Consider using a password manager
- Avoid common passwords or personal information
- Change passwords if you suspect compromise

**For Developers:**
- Implement password strength indicators
- Consider implementing password history
- Add breach detection using services like HaveIBeenPwned
- Implement secure password reset flows

## JWT Token Security

### Token Architecture

```typescript
// JWT Payload Structure
interface JwtPayload {
  sub: string;     // User ID (subject)
  email: string;   // User email
  role: string;    // User role
  iat: number;     // Issued at
  exp: number;     // Expiration time
}
```

### Access Token Security

- **Short Lifespan**: 15 minutes default (configurable)
- **Stateless Validation**: No server-side storage required
- **Bearer Token Format**: Standard Authorization header
- **HMAC SHA-256**: Cryptographically secure signing
- **Secret Separation**: Different secret from refresh tokens

### Refresh Token Security

- **Longer Lifespan**: 7 days default (configurable)
- **Rotation**: New refresh token issued on each refresh
- **Single Use**: Previous refresh token becomes invalid
- **Separate Secret**: Different signing key from access tokens
- **Secure Storage**: Should be stored in httpOnly cookies

### Token Best Practices

**Implementation:**
```typescript
// Token generation with proper configuration
const accessToken = this.jwtService.sign(payload, {
  secret: process.env.JWT_ACCESS_SECRET,
  expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
});

const refreshToken = this.jwtService.sign(payload, {
  secret: process.env.JWT_REFRESH_SECRET,
  expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
});
```

**Security Measures:**
- Use environment variables for secrets (never hardcode)
- Minimum 256-bit (32 character) secrets
- Rotate secrets regularly in production
- Implement token blacklisting for logout (optional)
- Validate token expiration on every request

### Token Storage Recommendations

**Client-Side Storage Options:**

1. **httpOnly Cookies (Recommended)**:
   ```javascript
   // Most secure option
   document.cookie = "accessToken=token; httpOnly; secure; sameSite=strict";
   ```

2. **Secure localStorage** (with precautions):
   ```javascript
   // Store with encryption if possible
   localStorage.setItem('auth_token', encryptedToken);
   ```

3. **Memory Storage** (most secure, lost on refresh):
   ```javascript
   // Store in React state or Zustand store
   const [token, setToken] = useState(null);
   ```

## Account Protection

### Account Status Management

```typescript
enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification'
}
```

### Account Lockout (Future Enhancement)

**Planned Features:**
- Failed login attempt tracking
- Progressive lockout periods (5min, 15min, 1hr, 24hr)
- IP-based and account-based lockouts
- Admin unlock capabilities
- Automatic lockout expiration

**Implementation Plan:**
```typescript
// Future implementation structure
interface LoginAttempt {
  userId?: string;
  ipAddress: string;
  timestamp: Date;
  success: boolean;
  userAgent: string;
}

interface AccountLockout {
  userId: string;
  lockedUntil: Date;
  attemptCount: number;
  lockoutReason: string;
}
```

### Email Verification (Preparation)

**Current State**: Database fields prepared for email verification
- `emailVerifiedAt` timestamp field
- `isEmailVerified` virtual property
- Email verification status in user responses

**Future Implementation**:
- Email verification tokens
- Verification email sending
- Account activation on verification
- Re-send verification capabilities

## Rate Limiting

### Current Implementation Status

**Planned Rate Limits:**
- Login attempts: 5 per 15 minutes per IP
- Registration: 3 per hour per IP
- Token refresh: 10 per 5 minutes per IP
- Password reset: 3 per hour per email

### Implementation Strategy

```typescript
// Planned rate limiting middleware
@UseGuards(ThrottlerGuard)
@Throttle(5, 900) // 5 requests per 15 minutes
@Post('login')
async login(@Body() loginDto: LoginDto) {
  // Login implementation
}
```

### Rate Limiting Headers

```http
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1640996100
Retry-After: 900
```

## Security Headers

### Essential Security Headers

```typescript
// Helmet.js configuration for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### CORS Configuration

```typescript
// CORS setup for authentication
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

## Environmental Security

### Environment Variables Security

**Required Secure Variables:**
```bash
# Use cryptographically secure random values
JWT_ACCESS_SECRET=your_256_bit_secret_here
JWT_REFRESH_SECRET=your_different_256_bit_secret_here
DATABASE_PASSWORD=your_secure_db_password
```

**Security Practices:**
- Never commit secrets to version control
- Use different secrets for each environment
- Rotate secrets regularly (quarterly recommended)
- Use secret management services in production
- Audit secret access and usage

### Secret Generation

```bash
# Generate cryptographically secure secrets
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### Environment Separation

- **Development**: Basic security, debugging enabled
- **Staging**: Production-like security, limited debugging
- **Production**: Maximum security, no debugging, monitoring enabled

## Vulnerability Prevention

### Common Attack Vectors

**1. SQL Injection**
- **Prevention**: TypeORM parameterized queries
- **Implementation**: All database queries use ORM methods
- **Validation**: Input sanitization at DTO level

**2. Cross-Site Scripting (XSS)**
- **Prevention**: Input validation and output encoding
- **Implementation**: Class-validator decorators
- **Headers**: Content Security Policy (CSP)

**3. Cross-Site Request Forgery (CSRF)**
- **Prevention**: SameSite cookies, CSRF tokens
- **Implementation**: Stateless JWT reduces CSRF risk
- **Headers**: Proper CORS configuration

**4. Brute Force Attacks**
- **Prevention**: Rate limiting, account lockouts
- **Implementation**: Progressive delays, IP blocking
- **Monitoring**: Failed attempt logging

**5. Session Hijacking**
- **Prevention**: HTTPS only, secure cookies
- **Implementation**: Short token lifespans
- **Rotation**: Refresh token rotation

### Input Validation

```typescript
// Comprehensive input validation
@IsEmail({}, { message: 'Invalid email format' })
@Length(1, 254, { message: 'Email must be between 1 and 254 characters' })
email: string;

@IsString({ message: 'Password must be a string' })
@Length(8, 100, { message: 'Password must be between 8 and 100 characters' })
@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
  message: 'Password must meet complexity requirements'
})
password: string;
```

## Security Monitoring

### Logging Strategy

**Authentication Events to Log:**
- Successful logins (user, IP, timestamp)
- Failed login attempts (email, IP, timestamp)
- Account registrations (email, IP, timestamp)
- Token refresh events (user, IP, timestamp)
- Account lockouts (user, reason, timestamp)
- Password changes (user, IP, timestamp)

**Implementation:**
```typescript
// Security event logging
this.logger.log(`Successful login: ${user.email} from ${req.ip}`, 'AuthService');
this.logger.warn(`Failed login attempt: ${email} from ${req.ip}`, 'AuthService');
this.logger.error(`Account locked: ${user.email} - ${reason}`, 'AuthService');
```

### Security Metrics

**Key Performance Indicators:**
- Failed login rate
- Account lockout frequency
- Token refresh patterns
- Unusual login locations/times
- Password reset frequency

### Alert Thresholds

**Automated Alerts for:**
- Login failure rate > 10% in 5 minutes
- Multiple failed logins from same IP
- Login from new geographic location
- Bulk account registrations
- Token validation failures

## Compliance Considerations

### GDPR Compliance

**Data Protection:**
- User consent for data processing
- Right to data portability
- Right to deletion (account deletion)
- Data minimization (only necessary data)
- Pseudonymization (UUIDs instead of sequential IDs)

**Implementation:**
```typescript
// GDPR-compliant user data handling
@Column({ type: 'uuid', primary: true, generated: 'uuid' })
id: string; // UUID instead of auto-increment

@Column({ nullable: true })
dataProcessingConsent: boolean;

@Column({ nullable: true })
dataRetentionPeriod: Date;
```

### SOC 2 Considerations

**Security Controls:**
- Access controls and authentication
- Logical and physical access controls
- System operations monitoring
- Change management procedures
- Risk assessment and mitigation

### Financial Data Security

**PCI DSS Considerations** (for future payment features):
- Secure authentication mechanisms
- Encrypted data transmission
- Regular security testing
- Access control measures
- Secure development practices

## Security Checklist

### Development Checklist

- [ ] All passwords are hashed with bcrypt (12+ salt rounds)
- [ ] JWT secrets are 32+ characters and unique
- [ ] Input validation is implemented on all endpoints
- [ ] Error messages don't leak sensitive information
- [ ] HTTPS is enforced in production
- [ ] Security headers are properly configured
- [ ] Rate limiting is implemented
- [ ] Authentication logs are comprehensive
- [ ] Account lockout mechanisms are planned
- [ ] Token expiration times are appropriate

### Production Checklist

- [ ] Environment variables are properly secured
- [ ] Database access is restricted and monitored
- [ ] CORS is configured for production domains only
- [ ] Security monitoring and alerting is active
- [ ] Regular security scans are scheduled
- [ ] Incident response procedures are documented
- [ ] Backup and recovery procedures are tested
- [ ] Security training is provided to team members

## Incident Response

### Security Incident Types

1. **Credential Compromise**: User accounts accessed without authorization
2. **Data Breach**: Unauthorized access to user data
3. **System Compromise**: Unauthorized access to application servers
4. **DDoS Attack**: Service disruption through traffic flooding

### Response Procedures

1. **Immediate Response** (0-1 hour):
   - Assess and contain the incident
   - Document all actions taken
   - Notify relevant stakeholders

2. **Investigation** (1-24 hours):
   - Analyze logs and system state
   - Identify root cause and scope
   - Implement additional safeguards

3. **Recovery** (24-72 hours):
   - Restore normal operations
   - Implement permanent fixes
   - Update security measures

4. **Post-Incident** (1-2 weeks):
   - Conduct post-mortem analysis
   - Update security procedures
   - Implement lessons learned

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [JWT Security Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)
- [NestJS Security](https://docs.nestjs.com/security/authentication)

---

**Next Steps:**
1. Implement rate limiting middleware
2. Add comprehensive security logging
3. Set up security monitoring dashboards
4. Conduct security penetration testing
5. Implement account lockout mechanisms
6. Add email verification functionality