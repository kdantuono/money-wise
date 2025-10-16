# Task: Configuration Management Consolidation

**Issue**: #106
**Story**: STORY-1.5.4
**Domain**: devops/backend
**Assigned To**: devops-engineer, senior-backend-dev
**Branch**: feature/story-1.5.4-config-consolidation
**Status**: assigned
**Dependencies**: None (can start immediately)

## Full Context (Self-Contained)

### Objective

Eliminate all 181 direct `process.env` references and consolidate 11 scattered `.env` files into a unified, validated configuration system using NestJS ConfigModule. This will improve security, maintainability, and deployment reliability.

### Current State Analysis

**Problem Scope**:
- 181 `process.env` violations across 34 files
- 11 environment files scattered across the monorepo
- No validation on configuration values
- Secrets exposed in repository
- Inconsistent configuration between environments

**Files with Most Violations**:
```typescript
// Backend (112 occurrences in 21 files):
apps/backend/src/config/database.ts (7 refs)
apps/backend/src/config/timescaledb.config.ts (6 refs)
apps/backend/src/instrument.ts (4 refs)
apps/backend/__tests__/setup.ts (10 refs)

// Frontend (69 occurrences in 13 files):
apps/web/sentry.*.config.ts (18 refs total)
apps/web/lib/auth.ts (1 ref)
apps/web/playwright.config.ts (13 refs)
```

### Requirements

1. **Unified Configuration Module** with objective acceptance criteria:
   - All configs accessed via ConfigService, not process.env
   - Validation using Joi or class-validator schemas
   - Type-safe configuration objects
   - Environment-specific overrides supported

2. **Consolidate Environment Files** with objective acceptance criteria:
   - Maximum 4 .env files total (root + app-specific)
   - Clear naming convention: .env, .env.development, .env.production
   - All secrets moved to GitHub Secrets
   - Generated .env.example files with all variables documented

3. **Migration Strategy** with objective acceptance criteria:
   - Zero breaking changes during migration
   - Feature flags for gradual rollout if needed
   - All tests passing after migration
   - CI/CD continues working with GitHub Secrets

### Technical Specifications

#### 1. ConfigModule Setup (Backend)

```typescript
// apps/backend/src/config/config.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { databaseConfig } from './database.config';
import { authConfig } from './auth.config';
import { sentryConfig } from './sentry.config';
import { redisConfig } from './redis.config';
import { appConfig } from './app.config';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}.local`,
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env.local',
        '.env'
      ],
      load: [
        appConfig,
        databaseConfig,
        authConfig,
        sentryConfig,
        redisConfig
      ],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production', 'staging')
          .default('development'),
        PORT: Joi.number().default(3001),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default('7d'),
        REDIS_URL: Joi.string(),
        SENTRY_DSN: Joi.string().uri().optional(),
        // Add all other variables with validation
      }),
      validationOptions: {
        allowUnknown: false,
        abortEarly: false,
      }
    })
  ],
  exports: [NestConfigModule]
})
export class ConfigModule {}
```

#### 2. Configuration Schema Example

```typescript
// apps/backend/src/config/database.config.ts
import { registerAs } from '@nestjs/config';
import { IsString, IsNumber, IsBoolean, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

class DatabaseConfig {
  @IsString()
  url: string;

  @IsString()
  host: string;

  @IsNumber()
  port: number;

  @IsString()
  database: string;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsBoolean()
  synchronize: boolean;

  @IsBoolean()
  logging: boolean;

  @IsNumber()
  poolSize: number;
}

export const databaseConfig = registerAs('database', (): DatabaseConfig => {
  const config = {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'moneywise',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
  };

  const validatedConfig = plainToClass(DatabaseConfig, config);
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
});
```

#### 3. Using ConfigService

```typescript
// Before (BAD):
const port = process.env.PORT || 3001;
const dbUrl = process.env.DATABASE_URL;

// After (GOOD):
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private config: ConfigService) {}

  getPort(): number {
    return this.config.get<number>('PORT', 3001);
  }

  getDatabaseUrl(): string {
    return this.config.get<string>('database.url');
  }
}
```

#### 4. Frontend Configuration (Next.js)

```typescript
// apps/web/lib/config.ts
import { z } from 'zod';

const configSchema = z.object({
  // Public runtime config
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']),

  // Server-only config
  API_SECRET_KEY: z.string().min(32),
  DATABASE_URL: z.string(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
});

// Validate at build time
const config = configSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || 'development',
  API_SECRET_KEY: process.env.API_SECRET_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
});

