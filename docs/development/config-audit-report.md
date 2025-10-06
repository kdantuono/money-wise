# Configuration Audit Report - STORY-1.5.4

**Generated**: 2025-10-06
**Status**: M1.5 Configuration Consolidation
**Auditor**: Claude Code + Project Orchestrator

---

## Executive Summary

### Current State
- **Total .env files**: 11 files across monorepo
- **Unique variables**: 52 distinct configuration variables
- **Process.env violations**: 181 direct accesses across 34 files
- **Configuration domains**: 9 distinct domains (app, database, auth, redis, monitoring, etc.)

### Critical Findings
1. **Duplicate .env files**: Root `.env.example` duplicates backend config
2. **Inconsistent naming**: Mix of DB_* and DATABASE_*, REDIS vs CACHE
3. **Missing validation**: No startup validation for critical configs (JWT secrets, DB credentials)
4. **Security risks**: JWT secrets not validated for uniqueness or strength
5. **Environment sprawl**: 4 environment-specific files (dev, test, staging, production)

### Recommended Consolidation
- **Target**: 4 .env files maximum (root dev + per-app examples)
- **Strategy**: Unified ConfigModule with class-validator
- **Effort**: 44 hours across 5 migration tasks

---

## File Inventory

### 1. Root Level (2 files)

#### `/home/nemesi/dev/money-wise/.env.example`
**Status**: ⚠️ DUPLICATE - Redundant with backend config
**Lines**: 36
**Variables**: 22
**Purpose**: Originally monorepo-wide, now mostly duplicates backend

**Variables**:
```env
# Database (6 vars)
DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME

# Application (2 vars)
NODE_ENV, PORT

# Security (1 var)
JWT_SECRET

# Redis (3 vars)
REDIS_HOST, REDIS_PORT, REDIS_PASSWORD

# External Services - Plaid (3 vars)
PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENVIRONMENT

# Email (4 vars)
EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD

# Monitoring (2 vars)
LOG_LEVEL, ENABLE_METRICS

# Development (1 var)
SWAGGER_ENABLED
```

**Recommendation**: DELETE - All vars covered by app-specific configs

---

#### `/home/nemesi/dev/money-wise/.env`
**Status**: ✅ ACTIVE DEVELOPMENT CONFIG
**Purpose**: Loaded by apps for local development
**Recommendation**: KEEP - Consolidate as single dev environment file

---

### 2. Backend App (5 files)

#### `/home/nemesi/dev/money-wise/apps/backend/.env.example`
**Status**: ✅ PRIMARY BACKEND CONFIG
**Lines**: 73
**Variables**: 39
**Purpose**: Complete backend configuration template

**Variable Groups**:

**Application Config (7 vars)**:
```env
NODE_ENV, PORT, APP_NAME, APP_VERSION, API_PREFIX, CORS_ORIGIN
```

**Database Config (9 vars)**:
```env
DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME, DB_SCHEMA, DB_SYNCHRONIZE, DB_LOGGING
```

**TimescaleDB Config (6 vars)**:
```env
TIMESCALEDB_ENABLED, TIMESCALEDB_COMPRESSION_ENABLED, TIMESCALEDB_RETENTION_ENABLED
TIMESCALEDB_CHUNK_TIME_INTERVAL, TIMESCALEDB_COMPRESSION_AFTER, TIMESCALEDB_RETENTION_AFTER
```

**JWT/Auth Config (4 vars)**:
```env
JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN
```

**Redis Config (4 vars)**:
```env
REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB
```

**Sentry Monitoring (3 vars)**:
```env
SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_RELEASE
```

**CloudWatch Monitoring (5 vars)**:
```env
CLOUDWATCH_ENABLED, CLOUDWATCH_NAMESPACE, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
```

**Health/Metrics (3 vars)**:
```env
METRICS_ENABLED, METRICS_FLUSH_INTERVAL, HEALTH_CHECK_ENABLED
```

**Recommendation**: KEEP - Transform into validated ConfigModule

---

#### `/home/nemesi/dev/money-wise/apps/backend/.env`
**Status**: ✅ ACTIVE - Local development overrides
**Recommendation**: KEEP - Rename to `.env.local` (gitignored)

---

