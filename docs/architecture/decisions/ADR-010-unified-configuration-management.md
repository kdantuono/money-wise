# ADR-010: Unified Configuration Management Strategy

**Status**: Proposed
**Date**: 2025-10-06
**Context**: STORY-1.5.4 - Configuration Consolidation
**Related**: M1.5 Development Infrastructure & Quality

---

## Context and Problem Statement

MoneyWise currently has:
- **181 direct `process.env` accesses** across 34 files
- **11 .env files** with inconsistent naming and structure
- **No startup validation** - misconfiguration causes runtime errors
- **Type-unsafe configuration access** - prone to typos and type errors
- **Scattered configuration logic** - no single source of truth

**Critical Issues**:
1. JWT secrets can be weak, missing, or identical (security risk)
2. Database credentials not validated (connection failures at runtime)
3. Environment-specific configs duplicated across 5 files
4. No fail-fast validation - errors discovered in production

**Question**: How do we consolidate configuration management to be type-safe, validated, and maintainable?

---

## Decision Drivers

### Must Have
- **Type Safety**: TypeScript types for all configuration
- **Fail-Fast Validation**: Startup validation prevents misconfiguration
- **Security**: Validate JWT secrets, passwords, credentials
- **DRY**: Single source of truth for configuration structure
- **Environment-Aware**: Support dev/staging/production with defaults

### Should Have
- **Documentation**: Auto-generated config documentation
- **IDE Support**: Autocomplete for configuration access
- **Testability**: Easy to mock in tests
- **CI/CD Friendly**: GitHub Secrets integration

### Nice to Have
- **Hot Reload**: Configuration changes without restart (development only)
- **Validation Reports**: Clear error messages for misconfiguration

---

## Considered Options

### Option 1: Direct process.env with TypeScript Declarations
**Pattern**: Augment NodeJS.ProcessEnv interface

```typescript
// global.d.ts
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'staging' | 'production';
      DB_HOST: string;
      DB_PORT: string;
      JWT_ACCESS_SECRET: string;
      // ... 50+ more variables
    }
  }
}

// Usage
const dbHost = process.env.DB_HOST; // Type: string
```

**Pros**:
- Simple, no runtime overhead
- TypeScript autocomplete
- No additional dependencies

**Cons**:
- ❌ No runtime validation
- ❌ No fail-fast behavior
- ❌ No default values
- ❌ No nested configuration structure
- ❌ Still 181 process.env accesses (refactoring smell)

**Verdict**: ❌ REJECTED - Doesn't solve core validation problem

---

### Option 2: NestJS ConfigModule + class-validator (RECOMMENDED)
**Pattern**: Validated configuration classes with dependency injection

```typescript
// auth.config.ts
import { IsString, MinLength, Validate } from 'class-validator';

export class AuthConfig {
  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters' })
  JWT_ACCESS_SECRET: string;

  @IsString()
  @MinLength(32)
  @Validate(IsUniqueSecret, ['JWT_ACCESS_SECRET'])
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN?: string = '15m';
}

// auth.service.ts
@Injectable()
export class AuthService {
  constructor(private configService: ConfigService) {}

  generateToken(payload: any) {
    const config = this.configService.get<AuthConfig>('auth');
    return this.jwtService.sign(payload, {
      secret: config.JWT_ACCESS_SECRET,  // ✅ Type-safe, validated
      expiresIn: config.JWT_ACCESS_EXPIRES_IN,
    });
  }
}
```

**Pros**:
- ✅ Runtime validation at startup (fail-fast)
- ✅ Type-safe access with TypeScript
- ✅ Custom validators (uniqueness, strength, etc.)
- ✅ Nested configuration structure
- ✅ Default values with environment-aware logic
- ✅ Built-in NestJS integration
- ✅ Testable (easy to mock ConfigService)
- ✅ Clear error messages

**Cons**:
- Additional dependency (class-validator)
- Slightly more boilerplate
- Learning curve for custom validators

**Verdict**: ✅ **SELECTED** - Best balance of type safety, validation, and maintainability

---

### Option 3: Zod Configuration Schema
**Pattern**: Runtime schema validation with Zod

```typescript
import { z } from 'zod';

const authConfigSchema = z.object({
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
});

type AuthConfig = z.infer<typeof authConfigSchema>;

// Validation
const config = authConfigSchema.parse(process.env);
```

