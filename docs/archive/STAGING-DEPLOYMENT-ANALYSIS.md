# MoneyWise Staging Deployment - Comprehensive Analysis

**Date**: October 27, 2025  
**Project**: MoneyWise - Personal Finance Management Application  
**Status**: MVP Development (v0.5.0)  
**Focus**: Staging Environment Preparation & Deployment Configuration

---

## EXECUTIVE SUMMARY

The MoneyWise project is a **production-ready monorepo** with comprehensive deployment infrastructure. The codebase demonstrates:
- ✅ Mature Docker containerization strategy
- ✅ Multi-environment configuration system (.env files for dev/staging/prod)
- ✅ Sophisticated CI/CD pipeline with GitHub Actions
- ✅ Database versioning with Prisma migrations
- ✅ Monitoring and error tracking (Sentry, CloudWatch)
- ✅ Security best practices (non-root containers, health checks)

**Key Finding**: All infrastructure code and configuration templates exist for staging deployment. Primary work involves **variable substitution, secrets management, and infrastructure provisioning**.

---

## 1. PROJECT LAYOUT & DIRECTORY STRUCTURE

### Root Structure
```
/home/nemesi/dev/money-wise/
├── apps/                          # Application services
│   ├── backend/                   # NestJS API (Port 3001)
│   ├── web/                       # Next.js frontend (Port 3000)
│   └── mobile/                    # React Native app
├── packages/                      # Shared code
│   ├── types/                     # TypeScript definitions
│   ├── utils/                     # Utility functions
│   ├── ui/                        # React components
│   └── test-utils/                # Testing utilities
├── infrastructure/                # Docker configs & deployment
│   ├── docker/                    # Dockerfile and Docker configs
│   │   ├── postgres/              # PostgreSQL initialization
│   │   └── redis/                 # Redis configuration
│   └── monitoring/                # Prometheus/Grafana configs
├── docs/                          # Documentation
│   ├── development/               # Setup & development guides
│   ├── planning/                  # Roadmaps & specifications
│   ├── architecture/              # Architecture decisions
│   └── api/                       # API documentation
├── scripts/                       # Build & deployment scripts
├── .github/                       # GitHub Actions workflows
└── .claude/                       # Claude Code configuration
```

### Size Indicators
- **node_modules**: Present (monorepo installed)
- **dist directories**: Build artifacts exist
- **docker-compose files**: 2 main files (dev + monitoring)
- **Dockerfile files**: Backend and web apps containerized

---

## 2. DEPLOYMENT CONFIGURATION ANALYSIS

### 2.1 Docker-Compose Files

#### Development Setup (`docker-compose.dev.yml`)
**Location**: `/home/nemesi/dev/money-wise/docker-compose.dev.yml`

**Services Defined**:
```yaml
services:
  postgres:           # TimescaleDB (PostgreSQL + Time-series)
    image: timescale/timescaledb:latest-pg15
    container_name: postgres-dev
    ports: 5432:5432
    volumes: postgres_data
    
  redis:              # Cache & Session Storage
    image: redis:7-alpine
    container_name: redis-dev
    ports: 6379:6379
    volumes: redis_data
```

**Key Configuration**:
- Uses **TimescaleDB** (PostgreSQL extension for time-series data)
- Database: `moneywise` (default: postgres/password)
- Redis on default port (6379)
- Named volumes for persistence
- Health checks configured for both services
- Network: `app-network` (bridge)

#### Monitoring Services (`docker-compose.monitoring.yml`)
**Location**: `/home/nemesi/dev/money-wise/docker-compose.monitoring.yml`

**Optional Services** (via `profiles: [monitoring]`):
- **CloudWatch Agent**: AWS integration
- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboard
- **Node Exporter**: System metrics
- **cAdvisor**: Container metrics

---

### 2.2 Environment Configuration System

#### Structure Pattern
Three-environment system with cascading overrides:

```
.env.example              # Template (documented)
├── .env.local            # Local development (not committed)
├── .env.development      # Dev environment specifics
├── .env.staging          # Staging environment specifics
├── .env.production       # Production environment specifics
└── .env.test            # Test environment specifics
```

