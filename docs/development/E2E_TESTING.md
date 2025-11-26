# E2E Testing Guide

End-to-end testing for MoneyWise using Playwright.

## Quick Start

```bash
# Start E2E infrastructure
docker compose -f docker-compose.e2e.yml up -d

# Wait for services to be healthy
docker compose -f docker-compose.e2e.yml ps

# Run all tests
cd apps/web
SKIP_WEBSERVER=true npx playwright test

# Run specific test file
SKIP_WEBSERVER=true npx playwright test tests/smoke/smoke.spec.ts
```

## Test Structure

```
apps/web/e2e/
├── auth/                    # Authentication tests
│   ├── auth.spec.ts         # Login/logout/signup tests
│   └── registration.e2e.spec.ts
├── tests/                   # Feature tests
│   ├── auth/               # Additional auth tests
│   ├── critical/           # Critical user journeys
│   ├── dashboard/          # Dashboard tests
│   └── smoke/              # Smoke tests (run first)
├── utils/                   # Test helpers
├── factories/               # Test data factories
├── config/                  # Test configuration
├── global-setup.ts          # Setup before all tests
└── global-teardown.ts       # Cleanup after all tests
```

## Test Categories

| Category | Path | Purpose |
|----------|------|---------|
| Smoke | `tests/smoke/` | Basic health checks |
| Critical | `tests/critical/` | Core user journeys |
| Auth | `auth/`, `tests/auth/` | Authentication flows |
| Dashboard | `tests/dashboard/` | Dashboard functionality |

## Running Tests

### Local Development

```bash
# Full suite (both browsers)
SKIP_WEBSERVER=true npx playwright test

# Chromium only (faster)
SKIP_WEBSERVER=true npx playwright test --project=chromium

# Smoke tests only
SKIP_WEBSERVER=true npx playwright test tests/smoke/

# With UI mode (debugging)
SKIP_WEBSERVER=true npx playwright test --ui
```

### CI/CD

Tests run automatically on:
- Push to `main`, `develop`, `hotfix/*` branches
- Pull requests from `hotfix/*` branches
- PR `ready_for_review` events

The CI uses Docker Compose for infrastructure (PostgreSQL, Redis, Backend, Frontend).

## Configuration

### playwright.config.ts

Key settings:
- `testMatch`: Only `**/tests/**/*.spec.ts` and `**/auth/**/*.spec.ts`
- `testIgnore`: Excludes `__old_tests_backup/`
- `retries`: 2 in CI, 0 locally
- `workers`: 2 in CI for parallel execution

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SKIP_WEBSERVER` | Skip Playwright's webServer (use Docker) | `false` |
| `PLAYWRIGHT_BASE_URL` | Frontend URL | `http://localhost:3000` |
| `CI` | CI environment flag | - |

## Test User

A single test user is created for all tests:
- Email: `e2e-test@moneywise.test`
- Password: `TestUser#2025!E2E`

## Infrastructure

Docker Compose provides:
- **PostgreSQL** (port 5432) - Database
- **Redis** (port 6379) - Session cache
- **Backend** (port 3001) - NestJS API
- **Frontend** (port 3000) - Next.js app via Nginx

### Health Checks

All services have health checks. Backend becomes healthy after migrations complete.

```bash
# Check service health
docker compose -f docker-compose.e2e.yml ps

# View logs
docker compose -f docker-compose.e2e.yml logs backend-e2e
```

## Debugging

### View Test Reports

```bash
npx playwright show-report
```

### Trace Viewer

Traces are captured on first retry:
```bash
npx playwright show-trace test-results/.../trace.zip
```

### Screenshots & Videos

Failed tests automatically capture:
- Screenshots: `test-results/*/test-failed-*.png`
- Videos: `test-results/*/video.webm`

## Performance

| Metric | Target | Actual |
|--------|--------|--------|
| Full suite | <2 min | ~70 sec |
| Smoke tests | <10 sec | ~5 sec |
| CI total | <5 min | ~3 min |

## Troubleshooting

### Services Not Starting

```bash
# Restart all services
docker compose -f docker-compose.e2e.yml down -v
docker compose -f docker-compose.e2e.yml up -d
```

### Tests Hang

Check if services are healthy:
```bash
curl http://localhost:3001/api/health
curl http://localhost:3000
```

### Flaky Tests

Run with retries disabled to identify:
```bash
SKIP_WEBSERVER=true npx playwright test --retries=0
```