**Pros**:
- ✅ Type inference (no manual types)
- ✅ Runtime validation
- ✅ Composable schemas
- ✅ Great TypeScript support

**Cons**:
- ❌ Not NestJS-native (requires adapter)
- ❌ Less familiar to NestJS developers
- ❌ Harder to integrate with DI
- ❌ No decorator-based validation

**Verdict**: ⚠️ ALTERNATIVE - Good for frontend (Next.js) but not ideal for NestJS backend

---

## Decision: NestJS ConfigModule + class-validator

### Architecture

```
apps/backend/src/core/config/
├── config.module.ts           # ConfigModule setup
├── config.schema.ts           # Root configuration validation
├── app.config.ts              # Application configuration
├── database.config.ts         # Database configuration
├── auth.config.ts             # Authentication configuration
├── redis.config.ts            # Redis configuration
├── monitoring.config.ts       # Sentry + CloudWatch
├── timescaledb.config.ts      # TimescaleDB-specific
└── validators/
    ├── unique-secret.validator.ts
    ├── strong-password.validator.ts
    └── connection-string.validator.ts
```

### Configuration Domains

#### 1. Application Config (`app.config.ts`)
```typescript
export class AppConfig {
  @IsString()
  NODE_ENV: 'development' | 'staging' | 'production';

  @IsNumber()
  @Min(1024)
  @Max(65535)
  PORT: number;

  @IsString()
  @IsOptional()
  APP_NAME?: string = 'MoneyWise Backend';

  @IsString()
  API_PREFIX: string = 'api';

  @IsString()
  @IsUrl()
  CORS_ORIGIN: string;
}
```

#### 2. Database Config (`database.config.ts`)
```typescript
export class DatabaseConfig {
  @IsString()
  DB_HOST: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  @MinLength(8, { message: 'DB_PASSWORD must be at least 8 characters in production' })
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  @IsString()
  @IsOptional()
  DB_SCHEMA?: string = 'public';

  @IsBoolean()
  @ValidateIf((o) => o.NODE_ENV === 'production', {
    message: 'DB_SYNCHRONIZE must be false in production'
  })
  DB_SYNCHRONIZE: boolean = process.env.NODE_ENV !== 'production';

  @IsBoolean()
  DB_LOGGING: boolean = process.env.NODE_ENV === 'development';
}
```

#### 3. Auth Config (`auth.config.ts`)
```typescript
export class AuthConfig {
  @IsString()
  @MinLength(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters' })
  JWT_ACCESS_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_EXPIRES_IN?: string = '15m';

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters' })
  @Validate(IsUniqueSecret, ['JWT_ACCESS_SECRET'], {
    message: 'JWT_REFRESH_SECRET must be different from JWT_ACCESS_SECRET'
  })
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_EXPIRES_IN?: string = '7d';
}
```

#### 4. Redis Config (`redis.config.ts`)
```typescript
export class RedisConfig {
  @IsString()
  REDIS_HOST: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsNumber()
  @Min(0)
  @Max(15)
  @IsOptional()
  REDIS_DB?: number = 0;
}
```

#### 5. Monitoring Config (`monitoring.config.ts`)
```typescript
export class SentryConfig {
  @IsString()
  @IsOptional()
  SENTRY_DSN?: string;

  @IsString()
  @IsOptional()
  SENTRY_ENVIRONMENT?: string;

  @IsString()
  @IsOptional()
  SENTRY_RELEASE?: string;
}

export class CloudWatchConfig {
  @IsBoolean()
  @IsOptional()
  CLOUDWATCH_ENABLED?: boolean = false;

  @IsString()
  @ValidateIf((o) => o.CLOUDWATCH_ENABLED === true)
  CLOUDWATCH_NAMESPACE: string;

  @IsString()
  @ValidateIf((o) => o.CLOUDWATCH_ENABLED === true)
  AWS_REGION: string;

  @IsString()
  @ValidateIf((o) => o.CLOUDWATCH_ENABLED === true)
  AWS_ACCESS_KEY_ID: string;

  @IsString()
  @ValidateIf((o) => o.CLOUDWATCH_ENABLED === true)
  AWS_SECRET_ACCESS_KEY: string;
}

export class MonitoringConfig {
  @ValidateNested()
  @Type(() => SentryConfig)
  sentry: SentryConfig;

  @ValidateNested()
  @Type(() => CloudWatchConfig)
  cloudwatch: CloudWatchConfig;

  @IsBoolean()
  @IsOptional()
  METRICS_ENABLED?: boolean = true;

  @IsNumber()
  @IsOptional()
  METRICS_FLUSH_INTERVAL?: number =
    process.env.NODE_ENV === 'production' ? 60000 : 30000;

  @IsBoolean()
  @IsOptional()
  HEALTH_CHECK_ENABLED?: boolean = true;
}
```