export default config;
```

### Files to Create/Modify

**Create**:
- `/apps/backend/src/config/config.module.ts` - Main configuration module
- `/apps/backend/src/config/app.config.ts` - Application config
- `/apps/backend/src/config/auth.config.ts` - Authentication config
- `/apps/backend/src/config/sentry.config.ts` - Monitoring config
- `/apps/backend/src/config/redis.config.ts` - Cache config
- `/apps/web/lib/config.ts` - Frontend configuration
- `/.env.example` - Root example with all variables
- `/apps/backend/.env.example` - Backend-specific example
- `/apps/web/.env.example` - Frontend-specific example

**Modify** (replace process.env):
- All 34 files with process.env references
- Update imports to use ConfigService
- Update tests to use ConfigModule.forRoot

**Delete**:
- `/apps/backend/.env.staging.example`
- `/apps/backend/.env.production.example`
- `/apps/web/.env.staging.example`
- `/apps/web/.env.production.example`
- Consolidate into single examples

### Migration Plan

**Phase 1: Setup (Day 1)**
1. Create ConfigModule and all config files
2. Add validation schemas
3. Test module loads correctly

**Phase 2: Backend Migration (Day 2-3)**
1. Update main.ts to use ConfigService
2. Migrate database configuration
3. Migrate auth module
4. Migrate all services
5. Update all tests

**Phase 3: Frontend Migration (Day 3-4)**
1. Create config.ts with validation
2. Update all components
3. Update API calls
4. Update build configs

**Phase 4: CI/CD Update (Day 4)**
1. Move secrets to GitHub Secrets
2. Update workflows to inject secrets
3. Test all pipelines

### Definition of Done

- [ ] Zero `process.env` references (grep returns 0)
- [ ] Maximum 4 .env files in repository
- [ ] All configs have validation schemas
- [ ] ConfigService used everywhere
- [ ] CI/CD uses GitHub Secrets only
- [ ] All tests passing
- [ ] Documentation updated
- [ ] .env.example files complete

### Integration Notes

This configuration consolidation will:
- Enable STORY-1.5.6 (structure optimization) by cleaning up configs first
- Support STORY-1.5.7 (testing) with proper test configurations
- Improve security by validating all inputs
- Simplify deployment with environment-specific configs

### Commands for Agent

```bash
# Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/story-1.5.4-config-consolidation

# Install required packages
pnpm add @nestjs/config joi class-validator class-transformer
pnpm add -D @types/joi

# Create config structure
mkdir -p apps/backend/src/config
touch apps/backend/src/config/{config.module,app.config,auth.config,database.config,redis.config,sentry.config}.ts

# Test configuration loads
pnpm test:unit --testPathPattern=config

# Find all process.env references to fix
grep -r "process\.env\." --include="*.ts" --include="*.tsx" apps/

# After implementation
git add .
git commit -m "feat(config): implement unified configuration management with validation"
git push -u origin feature/story-1.5.4-config-consolidation

# Create PR
gh pr create \
  --title "feat(config): STORY-1.5.4 - Configuration Management Consolidation" \
  --body "Closes #106 - Implements unified configuration management with validation" \
  --base develop
```

### Testing Strategy

```typescript
// apps/backend/src/config/__tests__/config.module.spec.ts
describe('ConfigModule', () => {
  it('should load configuration with validation', async () => {
    const module = await Test.createTestingModule({
      imports: [ConfigModule],
    }).compile();

    const configService = module.get(ConfigService);

    expect(configService.get('NODE_ENV')).toBeDefined();
    expect(configService.get('database.host')).toBeDefined();
    expect(() => configService.get('INVALID_KEY')).toThrow();
  });

  it('should validate required environment variables', () => {
    const originalEnv = process.env;
    process.env = {};

    expect(() => {
      ConfigModule.forRoot();
    }).toThrow(/JWT_SECRET.*required/);

    process.env = originalEnv;
  });
});
```

### Risk Mitigation

1. **Breaking Changes**: Use feature flags to gradually migrate
2. **Missing Variables**: Validation will catch at startup
3. **Test Failures**: Update test setup to include ConfigModule
4. **CI/CD Issues**: Test with GitHub Secrets in separate PR first

---

**Agent Instructions**: Focus on creating a robust, validated configuration system that eliminates all direct process.env usage. Start with the backend ConfigModule, then migrate all references systematically. Ensure zero breaking changes and maintain backward compatibility during migration.