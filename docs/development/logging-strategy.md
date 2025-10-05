# Logging Strategy - MoneyWise

**Date**: 2025-10-05
**Status**: ✅ Implemented
**Purpose**: Comprehensive logging architecture for debugging, monitoring, and operational insights

---

## 📋 Executive Summary

| Aspect | Implementation | Status |
|--------|---------------|--------|
| **Structured Logging** | JSON format (production), pretty (development) | ✅ Complete |
| **Log Levels** | Environment-aware (prod: errors only, dev: all) | ✅ Complete |
| **Sentry Integration** | Errors auto-reported, breadcrumbs tracked | ✅ Complete |
| **Performance Tracking** | HTTP requests, DB queries, operations | ✅ Complete |
| **Context Propagation** | Request ID, user ID, correlation IDs | 🟡 Partial |

---

## 🎯 Logging Philosophy

### Core Principles

1. **Production = Signal, Not Noise**
   - Production logs ERROR level only (reduce costs, improve signal-to-noise)
   - All errors automatically sent to Sentry for investigation
   - Breadcrumbs provide context without full DEBUG logs

2. **Development = Maximum Visibility**
   - All log levels enabled (verbose, debug, log, warn, error)
   - Pretty-printed format for easy reading
   - No Sentry overhead (faster development)

3. **Staging = Validation**
   - WARN level and above (catch warnings before production)
   - Full Sentry integration (test alerting)
   - Performance tracking enabled

4. **Structured Data**
   - JSON format in production (machine-readable)
   - Consistent metadata fields (timestamp, level, context, message)
   - Additional context via `meta` parameter

---

## 🏗️ Architecture

### LoggerService

**Location**: `apps/backend/src/core/logging/logger.service.ts`

**Features**:
- Environment-aware log levels
- Structured JSON logging (production)
- Sentry integration (errors + breadcrumbs)
- Performance tracking
- HTTP request logging
- Database query logging (slow query detection)
- Child loggers with context

**Usage Example**:
```typescript
import { LoggerService } from '@/core/logging/logger.service';

@Injectable()
export class PaymentService {
  private readonly logger: LoggerService;

  constructor(loggerService: LoggerService) {
    this.logger = loggerService.child('PaymentService');
  }

  async processPayment(userId: string, amount: number) {
    this.logger.log('Processing payment', { userId, amount });

    try {
      const start = Date.now();
      const result = await this.paymentGateway.charge(amount);
      const duration = Date.now() - start;

      this.logger.performance('PaymentGateway.charge', duration, {
        userId,
        amount,
        transactionId: result.id,
      });

      return result;
    } catch (error) {
      this.logger.error('Payment failed', error, { userId, amount });
      throw error;
    }
  }
}
```

---

## 📊 Log Levels

### Environment-Specific Levels

| Environment | Log Level | Rationale | Output Format |
|-------------|-----------|-----------|---------------|
| **Production** | `ERROR` | Minimize noise, reduce costs | JSON |
| **Staging** | `WARN` | Catch warnings before production | JSON |
| **Development** | `LOG` (all) | Maximum visibility for debugging | Pretty-print |
| **Test** | `FATAL` | Reduce test noise, only critical errors | Minimal |

### Log Level Hierarchy

```
VERBOSE → DEBUG → LOG → WARN → ERROR → FATAL
  ↓        ↓      ↓      ↓       ↓       ↓
 Dev     Dev    Dev    Stg    Prod    All
```

### Level Guidelines

| Level | When to Use | Example |
|-------|-------------|---------|
| **VERBOSE** | Extremely detailed debugging | "Entering function X with params Y" |
| **DEBUG** | Debugging information | "Query result: {data}" |
| **LOG** | General information | "User logged in successfully" |
| **WARN** | Potential issues | "Rate limit approaching for user X" |
| **ERROR** | Recoverable errors | "Payment failed, will retry" |
| **FATAL** | Critical failures | "Database connection lost" |

---

## 🔧 Log Methods

### Standard Methods

#### `log(message, meta?)`
General informational messages
```typescript
this.logger.log('User profile updated', { userId: '123', fields: ['email', 'name'] });
```