#### `/home/nemesi/dev/money-wise/apps/backend/.env.test`
**Status**: ✅ TEST ENVIRONMENT
**Purpose**: Jest test configuration
**Recommendation**: KEEP - Required for isolated test environment

---

#### `/home/nemesi/dev/money-wise/apps/backend/.env.production.example`
**Status**: ⚠️ TEMPLATE - Production configuration template
**Lines**: 62
**Variables**: 34 (subset of .env.example with production values)

**Key Differences from Dev**:
- `DB_SYNCHRONIZE=false` (CRITICAL - prevent schema auto-sync)
- `DB_LOGGING=false` (performance)
- `METRICS_FLUSH_INTERVAL=60000` (less frequent)
- `CLOUDWATCH_ENABLED=true` (required)
- Stronger password placeholders

**Recommendation**: CONSOLIDATE into main .env.example with environment-aware defaults

---

#### `/home/nemesi/dev/money-wise/apps/backend/.env.staging.example`
**Status**: ⚠️ TEMPLATE - Staging environment
**Purpose**: Pre-production testing configuration
**Recommendation**: CONSOLIDATE - Use environment-specific overrides in deployment configs

---

### 3. Web App (3 files)

#### `/home/nemesi/dev/money-wise/apps/web/.env.example`
**Status**: ✅ PRIMARY WEB CONFIG
**Lines**: 44
**Variables**: 15
**Purpose**: Next.js application configuration

**Variable Groups**:

**Application Config (3 vars)**:
```env
NEXT_PUBLIC_APP_NAME, NEXT_PUBLIC_APP_VERSION, NEXT_PUBLIC_API_URL
```

**Sentry Config (10 vars)**:
```env
NEXT_PUBLIC_SENTRY_DSN, NEXT_PUBLIC_SENTRY_ENVIRONMENT, NEXT_PUBLIC_SENTRY_RELEASE
SENTRY_ORG, SENTRY_PROJECT, SENTRY_RELEASE, SENTRY_ENVIRONMENT
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE, NEXT_PUBLIC_SENTRY_DEBUG
```

**Analytics (1 var)**:
```env
NEXT_PUBLIC_ANALYTICS_ENABLED
```

**Recommendation**: KEEP - Validate with class-validator in next.config.js

---

#### `/home/nemesi/dev/money-wise/apps/web/.env.production.example`
**Status**: ⚠️ TEMPLATE
**Recommendation**: CONSOLIDATE into main example

---

#### `/home/nemesi/dev/money-wise/apps/web/.env.staging.example`
**Status**: ⚠️ TEMPLATE
**Recommendation**: CONSOLIDATE into main example

---

### 4. Mobile App (1 file)

#### `/home/nemesi/dev/money-wise/apps/mobile/.env.example`
**Status**: ✅ PRIMARY MOBILE CONFIG
**Lines**: 11
**Variables**: 6
**Purpose**: Expo/React Native configuration

**Variables**:
```env
EXPO_PUBLIC_APP_NAME, EXPO_PUBLIC_APP_VERSION, EXPO_PUBLIC_API_URL
EXPO_PUBLIC_SENTRY_DSN, EXPO_PUBLIC_SENTRY_RELEASE
EXPO_PUBLIC_ANALYTICS_ENABLED
```

**Recommendation**: KEEP - Minimal, well-structured

---

## Variable Analysis

### Complete Variable Catalog (52 unique)

#### Application Domain (10 vars)
```
NODE_ENV, PORT, APP_NAME, APP_VERSION, API_PREFIX, CORS_ORIGIN
NEXT_PUBLIC_APP_NAME, NEXT_PUBLIC_APP_VERSION, NEXT_PUBLIC_API_URL
EXPO_PUBLIC_APP_NAME, EXPO_PUBLIC_APP_VERSION, EXPO_PUBLIC_API_URL
```

#### Database Domain (10 vars)
```
DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME, DB_SCHEMA
DB_SYNCHRONIZE, DB_LOGGING
DATABASE_HOST, DATABASE_PORT (legacy naming)
```

#### TimescaleDB Domain (6 vars)
```
TIMESCALEDB_ENABLED, TIMESCALEDB_COMPRESSION_ENABLED, TIMESCALEDB_RETENTION_ENABLED
TIMESCALEDB_CHUNK_TIME_INTERVAL, TIMESCALEDB_COMPRESSION_AFTER, TIMESCALEDB_RETENTION_AFTER
```

