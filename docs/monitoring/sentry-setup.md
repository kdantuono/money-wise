# Sentry Error Tracking and Performance Monitoring Setup

## Overview

MoneyWise uses Sentry for comprehensive error tracking and performance monitoring across all applications:

- **Backend**: NestJS API with detailed error context and performance metrics
- **Web Frontend**: Next.js application with React error boundaries and Web Vitals
- **Mobile App**: React Native with crash reporting and session replay

## Prerequisites

1. **Sentry Account**: Create a Sentry account at [sentry.io](https://sentry.io)
2. **Sentry Organization**: Set up an organization for MoneyWise
3. **Projects**: Create separate projects for each application:
   - `moneywise-backend` (Node.js)
   - `moneywise-web` (JavaScript)
   - `moneywise-mobile` (React Native)

## Environment Configuration

### 1. Backend (.env)

```bash
# Sentry Configuration
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_RELEASE=v1.0.0
```

### 2. Web Frontend (.env.local)

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-organization
SENTRY_PROJECT=moneywise-web
SENTRY_RELEASE=v1.0.0
```

### 3. Mobile App (.env)

```bash
# Sentry Configuration
EXPO_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
EXPO_PUBLIC_SENTRY_RELEASE=v1.0.0
```

### 4. CI/CD Secrets

Configure the following secrets in GitHub Actions:

```bash
SENTRY_ORG=your-organization
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_PROJECT_BACKEND=moneywise-backend
SENTRY_PROJECT_WEB=moneywise-web
SENTRY_PROJECT_MOBILE=moneywise-mobile
```

## Application Setup

### Backend (NestJS)

1. **Automatic Initialization**: Sentry is automatically initialized in `main.ts`
2. **Error Filtering**: Sensitive data is automatically filtered out
3. **Performance Monitoring**: Database queries and API endpoints are tracked
4. **Custom Decorators**: Use `@SentryTransaction()` for custom performance monitoring

Example usage:

```typescript
import { SentryTransaction, addSentryBreadcrumb } from '@/common/decorators/sentry-transaction.decorator';

@SentryTransaction({ name: 'user.create', op: 'database' })
async createUser(userData: CreateUserDto) {
  addSentryBreadcrumb('Creating new user', 'auth');
  // Implementation
}
```

### Web Frontend (Next.js)

1. **Error Boundaries**: Wrap components with `<ErrorBoundary>`
2. **Performance Monitoring**: Use `PerformanceMonitor` for custom measurements
3. **Web Vitals**: Automatically tracked (FCP, LCP, CLS, FID)

Example usage:

```tsx
import { ErrorBoundary } from '@/components/error';
import { PerformanceMonitor } from '@/lib/performance';

function MyComponent() {
  const handleAsyncOperation = async () => {
    await PerformanceMonitor.measure('user.fetch', async () => {
      // API call
    });
  };

  return (
    <ErrorBoundary>
      <YourComponent />
    </ErrorBoundary>
  );
}
```

### Mobile App (React Native)

1. **Automatic Initialization**: Initialize in your main App component
2. **Error Boundaries**: Use the provided `ErrorBoundary` component
3. **Session Replay**: Automatically captures user interactions
4. **Crash Reporting**: Native crashes are automatically captured

Example initialization:

```typescript
import { initializeSentry } from '@/config/sentry.config';

export default function App() {
  useEffect(() => {
    initializeSentry();
  }, []);

  return (
    <ErrorBoundary>
      <YourApp />
    </ErrorBoundary>
  );
}
```

## Monitoring Configuration

### Error Alerts

1. **High Error Rate**: Alert when error rate exceeds 5% in production
2. **New Issues**: Immediate notification for new error types
3. **Performance Degradation**: Alert when response times increase by 50%
4. **Critical Errors**: Immediate notification for 5xx errors

### Performance Monitoring

1. **API Endpoints**: Track response times and error rates
2. **Database Queries**: Monitor slow queries and connection issues
3. **Web Vitals**: Track Core Web Vitals metrics
4. **User Experience**: Monitor session duration and interaction patterns

### Custom Dashboards

Create dashboards for:

1. **Application Health**: Overall error rates, performance metrics
2. **User Experience**: Web Vitals, mobile performance
3. **Backend Performance**: API response times, database performance
4. **Release Health**: Track issues introduced by new releases

## Release Management

### Automatic Release Creation

Releases are automatically created and managed through GitHub Actions:

1. **Version Generation**: Based on git tags or commit SHA
2. **Source Map Upload**: Automatic upload for better error tracking
3. **Deploy Notifications**: Track which version is deployed where
4. **Release Health**: Monitor error rates for new releases

### Manual Release Commands

```bash
# Create a new release
pnpm sentry:release

# Upload source maps
pnpm sentry:sourcemaps

# Finalize release
pnpm sentry:finalize
```

## Best Practices

### Error Context

Always provide meaningful context:

```typescript
// Backend
Sentry.setContext('user_action', {
  userId: user.id,
  action: 'create_transaction',
  amount: transaction.amount,
});

// Frontend
Sentry.setContext('page_context', {
  page: 'dashboard',
  userId: user.id,
  timestamp: new Date().toISOString(),
});
```

### Performance Tracking

Track business-critical operations:

```typescript
// Track important user actions
PerformanceMonitor.start('transaction.create');
await createTransaction(data);
PerformanceMonitor.end('transaction.create', {
  amount: data.amount,
  category: data.category
});
```

### Error Filtering

Configure appropriate error filtering:

1. **Development**: Log all errors for debugging
2. **Staging**: Filter out known non-critical errors
3. **Production**: Strict filtering to reduce noise

### Data Privacy

Ensure sensitive data is never sent to Sentry:

1. **Automatic Filtering**: Passwords, tokens, and personal data are filtered
2. **Custom Sanitization**: Add custom filters for application-specific data
3. **Data Scrubbing**: Enable Sentry's data scrubbing features

## Troubleshooting

### Common Issues

1. **DSN Not Found**: Verify environment variables are set correctly
2. **Source Maps Missing**: Ensure build process includes source map generation
3. **High Event Volume**: Review error filtering configuration
4. **Performance Impact**: Adjust sampling rates for production

### Debug Mode

Enable debug mode for troubleshooting:

```bash
# Backend
SENTRY_DEBUG=true

# Frontend
NEXT_PUBLIC_SENTRY_DEBUG=true
```

### Testing Sentry Integration

Test error tracking in development:

```typescript
// Trigger a test error
throw new Error('Test error for Sentry integration');

// Test performance monitoring
PerformanceMonitor.measure('test.operation', async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
});
```

## Monitoring Checklist

- [ ] All DSNs configured correctly
- [ ] Error boundaries implemented
- [ ] Performance monitoring active
- [ ] Alerts configured
- [ ] Dashboards created
- [ ] Release tracking enabled
- [ ] Source maps uploading
- [ ] Data privacy verified
- [ ] Team access configured
- [ ] Documentation updated

## Support

For Sentry-related issues:

1. Check Sentry documentation: [docs.sentry.io](https://docs.sentry.io)
2. Review application logs for Sentry warnings
3. Verify configuration in Sentry dashboard
4. Contact the development team for MoneyWise-specific issues