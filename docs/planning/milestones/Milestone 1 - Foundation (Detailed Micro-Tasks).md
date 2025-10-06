# Milestone 1: Foundation & Setup - Detailed Breakdown
## 55 Points → 142 Micro-Tasks

> ⚠️ **PLANNING TEMPLATE - OBSOLETE TECH STACK**
> This document was created as a planning template and contains references to Python/FastAPI/Pytest.
> **Actual Implementation**: NestJS + Next.js + TypeScript + Jest/Vitest/Playwright
> **Current Status**: See [`docs/development/progress.md`](../../development/progress.md) for actual implementation progress
> **Purpose**: Historical reference and task breakdown concepts only

---

## Quick Reference for Claude Code

```yaml
Total Tasks: 142
Parallel Branches: 8
Estimated Time: 2 weeks
Critical Path: TASK-001 → TASK-004 → TASK-006
```

---

## [EPIC-001] Project Infrastructure (21 points → 68 tasks)

### [STORY-001] Repository and Development Environment (8 points → 28 tasks)

#### Phase 1.1: Base Repository Setup (Parallel Safe)

##### [TASK-001-001] Initialize Git Repository
- **Points**: 0.2
- **Agent**: Claude-Infra
- **Branch**: `setup/git-init`
- **File**: `.gitignore`
- **Dependencies**: None
```bash
# Commands to execute
git init
git flow init
```
**Acceptance Criteria**:
- [ ] .gitignore with Python/Node/IDE patterns
- [ ] .gitattributes for line endings
- [ ] README.md with project name
- [ ] LICENSE file (MIT)

---

##### [TASK-001-002] Create Monorepo Root Structure
- **Points**: 0.3
- **Agent**: Claude-Infra
- **Branch**: `setup/monorepo-structure`
- **Files**: Root directories
- **Dependencies**: [TASK-001-001]
```bash
moneywise/
├── apps/
├── packages/
├── infrastructure/
├── docs/
├── scripts/
└── tools/
```
**Acceptance Criteria**:
- [ ] All root directories created
- [ ] .gitkeep in empty directories
- [ ] Root package.json with workspaces config

---

##### [TASK-001-003] Setup Workspace Configuration
- **Points**: 0.5
- **Agent**: Claude-Infra
- **Branch**: `setup/workspaces`
- **File**: `package.json`
- **Dependencies**: [TASK-001-002]
```json
{
  "name": "moneywise",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```
**Acceptance Criteria**:
- [ ] Yarn/npm workspaces configured
- [ ] Lerna config if needed
- [ ] .nvmrc with Node version

---

##### [TASK-001-004] Configure EditorConfig
- **Points**: 0.2
- **Agent**: Claude-Infra
- **Branch**: `setup/editorconfig`
- **File**: `.editorconfig`
- **Dependencies**: None
```ini
root = true
[*]
indent_style = space
indent_size = 2
end_of_line = lf
```
**Acceptance Criteria**:
- [ ] Rules for all file types
- [ ] Python: 4 spaces
- [ ] TypeScript/JavaScript: 2 spaces

---