#### 6. TimescaleDB Config (`timescaledb.config.ts`)
```typescript
export class TimescaleDBConfig {
  @IsBoolean()
  @IsOptional()
  TIMESCALEDB_ENABLED?: boolean = true;

  @IsBoolean()
  @IsOptional()
  TIMESCALEDB_COMPRESSION_ENABLED?: boolean = true;

  @IsBoolean()
  @IsOptional()
  TIMESCALEDB_RETENTION_ENABLED?: boolean = true;

  @IsString()
  @IsOptional()
  TIMESCALEDB_CHUNK_TIME_INTERVAL?: string = '1d';

  @IsString()
  @IsOptional()
  TIMESCALEDB_COMPRESSION_AFTER?: string = '7d';

  @IsString()
  @IsOptional()
  TIMESCALEDB_RETENTION_AFTER?: string = '7y';
}
```

---

### Root Configuration Schema

```typescript
// config.schema.ts
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RootConfigSchema {
  @ValidateNested()
  @Type(() => AppConfig)
  app: AppConfig;

  @ValidateNested()
  @Type(() => DatabaseConfig)
  database: DatabaseConfig;

  @ValidateNested()
  @Type(() => AuthConfig)
  auth: AuthConfig;

  @ValidateNested()
  @Type(() => RedisConfig)
  redis: RedisConfig;

  @ValidateNested()
  @Type(() => MonitoringConfig)
  monitoring: MonitoringConfig;

  @ValidateNested()
  @Type(() => TimescaleDBConfig)
  timescaledb: TimescaleDBConfig;
}
```

---

### ConfigModule Setup

```typescript
// config.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validateConfig } from './config.validator';
import appConfig from './app.config';
import databaseConfig from './database.config';
import authConfig from './auth.config';
import redisConfig from './redis.config';
import monitoringConfig from './monitoring.config';
import timescaledbConfig from './timescaledb.config';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env.local',          // Local overrides (gitignored)
        `.env.${process.env.NODE_ENV}`,  // Environment-specific
        '.env',                 // Default
      ],
      load: [
        appConfig,
        databaseConfig,
        authConfig,
        redisConfig,
        monitoringConfig,
        timescaledbConfig,
      ],
      validate: validateConfig,  // ✅ Fail-fast validation
      validationOptions: {
        abortEarly: false,     // Show all errors
        forbidUnknownValues: true,
      },
    }),
  ],
})
export class ConfigurationModule {}
```

---

### Configuration Validator

