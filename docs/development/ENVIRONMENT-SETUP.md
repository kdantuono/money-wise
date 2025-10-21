# Environment Setup Guide

This guide walks you through setting up the MoneyWise development environment. **It should take about 5-10 minutes.**

## Prerequisites

Before starting, ensure you have installed:

- **Node.js** 18+ (check: `node --version`)
- **pnpm** 8+ (check: `pnpm --version`)
- **Docker** and **Docker Compose** (check: `docker --version && docker-compose --version`)
- **Git** (check: `git --version`)

### Installation Links

- [Node.js](https://nodejs.org/) - Choose LTS version
- [pnpm](https://pnpm.io/installation) - `npm install -g pnpm`
- [Docker Desktop](https://www.docker.com/products/docker-desktop) - Includes Docker Compose

---

## Quick Start (5 Minutes)

### Step 1: Copy Environment Files

```bash
# Root environment
cp .env.example .env.local

# Backend environment
cp apps/backend/.env.example apps/backend/.env

# Frontend environment
cp apps/web/.env.example apps/web/.env.local
```

### Step 2: Start Docker Services

```bash
# Start PostgreSQL, Redis, and other services
docker-compose -f docker-compose.dev.yml up -d

# Verify services are running
docker-compose ps
```

Expected output:
```
NAME                COMMAND                  SERVICE      STATUS
moneywise-postgres  "docker-entrypoint..."   postgres     Up (healthy)
moneywise-redis     "redis-server"           redis        Up (healthy)
```

### Step 3: Verify Environment

```bash
# Run environment verification script
./.claude/scripts/verify-environment.sh development
```

You should see: ✅ **All checks passed!**

### Step 4: Start Development

```bash
# Install dependencies (if not already installed)
pnpm install

# Start development servers
pnpm dev
```

Open your browser:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **API Docs**: http://localhost:3001/api/docs

---

## Environment Variables Explained

### Backend Configuration (apps/backend/.env)

**Required:**
- `DB_HOST=localhost` - PostgreSQL host
- `DB_PORT=5432` - PostgreSQL port
- `DB_USERNAME=postgres` - Database user
- `DB_PASSWORD=password` - Database password
- `DB_NAME=moneywise` - Database name
- `REDIS_HOST=localhost` - Redis host
- `REDIS_PORT=6379` - Redis port
- `JWT_ACCESS_SECRET` - JWT signing key (min 32 chars)
- `JWT_REFRESH_SECRET` - JWT refresh key (min 32 chars, must differ from access)

**Optional:**
- `SENTRY_DSN` - Error tracking
- `PLAID_CLIENT_ID` - Banking API (Plaid)
- `PLAID_SECRET` - Banking API secret

### Frontend Configuration (apps/web/.env.local)

**Required:**
- `NEXT_PUBLIC_API_URL=http://localhost:3001/api` - Backend API URL

**Optional:**
- `NEXT_PUBLIC_SENTRY_DSN` - Client-side error tracking
- `NEXT_PUBLIC_ANALYTICS_ENABLED=false` - Analytics

---

## Troubleshooting

### "Cannot connect to Docker daemon"

**Problem:** Docker Desktop is not running

**Solution:**
```bash
# macOS / Windows
# Start Docker Desktop application

# Linux
sudo systemctl start docker
```

### "Can't reach database server at localhost:5432"

**Problem:** PostgreSQL container not running

**Solution:**
```bash
# Start services
docker-compose -f docker-compose.dev.yml up -d

# Check status
docker-compose ps

# View logs
docker-compose logs postgres
```

### "Port 3001 is already in use"

**Problem:** Another application is using port 3001

**Solution:**
```bash
# Option 1: Find and kill the process
lsof -i :3001
kill -9 <PID>

# Option 2: Use a different port
echo "PORT=3002" >> apps/backend/.env
```

### "Cannot find module '@nestjs/common'"

**Problem:** Dependencies not installed

**Solution:**
```bash
pnpm install
```

### "TypeScript errors in IDE"

**Problem:** TypeScript version mismatch

**Solution:**
```bash
# Rebuild TypeScript
pnpm type-check

# Restart IDE
# - VS Code: Cmd+Shift+P → TypeScript: Reload Projects
# - WebStorm: File → Invalidate Caches
```

### Tests fail with "p2003: constraint failed"

**Problem:** Foreign key constraint violated

**Solution:**
```bash
# Reset database and migrations
pnpm db:reset

# Or just seed with fresh data
pnpm db:seed
```

---

## Development Workflow

### Running Development Servers

```bash
# Start all services (API + Web)
pnpm dev

# Start individual services
pnpm --filter @money-wise/backend dev
pnpm --filter @money-wise/web dev
```

### Running Tests

```bash
# All tests
pnpm test

# Backend tests only
pnpm --filter @money-wise/backend test

# Frontend tests only
pnpm --filter @money-wise/web test

# With coverage
pnpm test:coverage

# Watch mode
pnpm test --watch
```

### Building for Production

```bash
# Build all packages
pnpm build

# Start production server
pnpm start
```

---

## Database Management

### View Database

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d moneywise

# Common commands:
# \dt              - List tables
# \d+ users        - Describe users table
# SELECT * FROM users; - Query data
# \q              - Exit
```

### View Redis

```bash
# Connect to Redis
docker-compose exec redis redis-cli

# Common commands:
# KEYS *           - List all keys
# GET key          - Get value
# DEL key          - Delete key
# FLUSHDB          - Clear database
# QUIT             - Exit
```

### Reset Database

```bash
# Drop and recreate all tables
pnpm db:reset

# Or manually
docker-compose down -v
docker-compose up -d
pnpm db:migrate
pnpm db:seed
```

---

## IDE Setup

### VS Code Extensions (Recommended)

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [Prisma](https://marketplace.visualstudio.com/items?itemName=Prisma.prisma)

### VS Code Settings

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## Next Steps

1. **Read the README**: `cat README.md`
2. **Explore the codebase**: Start with `docs/architecture/`
3. **Create your first feature**: See `.claude/CLAUDE.md` for AI-assisted workflow
4. **Join the team**: Ask questions in the project Slack/Discord

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `./.claude/scripts/verify-environment.sh` | Verify environment setup |
| `pnpm dev` | Start development servers |
| `pnpm test` | Run all tests |
| `pnpm build` | Build for production |
| `docker-compose ps` | Check Docker services |
| `pnpm db:reset` | Reset database to clean state |
| `pnpm type-check` | Check TypeScript types |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format code with Prettier |

---

## Getting Help

1. **Check this guide** - Most common issues are covered above
2. **Run verification script** - `./.claude/scripts/verify-environment.sh`
3. **Check Docker logs** - `docker-compose logs -f [service-name]`
4. **Review error messages** - They usually contain actionable information
5. **Ask AI** - Use Claude Code: `/resume-work` or `/help`
6. **Check docs** - See `docs/` folder for detailed documentation

---

## Security Notes

### Development Only

- Default passwords in `.env.example` are for local development only
- Never use these in production
- Always generate strong, random secrets for production

### Generating Secure Secrets

```bash
# Generate a 32-character random secret
openssl rand -hex 32

# Example output:
# a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

# Use this for JWT_ACCESS_SECRET and JWT_REFRESH_SECRET
```

### Production Setup

For production deployment, see: `docs/deployment/PRODUCTION-SETUP.md`

---

**Last Updated:** October 2025
**Maintenance:** Update this guide when adding new required environment variables