#### Backend Environment Files
**Location**: `/home/nemesi/dev/money-wise/apps/backend/.env*`

**Files Present**:
- `.env` (current development config)
- `.env.development` 
- `.env.example` (template - 4494 bytes)
- `.env.local` (git-ignored)
- `.env.staging.example` (staging template)
- `.env.production.example` (production template)
- `.env.test` (testing environment)

#### Frontend Environment Files  
**Location**: `/home/nemesi/dev/money-wise/apps/web/.env*`

**Files Present**:
- `.env.local` (current development)
- `.env.example` (template - 1905 bytes)
- `.env.local.template` (detailed template - 3501 bytes)
- `.env.staging.example` (staging template)
- `.env.production.example` (production template)

---

### 2.3 Root-Level Environment Configuration

**Location**: `/home/nemesi/dev/money-wise/.env*`

**Files**:
- `.env.example` (4612 bytes) - Comprehensive template
- `.env.local` (720 bytes) - Development-only values

**Structure**: Root .env aggregates both backend and frontend environment variables

---

## 3. BACKEND SERVICES CONFIGURATION

### 3.1 Backend Service (NestJS)

**Tech Stack**:
- Framework: NestJS 10.0.0
- Database ORM: Prisma 6.17.1
- Language: TypeScript
- Package Manager: pnpm

**Dockerfile** (`apps/backend/Dockerfile`):
```dockerfile
# Multi-stage build (optimized)
Stage 1: Builder (Node 20 Alpine)
  - Install dependencies
  - Build application
  - Output: /app/apps/backend/dist

Stage 2: Runtime (Node 20 Alpine)
  - Non-root user: nestjs (UID 1001)
  - Production dependencies only
  - Port: 3001
  - Health check: GET /health endpoint
```

**Build Process**:
```bash
pnpm install --frozen-lockfile
pnpm --filter @money-wise/backend build
# Internally: (1) prisma generate → (2) nest build
```

**Key Dependencies**:
- Authentication: JWT, Passport
- Database: Prisma, PostgreSQL driver
- Security: Argon2, bcryptjs, Helmet
- Error Tracking: Sentry/NestJS
- Monitoring: AWS CloudWatch, custom metrics
- Banking: Plaid (optional)

**Environment Variables** (Backend):
```
NODE_ENV=staging
PORT=3001
CORS_ORIGIN=https://staging.moneywise.app

# Database (TimescaleDB)
DB_HOST=staging-db.example.com
DB_PORT=5432
DB_NAME=moneywise_staging
DB_USERNAME=postgres
DB_PASSWORD=<CHANGE-ME>

# JWT Secrets
JWT_ACCESS_SECRET=<CHANGE-ME-MIN-32-CHARS>
JWT_REFRESH_SECRET=<CHANGE-ME-MIN-32-CHARS>

# Redis (Session/Cache)
REDIS_HOST=<staging-redis-host>
REDIS_PASSWORD=<CHANGE-ME>

# Sentry Error Tracking
SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project-id>
SENTRY_ENVIRONMENT=staging
SENTRY_RELEASE=moneywise@<version>

# CloudWatch (AWS Monitoring)
CLOUDWATCH_ENABLED=true
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<CHANGE-ME>
AWS_SECRET_ACCESS_KEY=<CHANGE-ME>

# Banking Integration (SaltEdge)
SALTEDGE_CLIENT_ID=<CHANGE-ME>
SALTEDGE_SECRET=<CHANGE-ME>
BANKING_INTEGRATION_ENABLED=true
```

**Health Check**: `GET /api/health` (NestJS built-in endpoint)

---

### 3.2 Database Configuration

**Database Type**: PostgreSQL 15 with **TimescaleDB** extension

**TimescaleDB Features** (Production Features):
```
TIMESCALEDB_ENABLED=true
TIMESCALEDB_COMPRESSION_ENABLED=true
TIMESCALEDB_RETENTION_ENABLED=true
TIMESCALEDB_CHUNK_TIME_INTERVAL=1d
TIMESCALEDB_COMPRESSION_AFTER=7d
TIMESCALEDB_RETENTION_AFTER=7y
```

