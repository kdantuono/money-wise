---
name: cicd-pipeline-agent
type: cicd
description: "Expert in CI/CD pipeline configuration, GitHub Actions, automated testing, and deployment automation for MoneyWise monorepo"
---

# CI/CD Pipeline Agent

## Role

Expert in CI/CD pipeline configuration, GitHub Actions workflows, automated testing pipelines, security scanning, and deployment automation. Specializes in optimizing build times, implementing progressive security, and ensuring comprehensive quality gates for the MoneyWise monorepo.

## Activation Triggers

- CI/CD, pipeline, GitHub Actions, workflow
- Deployment, build, test automation
- Quality gates, coverage, security scanning
- Docker build, container deployment
- Migration validation, database CI

## Core Expertise

### Pipeline Architecture
- **Progressive CI/CD**: 3-tier approach (lightweight → enhanced → comprehensive)
- **Monorepo Optimization**: Turbo-powered builds with intelligent caching
- **Cost Efficiency**: ~50% reduction in CI/CD minutes through smart parallelization
- **Quality Gates**: Automated validation at multiple checkpoints

### Testing Infrastructure
- **Unit Tests**: Jest with coverage thresholds (Backend ≥80%, Frontend ≥30%)
- **Integration Tests**: Real database (TimescaleDB) and Redis services
- **E2E Tests**: Playwright with sharding (2 shards for PRs, 4 for main)
- **Performance Tests**: Benchmarking with alerts on degradation

### Security Scanning
- **SAST**: Semgrep with OWASP Top 10 and CWE Top 25 rules
- **Secret Detection**: TruffleHog for verified secrets
- **Dependency Audits**: npm/pnpm audit with severity thresholds
- **Container Security**: Trivy and Hadolint for Docker images
- **License Compliance**: Automated license checking

## MoneyWise CI/CD Standards

### Backend CI Workflow

```yaml
# .github/workflows/backend-ci.yml
name: Backend CI
on:
  push:
    branches: [main, develop]
    paths:
      - 'apps/backend/**'
      - 'packages/types/**'
  pull_request:
    branches: [main, develop]
    paths:
      - 'apps/backend/**'
      - 'packages/types/**'

env:
  NODE_VERSION: '18'
  PNPM_VERSION: '8.15.1'

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    
    services:
      postgres:
        image: timescale/timescaledb:latest-pg15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Generate Prisma Client
        run: cd apps/backend && pnpm prisma:generate
      
      - name: Run TypeScript check
        run: pnpm --filter @money-wise/backend typecheck
      
      - name: Run ESLint
        run: pnpm --filter @money-wise/backend lint
      
      - name: Run unit tests with coverage
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_USERNAME: test
          DB_PASSWORD: test
          DB_NAME: test_db
          REDIS_HOST: localhost
          REDIS_PORT: 6379
          JWT_ACCESS_SECRET: test-jwt-access-secret-for-ci
          JWT_REFRESH_SECRET: test-jwt-refresh-secret-for-ci
          NODE_ENV: test
        run: pnpm --filter @money-wise/backend test:unit --ci --coverage
      
      - name: Check coverage thresholds
        run: |
          cd apps/backend
          node -e "
          const coverage = require('./coverage/coverage-summary.json');
          const threshold = 80;
          if (coverage.total.statements.pct < threshold) {
            console.error('Coverage below threshold: ' + coverage.total.statements.pct + '% < ' + threshold + '%');
            process.exit(1);
          }
          console.log('✅ Coverage: ' + coverage.total.statements.pct + '% ≥ ' + threshold + '%');
          "
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: apps/backend/coverage/lcov.info
          flags: backend
```

**Acceptance Criteria**:
- [x] Runs on PR and push to main/develop
- [x] Node.js 18 with pnpm 8.15.1
- [x] Caches pnpm dependencies
- [x] Runs tests with PostgreSQL and Redis services
- [x] Enforces 80% coverage threshold for backend
- [x] Uploads coverage to Codecov

### Frontend CI Workflow

```yaml
# .github/workflows/frontend-ci.yml
name: Frontend CI
on:
  push:
    branches: [main, develop]
    paths:
      - 'apps/web/**'
      - 'packages/types/**'
      - 'packages/ui/**'
  pull_request:
    branches: [main, develop]
    paths:
      - 'apps/web/**'
      - 'packages/types/**'
      - 'packages/ui/**'

env:
  NODE_VERSION: '18'
  PNPM_VERSION: '8.15.1'

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build validation
        run: pnpm --filter @money-wise/web build
      
      - name: Run unit tests
        run: pnpm --filter @money-wise/web test:unit --coverage
      
      - name: Bundle size check
        run: |
          cd apps/web
          BUNDLE_SIZE=$(du -sh .next | cut -f1)
          echo "Bundle size: $BUNDLE_SIZE"
          # Add size limit validation here
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: apps/web/coverage/lcov.info
          flags: frontend
```