##### [TASK-001-005] Setup Prettier Configuration
- **Points**: 0.3
- **Agent**: Claude-Infra
- **Branch**: `setup/prettier`
- **Files**: `.prettierrc`, `.prettierignore`
- **Dependencies**: [TASK-001-003]
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```
**Acceptance Criteria**:
- [ ] Config for TS/JS/JSON/MD
- [ ] Ignore patterns for generated files
- [ ] Package.json script added

---

##### [TASK-001-006] Setup ESLint Configuration
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `setup/eslint`
- **Files**: `.eslintrc.js`, `.eslintignore`
- **Dependencies**: [TASK-001-003]
**Acceptance Criteria**:
- [ ] TypeScript support
- [ ] React rules
- [ ] Prettier integration
- [ ] Custom rules for project

---

##### [TASK-001-007] Create Backend App Structure
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `setup/backend-structure`
- **Path**: `apps/backend/`
- **Dependencies**: [TASK-001-002]
```
apps/backend/
├── app/
│   ├── api/
│   ├── core/
│   ├── domains/
│   ├── repositories/
│   ├── schemas/
│   └── services/
├── alembic/
├── tests/
└── requirements/
```
**Acceptance Criteria**:
- [ ] All directories created
- [ ] __init__.py files where needed
- [ ] main.py entry point

---

##### [TASK-001-008] Initialize Python Virtual Environment
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `setup/python-env`
- **Path**: `apps/backend/`
- **Dependencies**: [TASK-001-007]
```bash
python -m venv venv
source venv/bin/activate
pip install --upgrade pip
```
**Acceptance Criteria**:
- [ ] Python 3.11+ venv created
- [ ] .python-version file
- [ ] Activation script documented

---

##### [TASK-001-009] Create Requirements Files Structure
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `setup/requirements`
- **Path**: `apps/backend/requirements/`
- **Dependencies**: [TASK-001-008]
```
requirements/
├── base.txt      # Core dependencies
├── dev.txt       # Development tools
├── test.txt      # Testing libraries
└── prod.txt      # Production only
```
**Acceptance Criteria**:
- [ ] Inheritance structure (-r base.txt)
- [ ] Version pinning
- [ ] Comments for each package

---

##### [TASK-001-010] Install Core Python Dependencies
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `setup/python-deps`
- **File**: `apps/backend/requirements/base.txt`
- **Dependencies**: [TASK-001-009]
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
sqlalchemy==2.0.23
alembic==1.12.1
asyncpg==0.29.0
redis==5.0.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
```
**Acceptance Criteria**:
- [ ] All packages installable
- [ ] No version conflicts
- [ ] pip freeze > requirements.lock

---

##### [TASK-001-011] Create Frontend App Structure  
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `setup/frontend-structure`
- **Path**: `apps/web/`
- **Dependencies**: [TASK-001-002]
```
apps/web/
├── public/
├── src/
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── services/
│   ├── store/
│   ├── styles/
│   └── utils/
└── tests/
```
**Acceptance Criteria**:
- [ ] Vite project initialized
- [ ] TypeScript configured
- [ ] Index.html template

---

##### [TASK-001-012] Initialize React Application
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `setup/react-app`
- **Path**: `apps/web/`
- **Dependencies**: [TASK-001-011]
```bash
npm create vite@latest . -- --template react-ts
npm install
```
**Acceptance Criteria**:
- [ ] React 18+ installed
- [ ] TypeScript 5+ configured
- [ ] Vite dev server working

---

##### [TASK-001-013] Install Frontend Core Dependencies
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `setup/frontend-deps`
- **File**: `apps/web/package.json`
- **Dependencies**: [TASK-001-012]
```json
"dependencies": {
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.20.0",
  "@reduxjs/toolkit": "^2.0.1",
  "react-redux": "^9.0.4",
  "@mui/material": "^5.14.0",
  "axios": "^1.6.0"
}
```
**Acceptance Criteria**:
- [ ] All deps installed
- [ ] Package-lock.json committed
- [ ] No vulnerabilities

---

##### [TASK-001-014] Configure TypeScript for Backend
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `setup/backend-typescript`
- **File**: `apps/backend/tsconfig.json`
- **Dependencies**: [TASK-001-007]
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "strict": true
  }
}
```
**Acceptance Criteria**:
- [ ] For tooling only (not runtime)
- [ ] Paths configured
- [ ] Include/exclude patterns

---

##### [TASK-001-015] Configure TypeScript for Frontend
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `setup/frontend-typescript`
- **File**: `apps/web/tsconfig.json`
- **Dependencies**: [TASK-001-012]
**Acceptance Criteria**:
- [ ] Strict mode enabled
- [ ] Path aliases configured
- [ ] JSX configured for React

---

##### [TASK-001-016] Setup Shared Types Package
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `setup/shared-types`
- **Path**: `packages/types/`
- **Dependencies**: [TASK-001-002]
```
packages/types/
├── src/
│   ├── api/
│   ├── models/
│   └── index.ts
├── package.json
└── tsconfig.json
```
**Acceptance Criteria**:
- [ ] TypeScript package setup
- [ ] Build script configured
- [ ] Export mappings

---

##### [TASK-001-017] Create Environment Configuration
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `setup/env-config`
- **Files**: `.env.example`, `apps/backend/app/core/config.py`
- **Dependencies**: [TASK-001-010]
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    secret_key: str
    
    class Config:
        env_file = ".env"
```
**Acceptance Criteria**:
- [ ] All env vars documented
- [ ] Validation with Pydantic
- [ ] .env.example complete

