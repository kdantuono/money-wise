# MoneyWise Development Troubleshooting Guide

Quick reference for common development issues and their solutions.

## 🚀 Quick Diagnostics

Before diving into specific issues, run these checks:

```bash
# 1. Verify environment
./.claude/scripts/verify-environment.sh

# 2. Check Docker services
docker-compose ps

# 3. Check dependencies
pnpm ls --depth=0

# 4. Verify Prisma setup
pnpm prisma:validate
```

---

## 🐳 Docker & Database Issues

### Docker Container Won't Start

**Error:** `Error response from daemon: Cannot start container...`

**Solutions:**
```bash
# Kill all money-wise containers
docker-compose -f docker-compose.dev.yml down

# Remove dangling volumes
docker volume prune

# Start fresh
docker-compose -f docker-compose.dev.yml up -d
```

**Check status:**
```bash
docker-compose ps
docker-compose logs postgres
```

### PostgreSQL Connection Refused

**Error:** `connect ECONNREFUSED 127.0.0.1:5432`

**Causes & Fixes:**
```bash
# 1. Is Postgres running?
docker-compose ps | grep postgres

# 2. Check DATABASE_URL in .env
cat apps/backend/.env | grep DATABASE_URL

# 3. Verify network connectivity
docker-compose exec postgres pg_isready -U postgres

# 4. Check password
# Default in docker-compose.dev.yml: postgres
```

**Correct DATABASE_URL format:**
```
postgresql://postgres:postgres@localhost:5432/moneywise
# or with docker container name:
postgresql://postgres:postgres@postgres:5432/moneywise
```

### Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::5432`

**Solutions:**
```bash
# Find process using port 5432 (PostgreSQL)
lsof -i :5432

# Kill the process
kill -9 <PID>

# Or use Docker to stop everything
docker-compose -f docker-compose.dev.yml down
```

For Node ports (3000, 3001):
```bash
# Find process
lsof -i :3001

# Kill it
kill -9 <PID>
```

---

## 🔧 Node.js & Dependencies Issues

### "Cannot find module" Errors

**Error:** `Cannot find module '@nestjs/common'`

**Cause:** Dependencies not installed or cache corrupted

**Solutions:**
```bash
# 1. Reinstall dependencies
pnpm install

# 2. Clear pnpm cache
pnpm store prune

# 3. Remove node_modules and lock file
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 4. Clean Turbo cache
pnpm turbo prune --scope=@money-wise/backend --docker
```

### TypeScript Compilation Errors

**Error:** `error TS2307: Cannot find module 'generated/prisma'`

**Cause:** Prisma client not generated

**Solution:**
```bash
# Generate Prisma client
pnpm prisma:generate

# If that fails, try:
pnpm prisma:validate
cd apps/backend
pnpm prisma generate
```

### Build Failures with "Cannot find symbol" (Java-like errors in TS)

**Error:** `error TS1003: Identifier expected.` or syntax errors

**Causes:**
- Corrupted build cache
- TypeScript version mismatch
- Stale compiled files

**Solutions:**
```bash
# Clean all build artifacts
pnpm turbo:clean

# Rebuild from scratch
pnpm turbo run build --force

# If still failing, check TypeScript version
pnpm ls typescript

# Should be 5.x for this project
```

---

## 🗄️ Database Migration Issues

### "Table does not exist" During Seeding

**Error:** `PrismaClientRustPanicError: Table "user" does not exist`

**Cause:** Migrations not applied

**Solution:**
```bash
# Apply pending migrations
pnpm db:migrate:dev

# Verify database schema
pnpm prisma:studio  # Opens http://localhost:5555

# Then seed
pnpm db:seed
```

### Migration Stuck or Deadlock

**Error:** `PrismaClientInitializationError: Unable to acquire connection...`

**Solution:**
```bash
# Reset database completely (⚠️ destructive)
pnpm prisma:reset

# This will:
# 1. Drop the database
# 2. Create a new one
# 3. Run all migrations
# 4. Seed data

# Then reseed:
pnpm db:seed
```

### Duplicate Key Constraint Violation During Seed

**Error:** `Unique constraint failed: user.email`

**Cause:** Seed data already exists

**Solution:**
```bash
# The seed script has auto-cleanup, so just run again:
pnpm db:seed

# Or manually clean seed data:
# Delete records where email contains '@demo.moneywise.app'
pnpm prisma:studio  # Use UI to delete

# Then reseed
pnpm db:seed
```

---

## 🧪 Testing Issues

### Tests Fail with "Cannot connect to database"

**Error:** `connect ECONNREFUSED` in test output

**Cause:** Test database not running or not configured

**Solution:**
```bash
# 1. Ensure Docker is running
docker-compose -f docker-compose.dev.yml up -d

# 2. Check TEST_DATABASE_URL in .env
cat .env | grep TEST_DATABASE_URL

# 3. Run migrations for test database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/moneywise_test" \
  pnpm db:migrate:dev

# 4. Run tests
pnpm test
```