**Rationale**: Time-series financial data (transactions, price history, budget trends)

**Prisma Integration**:
- Located: `/home/nemesi/dev/money-wise/apps/backend/prisma/`
- Files: `schema.prisma`, `migrations/`
- Commands:
  ```bash
  pnpm db:migrate         # Run pending migrations
  pnpm db:seed           # Seed development data
  pnpm prisma:studio    # GUI database editor
  ```

**Initial Setup** (`infrastructure/docker/postgres/init.sql`):
- Executed on container startup
- Creates initial schema
- Sets up extensions

---

### 3.3 Redis Configuration

**Purpose**: Session storage, caching, real-time features

**Staging Configuration**:
```
REDIS_HOST=staging-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=<CHANGE-ME>
REDIS_DB=0
```

**Recommendations**:
- Use AWS ElastiCache (Multi-AZ for HA)
- Or Redis Cloud (Enterprise tier)
- Password-protected
- Persistence enabled

---

## 4. FRONTEND SERVICES CONFIGURATION

### 4.1 Frontend Service (Next.js)

**Tech Stack**:
- Framework: Next.js 15.4.7
- Runtime: React 18
- Language: TypeScript
- Styling: Tailwind CSS
- Error Tracking: Sentry

**Dockerfile** (`apps/web/Dockerfile`):
```dockerfile
# Multi-stage build (optimized)
Stage 1: Builder (Node 20 Alpine)
  - Install dependencies
  - Build Next.js application
  - Output: /app/apps/web/dist/.next

Stage 2: Runtime (Nginx Alpine)
  - Lightweight web server
  - Custom nginx configuration
  - Non-root user: nextjs (UID 1001)
  - Port: 80 (HTTP)
  - Health check: GET / (wget)
```

**Build Process**:
```bash
pnpm install --frozen-lockfile
pnpm --filter @money-wise/web build
# Output: Next.js optimized build in .next/
```

**Next.js Configuration** (`next.config.mjs`):
```javascript
- Strict mode enabled
- TypeScript strict checking enforced
- ESLint enabled during builds
- Bundle analyzer available (ANALYZE=true)
- Sentry integration with source map upload
- React component annotation enabled
- Automatic Next.js function instrumentation
```

**Environment Variables** (Frontend):
```
NEXT_PUBLIC_APP_NAME=MoneyWise
NEXT_PUBLIC_APP_VERSION=0.5.0
NEXT_PUBLIC_API_URL=https://staging-api.moneywise.app/api

# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project-id>
NEXT_PUBLIC_SENTRY_ENVIRONMENT=staging
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.5

# Analytics
NEXT_PUBLIC_ANALYTICS_ENABLED=true

# Banking Integration
NEXT_PUBLIC_BANKING_ENABLED=true
NEXT_PUBLIC_OAUTH_REDIRECT_BASE=https://staging.moneywise.app
NEXT_PUBLIC_OAUTH_CALLBACK_PATH=/banking/callback
```

**Nginx Configuration**:
- Custom `nginx.conf` for SPA routing
- Gzip compression enabled
- Static asset caching
- SPA fallback (all routes → index.html)

**Health Check**: `GET /` (HTTP 200)

---

### 4.2 Build System & Package Manager

**Tool**: Turbo (monorepo orchestration)

**Configuration** (`turbo.json`):
- Caching strategy for builds
- Task dependency graph
- Parallel execution optimization

**Commands**:
```bash
# Development
pnpm dev                 # All services in parallel
pnpm dev:backend        # Backend only
pnpm dev:web           # Frontend only

# Production Build
pnpm build              # Full monorepo build
pnpm build:backend      # Backend build only
pnpm build:web         # Frontend build only

# Testing
pnpm test               # All tests
pnpm test:coverage      # Coverage report
pnpm test:e2e          # End-to-end tests
```

---

## 5. CURRENT ENVIRONMENT SETUP