---

##### [TASK-001-018] Setup Logging Configuration
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `setup/logging`
- **File**: `apps/backend/app/core/logging.py`
- **Dependencies**: [TASK-001-017]
```python
import logging
from pythonjsonlogger import jsonlogger

def setup_logging(level: str = "INFO"):
    # Configure structured logging
    pass
```
**Acceptance Criteria**:
- [ ] Structured JSON logs
- [ ] Different levels per module
- [ ] Rotation configured

---

##### [TASK-001-019] Create Makefile with Common Commands
- **Points**: 0.5
- **Agent**: Claude-Infra
- **Branch**: `setup/makefile`
- **File**: `Makefile`
- **Dependencies**: [TASK-001-007, TASK-001-011]
```makefile
.PHONY: install dev test lint

install:
	cd apps/backend && pip install -r requirements/dev.txt
	cd apps/web && npm install

dev:
	docker-compose up
```
**Acceptance Criteria**:
- [ ] All common commands
- [ ] Help target with descriptions
- [ ] Color output

---

##### [TASK-001-020] Setup Pre-commit Hooks
- **Points**: 0.5
- **Agent**: Claude-Infra
- **Branch**: `setup/pre-commit`
- **File**: `.pre-commit-config.yaml`
- **Dependencies**: [TASK-001-005, TASK-001-006]
```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
```
**Acceptance Criteria**:
- [ ] Python: black, ruff, mypy
- [ ] JS/TS: prettier, eslint
- [ ] Commit message linting

---

##### [TASK-001-021] Create Docker Configuration for Backend
- **Points**: 0.8
- **Agent**: Claude-Backend
- **Branch**: `setup/backend-docker`
- **File**: `apps/backend/Dockerfile`
- **Dependencies**: [TASK-001-010]
```dockerfile
FROM python:3.11-slim
WORKDIR /app
# Multi-stage build
```
**Acceptance Criteria**:
- [ ] Multi-stage build
- [ ] Non-root user
- [ ] Health check
- [ ] Optimized layers

---

##### [TASK-001-022] Create Docker Configuration for Frontend
- **Points**: 0.8
- **Agent**: Claude-Frontend
- **Branch**: `setup/frontend-docker`
- **File**: `apps/web/Dockerfile`
- **Dependencies**: [TASK-001-013]
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
# Build stage
```
**Acceptance Criteria**:
- [ ] Multi-stage build
- [ ] Nginx for serving
- [ ] Gzip enabled
- [ ] Cache headers

---

##### [TASK-001-023] Setup Docker Compose Configuration
- **Points**: 1.0
- **Agent**: Claude-Infra
- **Branch**: `setup/docker-compose`
- **File**: `docker-compose.yml`
- **Dependencies**: [TASK-001-021, TASK-001-022]
```yaml
version: '3.8'
services:
  postgres:
    image: timescale/timescaledb:latest-pg15
  redis:
    image: redis:7-alpine
  backend:
    build: ./apps/backend
  frontend:
    build: ./apps/web
```
**Acceptance Criteria**:
- [ ] All services defined
- [ ] Networks configured
- [ ] Volumes for persistence
- [ ] Health checks
- [ ] Restart policies

---

##### [TASK-001-024] Create Database Service Configuration
- **Points**: 0.5
- **Agent**: Claude-Infra
- **Branch**: `setup/database-service`
- **File**: `infrastructure/docker/postgres/init.sql`
- **Dependencies**: [TASK-001-023]
```sql
CREATE DATABASE moneywise;
CREATE DATABASE moneywise_test;
-- TimescaleDB extension
```
**Acceptance Criteria**:
- [ ] Databases created
- [ ] Extensions enabled
- [ ] User permissions set
- [ ] Test database separate

---

##### [TASK-001-025] Configure Redis Service
- **Points**: 0.3
- **Agent**: Claude-Infra
- **Branch**: `setup/redis-service`
- **File**: `infrastructure/docker/redis/redis.conf`
- **Dependencies**: [TASK-001-023]
**Acceptance Criteria**:
- [ ] Persistence enabled
- [ ] Max memory policy
- [ ] Password protected

---

##### [TASK-001-026] Setup Development Scripts
- **Points**: 0.5
- **Agent**: Claude-Infra
- **Branch**: `setup/dev-scripts`
- **Path**: `scripts/`
- **Dependencies**: [TASK-001-023]
```bash
scripts/
├── setup.sh
├── reset-db.sh
├── seed-data.sh
└── health-check.sh
```
**Acceptance Criteria**:
- [ ] Executable permissions
- [ ] Error handling
- [ ] Color output
- [ ] Help text

---

##### [TASK-001-027] Create README with Setup Instructions
- **Points**: 0.5
- **Agent**: Claude-Infra
- **Branch**: `setup/documentation`
- **File**: `README.md`
- **Dependencies**: All previous
```markdown
# MoneyWise

