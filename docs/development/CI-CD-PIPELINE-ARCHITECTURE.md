# MoneyWise CI/CD Pipeline Architecture

## Visual Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GITHUB EVENT TRIGGERS                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Push: main, develop, epic/*, feature/*, story/*, refactor/*              │
│  Pull Request: Target branches above                                       │
│  Tags: v* (semver)                                                         │
│  Manual: workflow_dispatch                                                 │
│                                                                             │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │   🌱 FOUNDATION JOB (Always runs)       │
        │   - Repository health detection        │
        │   - Project stage identification       │
        │   - Timeout: 10 minutes                │
        └────────────────┬───────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
    ┌─────────┐    ┌──────────┐   ┌──────────────┐
    │  📦     │    │ 🔒      │   │ 🧪          │
    │ DEV     │    │ SECURITY│   │ TESTING     │
    │ PIPELINE│    │ PIPELINE│   │ PIPELINE    │
    └─────────┘    └──────────┘   └──────────────┘
         │               │               │
         ▼               ▼               ▼
    [Lint/Type]   [Risk Analysis]  [Coverage]
    [3-4 min]     [8-25 min]       [8-10 min]
         │               │               │
         └───────────────┼───────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────┐
        │   🏗️ BUILD PIPELINE (Matrix)           │
        │   - Backend (NestJS)                   │
        │   - Web (Next.js)                      │
        │   - Mobile (config ready)              │
        │   - Timeout: 20 minutes                │
        └────────────────┬───────────────────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
        ┌─────────────┐      ┌──────────────┐
        │ 🧪         │      │ 📦          │
        │ E2E TESTS   │      │ BUNDLE SIZE │
        │ (Smart      │      │ CHECK       │
        │ Sharding)   │      │             │
        │             │      │             │
        │ 2 shards:   │      │ PR only     │
        │ 10-15 min   │      │ 15 min      │
        │ 4 shards:   │      │             │
        │ 20-30 min   │      │             │
        └─────────────┘      └──────────────┘
              │                     │
              └──────────┬──────────┘
                         │
                         ▼
        ┌────────────────────────────────────────┐
        │   📊 QUALITY REPORT                    │
        │   - Aggregate all results              │
        │   - Generate summary                   │
        │   - Timeout: 5 minutes                 │
        └────────────────┬───────────────────────┘
                         │
                    ┌────┴────┐
                    │ Success? │
                    └────┬────┘
                   Yes   │   No
                    ┌────┴─────┐
                    │           │
                    ▼           ▼
            ┌─────────────┐ ┌──────────┐
            │ ✅ SUMMARY  │ │ ❌ FAIL  │
            │ - Report    │ │ NOTIFY   │
            │ - Status    │ │ DEVELOPER│
            └─────────────┘ └──────────┘
                    │
                    ▼
        ┌─────────────────────────────────┐
        │   🚀 RELEASE PIPELINE           │
        │   (Only on main branch)          │
        │                                 │
        │   - Sentry release creation     │
        │   - Docker image builds         │
        │   - GitHub release generation   │
        │   - Changelog auto-creation     │
        │   - Multi-platform build        │
        │   (linux/amd64, linux/arm64)   │
        └─────────────────────────────────┘
```

---

## Security Pipeline Tiers

```
┌──────────────────────────────────────────────────────────────┐
│                    SECURITY SCANNING LAYERS                  │
└──────────────────────────────────────────────────────────────┘

FEATURE BRANCHES (PRs to develop)
├─ Duration: ~12 min
├─ Cost: ~10% of full scan
└─ Coverage:
   ├─ SAST: Critical patterns only
   │  ├─ p/secrets
   │  ├─ p/xss
   │  ├─ p/sql-injection
   │  └─ p/command-injection
   └─ Secrets: Verified only
      └─ TruffleHog (high confidence)

                    ▼