#### `error(message, trace?, meta?)`
Errors (automatically sent to Sentry)
```typescript
this.logger.error('Database query failed', error, { query: 'SELECT * FROM users', userId: '123' });
```

#### `warn(message, meta?)`
Warnings (tracked in Sentry as breadcrumbs)
```typescript
this.logger.warn('API rate limit approaching', { userId: '123', remaining: 5 });
```

#### `debug(message, meta?)`
Debug information (development only)
```typescript
this.logger.debug('Cache hit', { key: 'user:123', ttl: 3600 });
```

#### `verbose(message, meta?)`
Extremely detailed logs (development only)
```typescript
this.logger.verbose('Validating input', { input: req.body });
```

#### `fatal(message, trace?, meta?)`
Critical failures (always logged, highest Sentry priority)
```typescript
this.logger.fatal('Database connection failed', error, { host: 'db.example.com' });
```

### Specialized Methods

#### `performance(operation, duration, meta?)`
Track operation performance
```typescript
const start = Date.now();
await someOperation();
const duration = Date.now() - start;
this.logger.performance('someOperation', duration, { userId: '123' });
```

#### `http(method, url, statusCode, duration, meta?)`
Log HTTP requests/responses
```typescript
this.logger.http('GET', '/api/users/123', 200, 45, { userId: '123' });
```

#### `query(query, duration, meta?)`
Log database queries (detects slow queries >1000ms)
```typescript
const start = Date.now();
const result = await this.db.query('SELECT * FROM users');
const duration = Date.now() - start;
this.logger.query('SELECT * FROM users', duration, { rowCount: result.length });
```

---

## 🔗 Sentry Integration

### Automatic Error Reporting

All errors logged via `logger.error()` or `logger.fatal()` are automatically sent to Sentry:

```typescript
try {
  await riskyOperation();
} catch (error) {
  // Automatically sent to Sentry with full context
  this.logger.error('Operation failed', error, { userId, operation: 'riskyOperation' });
}
```

### Breadcrumb Tracking

Non-error logs create breadcrumbs in Sentry for context:

```typescript
this.logger.log('Starting payment process', { userId: '123', amount: 100 });
this.logger.warn('Payment retry', { userId: '123', attempt: 2 });
this.logger.error('Payment failed', error, { userId: '123' });
// Sentry error will include breadcrumbs showing the sequence of events
```

### Slow Query Detection

Database queries >1000ms automatically create Sentry breadcrumbs:

```typescript
const result = await this.db.query('SELECT * FROM large_table'); // Takes 1500ms
// Automatically creates Sentry breadcrumb: "Slow query detected (1500ms)"
```

---

## 🏷️ Context Management

### Child Loggers

Create context-specific loggers:

```typescript
export class UserService {
  private readonly logger: LoggerService;

  constructor(loggerService: LoggerService) {
    // All logs will have context="UserService"
    this.logger = loggerService.child('UserService');
  }

  async createUser(data: CreateUserDto) {
    this.logger.log('Creating user', { email: data.email });
    // Output: [2025-10-05T...] [LOG] [UserService] Creating user { email: "user@example.com" }
  }
}
```

### Request Context (Future Enhancement)

**Status**: 🟡 **Not Yet Implemented**

**Plan**: Use AsyncLocalStorage for request-scoped context

```typescript
// Future implementation
this.logger.log('User action', { action: 'updateProfile' });
// Auto-includes: { requestId: '...', userId: '...', correlationId: '...' }
```

---

## 📈 Log Format

### Development Format (Pretty)

```
[2025-10-05T21:30:45.123Z] [LOG] [PaymentService] Processing payment {
  "userId": "123",
  "amount": 100,
  "currency": "USD"
}
```

### Production Format (JSON)

```json
{
  "timestamp": "2025-10-05T21:30:45.123Z",
  "level": "log",
  "context": "PaymentService",
  "message": "Processing payment",
  "userId": "123",
  "amount": 100,
  "currency": "USD"
}
```

### Error Format

```json
{
  "timestamp": "2025-10-05T21:30:45.123Z",
  "level": "error",
  "context": "PaymentService",
  "message": "Payment failed",
  "userId": "123",
  "amount": 100,
  "stack": "Error: Payment failed\n    at PaymentService.processPayment (payment.service.ts:45:13)\n..."
}
```