## Quick Start
1. Clone the repository
2. Run `make install`
3. Run `make dev`
```
**Acceptance Criteria**:
- [ ] Prerequisites listed
- [ ] Step-by-step setup
- [ ] Troubleshooting section
- [ ] Architecture diagram

---

##### [TASK-001-028] Configure VS Code Workspace
- **Points**: 0.3
- **Agent**: Claude-Infra
- **Branch**: `setup/vscode`
- **File**: `.vscode/settings.json`
- **Dependencies**: None
```json
{
  "python.linting.enabled": true,
  "python.formatting.provider": "black",
  "editor.formatOnSave": true
}
```
**Acceptance Criteria**:
- [ ] Python settings
- [ ] TypeScript settings
- [ ] Recommended extensions
- [ ] Debug configurations

---

### [STORY-002] CI/CD Pipeline (5 points → 18 tasks)

#### Phase 1.2: GitHub Actions Setup

##### [TASK-002-001] Create GitHub Actions Workflow Structure
- **Points**: 0.2
- **Agent**: Claude-Infra
- **Branch**: `cicd/gh-actions-structure`
- **Path**: `.github/workflows/`
- **Dependencies**: None
```
.github/
├── workflows/
├── actions/
└── ISSUE_TEMPLATE/
```
**Acceptance Criteria**:
- [ ] Directory structure created
- [ ] workflow permissions documented

---

##### [TASK-002-002] Create CI Workflow for Backend
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `cicd/backend-ci`
- **File**: `.github/workflows/backend-ci.yml`
- **Dependencies**: [TASK-002-001]
```yaml
name: Backend CI
on:
  push:
    paths:
      - 'apps/backend/**'
jobs:
  test:
    runs-on: ubuntu-latest
```
**Acceptance Criteria**:
- [ ] Runs on PR and push
- [ ] Python matrix (3.11, 3.12)
- [ ] Caches dependencies
- [ ] Runs tests with coverage

---

##### [TASK-002-003] Create CI Workflow for Frontend
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `cicd/frontend-ci`
- **File**: `.github/workflows/frontend-ci.yml`
- **Dependencies**: [TASK-002-001]
**Acceptance Criteria**:
- [ ] Node version matrix
- [ ] Build validation
- [ ] Test execution
- [ ] Bundle size check

---

##### [TASK-002-004] Setup Code Coverage Reporting
- **Points**: 0.3
- **Agent**: Claude-Infra
- **Branch**: `cicd/coverage`
- **File**: `.github/workflows/coverage.yml`
- **Dependencies**: [TASK-002-002, TASK-002-003]
```yaml
- name: Upload coverage
  uses: codecov/codecov-action@v3
```
**Acceptance Criteria**:
- [ ] Codecov integration
- [ ] Coverage badges
- [ ] PR comments with delta

---

##### [TASK-002-005] Configure Security Scanning
- **Points**: 0.5
- **Agent**: Claude-Security
- **Branch**: `cicd/security-scan`
- **File**: `.github/workflows/security.yml`
- **Dependencies**: [TASK-002-001]
```yaml
- name: Run Snyk
  uses: snyk/actions/python@master
```
**Acceptance Criteria**:
- [ ] Dependency scanning
- [ ] SAST scanning
- [ ] Secret detection
- [ ] License compliance

---

##### [TASK-002-006] Setup Dependency Updates
- **Points**: 0.3
- **Agent**: Claude-Infra
- **Branch**: `cicd/dependabot`
- **File**: `.github/dependabot.yml`
- **Dependencies**: None
```yaml
version: 2
updates:
  - package-ecosystem: "pip"
    directory: "/apps/backend"
    schedule:
      interval: "weekly"
