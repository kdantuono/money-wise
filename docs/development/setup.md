# Development Environment Setup

> **Current Status**: Infrastructure complete, ready for application development

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Git
- pnpm (will be installed automatically)

## Quick Setup

1. **Clone and navigate to project**:
   ```bash
   git clone https://github.com/kdantuono/money-wise.git
   cd money-wise
   ```

2. **Run automated setup**:
   ```bash
   chmod +x .claude/scripts/setup-dev-environment.sh
   ./.claude/scripts/setup-dev-environment.sh
   ```

3. **Validate environment**:
   ```bash
   ./.claude/scripts/validate-environment.sh
   ```

## Manual Setup Steps

If automated setup fails, follow these steps:

### 1. Install Dependencies
```bash
npm install -g pnpm@latest
pnpm install
```

### 2. Start Infrastructure Services
```bash
docker compose -f docker-compose.dev.yml up -d
```

### 3. Verify Services
```bash
docker compose ps  # Should show postgres-dev and redis-dev as healthy
```

## Development Workflow

### Branch Strategy
- **Never work on `main`** - always create feature branches
- Branch naming: `feature/your-feature-name`
- Follow atomic commits and progressive merge strategy

### Daily Development
```bash
# Start development environment
./dev.sh

# Start backend (when implemented)
pnpm dev:backend

# Start frontend (when implemented)
pnpm dev:web
```

## Services

| Service | URL | Purpose |
|---------|-----|---------|
| PostgreSQL | `localhost:5432` | Main database |
| Redis | `localhost:6379` | Caching and sessions |
| Backend API | `localhost:3001` | NestJS API (when implemented) |
| Frontend | `localhost:3000` | Next.js web app (when implemented) |

## Environment Variables

Environment configuration is in `.env.local` (created by setup script):

- Database connection: `DATABASE_URL`
- Redis connection: `REDIS_URL`
- JWT secrets: `JWT_SECRET`
- API configuration: `API_PORT`, `API_PREFIX`

## Troubleshooting

### Docker Services Not Starting
```bash
docker compose down
docker compose -f docker-compose.dev.yml up -d
docker compose logs
```

### Database Connection Issues
```bash
docker exec postgres-dev pg_isready -U app_user -d app_dev
```

### Redis Connection Issues
```bash
docker exec redis-dev redis-cli ping
```

## Next Steps

1. Initialize NestJS backend application
2. Set up database schema and migrations
3. Create Next.js frontend application
4. Implement authentication system

## GitHub Actions Validation Tools

### actionlint

We use **actionlint** to validate GitHub Actions workflows locally before pushing. This catches configuration errors early and prevents CI/CD failures.

#### Automatic Setup

actionlint is installed automatically during the initial setup:

```bash
./.claude/scripts/setup-dev-environment.sh
```

#### Manual Installation

You can install actionlint manually anytime:

```bash
pnpm setup:actionlint
```

#### Validating Workflows

**Validate all workflows:**
```bash
pnpm lint:workflows
```

**Validate specific workflow:**
```bash
./.claude/tools/actionlint .github/workflows/ci-cd.yml
```

#### Pre-commit Hook

actionlint is automatically run on any commits that modify `.github/workflows/` files. If issues are found, the commit will be blocked until they're fixed:

```bash
# This will check workflows if any are modified
git add .github/workflows/ci-cd.yml
git commit -m "fix(ci): update workflow"

# If actionlint finds issues:
# ❌ GitHub Actions workflows have errors:
# Please fix workflow errors before committing.
```

#### Troubleshooting

**actionlint not found in pre-commit:**
```bash
pnpm setup:actionlint
```

**Skip validation for specific commit (not recommended):**
```bash
git commit --no-verify -m "message"
```

**Manual actionlint installation from GitHub:**
- Visit: https://github.com/rhysd/actionlint/releases
- Download latest release for your platform
- Place binary in `./.claude/tools/actionlint`

## Validation

Run the environment validation script anytime:
```bash
./.claude/scripts/validate-environment.sh
```

This will verify all tools, services, and configurations are properly set up.