#### Authentication Domain (5 vars)
```
JWT_SECRET (legacy - root only)
JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES_IN
JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN
```

#### Redis Domain (4 vars)
```
REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_DB
```

#### Sentry Monitoring (Backend - 3 vars)
```
SENTRY_DSN, SENTRY_ENVIRONMENT, SENTRY_RELEASE
```

#### Sentry Monitoring (Web - 10 vars)
```
NEXT_PUBLIC_SENTRY_DSN, NEXT_PUBLIC_SENTRY_ENVIRONMENT, NEXT_PUBLIC_SENTRY_RELEASE
SENTRY_ORG, SENTRY_PROJECT, SENTRY_RELEASE, SENTRY_ENVIRONMENT
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE, NEXT_PUBLIC_SENTRY_DEBUG
```

#### Sentry Monitoring (Mobile - 2 vars)
```
EXPO_PUBLIC_SENTRY_DSN, EXPO_PUBLIC_SENTRY_RELEASE
```

#### CloudWatch Monitoring (5 vars)
```
CLOUDWATCH_ENABLED, CLOUDWATCH_NAMESPACE, AWS_REGION
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
```

#### Application Metrics (3 vars)
```
METRICS_ENABLED, METRICS_FLUSH_INTERVAL, HEALTH_CHECK_ENABLED
```

#### Legacy/Unused (8 vars)
```
EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD (not implemented)
PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENVIRONMENT (not implemented)
LOG_LEVEL (redundant with NODE_ENV), ENABLE_METRICS (superseded by METRICS_ENABLED)
SWAGGER_ENABLED (hardcoded in backend)
```

---

## Naming Inconsistencies

### Database Naming Conflict
**Problem**: Mix of `DB_*` and `DATABASE_*` prefixes

**Root .env.example**:
```env
DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME
```

**Backend .env.example**:
```env
DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME, DB_SCHEMA
```

**Recommendation**: Standardize on `DB_*` (shorter, backend already uses it)

**Migration**:
```typescript
// Before
DATABASE_HOST=localhost

// After
DB_HOST=localhost
```

---

### Application Name Variations
**Problem**: Different app name variables per platform

```env
APP_NAME=MoneyWise Backend              # Backend
NEXT_PUBLIC_APP_NAME=MoneyWise          # Web
EXPO_PUBLIC_APP_NAME=MoneyWise Mobile   # Mobile
```

**Recommendation**: KEEP - Platform-specific naming makes sense here

---

## Security Findings

### 🚨 CRITICAL: No JWT Secret Validation

**Current State**: JWT secrets accepted as-is from environment

**Risks**:
1. Weak secrets (e.g., "secret", "password")
2. Same secret for access + refresh tokens
3. Missing secrets = runtime errors

**Solution**: Add class-validator validators
```typescript
@MinLength(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters' })
@Validate(IsUniqueSecret, ['JWT_REFRESH_SECRET'])
JWT_ACCESS_SECRET: string;
```

**Status**: ✅ ALREADY IMPLEMENTED in `apps/backend/src/core/config/auth.config.ts`

---

### 🔒 Database Credentials Validation

**Current State**: No validation for DB credentials

**Recommendation**: Add validators
```typescript
@IsString()
@MinLength(8, { message: 'DB_PASSWORD must be at least 8 characters in production' })
DB_PASSWORD: string;
```

---

## Process.env Violations

**Total Violations**: 181 across 34 files

### High-Priority Files (Backend)

1. **apps/backend/src/auth/auth.service.ts** (5 violations)
   - Lines 256, 293, 294, 298, 299
   - Direct JWT secret access

2. **apps/backend/src/auth/strategies/jwt.strategy.ts** (1 violation)
   - Line 13: `process.env.JWT_ACCESS_SECRET`

3. **apps/backend/src/core/monitoring/health.controller.ts** (4 violations)
   - Lines 96, 97, 132, 133
   - `process.env.npm_package_version`, `process.env.NODE_ENV`

4. **apps/backend/src/instrument.ts** (4 violations)
   - Lines 14, 15, 16, 67
   - **NOTE**: This is DOCUMENTED EXCEPTION - runs before NestJS bootstrap