```
**Acceptance Criteria**:
- [ ] Python dependencies
- [ ] NPM dependencies
- [ ] Docker base images
- [ ] GitHub Actions

---

##### [TASK-002-007] Create Lint Workflow
- **Points**: 0.3
- **Agent**: Claude-Infra
- **Branch**: `cicd/lint-workflow`
- **File**: `.github/workflows/lint.yml`
- **Dependencies**: [TASK-002-001]
**Acceptance Criteria**:
- [ ] Python linting (ruff, black)
- [ ] TypeScript linting (eslint)
- [ ] Markdown linting
- [ ] YAML validation

---

##### [TASK-002-008] Setup Database Migration Check
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `cicd/migration-check`
- **File**: `.github/workflows/migrations.yml`
- **Dependencies**: [TASK-002-002]
```yaml
- name: Check migrations
  run: |
    alembic upgrade head
    alembic check
```
**Acceptance Criteria**:
- [ ] Migration validation
- [ ] Rollback testing
- [ ] Schema comparison

---

##### [TASK-002-009] Create Build Workflow
- **Points**: 0.5
- **Agent**: Claude-Infra
- **Branch**: `cicd/build-workflow`
- **File**: `.github/workflows/build.yml`
- **Dependencies**: [TASK-002-002, TASK-002-003]
**Acceptance Criteria**:
- [ ] Docker image builds
- [ ] Image scanning
- [ ] Size optimization check
- [ ] Multi-platform builds

---

##### [TASK-002-010] Setup Staging Deployment
- **Points**: 0.8
- **Agent**: Claude-Infra
- **Branch**: `cicd/staging-deploy`
- **File**: `.github/workflows/deploy-staging.yml`
- **Dependencies**: [TASK-002-009]
```yaml
on:
  push:
    branches: [develop]
```
**Acceptance Criteria**:
- [ ] Auto-deploy to staging
- [ ] Database migrations
- [ ] Smoke tests
- [ ] Rollback capability

---

##### [TASK-002-011] Create Production Deployment Workflow
- **Points**: 0.8
- **Agent**: Claude-Infra
- **Branch**: `cicd/prod-deploy`
- **File**: `.github/workflows/deploy-production.yml`
- **Dependencies**: [TASK-002-009]
```yaml
on:
  release:
    types: [published]
```
**Acceptance Criteria**:
- [ ] Manual approval required
- [ ] Blue-green deployment
- [ ] Database backup
- [ ] Monitoring alerts

---

##### [TASK-002-012] Setup E2E Test Workflow
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `cicd/e2e-tests`
- **File**: `.github/workflows/e2e.yml`
- **Dependencies**: [TASK-002-003]
```yaml
- name: Run Playwright tests
  run: npm run test:e2e
```
**Acceptance Criteria**:
- [ ] Playwright setup
- [ ] Multiple browsers
- [ ] Screenshot on failure
- [ ] Video recordings

---

##### [TASK-002-013] Configure PR Automation
- **Points**: 0.3
- **Agent**: Claude-Infra
- **Branch**: `cicd/pr-automation`
- **File**: `.github/workflows/pr-automation.yml`
- **Dependencies**: [TASK-002-001]
**Acceptance Criteria**:
- [ ] Auto-labeling
- [ ] Size labels
- [ ] Review assignment
- [ ] Merge conflict detection

---

##### [TASK-002-014] Create Release Workflow
- **Points**: 0.5
- **Agent**: Claude-Infra
- **Branch**: `cicd/release-workflow`
- **File**: `.github/workflows/release.yml`
- **Dependencies**: [TASK-002-009]
```yaml
- name: Create release
  uses: softprops/action-gh-release@v1
```
**Acceptance Criteria**:
- [ ] Changelog generation
- [ ] Version bumping
- [ ] Asset attachment
- [ ] Release notes

---

##### [TASK-002-015] Setup Performance Testing
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `cicd/performance-tests`
- **File**: `.github/workflows/performance.yml`
- **Dependencies**: [TASK-002-002]
**Acceptance Criteria**:
- [ ] Load testing with k6
- [ ] Response time checks
- [ ] Memory leak detection
- [ ] Database query analysis

---

##### [TASK-002-016] Configure Monitoring Integration
- **Points**: 0.3
- **Agent**: Claude-Infra
- **Branch**: `cicd/monitoring`
- **File**: `.github/workflows/monitoring.yml`
- **Dependencies**: [TASK-002-010, TASK-002-011]
```yaml
- name: Notify deployment
  run: |
    curl -X POST $MONITORING_WEBHOOK