```typescript
// config.validator.ts
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { RootConfigSchema } from './config.schema';

export function validateConfig(config: Record<string, unknown>) {
  // Transform flat process.env to nested config object
  const configObject = transformToNested(config);

  // Validate against schema
  const validatedConfig = plainToInstance(RootConfigSchema, configObject, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => Object.values(error.constraints || {}))
      .flat()
      .join('\n');

    throw new Error(`❌ Configuration Validation Failed:\n${errorMessages}`);
  }

  return configObject;
}

function transformToNested(env: Record<string, unknown>) {
  return {
    app: {
      NODE_ENV: env.NODE_ENV,
      PORT: parseInt(env.PORT as string, 10) || 3001,
      APP_NAME: env.APP_NAME,
      API_PREFIX: env.API_PREFIX,
      CORS_ORIGIN: env.CORS_ORIGIN,
    },
    database: {
      DB_HOST: env.DB_HOST,
      DB_PORT: parseInt(env.DB_PORT as string, 10),
      DB_USERNAME: env.DB_USERNAME,
      DB_PASSWORD: env.DB_PASSWORD,
      DB_NAME: env.DB_NAME,
      DB_SCHEMA: env.DB_SCHEMA,
      DB_SYNCHRONIZE: env.DB_SYNCHRONIZE === 'true',
      DB_LOGGING: env.DB_LOGGING === 'true',
    },
    auth: {
      JWT_ACCESS_SECRET: env.JWT_ACCESS_SECRET,
      JWT_ACCESS_EXPIRES_IN: env.JWT_ACCESS_EXPIRES_IN,
      JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET,
      JWT_REFRESH_EXPIRES_IN: env.JWT_REFRESH_EXPIRES_IN,
    },
    redis: {
      REDIS_HOST: env.REDIS_HOST,
      REDIS_PORT: parseInt(env.REDIS_PORT as string, 10),
      REDIS_PASSWORD: env.REDIS_PASSWORD,
      REDIS_DB: parseInt(env.REDIS_DB as string, 10) || 0,
    },
    monitoring: {
      sentry: {
        SENTRY_DSN: env.SENTRY_DSN,
        SENTRY_ENVIRONMENT: env.SENTRY_ENVIRONMENT,
        SENTRY_RELEASE: env.SENTRY_RELEASE,
      },
      cloudwatch: {
        CLOUDWATCH_ENABLED: env.CLOUDWATCH_ENABLED === 'true',
        CLOUDWATCH_NAMESPACE: env.CLOUDWATCH_NAMESPACE,
        AWS_REGION: env.AWS_REGION,
        AWS_ACCESS_KEY_ID: env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
      },
      METRICS_ENABLED: env.METRICS_ENABLED === 'true',
      METRICS_FLUSH_INTERVAL: parseInt(env.METRICS_FLUSH_INTERVAL as string, 10),
      HEALTH_CHECK_ENABLED: env.HEALTH_CHECK_ENABLED === 'true',
    },
    timescaledb: {
      TIMESCALEDB_ENABLED: env.TIMESCALEDB_ENABLED === 'true',
      TIMESCALEDB_COMPRESSION_ENABLED: env.TIMESCALEDB_COMPRESSION_ENABLED === 'true',
      TIMESCALEDB_RETENTION_ENABLED: env.TIMESCALEDB_RETENTION_ENABLED === 'true',
      TIMESCALEDB_CHUNK_TIME_INTERVAL: env.TIMESCALEDB_CHUNK_TIME_INTERVAL,
      TIMESCALEDB_COMPRESSION_AFTER: env.TIMESCALEDB_COMPRESSION_AFTER,
      TIMESCALEDB_RETENTION_AFTER: env.TIMESCALEDB_RETENTION_AFTER,
    },
  };
}
```

---

### Custom Validators

#### IsUniqueSecret Validator
```typescript
// validators/unique-secret.validator.ts
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isUniqueSecret', async: false })
export class IsUniqueSecret implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    return value !== relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be different from ${args.constraints[0]} for security`;
  }
}
```

#### IsStrongPassword Validator (Production Only)
```typescript
// validators/strong-password.validator.ts
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPassword implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    // Only enforce in production
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }

    // Require: 32+ chars, mix of upper/lower/numbers/symbols
    const hasLength = value.length >= 32;
    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSymbol = /[^A-Za-z0-9]/.test(value);

    return hasLength && hasUpper && hasLower && hasNumber && hasSymbol;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a strong password in production (32+ chars, mixed case, numbers, symbols)`;
  }
}
```

---

### Usage Patterns

#### Before (Direct process.env)
```typescript
// ❌ BEFORE: Type-unsafe, no validation, scattered
const token = this.jwtService.sign(payload, {
  secret: process.env.JWT_ACCESS_SECRET,  // String | undefined
  expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
});
```

#### After (ConfigService)
```typescript
// ✅ AFTER: Type-safe, validated, centralized
constructor(private configService: ConfigService) {}

generateToken(payload: any) {
  const authConfig = this.configService.get<AuthConfig>('auth');
  return this.jwtService.sign(payload, {
    secret: authConfig.JWT_ACCESS_SECRET,  // String (guaranteed)
    expiresIn: authConfig.JWT_ACCESS_EXPIRES_IN,  // '15m' (default)
  });
}
```

---

### Frontend Configuration (Next.js)