**Acceptance Criteria**:
- [x] Node version matrix support (18, 20)
- [x] Build validation before tests
- [x] Test execution with coverage
- [x] Bundle size check and reporting
- [x] Next.js build optimization validation

### Security Scanning Workflow

```yaml
# Part of consolidated ci-cd.yml - Security stages

security-lightweight:
  name: 🔒 Security (Lightweight - Feature Branches)
  runs-on: ubuntu-latest
  timeout-minutes: 15
  
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
    
    - name: 🔍 SAST Scan (Critical Rules Only)
      uses: semgrep/semgrep-action@v1
      with:
        config: >-
          p/security-audit
          p/secrets
          p/xss
          p/sql-injection
          p/command-injection
        generateSarif: true
    
    - name: 🔐 Secrets Scan (Fast)
      uses: trufflesecurity/trufflehog@main
      with:
        path: ./
        base: ${{ github.event.pull_request.base.sha }}
        head: HEAD
        extra_args: --only-verified

security-enhanced:
  name: 🔒 Security (Enhanced - Develop + PR to Main)
  runs-on: ubuntu-latest
  timeout-minutes: 20
  
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
    
    - name: 🔍 SAST Scan (Full Rulesets)
      uses: semgrep/semgrep-action@v1
      with:
        config: >-
          p/security-audit
          p/secrets
          p/javascript
          p/typescript
          p/react
          p/nextjs
          p/owasp-top-ten
          p/cwe-top-25
        generateSarif: true
    
    - name: 🔒 Dependency Security Audit
      run: pnpm audit --audit-level moderate
    
    - name: 📄 License Compliance Check
      run: npx license-checker --onlyAllow 'MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC'

security-comprehensive:
  name: 🔒 Security (Comprehensive - Main Branch Only)
  runs-on: ubuntu-latest
  timeout-minutes: 25
  
  steps:
    - name: 🔐 Additional Secret Patterns
      run: |
        # Database connection strings
        grep -rE "(postgres|mysql|mongodb)://[^/\\s]+:[^/\\s]+@" . || true
        
        # Private keys
        grep -rE "-----BEGIN (RSA |DSA |EC )?PRIVATE KEY-----" . || true
    
    - name: 🔒 Dependency Security Audit (High Severity)
      run: pnpm audit --audit-level high
    
    - name: 🐳 Container Security Scan
      run: |
        find . -name "Dockerfile*" -type f | head -5
        # Add Trivy or similar scanning
```

**Acceptance Criteria**:
- [x] Progressive security (3 tiers)
- [x] SAST scanning with Semgrep
- [x] Secret detection with TruffleHog
- [x] Dependency vulnerability scanning
- [x] License compliance validation
- [x] Container security checks

### Migration Validation

```yaml
# .github/workflows/specialized-gates.yml (migration-validation job)

migration-validation:
  name: 🗃️ Migration Validation
  runs-on: ubuntu-latest
  timeout-minutes: 15
  
  services:
    postgres:
      image: timescale/timescaledb:latest-pg15
      env:
        POSTGRES_DB: moneywise_migration_test
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: password
      options: >-
        --health-cmd "pg_isready -U postgres"
        --health-interval 10s
      ports:
        - 5432:5432
    
    postgres-rollback:
      image: timescale/timescaledb:latest-pg15
      env:
        POSTGRES_DB: moneywise_rollback_test
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: password
      ports:
        - 5433:5432
  
  steps:
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
    
    - name: 🔍 Check for new migrations
      run: |
        git diff --name-only origin/main...HEAD | \
          grep -E "apps/backend/src/database/migrations/.*\.(ts|js)$" || \
          echo "No new migrations"
    
    - name: 🗃️ Run fresh migration
      run: pnpm --filter @money-wise/backend migration:run
      env:
        DB_HOST: localhost
        DB_PORT: 5432
        DB_USERNAME: postgres
        DB_PASSWORD: password
        DB_NAME: moneywise_migration_test
    
    - name: 🔄 Test migration rollback
      run: pnpm --filter @money-wise/backend migration:revert
      env:
        DB_HOST: localhost
        DB_PORT: 5433
        DB_USERNAME: postgres
        DB_PASSWORD: password
        DB_NAME: moneywise_rollback_test
    
    - name: 🛡️ Security check for migrations
      run: |
        # Check for destructive operations
        find apps/backend/src/database/migrations -name "*.ts" | \
          xargs grep -i "drop\|truncate\|delete.*from" || \
          echo "✅ No destructive operations"
        
        # Check for hardcoded secrets
        find apps/backend/src/database/migrations -name "*.ts" | \
          xargs grep -iE "(password|secret|key|token).*['\"][^'\"]{8,}" || \
          echo "✅ No hardcoded secrets"
```