```
**Acceptance Criteria**:
- [ ] Deployment notifications
- [ ] Error rate tracking
- [ ] Performance metrics
- [ ] Custom alerts

---

##### [TASK-002-017] Create GitHub Actions Composite
- **Points**: 0.3
- **Agent**: Claude-Infra
- **Branch**: `cicd/composite-actions`
- **Path**: `.github/actions/`
- **Dependencies**: [TASK-002-001]
```yaml
name: 'Setup Python'
description: 'Setup Python with caching'
```
**Acceptance Criteria**:
- [ ] Reusable setup actions
- [ ] Caching logic
- [ ] Version management

---

##### [TASK-002-018] Setup Branch Protection Rules Script
- **Points**: 0.3
- **Agent**: Claude-Infra
- **Branch**: `cicd/branch-protection`
- **File**: `scripts/setup-branch-protection.sh`
- **Dependencies**: None
```bash
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true}'
```
**Acceptance Criteria**:
- [ ] Require PR reviews
- [ ] Require status checks
- [ ] Dismiss stale reviews
- [ ] Include administrators

---

### [STORY-003] Testing Infrastructure (8 points → 22 tasks)

#### Phase 1.3: Test Framework Setup

##### [TASK-003-001] Setup Pytest Configuration
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `testing/pytest-config`
- **File**: `apps/backend/pytest.ini`
- **Dependencies**: [TASK-001-010]
```ini
[pytest]
testpaths = tests
python_files = test_*.py
addopts = --cov=app --cov-report=term-missing
```
**Acceptance Criteria**:
- [ ] Coverage configuration
- [ ] Async support
- [ ] Markers defined
- [ ] Parallel execution setup

---

##### [TASK-003-002] Create Test Database Configuration
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `testing/test-database`
- **File**: `apps/backend/tests/conftest.py`
- **Dependencies**: [TASK-003-001]
```python
@pytest.fixture
async def test_db():
    # Create test database
    # Run migrations
    # Yield session
    # Cleanup
```
**Acceptance Criteria**:
- [ ] Isolated test database
- [ ] Auto-rollback transactions
- [ ] Migration runner
- [ ] Fixture scopes

---

##### [TASK-003-003] Setup Test Factories
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `testing/factories`
- **File**: `apps/backend/tests/factories.py`
- **Dependencies**: [TASK-003-002]
```python
class UserFactory:
    @staticmethod
    def create(**kwargs):
        return User(
            email=f"test{uuid4()}@example.com",
            **kwargs
        )
```
**Acceptance Criteria**:
- [ ] User factory
- [ ] Transaction factory
- [ ] Account factory
- [ ] Faker integration

---

##### [TASK-003-004] Create API Test Client
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `testing/api-client`
- **File**: `apps/backend/tests/client.py`
- **Dependencies**: [TASK-003-002]
```python
@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
```
**Acceptance Criteria**:
- [ ] Async test client
- [ ] Auth helpers
- [ ] Request builders
- [ ] Response validators

---

##### [TASK-003-005] Setup Frontend Test Configuration
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `testing/vitest-config`
- **File**: `apps/web/vitest.config.ts`
- **Dependencies**: [TASK-001-013]
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts'
  }
})
```
**Acceptance Criteria**:
- [ ] JSDOM environment
- [ ] Coverage config
- [ ] Path aliases
- [ ] Global setup

---

##### [TASK-003-006] Create React Testing Utils
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `testing/react-utils`
- **File**: `apps/web/tests/utils.tsx`
- **Dependencies**: [TASK-003-005]
```typescript
export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions
) {
  // Wrap with providers
  // Return render result
}
```
**Acceptance Criteria**:
- [ ] Redux provider wrapper
- [ ] Router wrapper
- [ ] Theme wrapper
- [ ] Custom queries

---