### Frontend Violations (69 total)
- Apps/web: 45 violations
- Apps/mobile: 24 violations

**Recommendation**: Full migration in Task 4 & 5

---

## Consolidation Strategy

### Phase 1: Reduce File Count (11 → 4 files)

**Target Structure**:
```
/.env                              # Local development (gitignored)
/apps/backend/.env.example         # Backend template
/apps/web/.env.example             # Web template
/apps/mobile/.env.example          # Mobile template
```

**Files to DELETE**:
- `/.env.example` (redundant)
- `/apps/backend/.env.production.example` (consolidate)
- `/apps/backend/.env.staging.example` (consolidate)
- `/apps/web/.env.production.example` (consolidate)
- `/apps/web/.env.staging.example` (consolidate)

**Files to KEEP**:
- `/.env` (local dev)
- `/apps/backend/.env.example` (enhanced with environment-aware defaults)
- `/apps/backend/.env.test` (test isolation)
- `/apps/web/.env.example`
- `/apps/mobile/.env.example`

---

### Phase 2: Standardize Naming

**Database Variables**:
```diff
- DATABASE_HOST → DB_HOST
- DATABASE_PORT → DB_PORT
- DATABASE_USER → DB_USERNAME
- DATABASE_PASSWORD → DB_PASSWORD
- DATABASE_NAME → DB_NAME
```

**Legacy Cleanup**:
```diff
- JWT_SECRET → (use JWT_ACCESS_SECRET + JWT_REFRESH_SECRET)
- LOG_LEVEL → (remove - use NODE_ENV)
- ENABLE_METRICS → METRICS_ENABLED
- SWAGGER_ENABLED → (remove - hardcode in backend based on NODE_ENV)
```

**Remove Unimplemented**:
```diff
- EMAIL_* (not implemented)
- PLAID_* (not implemented yet)
```

---

### Phase 3: Environment-Specific Defaults

**Strategy**: Single .env.example with environment-aware logic

**Example** (in ConfigModule):
```typescript
@IsOptional()
@IsBoolean()
DB_SYNCHRONIZE?: boolean = process.env.NODE_ENV !== 'production';

@IsOptional()
@IsNumber()
METRICS_FLUSH_INTERVAL?: number =
  process.env.NODE_ENV === 'production' ? 60000 : 30000;
```

**Benefits**:
- Single source of truth
- Environment-specific behavior without file duplication
- Validated defaults

---

## GitHub Secrets Requirements

### Backend Secrets (8 required)
```yaml
DB_PASSWORD              # Database password
JWT_ACCESS_SECRET        # JWT access token secret (32+ chars)
JWT_REFRESH_SECRET       # JWT refresh token secret (32+ chars, unique)
REDIS_PASSWORD           # Redis password
SENTRY_DSN              # Sentry error tracking DSN
AWS_ACCESS_KEY_ID       # CloudWatch access (production)
AWS_SECRET_ACCESS_KEY   # CloudWatch secret (production)
```

### Web Secrets (2 required)
```yaml
NEXT_PUBLIC_SENTRY_DSN  # Client-side error tracking
SENTRY_AUTH_TOKEN       # Source map upload token
```

### Deployment Secrets (per environment)
```yaml
# Staging
STAGING_DB_HOST
STAGING_REDIS_HOST
STAGING_SENTRY_DSN

# Production
PRODUCTION_DB_HOST
PRODUCTION_REDIS_HOST
PRODUCTION_SENTRY_DSN
```

---

## Success Metrics

### Quantitative
- ✅ File count: 11 → 4 (64% reduction)
- ✅ Variable consistency: 52 → 45 (remove 7 legacy/unused)
- ✅ Process.env violations: 181 → 0 (100% migration)
- ✅ Naming conflicts: 3 conflicts → 0
- ✅ Validation coverage: 0% → 100%

### Qualitative
- ✅ Startup validation prevents misconfiguration
- ✅ Type-safe configuration access
- ✅ Environment-specific defaults without file duplication
- ✅ Clear documentation for each variable
- ✅ CI/CD uses GitHub Secrets exclusively

---

## Next Steps

### Task 2: Design Unified ConfigModule (4h)
**Deliverables**:
- Architectural Decision Record (ADR)
- ConfigModule structure
- Validation strategy
- Environment-aware defaults

