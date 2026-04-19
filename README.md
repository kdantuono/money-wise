# MoneyWise

Personal finance management application with cross-platform support

[![CI/CD Pipeline](https://github.com/kdantuono/money-wise/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/kdantuono/money-wise/actions/workflows/ci-cd.yml)
[![Version](https://img.shields.io/badge/version-0.7.0-blue.svg)](https://github.com/kdantuono/money-wise)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org/)
[![Package Manager](https://img.shields.io/badge/package%20manager-pnpm%20%3E%3D10.0.0-orange.svg)](https://pnpm.io/)

## 🎯 Project Overview

MoneyWise is a comprehensive personal finance management application built with modern technologies and cross-platform compatibility. The application helps users track expenses, manage budgets, and gain insights into their financial health.

### **Current Status: MVP Development (v0.7.0)**
- ✅ Project infrastructure and monorepo setup complete
- ✅ Clinical health audit completed ([report](./docs/audits/2026-04-12-health-audit.md))
- ✅ Test credibility restored (Candidate 7+10)
- 🚧 Auth hardening + Family multi-tenancy next
- 📋 [View Development Progress](./docs/development/progress.md)

## 🚀 Quick Start (5 Minutes)

Get MoneyWise running locally in 5 minutes:

### **Prerequisites**
- Node.js 22+ (check with: `node --version`)
- pnpm package manager (install with: `npm install -g pnpm`)
- Git (check with: `git --version`)
- Docker & Docker Compose (for development databases)

### **Setup Commands**
```bash
# 1. Clone and enter directory
git clone https://github.com/kdantuono/money-wise.git
cd money-wise

# 2. Install dependencies
pnpm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env if needed (defaults work for local development)

# 4. Start development services (PostgreSQL + Redis)
pnpm docker:dev

# 5. Start development servers
pnpm dev
```

### **Verify Setup**
- Frontend (Web): http://localhost:3000
- Backend API: http://localhost:3001
- API Health: http://localhost:3001/api/health

**Next Steps:**
- Read [Detailed Setup Guide](./docs/development/setup.md)
- Try [Development Workflow](./docs/development/progress.md)
- Join our [Architecture Overview](./docs/money-wise-overview.md)

## 🏗️ Architecture & Tech Stack

### **Monorepo Structure**
```
money-wise/
├── apps/
│   ├── web/          # Next.js 15 web application (port 3000)
│   └── mobile/       # Expo 52 / React Native (dormiente — vedi ADR-005)
├── packages/         # Shared packages
│   ├── types/        # TypeScript type definitions
│   ├── utils/        # Utility functions (placeholder)
│   ├── ui/           # React UI components (Radix + Tailwind + CVA)
│   └── test-utils/   # Testing utilities & fixtures
├── supabase/         # Supabase Edge Functions + migrations
│   ├── migrations/   # SQL schema + RLS policies
│   ├── functions/    # Deno Edge Functions (categorize, detect-transfers, detect-bnpl, account-delete, banking-*)
│   └── config.toml   # Project configuration
├── docs/             # Documentation
│   ├── architecture/ # Architecture decisions (ADRs) — see vault for active ADRs
│   ├── development/  # Development guides
│   ├── audits/       # Clinical health audits
│   └── planning/     # Planning pointer — authoritative roadmap in vault
├── .github/          # GitHub Actions workflows
└── scripts/          # Development & CI helper scripts
```

**Monorepo Management**:
- Package Manager: pnpm workspaces
- Build System: Turborepo (optimized caching)
- Import Boundaries: Enforced via ESLint
- TypeScript: Path aliases configured

📖 **[View Complete Structure Documentation](./docs/development/monorepo-structure.md)**

### **Technology Stack**
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS v4, Radix UI, shadcn
- **Mobile**: Expo 52, React Native 0.76 (dormant — framework decision pending via ADR-005)
- **Backend-as-Service**: Supabase (PostgreSQL + Auth + Edge Functions Deno). No custom backend.
- **Edge Functions**: Deno runtime — categorization, transfer detection, BNPL matching, account deletion, banking (gated)
- **Auth**: Supabase Auth (cookie-based sessions via @supabase/ssr)
- **State**: Zustand + TanStack Query
- **Forms**: react-hook-form + Zod
- **Testing**: Vitest + Jest 30, Playwright (E2E)
- **Monitoring**: Sentry (@sentry/nextjs, @sentry/node, @sentry/react-native)
- **DevOps**: GitHub Actions, Turborepo 2.9, pnpm 10.24 workspaces
- **Runtime**: Node 22.12 LTS (Node 24 parked — see roadmap)

## 📋 Available Scripts

### **Development**
```bash
pnpm dev              # Start all development servers (Turbo)
pnpm dev:web          # Start web frontend only (Next.js on :3000)
# Mobile (Expo) is currently dormant — see ADR-005 mobile framework decision
```

### **Building**
```bash
pnpm build            # Build all applications
pnpm build:web        # Build web app only
```

### **Supabase**
```bash
supabase db push              # Push migration changes
supabase functions deploy     # Deploy Edge Functions
supabase functions serve      # Local Edge Functions runtime
```

### **Testing**
```bash
pnpm test             # Run all tests
pnpm test:unit        # Run unit tests only
pnpm test:integration # Run integration tests
pnpm test:e2e         # Run end-to-end tests
```

### **Code Quality**
```bash
pnpm lint             # Lint all packages
pnpm lint:fix         # Fix linting issues
pnpm typecheck        # Type checking
pnpm format           # Format code with Prettier
```

### **Database Operations**
```bash
pnpm db:migrate       # Run database migrations
pnpm db:seed          # Seed database with sample data
pnpm db:reset         # Reset database
```

### **Docker Operations**
```bash
pnpm docker:dev       # Start development services
pnpm docker:down      # Stop development services
pnpm docker:logs      # View service logs
```

## 🔐 Authentication Setup

MoneyWise uses JWT-based authentication with secure password hashing and token refresh capabilities.

### **Quick Authentication Setup**

1. **Configure JWT Secrets** (Required):
```bash
# Generate secure secrets
openssl rand -hex 32  # Copy output for JWT_ACCESS_SECRET
openssl rand -hex 32  # Copy output for JWT_REFRESH_SECRET

# Add to your .env file
JWT_ACCESS_SECRET=your_generated_access_secret_here
JWT_REFRESH_SECRET=your_generated_refresh_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

2. **Verify Database Connection**:
```bash
# Ensure PostgreSQL is running
pnpm docker:dev

# Run database migrations
pnpm db:migrate
```

3. **Test Authentication**:
```bash
# Start the backend
pnpm dev:backend

# Test registration (in another terminal)
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### **Authentication Features**

- ✅ **Secure Registration**: bcrypt password hashing with 12 salt rounds
- ✅ **JWT Authentication**: Access tokens (15min) + Refresh tokens (7d)
- ✅ **Input Validation**: Comprehensive password complexity requirements
- ✅ **Account Management**: User profiles with status tracking
- ✅ **API Documentation**: Interactive Swagger UI at `/api`
- 🚧 **Rate Limiting**: Planned for production security
- 🚧 **Email Verification**: Database prepared, implementation planned

### **Authentication Documentation**

- **[API Reference](./docs/api/authentication.md)** - Complete API documentation
- **[Setup Guide](./docs/development/authentication-setup.md)** - Detailed configuration steps
- **[Security Guide](./docs/security/authentication-security.md)** - Security best practices
- **[Troubleshooting](./docs/development/authentication-troubleshooting.md)** - Common issues and solutions
- **[Flow Diagrams](./docs/api/authentication-flows.md)** - Visual authentication flows

### **Password Requirements**

- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (@$!%*?&)

### **Development API Access**

- **Swagger UI**: http://localhost:3001/api (interactive API testing)
- **Health Check**: http://localhost:3001/api/health
- **Auth Endpoints**:
  - `POST /auth/register` - User registration
  - `POST /auth/login` - User login
  - `POST /auth/refresh` - Token refresh
  - `GET /auth/profile` - Get user profile (protected)
  - `POST /auth/logout` - User logout (protected)

## 🎯 Features

### **Core Features (MVP)**
- ✅ **User Authentication & Authorization**
  - ✅ User registration and login
  - ✅ JWT-based authentication
  - ✅ Profile management
  - ✅ Password security with bcrypt
  - ✅ Token refresh mechanism

- [ ] **Transaction Management**
  - Manual transaction entry
  - Transaction categorization
  - Transaction history and search

- [ ] **Account Management**
  - Multiple account support
  - Account balance tracking
  - Account types (checking, savings, credit)

- [ ] **Budgeting**
  - Budget creation and management
  - Budget vs actual tracking
  - Budget alerts and notifications

### **Advanced Features (Planned)**
- [ ] **Banking Integration**
  - Plaid API integration
  - Automated transaction import
  - Account synchronization

- [ ] **Financial Intelligence**
  - Spending insights and analytics
  - Financial goal tracking
  - Custom reporting and dashboards

- [ ] **Cross-Platform Support**
  - Progressive Web App (PWA)
  - React Native mobile applications
  - Responsive design

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### **Development Workflow**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit using conventional commits: `git commit -m "feat(scope): add amazing feature"`
5. Push to your branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### **Code Standards**
- TypeScript for type safety
- ESLint + Prettier for code formatting
- Conventional Commits for commit messages
- Jest for testing (aim for >80% coverage)
- Comprehensive documentation for new features

## 📚 Documentation

- [Setup Guide](./docs/development/setup.md) - Detailed setup instructions
- [Development Progress](./docs/development/progress.md) - Current development status
- [Architecture Overview](./docs/money-wise-overview.md) - System architecture
- [MVP Plan](./docs/mvp_eng_plan.md) - Engineering roadmap
- [API Documentation](./docs/api/) - API endpoints and schemas

## 🐛 Issue Reporting

Found a bug? Please create an issue using our [Issue Template](./.github/ISSUE_TEMPLATE/).

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Powered by [Next.js](https://nextjs.org/) for modern web development
- [Supabase](https://supabase.com/) for PostgreSQL, Auth, Edge Functions, Realtime
- UI components with [React](https://reactjs.org/), [Radix UI](https://www.radix-ui.com/), and [Tailwind CSS](https://tailwindcss.com/)
- Mobile via [Expo](https://expo.dev/) / [React Native](https://reactnative.dev/) (framework decision pending, see ADR-005)

---

**Version**: 0.7.0 | **Status**: Pre-beta (Sprint 1 closed 2026-04-18) | **Last Updated**: 2026-04-19

📋 **Authoritative roadmap**: see `~/vault/moneywise/planning/roadmap.md` (private knowledge vault, single source of truth for sprints, decisions, tech debt).

For questions or support, please create an issue or contact the maintainers.