### Tests Time Out

**Error:** `TypeError: Jest.setTimeout is not a function` or test times out

**Causes:**
- Database query is slow
- Network issue with Docker
- Test is waiting for async operation

**Solutions:**
```bash
# 1. Increase timeout for all tests
# In jest.config.js or package.json:
{
  "jest": {
    "testTimeout": 30000  // 30 seconds instead of default 5
  }
}

# 2. Check database performance
pnpm prisma:studio  # Check if data loads quickly

# 3. Run single test with verbose output
pnpm jest path/to/test.spec.ts --verbose

# 4. Check for hung processes
docker-compose ps
```

### Coverage Report Shows 0% When Tests Pass

**Error:** Coverage report empty or shows 0% coverage

**Cause:** Coverage reporter not configured correctly

**Solution:**
```bash
# Run with coverage flag
pnpm test:coverage

# Check coverage output directory
ls -la coverage/

# If empty, check jest.config.js:
# Must have collectCoverageFrom configured
```

---

## 🔐 Authentication Issues

### JWT Token Validation Failing

**Error:** `Unauthorized: Invalid token` or `JWT malformed`

**Causes:**
- Token expired
- Invalid secret key
- Signature mismatch

**Debugging:**
```bash
# 1. Check JWT_SECRET in .env
echo $JWT_SECRET

# 2. Decode JWT (online at https://jwt.io)
# Add token to debugger to see payload

# 3. Check token expiry
# Token should have 'exp' claim in payload

# 4. Verify issued token matches secret
```

### Login Fails with "User not found"

**Error:** `Unauthorized: User not found` after entering correct credentials

**Causes:**
- User doesn't exist in database
- Email not verified (if email verification required)
- User is deactivated

**Solutions:**
```bash
# 1. Verify user exists
pnpm prisma:studio  # Check User table

# 2. Use demo credentials (if seeded)
Email: john.smith@demo.moneywise.app
Password: demo123

# 3. Create new user via API
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "ValidPassword123!@#"
  }'
```

### Rate Limiting Blocking Requests

**Error:** `429 Too Many Requests` or `Rate limit exceeded`

**Cause:** Too many failed login attempts or requests from same IP

**Solutions:**
```bash
# 1. Wait for rate limit window to pass (usually 15 minutes)

# 2. Clear rate limit cache (if Redis available)
redis-cli FLUSHDB

# 3. Temporarily disable for development (not production!)
# Edit apps/backend/src/core/config/auth.config.ts
# Set RATE_LIMIT_ENABLED: false
```

---

## 🎨 Frontend Issues

### Frontend Can't Reach Backend API

**Error:** `Failed to fetch` or `CORS error` in browser console

**Cause:** Backend not running or CORS misconfigured

**Solutions:**
```bash
# 1. Verify backend is running
curl http://localhost:3001/api/health

# 2. Check CORS settings in .env
NEXT_PUBLIC_API_URL=http://localhost:3001

# 3. Check backend CORS config
grep -r "enableCors" apps/backend/src/main.ts

# 4. Restart both services
pnpm dev  # This starts both frontend and backend
```

### Pages Load Blank or 404 Errors

**Error:** Navigation works but pages are blank

**Cause:** Next.js not built or routes not defined

**Solutions:**
```bash
# 1. Rebuild frontend
pnpm --filter @money-wise/web build

# 2. Check route files exist
ls -la apps/web/app/

# 3. Clear Next.js cache
rm -rf apps/web/.next

# 4. Check page component exports
# Page components must export default component
```

---

## 📊 Monitoring & Logging

### Application Running But No Logs

**Error:** Silent failure or no output

**Cause:** Logger not initialized or output redirected

**Solution:**
```bash
# 1. Check log level in .env
echo $LOG_LEVEL

# 2. Set verbose logging
LOG_LEVEL=debug pnpm dev

# 3. Check for Sentry issues
# Errors might be captured by Sentry instead of console
# Check Sentry dashboard at: https://sentry.io
```

### Performance Degradation Over Time

**Error:** Slow API responses or memory leaks

**Cause:** Memory leak, database connection pool exhausted, cache issues

**Debugging:**
```bash
# 1. Check memory usage
docker-compose stats

# 2. Monitor database connections
docker-compose exec postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# 3. Check slow queries
pnpm prisma:studio  # Monitor query execution

# 4. Restart services to clear memory
docker-compose restart
```

---

## 🔍 Git & Version Control Issues

### Git Merge Conflicts

**Error:** `CONFLICT (content merge): ...`