### Task 3: Create Validation Schemas (8h)
**Deliverables**:
- `AppConfig`, `DatabaseConfig`, `AuthConfig`, etc.
- Custom validators (e.g., `IsUniqueSecret`, `IsStrongPassword`)
- Fail-fast validation logic

### Task 4: Migrate Backend (8h)
**Target**: 112 process.env violations → 0

### Task 5: Migrate Frontend (6h)
**Target**: 69 process.env violations → 0

---

## Appendix: Variable Reference

### Complete Alphabetical Index

```
API_PREFIX                           [Backend]
APP_NAME                             [Backend]
APP_VERSION                          [Backend]
AWS_ACCESS_KEY_ID                    [Backend - CloudWatch]
AWS_REGION                           [Backend - CloudWatch]
AWS_SECRET_ACCESS_KEY                [Backend - CloudWatch]
CLOUDWATCH_ENABLED                   [Backend]
CLOUDWATCH_NAMESPACE                 [Backend]
CORS_ORIGIN                          [Backend]
DATABASE_* (legacy)                  [Root - DEPRECATED]
DB_HOST                              [Backend]
DB_LOGGING                           [Backend]
DB_NAME                              [Backend]
DB_PASSWORD                          [Backend]
DB_PORT                              [Backend]
DB_SCHEMA                            [Backend]
DB_SYNCHRONIZE                       [Backend]
DB_USERNAME                          [Backend]
EMAIL_* (unimplemented)              [Root - UNUSED]
ENABLE_METRICS (legacy)              [Root - DEPRECATED]
EXPO_PUBLIC_ANALYTICS_ENABLED        [Mobile]
EXPO_PUBLIC_APP_NAME                 [Mobile]
EXPO_PUBLIC_APP_VERSION              [Mobile]
EXPO_PUBLIC_API_URL                  [Mobile]
EXPO_PUBLIC_SENTRY_DSN               [Mobile]
EXPO_PUBLIC_SENTRY_RELEASE           [Mobile]
HEALTH_CHECK_ENABLED                 [Backend]
JWT_ACCESS_EXPIRES_IN                [Backend]
JWT_ACCESS_SECRET                    [Backend]
JWT_REFRESH_EXPIRES_IN               [Backend]
JWT_REFRESH_SECRET                   [Backend]
JWT_SECRET (legacy)                  [Root - DEPRECATED]
LOG_LEVEL (legacy)                   [Root - DEPRECATED]
METRICS_ENABLED                      [Backend]
METRICS_FLUSH_INTERVAL               [Backend]
NEXT_PUBLIC_ANALYTICS_ENABLED        [Web]
NEXT_PUBLIC_APP_NAME                 [Web]
NEXT_PUBLIC_APP_VERSION              [Web]
NEXT_PUBLIC_API_URL                  [Web]
NEXT_PUBLIC_SENTRY_DEBUG             [Web]
NEXT_PUBLIC_SENTRY_DSN               [Web]
NEXT_PUBLIC_SENTRY_ENVIRONMENT       [Web]
NEXT_PUBLIC_SENTRY_RELEASE           [Web]
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE [Web]
NODE_ENV                             [Backend]
PLAID_* (unimplemented)              [Root - UNUSED]
PORT                                 [Backend]
REDIS_DB                             [Backend]
REDIS_HOST                           [Backend]
REDIS_PASSWORD                       [Backend]
REDIS_PORT                           [Backend]
SENTRY_DSN                           [Backend]
SENTRY_ENVIRONMENT                   [Backend, Web]
SENTRY_ORG                           [Web]
SENTRY_PROJECT                       [Web]
SENTRY_RELEASE                       [Backend, Web]
SWAGGER_ENABLED (legacy)             [Root - DEPRECATED]
TIMESCALEDB_CHUNK_TIME_INTERVAL      [Backend]
TIMESCALEDB_COMPRESSION_AFTER        [Backend]
TIMESCALEDB_COMPRESSION_ENABLED      [Backend]
TIMESCALEDB_ENABLED                  [Backend]
TIMESCALEDB_RETENTION_AFTER          [Backend]
TIMESCALEDB_RETENTION_ENABLED        [Backend]
```

---

**Document Status**: COMPLETE
**Next Action**: Proceed to Task 2 (Design Unified ConfigModule)
