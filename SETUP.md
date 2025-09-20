# MoneyWise MVP v0.1.0 Setup Guide

> **Quick and reliable setup for MoneyWise personal finance application**

## 🚀 Quick Start (5 minutes)

### Prerequisites

- **Node.js 18+** and npm 8+
- **Docker** and Docker Compose
- **Git** for version control

### 1. Clone and Initialize

```bash
git clone <repository-url>
cd money-wise
npm run setup
```

### 2. Start Development Environment

```bash
# Start database and services
docker-compose up -d

# Start application
npm run dev
```

### 3. Access Application

- 🌐 **Web Dashboard**: http://localhost:3000
- 🔧 **API Server**: http://localhost:3002
- 📚 **API Documentation**: http://localhost:3002/api

## 📋 Detailed Setup

### Environment Configuration

Create `.env` files for backend configuration:

**Backend** (`apps/backend/.env`):

```env
NODE_ENV=development
PORT=3002
DATABASE_URL=postgresql://moneywise:password@localhost:5432/moneywise_dev
JWT_SECRET=your-jwt-secret-key-here
REDIS_URL=redis://localhost:6379
```

**Frontend** (`apps/web/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

### Database Setup

```bash
# Database starts automatically with Docker Compose
docker-compose up -d postgres redis

# Run migrations (when ready)
cd apps/backend
npm run db:migrate

# Seed with test data (optional)
npm run db:seed
```

## 🛠️ Development Workflow

### Essential Commands

```bash
# Development
npm run dev                # Start all services
npm run dev:backend       # Backend only (port 3002)
npm run dev:web          # Frontend only (port 3000)

# Building
npm run build            # Build all applications
npm run test             # Run all tests
npm run lint             # Lint and format code
```

### Quality Gates (Automated)

```bash
# Before starting development session
.claude/scripts/init-session.sh

# Before any commit (automatic via git hooks)
.claude/scripts/quality-check.sh

# After completing session
.claude/scripts/session-complete.sh
```

## 🔧 Development Standards

### Git Workflow (Mandatory)

```bash
# 1. Always create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes with frequent commits
git add .
git commit -m "feat(module): descriptive message"

# 3. Quality gates run automatically on commit
# 4. Push when ready
git push origin feature/your-feature-name
```

### Code Quality Requirements

- **TypeScript**: Zero compilation errors
- **Tests**: 80% minimum coverage
- **Linting**: ESLint + Prettier formatting
- **Security**: No high-risk vulnerabilities

## 📁 Project Structure

```
money-wise/
├── apps/
│   ├── backend/          # NestJS API (port 3002)
│   └── web/             # Next.js dashboard (port 3000)
├── packages/
│   └── types/           # Shared TypeScript types
├── .claude/             # Development automation scripts
└── docs/               # Documentation and planning
```

## 🗄️ Database Schema

### Core Entities

- **Users**: Authentication and user management
- **Accounts**: Financial accounts (checking, savings)
- **Transactions**: Financial transactions with categorization
- **Budgets**: Budget tracking and alerts
- **Categories**: Transaction categorization

### Database Management

```bash
# View database
cd apps/backend
npm run db:studio

# Reset database (CAUTION: destroys data)
npm run db:reset

# Create new migration
npm run db:migrate:create migration-name
```

## 🔒 Security Setup

### Authentication

- **JWT tokens** with 7-day expiration
- **bcrypt** password hashing
- **Rate limiting** on auth endpoints
- **Input validation** on all endpoints

### Environment Security

- Never commit `.env` files
- Use strong JWT secrets (32+ characters)
- Regular dependency updates (`npm audit`)

## 🧪 Testing Setup

### Test Structure

```bash
apps/backend/tests/       # Backend tests
apps/web/tests/          # Frontend tests
  ├── unit/              # Unit tests (Jest)
  ├── integration/       # API integration tests
  └── e2e/              # End-to-end tests (Playwright)
```

### Running Tests

```bash
npm run test                    # All tests
npm run test:coverage          # Coverage report
npm run test:unit             # Unit tests only
npm run test:e2e              # End-to-end tests
```

## 🚨 Troubleshooting

### Common Issues

**Docker containers not starting:**

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs backend
docker-compose logs web

# Restart services
docker-compose restart
```

**TypeScript errors:**

```bash
# Check for errors
npx tsc --noEmit

# Rebuild types package
cd packages/types
npm run build
```

**Database connection issues:**

```bash
# Verify database is running
docker-compose ps postgres

# Check connection
cd apps/backend
npm run db:status
```

**Port conflicts:**

```bash
# Check what's using ports
lsof -i :3000
lsof -i :3002

# Kill processes if needed
kill -9 $(lsof -t -i:3000)
```

## 📚 Development Resources

### Documentation

- **API Documentation**: http://localhost:3002/api (when running)
- **Architecture Guide**: `docs/plans/architecture.md`
- **Best Practices**: `.claude/best-practices.md`

### Key Files

- **Backend Config**: `apps/backend/src/main.ts`
- **Frontend Config**: `apps/web/next.config.js`
- **Database Schema**: `apps/backend/src/**/*.entity.ts`
- **API Routes**: `apps/backend/src/modules/*/controllers/`

## 🎯 MVP Feature Scope

### What's Included

✅ User registration and authentication ✅ Manual transaction entry ✅ Basic account management ✅ Simple budget
tracking ✅ Clean dashboard interface ✅ Responsive web design

### What's Archived (Future Features)

📦 Bank connection and automatic imports 📦 AI-powered categorization 📦 Multi-factor authentication 📦 Real-time
notifications 📦 Advanced analytics 📦 Mobile application

## 🆘 Getting Help

### Self-Service

1. Check this setup guide
2. Review error logs (`docker-compose logs`)
3. Run quality check (`.claude/scripts/quality-check.sh`)
4. Check TypeScript compilation (`npx tsc --noEmit`)

### Resources

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Complete guides in `docs/` directory
- **Architecture**: Detailed system design in architecture docs

## ⚡ Quick Commands Reference

```bash
# Setup
npm run setup                  # Initial project setup
docker-compose up -d          # Start services
npm run dev                   # Start development

# Development
npm run build                 # Build all apps
npm run test                  # Run all tests
npm run lint                  # Code quality check

# Database
npm run db:migrate            # Run migrations
npm run db:studio            # Database GUI
npm run db:seed              # Add test data

# Quality Gates
.claude/scripts/init-session.sh     # Start session
.claude/scripts/quality-check.sh    # Pre-commit check
.claude/scripts/session-complete.sh # End session
```

---

**MoneyWise MVP v0.1.0** - Simple setup, reliable development, quality-focused workflow