**Solution:**
```bash
# 1. See which files have conflicts
git status

# 2. Open in editor and resolve
git open apps/backend/src/conflicted-file.ts

# 3. After resolving
git add .
git commit -m "chore: resolve merge conflicts"

# 4. Or abort merge
git merge --abort
```

### Pre-commit Hook Failing

**Error:** `husky: pre-commit hook exited with code 1`

**Causes:**
- ESLint errors
- TypeScript errors
- Failed tests
- Failed GitHub Actions workflow validation

**Solutions:**
```bash
# 1. See what's failing
git status

# 2. For linting errors
pnpm lint --fix

# 3. For type errors
pnpm type-check

# 4. For test failures
pnpm test

# 5. If still stuck, bypass (not recommended)
git commit --no-verify
```

---

## 🚀 CI/CD Pipeline Issues

### GitHub Actions Workflow Failing

**Error:** Red ❌ on pull request checks

**Debugging:**
```bash
# 1. View workflow runs
gh run list --branch feature/your-branch

# 2. View specific run
gh run view <run-id>

# 3. View logs
gh run view <run-id> --log

# 4. Common failures:
# - Linting: Run 'pnpm lint --fix' locally
# - Types: Run 'pnpm type-check' locally
# - Tests: Run 'pnpm test' locally
# - Coverage: Run 'pnpm test:coverage' locally
```

### Deployment Failing

**Error:** Workflow runs but deployment doesn't complete

**Solutions:**
```bash
# 1. Check deployment logs
gh run view <run-id> --log | grep -i deploy

# 2. Verify environment variables
gh secret list

# 3. Check Docker build
docker build -f Dockerfile -t money-wise .

# 4. Verify container runs locally
docker run -p 3001:3001 money-wise
```

---

## 📚 Configuration Issues

### .env File Not Being Read

**Error:** `Configuration not found` or null values

**Cause:** .env not in correct location

**Locations to check:**
```
✅ /home/nemesi/dev/money-wise/.env (root)
✅ /home/nemesi/dev/money-wise/apps/backend/.env (backend)
✅ /home/nemesi/dev/money-wise/apps/web/.env.local (frontend)
```

**Verify:**
```bash
cat .env
cat apps/backend/.env
cat apps/web/.env.local
```

### Missing Required Environment Variables

**Error:** `Configuration validation failed: x is required`

**Solution:**
```bash
# 1. Copy from example
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env

# 2. Fill in required values
nano .env

# 3. Verify all set
./.claude/scripts/verify-environment.sh
```

---

## 🆘 Getting Help

### When Nothing Works

1. **Verify Environment:**
   ```bash
   ./.claude/scripts/verify-environment.sh
   ```

2. **Check System Resources:**
   ```bash
   docker system df
   docker system prune  # ⚠️ removes unused resources
   ```

3. **Complete Reset (⚠️ destructive):**
   ```bash
   # Stop everything
   docker-compose down -v  # Removes volumes!

   # Clean Node
   rm -rf node_modules pnpm-lock.yaml
   pnpm install

   # Restart
   docker-compose up -d
   pnpm dev
   ```

4. **Review Recent Changes:**
   ```bash
   git log --oneline -10
   git diff HEAD~1
   ```

5. **Check Documentation:**
   - Development guide: `docs/development/ENVIRONMENT-SETUP.md`
   - Quick start: `apps/backend/src/database/seeds/QUICK_START.md`
   - Architecture: `docs/architecture/ARCHITECTURE_ASSESSMENT.md`

6. **Ask for Help:**
   - Check existing issues: `gh issue list`
   - Create new issue: `gh issue create`
   - Contact team lead with:
     - Error message (full stack trace)
     - Steps to reproduce
     - Output from `verify-environment.sh`
     - Docker status: `docker-compose ps`

---

## 📋 Common Command Reference

```bash
# Environment
./.claude/scripts/verify-environment.sh     # Verify setup
source .env                                  # Load env vars

# Docker
docker-compose up -d                        # Start services
docker-compose ps                           # View status
docker-compose logs -f postgres             # Stream logs
docker-compose down                         # Stop services

# Database
pnpm db:seed                                # Seed demo data
pnpm db:migrate:dev                         # Apply migrations
pnpm db:reset                               # Nuke and rebuild ⚠️
pnpm prisma:studio                          # Browse data at localhost:5555

# Development
pnpm dev                                    # Start dev environment
pnpm build                                  # Build for production
pnpm lint --fix                             # Fix linting issues
pnpm type-check                             # TypeScript check

# Testing
pnpm test                                   # Run all tests
pnpm test:coverage                          # Coverage report
pnpm test:watch                             # Watch mode

# Git
git status                                  # See changes
git branch                                  # List branches
git push origin [branch]                    # Push to remote
gh pr create                                # Create pull request
```

---

**Last Updated:** October 21, 2025
**Version:** 1.0
**Maintained By:** MoneyWise Development Team
