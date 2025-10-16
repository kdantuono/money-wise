# GitHub Actions Workflows

## Overview

This directory contains the CI/CD workflows for the MoneyWise project. The workflows are organized by trigger and purpose to optimize GitHub Actions usage.

## Active Workflows

### 1. Quality Gates (`quality-gates.yml`)
**Triggers:** Push/PR to `main` or `develop`
**Duration:** 20-30 minutes
**Purpose:** Comprehensive quality validation before merging to main branches

**Jobs:**
- ✅ Lint and Type Check
- ✅ Unit Tests (backend + web) with coverage
- ✅ Integration Tests (with PostgreSQL + Redis)
- ✅ E2E Tests (Playwright, sharded execution)
- ✅ Performance Tests
- ✅ Security Scan (Trivy)
- ✅ Bundle Size Check
- ✅ Quality Report
- ✅ Deploy Preview (PRs only)

**Environment:**
- Node.js: 20.x
- pnpm: 8.15.1
- PostgreSQL: TimescaleDB (latest-pg15)
- Redis: 7-alpine

### 2. Quality Gates Lite (`quality-gates-lite.yml`)
**Triggers:** Push to `epic/*` branches
**Duration:** 5-7 minutes
**Purpose:** Fast feedback for epic branch integration

**Jobs:**
- ✅ Lint and Type Check
- ✅ Unit Tests (backend + web)

**Environment:**
- Node.js: 20.x
- pnpm: 8.15.1

### 3. Specialized Gates (`specialized-gates.yml`)
**Triggers:** Path-specific changes (migrations, entities, Docker files)
**Duration:** 10-15 minutes
**Purpose:** Specialized validation for infrastructure changes

**Jobs:**
- 🗃️ Migration Validation (when database migrations change)
- 🐳 Container Security Scan (when Dockerfiles change)

**Environment:**
- Node.js: 20.x
- pnpm: 8.15.1

### 4. Release Pipeline (`release.yml`)
**Triggers:** 
- Tags matching `v*`
- Workflow call from other workflows

**Purpose:** Production release and deployment

**Environment:**
- Node.js: 20.x
- pnpm: 8.15.1

## Workflow Strategy

### Branch-Based CI Tiers

| Branch Pattern | Workflow | Tests Run | Duration |
|---------------|----------|-----------|----------|
| `feature/*`, `story/*` | Pre-commit hooks only | Local | N/A |
| `epic/*` | Quality Gates Lite | Lint, TypeCheck, Unit | 5-7 min |
| PR → `develop` | Quality Gates | Full suite | 20-30 min |
| `main`, `develop` | Quality Gates | Full suite | 20-30 min |

### Cost Optimization

**Monthly Budget:** 3000 minutes (GitHub Free Tier)

**Estimated Usage:**
- Epic branches: ~900 min/month (5 pushes/day × 6 min × 30 days)
- PR to develop: ~1,320 min/month (2 PRs/day × 22 min × 30 days)
- Main branch: ~960 min/month (1 push/day × 32 min × 30 days)
- **Total:** ~3,180 min/month (slightly over budget, but acceptable)

**Optimizations:**
- Epic branches run lite CI (no E2E/integration)
- E2E tests use sharding (2 shards for PRs, 4 for main)
- Concurrent job execution where possible
- Aggressive caching (pnpm store, Playwright browsers)

## Disabled Workflows

The following workflows have been disabled to avoid redundancy:

### `ci-cd.yml.disabled`
**Reason:** Redundant with `quality-gates.yml`

The CI/CD pipeline was running the same checks as Quality Gates, causing duplicate runs and wasting GitHub Actions minutes. The Quality Gates workflow provides more comprehensive validation.

**Original Purpose:** Progressive security checks (lightweight → enhanced → comprehensive)

**Current Status:** Disabled, but preserved for reference

## Common Issues & Troubleshooting

### Issue: Tests fail with "Cannot find module '../../../generated/prisma'"
**Solution:** Prisma client not generated. All test jobs now include:
```yaml
- name: Generate Prisma Client
  run: |
    cd apps/backend && pnpm prisma:generate
```

### Issue: Workflows not showing in Actions tab
**Possible Causes:**
1. YAML syntax error (use `yamllint` or Python YAML parser to validate)
2. Workflow disabled (check for `.disabled` extension)
3. Branch name doesn't match trigger pattern

### Issue: Database connection errors in CI
**Solution:** Ensure all test jobs have complete environment variables:
```yaml
env:
  DATABASE_URL: postgresql://test:testpass@localhost:5432/test_db
  DB_HOST: localhost
  DB_PORT: 5432
  DB_USERNAME: test
  DB_PASSWORD: testpass
  DB_NAME: test_db
  REDIS_HOST: localhost
  REDIS_PORT: 6379
  JWT_ACCESS_SECRET: test-jwt-access-secret-minimum-32-characters-long-for-testing-purposes
  JWT_REFRESH_SECRET: test-jwt-refresh-secret-minimum-32-characters-long-different-from-access
  NODE_ENV: test
```

## Maintenance

### Adding a New Workflow

1. Create workflow file in `.github/workflows/`
2. Use consistent environment variables:
   ```yaml
   env:
     NODE_VERSION: '20.x'
     PNPM_VERSION: '8.15.1'
     TURBO_TELEMETRY_DISABLED: '1'
   ```
3. Include Prisma generation for backend tests
4. Validate YAML syntax before committing
5. Update this README with workflow details

### Modifying Existing Workflows

1. Maintain consistency with other workflows
2. Test changes in a feature branch first
3. Validate YAML syntax: `python3 -c "import yaml; yaml.safe_load(open('workflow.yml'))"`
4. Update this README if triggers or jobs change

## Version History

- **2025-10-16**: Standardized Node 20.x and pnpm 8.15.1 across all workflows
- **2025-10-16**: Fixed quality-gates.yml YAML syntax error (line 503-510)
- **2025-10-16**: Disabled ci-cd.yml to avoid redundancy with quality-gates.yml
- **2025-10-16**: Removed all .disabled workflow files

## References

- [CI/CD Workflow Guide](../../docs/development/ci-cd-workflow-guide.md)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