DEVELOP + PR TO MAIN
├─ Duration: ~20 min
├─ Cost: ~50% of full scan
└─ Coverage:
   ├─ SAST: Full rulesets
   │  ├─ p/security-audit
   │  ├─ p/owasp-top-ten
   │  ├─ p/cwe-top-25
   │  ├─ p/javascript
   │  ├─ p/typescript
   │  ├─ p/react
   │  └─ p/nextjs
   ├─ Dependencies: Moderate vulnerabilities
   ├─ License Compliance: Allowlist enforcement
   └─ Secrets: Comprehensive scan

                    ▼

MAIN BRANCH ONLY
├─ Duration: ~25 min
├─ Cost: Full scan
└─ Coverage:
   ├─ SAST: All tier 2 + custom patterns
   │  ├─ Database connection strings
   │  ├─ Private keys (PEM format)
   │  └─ Additional patterns
   ├─ Dependencies: High-severity only
   ├─ Trivy Filesystem: CRITICAL+HIGH
   ├─ Trivy Container: Image scanning (if Dockerfiles exist)
   ├─ License Compliance: Strict enforcement
   └─ Secrets: Comprehensive + verified
```

---

## Testing Architecture

```
┌──────────────────────────────────────────────────────────┐
│              COMPREHENSIVE TEST SUITE                    │
└──────────────────────────────────────────────────────────┘

FOUNDATION LAYER
├─ Environment: test database + redis
├─ Services:
│  ├─ PostgreSQL (timescaledb:latest-pg15)
│  │  └─ Database: test_db
│  └─ Redis (redis:7-alpine)
│     └─ DB: 0 (isolated)
└─ Health: Service ready checks

           ▼

TEST LAYERS (Parallel Execution)

┌─────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│   UNIT TESTS    │  │ INTEGRATION TEST │  │ PERFORMANCE     │
│                 │  │                  │  │ TESTS           │
│ - Jest runner   │  │ - Jest + Services│  │                 │
│ - Isolated units│  │ - API endpoints  │  │ - Benchmarks    │
│ - Fast (~3 min) │  │ - Database calls │  │ - Baseline store│
│                 │  │ - Moderate (~5m) │  │ - (~2-3 min)    │
└─────────────────┘  └──────────────────┘  └─────────────────┘

           ▼

COVERAGE TRACKING
├─ Backend coverage/coverage-final.json
├─ Web coverage/coverage-final.json
├─ Package coverage/coverage-final.json
└─ Upload to Codecov (with 80% target)

           ▼

E2E TESTS (Sharded for Performance)

Feature Branches:       Main/Develop:
┌────────────────┐     ┌────────────────┐
│ 2 SHARDS       │     │ 4 SHARDS       │
│                │     │                │
│ Shard 1 + 2    │     │ Shard 1 + 2    │
│ 10-15 min      │     │ Shard 3 + 4    │
│ (faster)       │     │ 20-30 min      │
│                │     │ (comprehensive)│
│ Start backend  │     │                │
│ Start frontend │     │                │
│ Run Playwright │     │                │
└────────────────┘     └────────────────┘

           ▼

BUNDLE SIZE MONITORING (Web only)
├─ Target: < 50MB (.next/static + .next/server)
├─ Reports: PR comments with size badges
└─ Tracking: Historical data maintained

           ▼

RESULTS AGGREGATION
├─ Artifact uploads (7-day retention)
├─ Coverage reports (codecov)
├─ Performance benchmarks (main/develop)
└─ E2E reports (Playwright)
```

---

## Deployment Pipeline (Release Workflow)

```
┌──────────────────────────────────────────────────────┐
│        RELEASE PIPELINE (On Tag Creation)            │
│   Triggered: v*.*.* tags or workflow_dispatch        │
└──────────────────────────────────────────────────────┘

1. VERSION VALIDATION
   ├─ Extract from tag (v1.0.0)
   ├─ Detect pre-release (alpha/beta/rc)
   └─ Validate format

           ▼

