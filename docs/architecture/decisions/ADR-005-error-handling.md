# ADR-005: Error Handling and Logging Strategy

**Status**: Accepted
**Date**: 2025-10-06
**Deciders**: Development Team
**Technical Story**: M1.5 Infrastructure & Quality

## Context

Financial applications require robust error handling to:
- **Prevent Data Loss**: Failed transactions must not silently disappear
- **Maintain User Trust**: Clear error messages prevent user frustration
- **Enable Debugging**: Structured logs accelerate issue resolution
- **Comply with Auditing**: Financial regulations require transaction logs

Poor error handling leads to:
- Silent failures (user loses money, doesn't know why)
- Vague error messages ("Something went wrong")
- Unactionable logs (missing context, stack traces)
- Production incidents that can't be reproduced

We need a comprehensive error handling strategy that:
- Catches errors at appropriate boundaries
- Provides user-friendly messages
- Logs sufficient context for debugging
- Integrates with monitoring tools (Sentry, CloudWatch)

## Decision

We will implement **layered error handling** with standardized error types and centralized logging:

```
┌─────────────────────────────────────────┐
│ 1. Error Creation (Custom Error Classes)│
│    - DomainException (business logic)   │
│    - ValidationException (input errors) │
│    - ExternalServiceException (APIs)    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 2. Error Handling (Filters/Middleware)  │
│    - NestJS Exception Filters           │
│    - Next.js Error Boundaries           │
│    - Axios Interceptors (HTTP clients)  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 3. Error Logging (Structured Logs)      │
│    - Winston (backend structured logs)  │
│    - Sentry (production error tracking) │
│    - CloudWatch (centralized logging)   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 4. User Feedback (HTTP Responses/UI)    │
│    - Standardized error responses       │
│    - Error toast notifications          │
│    - Form validation feedback           │
└─────────────────────────────────────────┘
```

### Key Principles

1. **Fail Fast**: Validate inputs early, reject invalid requests immediately
2. **Structured Errors**: Use custom error classes with machine-readable codes
3. **User-Friendly Messages**: Technical details hidden from users, shown in logs
4. **Contextual Logging**: Include request ID, user ID, operation type
5. **No Silent Failures**: All errors logged and monitored

## Implementation Details

### 1. Custom Error Classes (Backend)

```typescript
// apps/backend/src/common/exceptions/domain.exception.ts

/**
 * Base class for all domain/business logic errors
 */
export class DomainException extends HttpException {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        statusCode,
        message,
        error: code,
        timestamp: new Date().toISOString(),
        context,  // Logged but NOT sent to user
      },
      statusCode,
    );

    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Insufficient funds, budget exceeded, etc.
 */
export class BusinessRuleViolationException extends DomainException {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'BUSINESS_RULE_VIOLATION', context, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

/**
 * Plaid API down, email service unavailable, etc.
 */
export class ExternalServiceException extends DomainException {
  constructor(
    service: string,
    originalError: Error,
    context?: Record<string, unknown>,
  ) {
    super(
      `External service ${service} is currently unavailable`,
      'EXTERNAL_SERVICE_ERROR',
      { ...context, service, originalError: originalError.message },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

/**
 * Entity not found (account, transaction, user)
 */
export class EntityNotFoundException extends DomainException {
  constructor(entityName: string, identifier: string) {
    super(
      `${entityName} not found`,
      'ENTITY_NOT_FOUND',
      { entityName, identifier },
      HttpStatus.NOT_FOUND,
    );
  }
}
```

**Usage Example**:

```typescript
@Injectable()
export class AccountsService {
  async withdraw(accountId: string, amount: number): Promise<void> {
    const account = await this.accountsRepository.findOne({ where: { id: accountId } });

    if (!account) {
      throw new EntityNotFoundException('Account', accountId);
    }

    if (account.balance < amount) {
      throw new BusinessRuleViolationException(
        'Insufficient funds',
        { accountId, currentBalance: account.balance, requestedAmount: amount },
      );
    }

    // Process withdrawal...
  }
}
```

### 2. Global Exception Filter (NestJS)

```typescript
// apps/backend/src/common/filters/all-exceptions.filter.ts

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly monitoringService: MonitoringService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    // Log error with full context
    this.logger.error({
      message: errorResponse.message,
      error: errorResponse.error,
      statusCode: errorResponse.statusCode,
      path: request.url,
      method: request.method,
      userId: request['user']?.id,  // If authenticated
      requestId: request['id'],  // From correlation-id middleware
      stack: exception instanceof Error ? exception.stack : undefined,
      context: exception instanceof DomainException ? exception.context : undefined,
    });

    // Send to Sentry (production only)
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(exception, {
        tags: {
          path: request.url,
          method: request.method,
        },
        user: request['user']?.id ? { id: request['user'].id } : undefined,
      });
    }

    // Track error metric
    this.monitoringService.trackError(errorResponse.error, errorResponse.statusCode);

    // Send standardized response to client
    httpAdapter.reply(ctx.getResponse(), errorResponse, errorResponse.statusCode);
  }

  private buildErrorResponse(exception: unknown, request: Request) {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const statusCode = exception.getStatus();

      return {
        statusCode,
        message: typeof response === 'string' ? response : response['message'],
        error: typeof response === 'object' ? response['error'] : exception.name,
        timestamp: new Date().toISOString(),
        path: request.url,
      };
    }

    // Unknown error (500)
    return {
      statusCode: 500,
      message: 'Internal server error',
      error: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
      path: request.url,
    };
  }
}
```

**Register Filter Globally**:

```typescript
// apps/backend/src/main.ts
app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost, monitoringService));
```

### 3. Frontend Error Handling (React Error Boundaries)

```typescript
// apps/web/components/error-boundary.tsx

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean; error: Error | null }
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    });

    // Log to console (development)
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

// Default error UI
function DefaultErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center text-red-600 mb-4">
          <AlertCircle className="h-6 w-6 mr-2" />
          <h2 className="text-xl font-semibold">Something went wrong</h2>
        </div>
        <p className="text-gray-600 mb-4">
          We're sorry, but something unexpected happened. Our team has been notified.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto mb-4">
            {error.message}
          </pre>
        )}
        <button
          onClick={resetError}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
```

### 4. API Client Error Handling (Axios Interceptors)

```typescript
// apps/web/lib/api/axios-instance.ts

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10000,
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message: string; error: string; statusCode: number }>) => {
    const { response, config } = error;

    // Network error (no response)
    if (!response) {
      toast.error('Network error. Please check your connection.');
      return Promise.reject(new Error('Network error'));
    }

    // Handle specific error codes
    switch (response.status) {
      case 401:
        // Unauthorized - clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        router.push('/auth/login');
        break;

      case 403:
        toast.error('You do not have permission to perform this action');
        break;

      case 404:
        toast.error('Resource not found');
        break;

      case 422:
        // Business rule violation - show specific message
        toast.error(response.data?.message || 'Unable to complete request');
        break;

      case 429:
        toast.error('Too many requests. Please slow down.');
        break;

      case 500:
      case 502:
      case 503:
        toast.error('Service temporarily unavailable. Please try again later.');
        // Log to Sentry
        Sentry.captureException(error, {
          tags: {
            url: config.url,
            method: config.method,
          },
        });
        break;

      default:
        toast.error(response.data?.message || 'An error occurred');
    }

    return Promise.reject(error);
  },
);
```

### 5. Structured Logging (Winston)

```typescript
// apps/backend/src/common/logger/winston.config.ts

import * as winston from 'winston';
import { CloudWatchTransport } from 'winston-cloudwatch';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),  // Structured JSON logs
  ),
  defaultMeta: {
    service: 'money-wise-backend',
    environment: process.env.NODE_ENV,
  },
  transports: [
    // Console (development)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),

    // CloudWatch (production)
    ...(process.env.CLOUDWATCH_ENABLED === 'true'
      ? [
          new CloudWatchTransport({
            logGroupName: '/money-wise/backend',
            logStreamName: `${process.env.NODE_ENV}-${new Date().toISOString().split('T')[0]}`,
            awsRegion: process.env.AWS_REGION,
            jsonMessage: true,
          }),
        ]
      : []),
  ],
});

// Usage
logger.info('User logged in', { userId: '123', ipAddress: '1.2.3.4' });
logger.error('Payment failed', {
  error: error.message,
  userId: '123',
  transactionId: 'txn_456',
  stack: error.stack,
});
```

## Error Response Format

All API errors follow this standardized format:

```json
{
  "statusCode": 422,
  "error": "BUSINESS_RULE_VIOLATION",
  "message": "Insufficient funds",
  "timestamp": "2025-10-06T10:30:00.000Z",
  "path": "/api/accounts/123/withdraw"
}
```

**Fields**:
- `statusCode`: HTTP status code (400, 401, 404, 422, 500, etc.)
- `error`: Machine-readable error code (for client-side handling)
- `message`: Human-readable error message (for display to user)
- `timestamp`: ISO 8601 timestamp
- `path`: Request path that caused the error

**Context** (logged but NOT sent to client):
```typescript
{
  userId: '123',
  accountId: '456',
  requestedAmount: 1000,
  currentBalance: 50,
  stack: 'Error: Insufficient funds\n  at AccountsService.withdraw...'
}
```

## Consequences

### Positive

- **Faster Debugging**: Structured logs with context pinpoint issues in seconds
- **Better UX**: Clear error messages guide users toward resolution
- **Production Confidence**: Errors automatically captured and alerted
- **Regulatory Compliance**: Full audit trail of all errors and operations
- **Reduced Support Load**: Users self-serve with actionable error messages

### Negative

- **Verbose Code**: Try-catch blocks add boilerplate
- **Over-Logging Risk**: Excessive logging can impact performance
- **Sensitive Data Leakage**: Must carefully scrub logs of PII
- **Alert Fatigue**: Too many error alerts can desensitize team

### Mitigations

- **Verbose Code**: Centralize error handling in middleware/filters
- **Over-Logging**: Log levels (debug/info/warn/error), sample in production
- **Sensitive Data**: Sanitize logs with Winston formatters
- **Alert Fatigue**: Set thresholds (alert only if error rate >5%)

## Monitoring

- **Error Rate**: Track percentage of requests that error (target: <1%)
- **Error Response Time**: Measure time to handle/log errors (target: <50ms)
- **Unique Error Types**: Monitor new error codes (investigate spikes)
- **User-Reported Bugs**: Cross-reference with logged errors (coverage gap analysis)

## References

- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)
- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Winston Logger](https://github.com/winstonjs/winston)
- [Sentry Error Tracking](https://docs.sentry.io/)
- [ADR-003: Monitoring & Observability](./ADR-003-monitoring-observability.md)

---

**Superseded By**: N/A
**Related ADRs**: ADR-002 (Configuration), ADR-003 (Monitoring), ADR-004 (Testing)