### 5.1 Development Configuration Details

**Backend** (`apps/backend/.env`):
```
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=moneywise

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_ACCESS_SECRET=dev-super-secret-jwt-access-key-change-in-production-12345
JWT_REFRESH_SECRET=dev-super-secret-jwt-refresh-key-change-in-production-98765

# Banking Integration (Development SaltEdge)
SALTEDGE_CLIENT_ID=Rs59-zW4twuHmOKFdM7fjSKH1wywCwWIfbgpaPsWW6s
SALTEDGE_SECRET=Rs59-zW4twuHmOKFdM7fjSKH1wywCwWIfbgpaPsWW6s
SALTEDGE_API_URL=https://api.saltedge.com/api/v5
BANKING_INTEGRATION_ENABLED=true
```

**Frontend** (`apps/web/.env.local`):
```
NEXT_PUBLIC_APP_NAME=MoneyWise
NEXT_PUBLIC_APP_VERSION=0.5.0
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_ANALYTICS_ENABLED=false
NEXT_PUBLIC_BANKING_ENABLED=true
```

### 5.2 OAuth & Authentication Provider

**Banking/OAuth Provider**: **SaltEdge** (European banking aggregator)

**Integration Status**:
- ✅ Configured in development
- ✅ Credentials present in `.env`
- ✅ OAuth callback endpoint: `/banking/callback`
- ✅ Sandbox environment in dev

**SaltEdge Details**:
```
Provider: SaltEdge (https://api.saltedge.com)
Environment: sandbox (dev) → production (staging/prod)
Credentials Stored: .secrets/private.pem (asymmetric key)
Callback: NEXT_PUBLIC_OAUTH_REDIRECT_BASE + NEXT_PUBLIC_OAUTH_CALLBACK_PATH
```

---

## 6. CI/CD CONFIGURATION

### 6.1 GitHub Actions Workflow

**Location**: `/home/nemesi/dev/money-wise/.github/workflows/`

**Workflow Files**:
1. **ci-cd.yml** (Main pipeline - 50KB)
   - Foundation health checks
   - Progressive security gates
   - Linting, type checking, testing
   - Build artifacts
   - Deployment triggers

2. **release.yml** (Release management - 20KB)
   - Version bumping
   - Changelog generation
   - Docker image publishing
   - GitHub release creation

3. **specialized-gates.yml** (Advanced validation - 10KB)
   - Performance gates
   - Security scanning
   - Integration tests

### 6.2 CI/CD Pipeline Architecture