---

## 🎛️ Configuration

### Environment Variables

No additional environment variables required - uses existing:

- `NODE_ENV` - Determines log level (production/staging/development/test)
- `SENTRY_DSN` - If set, enables Sentry integration
- `SENTRY_ENVIRONMENT` - Sentry environment tag

### Log Level Override (Future)

**Status**: 🟡 **Potential Enhancement**

```bash
# Override log level per environment (not yet implemented)
LOG_LEVEL=debug  # Force debug level in production (for debugging)
```

---

## 🚀 Usage Patterns

### Controller Logging

```typescript
@Controller('users')
export class UsersController {
  private readonly logger: LoggerService;

  constructor(loggerService: LoggerService) {
    this.logger = loggerService.child('UsersController');
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    this.logger.log('Fetching user', { userId: id });

    try {
      const user = await this.usersService.findOne(id);
      return user;
    } catch (error) {
      this.logger.error('Failed to fetch user', error, { userId: id });
      throw error;
    }
  }
}
```

### Service Logging

```typescript
@Injectable()
export class UsersService {
  private readonly logger: LoggerService;

  constructor(
    loggerService: LoggerService,
    private readonly usersRepository: Repository<User>,
  ) {
    this.logger = loggerService.child('UsersService');
  }

  async findOne(id: string): Promise<User> {
    const start = Date.now();

    const user = await this.usersRepository.findOne({ where: { id } });

    const duration = Date.now() - start;
    this.logger.performance('User.findOne', duration, { userId: id });

    if (!user) {
      this.logger.warn('User not found', { userId: id });
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
```

### Middleware/Interceptor Logging

```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const duration = Date.now() - start;

        this.logger.http(method, url, response.statusCode, duration, {
          userId: request.user?.id,
        });
      }),
    );
  }
}
```

---

## 📊 Performance Considerations

### Log Volume Estimates

| Environment | Log Level | Daily Volume (est.) | Storage Cost |
|-------------|-----------|---------------------|--------------|
| Production | ERROR | ~1,000 lines | ~1 MB/day |
| Staging | WARN | ~10,000 lines | ~10 MB/day |
| Development | LOG (all) | ~100,000 lines | ~100 MB/day |

### Cost Optimization

1. **Production ERROR-only**: Reduces log storage costs by 90%
2. **Sentry integration**: Full error context without verbose logs
3. **Breadcrumbs**: Lightweight context tracking (<1KB per breadcrumb)
4. **Slow query detection**: Only logs queries >1000ms

---

## ✅ Implementation Checklist

- [x] Create LoggerService with environment-aware levels
- [x] Implement Sentry integration (errors + breadcrumbs)
- [x] Add performance tracking methods
- [x] Add HTTP request logging
- [x] Add database query logging (slow query detection)
- [x] Create LoggerModule for global injection
- [x] Document logging strategy and usage patterns
- [ ] Implement request context propagation (AsyncLocalStorage) - Future
- [ ] Add log aggregation (Datadog/CloudWatch) - Future
- [ ] Add log sampling for high-volume endpoints - Future
- [ ] Create logging dashboard - TASK-1.5.2.8

---

## 🔮 Future Enhancements

### Request Context Propagation (High Priority)

Use AsyncLocalStorage to automatically include request context:

```typescript
// Auto-include in all logs within request lifecycle
{
  "requestId": "req-abc-123",
  "userId": "user-456",
  "correlationId": "corr-xyz-789",
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

### Log Aggregation

**Options**:
- **Datadog**: Full APM + logging + metrics
- **AWS CloudWatch**: Native AWS integration
- **Elastic Stack (ELK)**: Self-hosted option

### Log Sampling

For high-volume endpoints, sample logs (e.g., 1% sampling):

```typescript
if (Math.random() < 0.01) { // 1% sampling
  this.logger.log('High-volume operation', meta);
}
```

---

**Document Owner**: kdantuono (User) + Claude Code (AI Assistant)
**Status**: ✅ Complete - Ready for use
**Last Updated**: 2025-10-05 21:45 UTC