##### [TASK-003-007] Setup Mock Service Worker
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `testing/msw-setup`
- **File**: `apps/web/tests/mocks/server.ts`
- **Dependencies**: [TASK-003-005]
```typescript
const handlers = [
  rest.get('/api/v1/user', (req, res, ctx) => {
    return res(ctx.json({ id: 1, email: 'test@example.com' }))
  })
]
```
**Acceptance Criteria**:
- [ ] MSW configured
- [ ] API handlers
- [ ] Error scenarios
- [ ] Network delay simulation

---

##### [TASK-003-008] Create E2E Test Configuration
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `testing/playwright-config`
- **File**: `apps/web/playwright.config.ts`
- **Dependencies**: [TASK-001-013]
```typescript
export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  }
})
```
**Acceptance Criteria**:
- [ ] Multiple browsers
- [ ] Mobile viewports
- [ ] Screenshot config
- [ ] Video recording

---

##### [TASK-003-009] Setup E2E Page Objects
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `testing/page-objects`
- **Path**: `apps/web/tests/e2e/pages/`
- **Dependencies**: [TASK-003-008]
```typescript
export class LoginPage {
  constructor(private page: Page) {}
  
  async login(email: string, password: string) {
    // Page interaction logic
  }
}
```
**Acceptance Criteria**:
- [ ] Login page object
- [ ] Dashboard page object
- [ ] Common components
- [ ] Wait helpers

---

##### [TASK-003-010] Create Load Testing Configuration
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `testing/k6-setup`
- **File**: `tests/load/config.js`
- **Dependencies**: None
```javascript
export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ]
}
```
**Acceptance Criteria**:
- [ ] K6 configuration
- [ ] Test scenarios
- [ ] Thresholds defined
- [ ] Result reporting

---

##### [TASK-003-011] Setup Test Data Seeders
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `testing/seeders`
- **File**: `apps/backend/tests/seeders.py`
- **Dependencies**: [TASK-003-003]
```python
async def seed_test_data(db: AsyncSession):
    users = [UserFactory.create() for _ in range(10)]
    # Create related data
```
**Acceptance Criteria**:
- [ ] User seeder
- [ ] Transaction seeder
- [ ] Realistic data
- [ ] Consistent state

---

##### [TASK-003-012] Create Integration Test Structure
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `testing/integration-structure`
- **Path**: `apps/backend/tests/integration/`
- **Dependencies**: [TASK-003-002]
```
tests/integration/
├── test_auth_flow.py
├── test_transaction_flow.py
└── test_plaid_flow.py
```
**Acceptance Criteria**:
- [ ] Directory structure
- [ ] Base test class
- [ ] Common assertions

---

##### [TASK-003-013] Setup Unit Test Structure
- **Points**: 0.3
- **Agent**: Claude-Backend
- **Branch**: `testing/unit-structure`
- **Path**: `apps/backend/tests/unit/`
- **Dependencies**: [TASK-003-001]
```
tests/unit/
├── services/
├── repositories/
└── utils/
```
**Acceptance Criteria**:
- [ ] Mirror app structure
- [ ] Test file naming
- [ ] Coverage targets

---

##### [TASK-003-014] Create Frontend Unit Test Examples
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `testing/frontend-unit-examples`
- **Path**: `apps/web/tests/unit/`
- **Dependencies**: [TASK-003-006]
```typescript
describe('Button Component', () => {
  it('should render correctly', () => {
    // Test implementation
  })
})
```
**Acceptance Criteria**:
- [ ] Component test example
- [ ] Hook test example
- [ ] Utils test example
- [ ] Store test example

---

##### [TASK-003-015] Setup Snapshot Testing
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `testing/snapshots`
- **File**: `apps/web/tests/setup.ts`
- **Dependencies**: [TASK-003-005]
```typescript
expect.extend({
  toMatchSnapshot: customSnapshotSerializer
})
```
**Acceptance Criteria**:
- [ ] Snapshot configuration
- [ ] Custom serializers
- [ ] Update scripts
- [ ] CI integration

---

##### [TASK-003-016] Create Test Coverage Scripts
- **Points**: 0.3
- **Agent**: Claude-Infra
- **Branch**: `testing/coverage-scripts`
- **File**: `scripts/test-coverage.sh`
- **Dependencies**: [TASK-003-001, TASK-003-005]
```bash
#!/bin/bash
# Run tests with coverage
# Generate reports
# Check thresholds
```
**Acceptance Criteria**:
- [ ] Coverage collection
- [ ] HTML reports
- [ ] Badge generation
- [ ] Threshold enforcement