#### Validation with Zod
```typescript
// apps/web/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default('MoneyWise'),
  NEXT_PUBLIC_APP_VERSION: z.string(),
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: z.enum(['development', 'staging', 'production']),
  NEXT_PUBLIC_ANALYTICS_ENABLED: z.boolean().default(false),
});

export type Env = z.infer<typeof envSchema>;

// Validate at build time
export const env = envSchema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  NEXT_PUBLIC_ANALYTICS_ENABLED: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true',
});

// Usage
import { env } from '@/config/env';

const apiUrl = env.NEXT_PUBLIC_API_URL;  // ✅ Type-safe, validated
```

---

## Consequences

### Positive
- ✅ **Zero direct process.env accesses** - All configuration through ConfigService
- ✅ **Fail-fast validation** - Misconfiguration prevents startup
- ✅ **Type safety** - TypeScript enforces correct types
- ✅ **Single source of truth** - Configuration structure in one place
- ✅ **Testability** - Easy to mock ConfigService in tests
- ✅ **Documentation** - Config classes serve as documentation
- ✅ **IDE support** - Autocomplete for all config properties
- ✅ **Security** - Custom validators enforce password strength, secret uniqueness

### Negative
- ⚠️ **Initial migration effort** - 181 process.env replacements
- ⚠️ **Boilerplate** - More code vs direct process.env
- ⚠️ **Learning curve** - Team needs to understand class-validator
- ⚠️ **Test updates** - All tests need ConfigService mocks

### Neutral
- ConfigModule adds ~5ms to startup time (negligible)
- class-validator adds ~50KB to bundle (acceptable)

---

## Migration Strategy

### Phase 1: Create Configuration Classes (Week 1, Days 1-2)
1. Create config classes for each domain
2. Add custom validators
3. Implement validateConfig function
4. Update ConfigModule setup
5. Test validation with invalid values

### Phase 2: Migrate Backend (Week 1, Days 3-4)
1. Replace auth.service.ts process.env (5 violations)
2. Replace jwt.strategy.ts process.env (1 violation)
3. Replace health.controller.ts process.env (4 violations)
4. Replace remaining 102 backend violations
5. Update all tests with ConfigService mocks

### Phase 3: Migrate Frontend (Week 1, Day 5)
1. Create Zod schema for Next.js env
2. Replace 45 web process.env violations
3. Replace 24 mobile process.env violations
4. Update build configs

### Phase 4: Consolidate .env Files (Week 2, Day 1)
1. Delete redundant .env files (5 files)
2. Update .env.example templates
3. Document environment-specific deployment

### Phase 5: CI/CD Integration (Week 2, Day 2)
1. Add GitHub Secrets for all environments
2. Update deployment workflows
3. Test staging deployment
4. Validate production readiness

---

## Validation

### Success Criteria
- ✅ Zero direct process.env usages (except instrument.ts)
- ✅ All tests passing with ConfigService mocks
- ✅ Startup validation prevents misconfiguration
- ✅ CI/CD using GitHub Secrets exclusively
- ✅ Documentation updated

### Testing Strategy
```typescript
// config.validator.spec.ts
describe('Configuration Validation', () => {
  it('should fail with missing JWT secrets', () => {
    expect(() => validateConfig({})).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('should fail with weak JWT secrets', () => {
    expect(() => validateConfig({
      JWT_ACCESS_SECRET: 'weak',  // < 32 chars
      JWT_REFRESH_SECRET: 'also-weak',
    })).toThrow(/at least 32 characters/);
  });

  it('should fail with identical JWT secrets', () => {
    const sameSecret = 'same-secret-for-both-tokens-32chars';
    expect(() => validateConfig({
      JWT_ACCESS_SECRET: sameSecret,
      JWT_REFRESH_SECRET: sameSecret,
    })).toThrow(/must be different/);
  });

  it('should apply environment-aware defaults', () => {
    process.env.NODE_ENV = 'production';
    const config = validateConfig({ /* minimal config */ });
    expect(config.database.DB_SYNCHRONIZE).toBe(false);  // ✅ Safe default
  });
});
```

---

## References

- **NestJS ConfigModule**: https://docs.nestjs.com/techniques/configuration
- **class-validator**: https://github.com/typestack/class-validator
- **Zod (Frontend)**: https://zod.dev/
- **Config Audit Report**: `/docs/development/config-audit-report.md`
- **STORY-1.5.4**: Configuration Management Consolidation

---

**Status**: Awaiting approval before implementation
**Next Step**: Begin Task 3 (Create validation schemas)