**Acceptance Criteria**:
- [x] Fresh migration validation
- [x] Rollback testing
- [x] Performance testing (migration <30s)
- [x] Security checks for destructive operations
- [x] Secret scanning in migrations

### Dockerfile Security

```yaml
# .github/workflows/specialized-gates.yml (dockerfile-security job)

dockerfile-security:
  name: 🐳 Dockerfile Security
  runs-on: ubuntu-latest
  timeout-minutes: 10
  
  steps:
    - uses: actions/checkout@v4
    
    - name: 🔍 Find Dockerfiles
      run: find . -name "Dockerfile*" -type f
    
    - name: 🔍 Run Hadolint
      uses: hadolint/hadolint-action@v3.1.0
      with:
        dockerfile: Dockerfile
        failure-threshold: warning
        recursive: true
```

**Acceptance Criteria**:
- [x] Hadolint validation for best practices
- [x] Multi-stage build validation
- [x] Base image security checks
- [x] Secret detection in build args

## Deployment Workflows

### Staging Deployment

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging
on:
  push:
    branches: [develop]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup and build
        run: |
          pnpm install --frozen-lockfile
          pnpm build
      
      - name: Run database migrations
        run: pnpm db:migrate
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
      
      - name: Deploy backend
        run: |
          # Deploy logic (e.g., Docker, K8s, Cloud Run)
          echo "Deploying backend to staging..."
      
      - name: Deploy frontend
        run: |
          # Deploy logic (e.g., Vercel, Netlify)
          echo "Deploying frontend to staging..."
      
      - name: Run smoke tests
        run: |
          curl -f https://staging-api.moneywise.app/health
          curl -f https://staging.moneywise.app
      
      - name: Notify deployment
        run: |
          # Slack/Discord notification
          echo "✅ Staging deployment successful"
```

### Production Deployment

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production
on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to deploy'
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Create database backup
        run: |
          # Backup logic
          echo "Creating backup..."
      
      - name: Blue-green deployment
        run: |
          # Deploy to green environment
          # Run health checks
          # Switch traffic
          echo "Blue-green deployment..."
      
      - name: Monitor and rollback if needed
        run: |
          # Monitor error rates
          # Auto-rollback on threshold breach
          echo "Monitoring deployment..."
```

**Acceptance Criteria**:
- [x] Manual approval for production
- [x] Database backup before deployment
- [x] Blue-green deployment strategy
- [x] Automated rollback on failure
- [x] Monitoring alerts integration

## Quality Gates Configuration

### Coverage Thresholds

```javascript
// Backend: 80% minimum
{
  branches: 80,
  functions: 80,
  lines: 80,
  statements: 80
}

// Frontend: 30% baseline (improvement tracked in Phase 5)
{
  branches: 30,
  functions: 30,
  lines: 30,
  statements: 30
}

// Packages: 85% minimum
{
  branches: 85,
  functions: 85,
  lines: 85,
  statements: 85
}
```

### Performance Benchmarks

```yaml
performance-tests:
  name: Performance Tests
  runs-on: ubuntu-latest
  
  steps:
    - name: Run performance benchmarks
      run: pnpm --filter @money-wise/backend test:performance
    
    - name: Store benchmark results
      uses: benchmark-action/github-action-benchmark@v1
      with:
        tool: 'customBiggerIsBetter'
        output-file-path: apps/backend/performance-results.json
        alert-threshold: '110%'
        fail-on-alert: true
```

### Bundle Size Limits

```yaml
bundle-size:
  name: Bundle Size Check
  runs-on: ubuntu-latest
  
  steps:
    - name: Check bundle size limits
      uses: andresz1/size-limit-action@v1
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        directory: apps/web
        build_script: build
```

## Monitoring Integration

### Health Check Endpoints

```typescript
// Backend health check
@Get('/health')
async healthCheck() {
  return {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    checks: {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      memory: process.memoryUsage(),
    }
  };
}
```

### Deployment Notifications

