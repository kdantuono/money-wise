# ADR-002: Centralized Configuration Management

**Status**: Accepted
**Date**: 2025-10-06
**Deciders**: Development Team, Security Team
**Technical Story**: STORY-1.5.1 Code Quality Cleanup

## Context

Environment configuration in NestJS applications presents several challenges:
- **Security**: Direct `process.env` access can leak secrets or use undefined values
- **Type Safety**: Environment variables are strings, requiring manual parsing and validation
- **Testing**: Mocking `process.env` in tests is fragile and error-prone
- **Observability**: Difficult to track which services depend on which config values

We need a configuration system that provides type safety, validation, and testability while preventing direct environment variable access.

## Decision

We will use **NestJS ConfigModule** with **class-validator** for centralized, type-safe configuration management.

### Architecture

```typescript
// 1. Configuration Classes (Type-Safe Schemas)
export class AuthConfig {
  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN?: string = '15m';
}

// 2. Validation Function (Fail-Fast Startup)
function validateConfig(config: Record<string, unknown>) {
  const authConfig = plainToInstance(AuthConfig, config, {
    enableImplicitConversion: true
  });

  const errors = validateSync(authConfig, {
    skipMissingProperties: false
  });

  if (errors.length > 0) {
    throw new Error(`Config validation failed: ${errors}`);
  }

  return { auth: authConfig };
}

// 3. Global Module Registration
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
      cache: true
    })
  ]
})
export class AppConfigModule {}

// 4. Service Consumption (Dependency Injection)
@Injectable()
export class AuthService {
  private readonly jwtSecret: string;

  constructor(private configService: ConfigService) {
    const authConfig = this.configService.get<AuthConfig>('auth');

    if (!authConfig?.JWT_ACCESS_SECRET) {
      throw new Error('JWT secret not configured');
    }

    this.jwtSecret = authConfig.JWT_ACCESS_SECRET;
  }
}
```

### Key Principles

1. **Zero Direct `process.env` Access** (except documented exceptions)
2. **Fail-Fast Validation** (application won't start with invalid config)
3. **Type-Safe Access** (ConfigService returns typed objects)
4. **Dependency Injection** (services receive ConfigService via constructor)

## Rationale

### Why ConfigModule?

**✅ Advantages**:
1. **Type Safety**: Configuration objects validated against TypeScript classes
2. **Validation**: class-validator decorators ensure correct types and required fields
3. **Testability**: Easy to mock ConfigService in unit tests
4. **Global Access**: @Global() decorator makes ConfigService available everywhere
5. **Caching**: Configuration values cached for performance

**❌ Alternatives Considered**:
- **Direct `process.env`** (rejected): No type safety, no validation, hard to test
- **dotenv only** (rejected): Still requires manual parsing and validation
- **custom config service** (rejected): Reinventing the wheel, less community support

### Documented Exceptions

Some files **MUST** use `process.env` directly because they run outside NestJS context:

#### 1. TypeORM CLI Configuration (`apps/backend/src/config/database.ts`)

```typescript
/**
 * DOCUMENTED EXCEPTION: TypeORM CLI runs outside NestJS context
 * Used by: pnpm migration:generate, pnpm migration:run
 */
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config(); // Load .env FIRST

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  // ... rest of config
});
```

**Why Exception Allowed**: TypeORM CLI commands run standalone, before NestJS bootstrap.

#### 2. Sentry Instrumentation (`apps/backend/src/instrument.ts`)

```typescript
/**
 * DOCUMENTED EXCEPTION: Sentry must initialize before NestJS bootstrap
 * MUST be imported FIRST in main.ts
 */
import * as Sentry from '@sentry/nestjs';
import { config } from 'dotenv';

config(); // Load .env FIRST

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || 'development',
  // ...
});
```

**Why Exception Allowed**: Sentry.init() must run before application starts to capture bootstrap errors.

## Consequences

### Positive

- **Early Error Detection**: Invalid configuration prevents application startup
- **Type Safety**: IDE autocomplete for all configuration values
- **Better Testing**: ConfigService easily mocked with custom values
- **Security**: No silent fallbacks to empty strings for secrets
- **Observability**: Clear dependency graph (services → ConfigService → env)

### Negative

- **Boilerplate**: Each config section requires a class with decorators
- **Learning Curve**: Developers must understand class-validator decorators
- **Migration Effort**: Existing `process.env` usage must be refactored

### Mitigations

- **Boilerplate**: Create templates for common config patterns
- **Learning Curve**: Provide comprehensive documentation and examples
- **Migration**: Use linting rules to prevent new `process.env` usage

## Implementation

### Step 1: Create Configuration Classes

```typescript
// apps/backend/src/core/config/app.config.ts
import { IsString, IsOptional, IsIn } from 'class-validator';

export class AppConfig {
  @IsString()
  @IsIn(['development', 'staging', 'production'])
  NODE_ENV!: string;

  @IsString()
  @IsOptional()
  PORT?: string = '3000';
}
```

### Step 2: Register ConfigModule

```typescript
// apps/backend/src/core/config/config.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validate: validateConfig,
      cache: true
    })
  ]
})
export class AppConfigModule {}
```

### Step 3: Use in Services

```typescript
// apps/backend/src/auth/auth.service.ts
constructor(private configService: ConfigService) {
  const authConfig = this.configService.get<AuthConfig>('auth');

  if (!authConfig?.JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET not configured');
  }

  this.jwtSecret = authConfig.JWT_ACCESS_SECRET;
}
```

### Step 4: Update Tests

```typescript
// apps/backend/__tests__/unit/auth/auth.service.spec.ts
{
  provide: ConfigService,  // ✅ Class token (not string)
  useValue: {
    get: jest.fn((key: string) => {
      const config = {
        auth: {
          JWT_ACCESS_SECRET: 'test-secret',
          JWT_ACCESS_EXPIRES_IN: '15m'
        }
      };
      return config[key];
    })
  }
}
```

## Validation

### Linting Rules

Add ESLint rule to prevent `process.env` usage (except exceptions):

```javascript
// .eslintrc.js
rules: {
  'no-process-env': 'error'
}
```

Disable for exception files:

```typescript
/* eslint-disable no-process-env */
// Documented exception: TypeORM CLI configuration
```

### Code Review Checklist

- [ ] No direct `process.env` access (except documented exceptions)
- [ ] ConfigService injected via constructor (not property injection)
- [ ] Fail-fast validation for required secrets
- [ ] Tests use ConfigService mock (not global process.env mocking)

## Migration Status

| Component | Status | Notes |
|-----------|--------|-------|
| Authentication | ✅ Complete | STORY-1.5.1, 50+ violations fixed |
| Database Config | ✅ Complete | Exception documented |
| Monitoring | ✅ Complete | CloudWatch, Sentry |
| Email Service | ✅ Complete | SMTP configuration |
| Redis | ✅ Complete | Cache configuration |

## Monitoring

- **Startup Failures**: Track config validation errors in CI/CD logs
- **Test Coverage**: Ensure ConfigService usage covered by unit tests
- **Linting Violations**: Zero `no-process-env` violations in CI

## References

- [NestJS Configuration Documentation](https://docs.nestjs.com/techniques/configuration)
- [class-validator Documentation](https://github.com/typestack/class-validator)
- [OWASP Configuration Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [ADR-001: Monorepo Structure](./ADR-001-monorepo-structure.md)

---

**Superseded By**: N/A
**Related ADRs**: ADR-001, ADR-005 (Error Handling)