**Trigger Events**:
- `push`: main, develop, epic/*, feature/*, story/*, refactor/* branches
- `pull_request`: Same branches
- `workflow_dispatch`: Manual trigger with optional full pipeline flag

**Pipeline Stages**:
1. **Foundation** (Always) - Health & detection
2. **Quality Gates** - Linting, TypeScript, formatting
3. **Testing** - Unit, integration, coverage
4. **Build** - Docker images, artifacts
5. **Security** - Vulnerability scanning
6. **Deployment** (Conditional) - Based on branch/approval

---

## 7. STAGING-SPECIFIC CONFIGURATION

### 7.1 Staging Environment Variables

**Backend** (Reference: `apps/backend/.env.staging.example`):

```bash
# Application
NODE_ENV=staging
PORT=3001
CORS_ORIGIN=https://staging.moneywise.app

# Database (Managed Service Required)
DB_HOST=staging-db.example.com
DB_PORT=5432
DB_NAME=moneywise_staging
DB_USERNAME=postgres
DB_PASSWORD=<CHANGE-ME-STAGING-DB-PASSWORD>

# TimescaleDB Compression (Production-like)
TIMESCALEDB_COMPRESSION_ENABLED=true
TIMESCALEDB_COMPRESSION_AFTER=7d
TIMESCALEDB_RETENTION_AFTER=7y

# JWT (Different from production)
JWT_ACCESS_SECRET=<CHANGE-ME-STAGING-JWT-ACCESS-SECRET>
JWT_REFRESH_SECRET=<CHANGE-ME-STAGING-JWT-REFRESH-SECRET>

# Redis (Managed Service Required)
REDIS_HOST=<staging-redis-host>
REDIS_PASSWORD=<CHANGE-ME-STAGING-REDIS-PASSWORD>

# Sentry (Staging Project)
SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<staging-project-id>
SENTRY_ENVIRONMENT=staging
SENTRY_RELEASE=moneywise@<git-hash>

# Monitoring
METRICS_ENABLED=true
METRICS_FLUSH_INTERVAL=30000
HEALTH_CHECK_ENABLED=true

# CloudWatch (Optional for staging)
CLOUDWATCH_ENABLED=false
```

**Frontend** (Reference: `apps/web/.env.staging.example`):

```bash
NEXT_PUBLIC_APP_NAME=MoneyWise
NEXT_PUBLIC_APP_VERSION=0.5.0
NEXT_PUBLIC_API_URL=https://staging-api.moneywise.app/api

# Sentry (Staging Project)
NEXT_PUBLIC_SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<staging-project-id>
NEXT_PUBLIC_SENTRY_ENVIRONMENT=staging
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.5

# Analytics
NEXT_PUBLIC_ANALYTICS_ENABLED=true
```

### 7.2 Infrastructure Requirements for Staging

**Required Infrastructure**:

1. **Compute**
   - Container orchestration: Docker Compose or Kubernetes
   - Container registry: Docker Hub, ECR, or GitHub Container Registry
   - Minimum: 2GB RAM, 1 CPU per service

2. **Database**
   - Managed PostgreSQL 15 with TimescaleDB extension
   - **Options**:
     - AWS RDS (PostgreSQL 15 + TimescaleDB)
     - DigitalOcean Managed Database
     - Azure Database for PostgreSQL
     - Heroku PostgreSQL (Staging tier)

3. **Cache/Session Store**
   - Managed Redis with password protection
   - **Options**:
     - AWS ElastiCache
     - Redis Cloud
     - DigitalOcean Managed Redis
     - Heroku Redis (Staging tier)

4. **Domain & SSL**
   - Domain: `staging.moneywise.app` (or similar)
   - SSL certificate (Let's Encrypt or managed)
   - DNS configured

5. **Error Tracking** (Sentry)
   - Create separate Sentry project for staging
   - Distinct from production project
   - Different DSN for backend and frontend

6. **Container Registry** (Optional but recommended)
   - Push Docker images for deployment
   - Version tagging strategy
   - Automated cleanup

---

## 8. SECURITY CONSIDERATIONS

### 8.1 Dockerfile Security

**Backend Dockerfile**:
- ✅ Non-root user (nestjs:1001)
- ✅ Alpine base (minimal attack surface)
- ✅ Multi-stage build (reduced image size)
- ✅ Health check configured
- ✅ No exposed secrets in image

**Frontend Dockerfile**:
- ✅ Non-root user (nextjs:1001)
- ✅ Alpine base (Nginx)
- ✅ Multi-stage build
- ✅ Health check configured
- ✅ Source maps hidden (hideSourceMaps: true)

### 8.2 Environment Variable Security

**Staging Recommendations**:
- Never commit `.env.staging` files to version control
- Use secret management:
  - GitHub Secrets (for CI/CD)
  - AWS Secrets Manager
  - HashiCorp Vault
  - 1Password / LastPass
- Rotate secrets regularly
- Different secrets for each environment
- Strong JWT secrets (minimum 32 characters)

### 8.3 Network Security

**Staging Network**:
- Private database (not internet-accessible)
- Private Redis (not internet-accessible)
- Backend API behind reverse proxy/load balancer
- Frontend behind CDN (optional)
- HTTPS only (redirect HTTP)
- CORS configured for staging domain only

### 8.4 Container Security

**Recommendations**:
- Regular image scanning (Trivy, Snyk)
- Keep dependencies updated
- Use read-only root filesystem (if possible)
- Limit container resources
- Network policies (if using Kubernetes)

---

## 9. MONITORING & OBSERVABILITY

### 9.1 Error Tracking (Sentry)

**Integration Status**: Configured in both apps

**Backend** (`@sentry/nestjs`):
- Global error handler
- Exception filtering
- Request/response tracking

**Frontend** (`@sentry/nextjs`):
- Runtime error tracking
- Source map upload
- Web Vitals monitoring
- Session replay (optional)

**Staging Setup Required**:
1. Create Sentry project for staging
2. Generate separate DSNs for backend and frontend
3. Configure in environment variables
4. Set sample rates (0.5 = 50% sampling for staging)

### 9.2 Metrics & Monitoring

**CloudWatch Integration** (AWS):
- Logs collection
- Custom metrics
- Alarms configuration
- Dashboard setup

**Optional Monitoring** (`docker-compose.monitoring.yml`):
- Prometheus: Metrics collection
- Grafana: Visualization dashboards
- Node Exporter: System metrics
- cAdvisor: Container metrics

---

## 10. DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] Infrastructure provisioned (Database, Redis, Domain)
- [ ] DNS configured for `staging.moneywise.app`
- [ ] SSL certificate obtained
- [ ] Environment variables prepared
- [ ] Secrets securely stored (GitHub, Vault, etc.)
- [ ] Container registry setup (optional)
- [ ] Sentry projects created (backend + frontend)
- [ ] Database initialized (migrations run)
- [ ] Backups configured for database
- [ ] Monitoring setup (Sentry, CloudWatch, etc.)

### Deployment Steps

1. **Build Docker Images**
   ```bash
   docker build -t moneywise-backend:staging apps/backend/
   docker build -t moneywise-web:staging apps/web/
   ```

2. **Push to Registry** (Optional)
   ```bash
   docker push <registry>/moneywise-backend:staging
   docker push <registry>/moneywise-web:staging
   ```

3. **Deploy Services**
   ```bash
   # Using Docker Compose
   docker-compose -f docker-compose.dev.yml up -d
   
   # Or using Kubernetes
   kubectl apply -f kubernetes/staging/
   ```

4. **Run Migrations**
   ```bash
   docker exec moneywise-backend npm run db:migrate
   ```

5. **Verify Deployment**
   - Backend health: `https://staging-api.moneywise.app/api/health`
   - Frontend: `https://staging.moneywise.app`
   - Database connectivity: Check logs

6. **Configure Monitoring**
   - Setup Sentry alerts
   - Configure CloudWatch alarms
   - Test error tracking

### Post-Deployment

- [ ] Smoke tests (critical user flows)
- [ ] API endpoint verification
- [ ] Database connectivity confirmed
- [ ] Error tracking verified
- [ ] Monitoring dashboards setup
- [ ] Team notified of staging availability
- [ ] Documentation updated

---

## 11. KNOWN CONFIGURATIONS & NOTES

### 11.1 Development Setup Status

**Current Development Environment**:
- Docker services running locally (postgres + redis)
- Monorepo fully installed (`node_modules` present)
- Both backend and frontend configured for localhost
- SaltEdge banking integration in sandbox mode
- TypeORM/Prisma database setup ready

### 11.2 Special Configurations

**Banking Integration** (SaltEdge):
- Credentials stored in `.secrets/` directory
- Private key path: `./apps/backend/.secrets/private.pem`
- Development sandbox mode (needs production credentials for staging)
- Callback endpoint must match deployment domain

**Database Initialization**:
- SQL script: `infrastructure/docker/postgres/init.sql`
- Prisma migrations: `apps/backend/prisma/migrations/`
- Seeding: `apps/backend/src/database/seeds/`

**Build Process** (Important):
```
Prisma MUST be generated before TypeScript compilation
Sequence: prisma generate → nest build (backend)
          prisma generate → next build (frontend)
```

---

## 12. FILE MANIFEST - KEY DEPLOYMENT FILES

### Docker Configuration
- `/home/nemesi/dev/money-wise/docker-compose.dev.yml` (Core services)
- `/home/nemesi/dev/money-wise/docker-compose.monitoring.yml` (Optional monitoring)
- `/home/nemesi/dev/money-wise/apps/backend/Dockerfile` (Backend container)
- `/home/nemesi/dev/money-wise/apps/web/Dockerfile` (Frontend container)

### Environment Templates
- `/home/nemesi/dev/money-wise/.env.example` (Root template)
- `/home/nemesi/dev/money-wise/apps/backend/.env.example` (Backend template)
- `/home/nemesi/dev/money-wise/apps/backend/.env.staging.example` (Staging config)
- `/home/nemesi/dev/money-wise/apps/backend/.env.production.example` (Production config)
- `/home/nemesi/dev/money-wise/apps/web/.env.example` (Frontend template)
- `/home/nemesi/dev/money-wise/apps/web/.env.staging.example` (Staging config)

### Infrastructure Scripts
- `/home/nemesi/dev/money-wise/infrastructure/docker/postgres/init.sql` (DB init)
- `/home/nemesi/dev/money-wise/infrastructure/docker/redis/` (Redis configs)
- `/home/nemesi/dev/money-wise/infrastructure/monitoring/` (Prometheus/Grafana)

### CI/CD Configuration
- `/home/nemesi/dev/money-wise/.github/workflows/ci-cd.yml` (Main pipeline)
- `/home/nemesi/dev/money-wise/.github/workflows/release.yml` (Release workflow)
- `/home/nemesi/dev/money-wise/.github/workflows/specialized-gates.yml` (Advanced gates)

### Package Management
- `/home/nemesi/dev/money-wise/package.json` (Root monorepo)
- `/home/nemesi/dev/money-wise/apps/backend/package.json` (Backend)
- `/home/nemesi/dev/money-wise/apps/web/package.json` (Frontend)
- `/home/nemesi/dev/money-wise/pnpm-workspace.yaml` (Workspace config)

### Documentation
- `/home/nemesi/dev/money-wise/README.md` (Main overview)
- `/home/nemesi/dev/money-wise/CLAUDE.md` (Development guidelines)
- `/home/nemesi/dev/money-wise/docs/development/` (Setup guides)
- `/home/nemesi/dev/money-wise/docs/planning/` (Roadmaps & specifications)

---

## 13. QUICK REFERENCE: STAGING DEPLOYMENT STEPS

### 1. Infrastructure Setup (1-2 hours)
```bash
# Provision infrastructure on AWS/Digital Ocean/similar
- PostgreSQL 15 with TimescaleDB
- Redis instance
- Domain & SSL certificate
- Container registry (optional)
```

### 2. Environment Configuration (30 minutes)
```bash
# Copy templates
cp apps/backend/.env.staging.example apps/backend/.env.staging
cp apps/web/.env.staging.example apps/web/.env.staging

# Replace placeholders with staging values
- Database credentials
- Redis host/password
- JWT secrets (32+ chars)
- Sentry DSNs
- API URLs (staging.moneywise.app)
```

### 3. Build & Deploy (30 minutes)
```bash
# Build images
docker build -t moneywise-backend:staging apps/backend/
docker build -t moneywise-web:staging apps/web/

# Deploy with docker-compose
docker-compose -f docker-compose.dev.yml up -d

# Run migrations
docker exec moneywise-backend npm run db:migrate
```

### 4. Verification (15 minutes)
```bash
# Test health endpoints
curl https://staging-api.moneywise.app/api/health
curl https://staging.moneywise.app

# Check logs
docker logs postgres-dev
docker logs redis-dev
```

---

## CONCLUSION

The MoneyWise project is **well-prepared for staging deployment**. All configuration templates, Docker infrastructure, and deployment scripts are in place. The primary work involves:

1. **Infrastructure Provisioning** - Database, Redis, Domain
2. **Secret Management** - Database passwords, JWT secrets, API credentials
3. **Configuration Substitution** - Replace placeholder values with staging-specific ones
4. **Monitoring Setup** - Sentry projects, CloudWatch alarms
5. **Verification & Testing** - Smoke tests, API validation

**Estimated Time to Staging**: 2-4 hours (with infrastructure already provisioned)