2. SENTRY RELEASES (Matrix: backend, web)
   ├─ Create release in Sentry
   ├─ Set commits auto-link
   ├─ Download build artifacts (if available)
   ├─ Rebuild if artifacts missing
   ├─ Upload source maps (.js.map, .next/**/*.map)
   ├─ Finalize release
   └─ ~15 min per app

           ▼

3. MOBILE SENTRY RELEASE
   ├─ Create release (separate project)
   ├─ No build artifacts (managed separately)
   └─ ~10 min

           ▼

4. CHANGELOG GENERATION
   ├─ Find previous tag
   ├─ Extract commits since last tag
   ├─ Format markdown changelog
   ├─ List contributors
   └─ Upload as artifact

           ▼

5. GITHUB RELEASE
   ├─ Create GitHub release
   ├─ Attach changelog
   ├─ Upload build artifacts
   ├─ Version metadata (JSON)
   └─ Mark as pre-release if applicable

           ▼

6. DOCKER BUILDS (Matrix: backend, web)
   ├─ Check Dockerfile exists
   ├─ Set up Docker Buildx
   ├─ Login to ghcr.io
   ├─ Extract metadata (tags, labels)
   ├─ Build multi-platform
   │  ├─ linux/amd64
   │  └─ linux/arm64
   ├─ Push to registry
   │  └─ ghcr.io/kdantuono/money-wise/{app}
   ├─ Tags:
   │  ├─ v1.0.0 (semver)
   │  ├─ 1.0 (major.minor)
   │  └─ latest (if not pre-release)
   └─ ~15 min per app

           ▼

7. DEPLOYMENT NOTIFICATION
   ├─ Create Sentry deployments
   │  ├─ Backend
   │  ├─ Web
   │  └─ Mobile
   ├─ Set environment (production/staging)
   └─ Deployment summaries

           ▼

8. HEALTH MONITORING (Placeholder)
   ├─ Wait 5 minutes for stabilization
   ├─ Error rate monitoring (needs implementation)
   ├─ Alert if issues detected
   └─ Approval workflow (future)

           ▼

9. RELEASE SUMMARY
   └─ Comprehensive status report
      ├─ Version info
      ├─ All job results
      ├─ Docker image URLs
      └─ Deployment status
```

---

## Environment Configuration Layers

```
┌───────────────────────────────────────────────────────┐
│           ENVIRONMENT CONFIGURATION STRATEGY          │
└───────────────────────────────────────────────────────┘

LOCAL DEVELOPMENT
├─ File: .env.development
├─ Service: docker-compose.dev.yml
├─ Database: TimescaleDB (localhost:5432)
├─ Cache: Redis (localhost:6379)
├─ Logging: Debug level (DB_LOGGING=true)
├─ Sentry: Disabled (100% sampling if enabled)
├─ Monitoring: Optional (monitoring profile)
└─ Health: Basic checks only

                   ▼

TESTING
├─ File: .env.test
├─ Service: In-memory or isolated services
├─ Database: test_db (postgres)
├─ Cache: Isolated redis:0
├─ JWT: Test keys (minimum 32 chars)
├─ Migrations: Run automatically
├─ Logging: Minimal (performance)
└─ Health: Full checks before tests

                   ▼

STAGING
├─ File: .env.staging.example (template)
├─ Service: Managed services
├─ Database: Cloud PostgreSQL
├─ Cache: Managed Redis
├─ Sentry: moneywise-staging project
├─ Sampling: 50%
├─ Monitoring: CloudWatch enabled
├─ Logging: Info level
└─ Health: Full health checks

                   ▼