---

##### [TASK-003-017] Setup Contract Testing
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `testing/contract-tests`
- **File**: `tests/contracts/api_contracts.py`
- **Dependencies**: [TASK-003-002]
```python
def test_api_contract():
    # Validate OpenAPI schema
    # Check response formats
```
**Acceptance Criteria**:
- [ ] OpenAPI validation
- [ ] Response schemas
- [ ] Breaking change detection

---

##### [TASK-003-018] Create Performance Test Suite
- **Points**: 0.5
- **Agent**: Claude-Backend
- **Branch**: `testing/performance-suite`
- **Path**: `tests/performance/`
- **Dependencies**: [TASK-003-010]
```python
def test_api_latency():
    # Measure response times
    # Check against SLA
```
**Acceptance Criteria**:
- [ ] Latency tests
- [ ] Throughput tests
- [ ] Memory tests
- [ ] Database query tests

---

##### [TASK-003-019] Setup Security Testing
- **Points**: 0.5
- **Agent**: Claude-Security
- **Branch**: `testing/security-tests`
- **File**: `tests/security/test_vulnerabilities.py`
- **Dependencies**: [TASK-003-002]
```python
def test_sql_injection():
    # Test for SQL injection
def test_xss():
    # Test for XSS
```
**Acceptance Criteria**:
- [ ] OWASP Top 10 tests
- [ ] Auth bypass tests
- [ ] Input validation tests
- [ ] Rate limit tests

---

##### [TASK-003-020] Create Accessibility Tests
- **Points**: 0.3
- **Agent**: Claude-Frontend
- **Branch**: `testing/a11y-tests`
- **File**: `apps/web/tests/a11y/accessibility.spec.ts`
- **Dependencies**: [TASK-003-008]
```typescript
test('should be accessible', async ({ page }) => {
  await injectAxe(page)
  await checkA11y(page)
})
```
**Acceptance Criteria**:
- [ ] Axe-core integration
- [ ] WCAG compliance
- [ ] Keyboard navigation
- [ ] Screen reader tests

---

##### [TASK-003-021] Setup Visual Regression Testing
- **Points**: 0.5
- **Agent**: Claude-Frontend
- **Branch**: `testing/visual-regression`
- **File**: `apps/web/tests/visual/config.ts`
- **Dependencies**: [TASK-003-008]
```typescript
export const visualConfig = {
  threshold: 0.1,
  animations: 'disabled'
}
```
**Acceptance Criteria**:
- [ ] Percy or similar setup
- [ ] Baseline screenshots
- [ ] Diff reporting
- [ ] CI integration

---

##### [TASK-003-022] Create Test Documentation
- **Points**: 0.3
- **Agent**: Claude-Infra
- **Branch**: `testing/documentation`
- **File**: `docs/testing.md`
- **Dependencies**: All testing tasks
```markdown
# Testing Strategy
## Unit Tests
## Integration Tests
## E2E Tests
```
**Acceptance Criteria**:
- [ ] Testing philosophy
- [ ] Running tests guide
- [ ] Writing tests guide
- [ ] Coverage goals

---

## Summary Statistics for Milestone 1

```yaml
Total Micro-Tasks: 68
Parallel Execution Paths: 8
Estimated Completion: 10-14 days with 4 agents

Critical Path:
1. Repository setup (TASK-001-001 to 001-004)
2. Docker setup (TASK-001-021 to 001-025)
3. CI/CD pipeline (TASK-002-001 to 002-005)
4. Testing framework (TASK-003-001 to 003-004)

Agent Assignment:
- Claude-Infra: 28 tasks (infrastructure, CI/CD)
- Claude-Backend: 22 tasks (Python, API, testing)
- Claude-Frontend: 16 tasks (React, testing, UI)
- Claude-Security: 2 tasks (security scanning)
```

---

## Next Milestone Preview

Would you like me to continue with:
- Milestone 2: Database Architecture (13 points → 45 tasks)
- Milestone 3: Authentication System (21 points → 67 tasks)
- Or proceed with a different milestone?