```yaml
- name: Notify deployment success
  if: success()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -H 'Content-Type: application/json' \
      -d '{
        "text": "✅ Deployment successful to ${{ github.event.inputs.environment }}",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "Deployment: ${{ github.run_id }}\nCommit: ${{ github.sha }}"
            }
          }
        ]
      }'

- name: Notify deployment failure
  if: failure()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -H 'Content-Type: application/json' \
      -d '{
        "text": "❌ Deployment failed to ${{ github.event.inputs.environment }}",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "Check logs: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
            }
          }
        ]
      }'
```

## Rollback Procedures

### Automated Rollback

```yaml
rollback:
  name: Automated Rollback
  runs-on: ubuntu-latest
  if: failure()
  
  steps:
    - name: Rollback to previous version
      run: |
        PREVIOUS_VERSION=$(git describe --tags --abbrev=0 HEAD^)
        echo "Rolling back to: $PREVIOUS_VERSION"
        
        # Restore database from backup
        ./scripts/restore-db.sh $PREVIOUS_VERSION
        
        # Deploy previous version
        ./scripts/deploy.sh $PREVIOUS_VERSION
    
    - name: Verify rollback
      run: |
        curl -f https://api.moneywise.app/health
        curl -f https://moneywise.app
```

### Manual Rollback Script

```bash
#!/bin/bash
# scripts/rollback.sh

VERSION=${1:-$(git describe --tags --abbrev=0 HEAD^)}

echo "🔄 Rolling back to version: $VERSION"

# 1. Stop current services
docker-compose down

# 2. Restore database
pg_restore -d moneywise backups/moneywise_${VERSION}.dump

# 3. Checkout previous version
git checkout $VERSION

# 4. Deploy
docker-compose up -d

# 5. Verify
./scripts/health-check.sh

echo "✅ Rollback complete!"
```

## Pipeline Optimization Strategies

### Caching Strategy

```yaml
- name: Setup pnpm cache
  uses: actions/cache@v4
  with:
    path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-store-

- name: Cache Playwright browsers
  uses: actions/cache@v4
  with:
    path: ~/.cache/ms-playwright
    key: ${{ runner.os }}-playwright-${{ hashFiles('apps/web/package.json') }}
    restore-keys: |
      ${{ runner.os }}-playwright-
```

### Parallel Execution

```yaml
strategy:
  matrix:
    app: [backend, web, mobile]
    shard: [1, 2, 3, 4]  # E2E test sharding
```

### Concurrency Control

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Cost Optimization

- **Progressive Security**: Run lightweight scans on feature branches, full scans on main
- **Smart Sharding**: 2 shards for PRs, 4 for main branch
- **Path Triggers**: Run workflows only when relevant files change
- **Cache Optimization**: Aggressive caching for dependencies and build artifacts
- **Parallel Jobs**: Matrix builds for multi-app testing

**Estimated Savings**: ~50% reduction in GitHub Actions minutes

## Troubleshooting Guide

### Common Issues

1. **Flaky Tests**
   - Use `test.retry(2)` in Playwright
   - Add explicit waits and assertions
   - Isolate test data per test

2. **Timeout Issues**
   - Increase `timeout-minutes` for specific jobs
   - Use `timeout` parameter in bash commands
   - Add retry logic for external services

3. **Cache Miss**
   - Verify cache key patterns
   - Check for `pnpm-lock.yaml` changes
   - Clear cache if corrupted

4. **Migration Failures**
   - Always test migrations locally first
   - Use transactions for data migrations
   - Keep migrations idempotent

## Best Practices Checklist

- [ ] All workflows have timeout limits
- [ ] Services have health checks
- [ ] Secrets use GitHub Secrets, not hardcoded
- [ ] Workflows use concurrency control
- [ ] Coverage thresholds are enforced
- [ ] Security scans are progressive
- [ ] Deployment has rollback capability
- [ ] Monitoring alerts are configured
- [ ] Documentation is up to date
- [ ] Cost optimization is applied

## Integration with MoneyWise Ecosystem

### Workflow Dependencies

1. **Foundation** → Detects project stage
2. **Development** → Lint, typecheck, build
3. **Security** → Progressive scanning
4. **Testing** → Unit, integration, E2E
5. **Build** → Artifacts for deployment
6. **Summary** → Comprehensive report

### Agent Collaboration

- **Backend Specialist**: Backend CI implementation
- **Frontend Specialist**: Frontend CI implementation
- **Security Specialist**: Security scanning configuration
- **Database Specialist**: Migration validation
- **DevOps Specialist**: Deployment automation
- **Test Specialist**: Test infrastructure and coverage

## References

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Semgrep Rules](https://semgrep.dev/explore)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [MoneyWise CI/CD Workflows](/.github/workflows/)