PRODUCTION
├─ File: .env.production.example (template)
├─ Service: Managed services (HA)
├─ Database: Cloud PostgreSQL (replicated)
├─ Cache: Managed Redis (sentinel)
├─ Sentry: moneywise-production project
├─ Sampling: 10%
├─ Monitoring: Full CloudWatch
├─ Logging: Warning level
└─ Health: Comprehensive checks + alerting
```

---

## Quality Gates & Validation Levels

```
┌──────────────────────────────────────────────────────┐
│        ZERO TOLERANCE VALIDATION SYSTEM (10 LEVELS)  │
└──────────────────────────────────────────────────────┘

PRE-COMMIT (Automatic)
│
├─ 🔍 File Hygiene
│  ├─ Trailing whitespace ✓ Auto-fix
│  ├─ End-of-file fixers ✓ Auto-fix
│  ├─ Merge conflict check
│  ├─ Large file detection (>1000KB)
│  └─ YAML/JSON validation
│
├─ 🛡️ Secrets Detection
│  ├─ detect-secrets pre-commit hook
│  ├─ Baseline: .secrets.baseline
│  └─ Blocks commit if secrets found
│
├─ 📝 Code Quality
│  ├─ ESLint (TS/JS)
│  ├─ Prettier (formatting)
│  └─ TypeScript checking
│
├─ 📄 Documentation
│  ├─ Markdown linting
│  └─ YAML linting
│
└─ ⏸️ STOPS commit if any fail

PRE-PUSH (Blocking - Levels 1-10)
│
├─ Levels 1-8: Code Quality Checks
│  │
│  ├─ 1️⃣  Linting (ESLint)
│  ├─ 2️⃣  Type Checking (TypeScript)
│  ├─ 3️⃣  Formatting (Prettier)
│  ├─ 4️⃣  Secrets Detection
│  ├─ 5️⃣  Unit Tests
│  ├─ 6️⃣  Integration Tests
│  ├─ 7️⃣  Build Verification
│  └─ 8️⃣  Coverage Thresholds
│
├─ Levels 9-10: Comprehensive (NEW)
│  │
│  ├─ 9️⃣  Workflow Syntax Validation (actionlint)
│  │     └─ Validates all .github/workflows/*.yml
│  │
│  └─ 🔟 Foundation Job Dry-Run (act)
│       └─ Simulates GitHub Actions execution
│       └─ Requires: Docker running
│       └─ Requires: act installed
│
└─ ⏸️ BLOCKS push if any level fails (no bypass)

GITHUB (Automatic on Push)
│
├─ Foundation Health Check (2-3 min)
├─ Development Pipeline (3-4 min)
├─ Security Scanning (8-25 min, tiered)
├─ Testing Pipeline (8-10 min)
├─ Build Pipeline (5-8 min per app)
├─ E2E Tests (10-30 min, sharded)
└─ Status Checks REQUIRED for merge
   └─ Cannot be bypassed
   └─ Cannot be skipped
   └─ Cannot be overridden

BRANCH PROTECTION (Enforcement)
│
├─ Pull Request Reviews: 1+ required
├─ Status Checks: ALL must pass
├─ Branch Current: Must be up-to-date
├─ Stale Dismissal: Auto-dismiss on new commits
├─ Admin Override: NONE for protected branches
└─ Emergency: Use safety/* branch (still requires PR)
```

---

## Monitoring & Observability Stack

```
┌──────────────────────────────────────────────────────┐
│          OBSERVABILITY ARCHITECTURE                  │
└──────────────────────────────────────────────────────┘

ERROR TRACKING (Sentry)
├─ Projects:
│  ├─ moneywise-development (100% sampling)
│  ├─ moneywise-staging (50% sampling)
│  └─ moneywise-production (10% sampling)
├─ Features:
│  ├─ Stack trace capture
│  ├─ Source maps (uploaded at release)
│  ├─ Release tracking (git commits)
│  ├─ Deployment notifications
│  └─ Error rate alerting
└─ Release Integration:
   ├─ Create release on deploy
   ├─ Upload source maps
   ├─ Set commit range
   └─ Finalize on deployment

METRICS & PERFORMANCE
├─ Backend Metrics (Configurable):
│  ├─ METRICS_ENABLED: true
│  ├─ Flush Interval: 30 seconds
│  ├─ Health endpoint: /api/health
│  └─ CloudWatch (optional)
│
├─ Test Coverage (Codecov):
│  ├─ Backend coverage
│  ├─ Web coverage
│  ├─ Package coverage
│  ├─ Target: 80% for all metrics
│  ├─ Historical tracking
│  └─ PR comments
│
├─ Performance Benchmarks:
│  ├─ Stored on main/develop
│  ├─ Alert threshold: 110% baseline
│  ├─ Regression detection
│  └─ Historical graphs
│
└─ Bundle Size Monitoring:
   ├─ Target: < 50MB
   ├─ Tracks .next/static + .next/server
   └─ PR comments with trends

INFRASTRUCTURE MONITORING (Optional - Docker profile)
├─ Prometheus
│  ├─ Metrics collection
│  ├─ TSDB storage (/prometheus)
│  ├─ Admin API enabled
│  ├─ Lifecycle commands enabled
│  └─ Port: 9090
│
├─ Grafana
│  ├─ Dashboard visualization
│  ├─ Datasource: Prometheus
│  ├─ Admin password: admin
│  ├─ Provisioned dashboards (if defined)
│  └─ Port: 3001 (dev environment)
│
├─ Node Exporter
│  ├─ System metrics (CPU, memory, disk)
│  ├─ Filesystem, network metrics
│  └─ Port: 9100
│
└─ cAdvisor
   ├─ Container metrics
   ├─ System resource usage
   └─ Port: 8080

LOGGING
├─ GitHub Actions:
│  ├─ Workflow logs (real-time)
│  ├─ Step-by-step execution
│  └─ Error summaries
│
├─ Test Output:
│  ├─ unit-tests.log
│  ├─ integration-tests.log
│  ├─ performance-tests.log
│  └─ Playwright reports (sharded)
│
└─ CloudWatch (Optional):
   ├─ Backend logs
   ├─ Error streams
   ├─ Metrics namespace: MoneyWise/Backend
   └─ Region: us-east-1 (configurable)
```

---

## Key Metrics & SLOs

```
┌──────────────────────────────────────────────────────┐
│       SERVICE LEVEL OBJECTIVES & TARGETS              │
└──────────────────────────────────────────────────────┘

CI/CD PIPELINE PERFORMANCE
├─ Build Time (Feature Branch)
│  ├─ Target: < 30 minutes
│  ├─ Current: ~20-30 minutes
│  └─ Status: ✅ On target
│
├─ Build Time (Main Branch)
│  ├─ Target: < 45 minutes
│  ├─ Current: ~35-45 minutes
│  └─ Status: ✅ On target
│
├─ Pipeline Reliability
│  ├─ Target: > 95%
│  ├─ Current: ~92%
│  └─ Status: ⚠️ Acceptable
│
└─ GitHub Actions Usage
   ├─ Free Tier: 2,000 min/month
   ├─ Estimated: 1,000-1,500 min/month
   └─ Status: ✅ Within budget

TEST COVERAGE TARGETS
├─ Backend
│  ├─ Lines: 80%+
│  ├─ Statements: 80%+
│  ├─ Functions: 80%+
│  └─ Branches: 80%+
│
├─ Web
│  ├─ Lines: 80%+
│  ├─ Statements: 80%+
│  ├─ Functions: 80%+
│  └─ Branches: 80%+
│
└─ Shared Packages
   ├─ Lines: 80%+
   ├─ Critical: 95%+
   └─ (Additional scrutiny)

PERFORMANCE SLOs
├─ Application Startup: < 30 seconds
├─ Health Check Response: < 500ms
├─ API Latency P95: < 1000ms
├─ Error Rate: < 0.1%
└─ Memory: < 512MB (baseline)

SECURITY SLOs
├─ Vulnerability Fix Time
│  ├─ Critical: < 1 hour
│  ├─ High: < 24 hours
│  └─ Medium: < 1 week
│
├─ Secret Incident Response: < 30 minutes
├─ Patch Deployment: < 1 week
└─ Audit Log Retention: ≥ 90 days
```

---

## Decision Points & Flow Control

```
┌──────────────────────────────────────────────────────┐
│     CONDITIONAL EXECUTION & FLOW CONTROL             │
└──────────────────────────────────────────────────────┘

Security Scanning (Conditional)
┌─────────────────────────────┐
│ github.event_name == 'pull_request'
│ github.base_ref != 'main'
└──────────────┬──────────────┘
       YES │           │ NO
          │           └─────────────────┐
          ▼                             ▼
    LIGHTWEIGHT              ENHANCED/COMPREHENSIVE
    security scan            security scan

Build Artifacts Upload
┌──────────────────────────────────┐
│ github.ref == 'refs/heads/main' ||
│ github.ref == 'refs/heads/develop'
└──────────┬───────────────────────┘
     YES   │           │ NO
          │           └─ Skip (save storage)
          ▼
    Upload artifacts
    (7-day retention)

E2E Test Sharding
┌──────────────────────────────────┐
│ github.event_name == 'pull_request'
└──────────┬───────────────────────┘
     YES   │           │ NO
          │           └─ 4 shards (comprehensive)
          ▼
       2 shards (fast feedback)

Performance Benchmark Storage
┌──────────────────────────────────┐
│ github.ref == 'refs/heads/main' ||
│ github.ref == 'refs/heads/develop'
└──────────┬───────────────────────┘
     YES   │           │ NO
          │           └─ Generate but don't store
          ▼
    Store benchmark results
    Alert if 110%+ regression

Docker Release
┌──────────────────────────────────┐
│ startsWith(github.ref, 'refs/tags/')
└──────────┬───────────────────────┘
     YES   │           │ NO
          │           └─ Skip release
          ▼
    Build & push multi-platform
    images to ghcr.io
```

---

## Deployment Flow (Future Implementation)

```
┌──────────────────────────────────────────────────────┐
│        RECOMMENDED DEPLOYMENT FLOW (To Implement)    │
└──────────────────────────────────────────────────────┘

TAG CREATED
│
├─ v1.0.0 (semver tag)
│  └─ Release workflow triggers
│     │
│     ├─ ✅ Version validation
│     ├─ ✅ Sentry releases
│     ├─ ✅ Docker builds
│     ├─ ✅ GitHub release
│     └─ ⏳ Deploy to production (MISSING)
│
└─ Release artifacts ready
   ├─ ghcr.io/kdantuono/money-wise/backend:1.0.0
   ├─ ghcr.io/kdantuono/money-wise/web:1.0.0
   └─ GitHub release with changelog

BLUE-GREEN DEPLOYMENT (Recommended)
│
├─ Deploy to GREEN environment
│  ├─ Pull latest Docker image
│  ├─ Start new instances
│  ├─ Database migrations
│  └─ Health check validation
│
├─ Smoke test GREEN environment
│  ├─ API health check
│  ├─ Basic functionality tests
│  └─ Performance baseline
│
├─ Traffic switch
│  ├─ Update load balancer
│  ├─ Route traffic to GREEN
│  └─ Keep BLUE as rollback
│
├─ Monitor deployment
│  ├─ Error rate check
│  ├─ Latency check
│  ├─ Resource utilization
│  └─ Alert if issues detected
│
└─ Success!
   ├─ Decommission BLUE
   ├─ GREEN becomes current
   └─ Ready for next deployment

ROLLBACK PROCEDURE (If issues detected)
│
├─ Revert traffic to BLUE
│  └─ Immediate recovery
│
├─ Investigate issues
│  ├─ Check Sentry errors
│  ├─ Review logs
│  └─ Identify root cause
│
├─ Create hotfix tag
│  ├─ Fix on main branch
│  ├─ Tag: v1.0.1
│  └─ Deployment workflow re-runs
│
└─ Redeploy with fix
   ├─ GREEN = new BLUE
   ├─ Deploy fixed version
   └─ Resume normal operations
```

---

## Troubleshooting Decision Tree

```
┌──────────────────────────────────────────────────────┐
│          CI/CD TROUBLESHOOTING FLOWCHART              │
└──────────────────────────────────────────────────────┘

Pipeline FAILED?
│
├─ Check Foundation job first
│  ├─ If foundation fails
│  │  ├─ Repository checkout issue
│  │  ├─ Check git permissions
│  │  └─ Check network access
│  │
│  └─ Foundation passed → Continue below
│
├─ Check Development job (Lint/Types)
│  ├─ ESLint errors?
│  │  ├─ Fix style issues
│  │  ├─ pnpm lint -- --fix
│  │  └─ Commit & push
│  │
│  ├─ TypeScript errors?
│  │  ├─ Fix type issues
│  │  ├─ pnpm typecheck
│  │  └─ Commit & push
│  │
│  └─ Prettier formatting?
│     ├─ Fix format issues
│     ├─ pnpm format
│     └─ Commit & push
│
├─ Check Security job
│  ├─ Secrets detected?
│  │  ├─ Remove from code
│  │  ├─ Move to environment
│  │  └─ Update .secrets.baseline
│  │
│  ├─ Vulnerability found?
│  │  ├─ If development dependency
│  │  │  ├─ Log as known issue
│  │  │  └─ Continue (monitor)
│  │  │
│  │  ├─ If production dependency
│  │  │  ├─ Investigate fix
│  │  │  ├─ Update if patch available
│  │  │  └─ Escalate if critical
│  │
│  └─ License issue?
│     ├─ Check dependency license
│     ├─ If not in allowlist
│     ├─ Request exception OR replace
│     └─ Update allowlist if approved
│
├─ Check Testing job
│  ├─ Unit tests failing?
│  │  ├─ Run locally: pnpm test:unit
│  │  ├─ Fix failing tests
│  │  └─ Ensure coverage >= 80%
│  │
│  ├─ Integration tests failing?
│  │  ├─ Run locally: pnpm test:integration
│  │  ├─ Check database state
│  │  ├─ Check Redis connectivity
│  │  └─ Fix failing tests
│  │
│  ├─ E2E tests failing?
│  │  ├─ Run locally: npx playwright test
│  │  ├─ Check shard dependencies
│  │  ├─ Review Playwright report
│  │  └─ Fix flaky tests
│  │
│  └─ Coverage insufficient?
│     ├─ Run: pnpm test:coverage
│     ├─ Add missing test cases
│     ├─ Target: 80% minimum
│     └─ Re-commit when >= 80%
│
├─ Check Build job
│  ├─ Build failures?
│  │  ├─ Run locally: pnpm build
│  │  ├─ Check for errors
│  │  ├─ Clear node_modules
│  │  ├─ Re-run: pnpm install
│  │  └─ Try build again
│  │
│  ├─ Bundle size exceeded?
│  │  ├─ Web only (50MB limit)
│  │  ├─ Run: pnpm analyze
│  │  ├─ Identify large deps
│  │  ├─ Optimize or remove
│  │  └─ Re-build
│  │
│  └─ Artifact upload failed?
│     ├─ Check disk space
│     ├─ Check runner permissions
│     └─ Retry (usually temporary)
│
└─ All checks passing?
   ├─ Pipeline SUCCESS ✅
   ├─ Status checks all green
   ├─ Ready to merge (if PR)
   └─ Ready for release (if main)
```

---

**Last Updated:** October 21, 2025
**Architecture Version:** 3.0
**Status:** Production-Ready
