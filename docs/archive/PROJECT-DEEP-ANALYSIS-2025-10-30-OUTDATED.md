# MoneyWise Project - Deep Analysis & Readiness Report

**Generated**: October 30, 2025  
**Analyst**: AI Development Assistant  
**Purpose**: Comprehensive project understanding and development support readiness

---

## 🎯 Executive Summary

**MoneyWise** is a sophisticated **multi-generational personal finance platform** (ages 7-70+) built as a modern TypeScript monorepo. The project is in **MVP development phase** with a strong foundation and significant banking integration progress.

### Key Metrics
- **Current Version**: 0.5.0
- **Architecture**: Monorepo (3 apps, 4 packages)
- **Tech Stack**: NestJS + Next.js + Prisma + PostgreSQL/TimescaleDB + Redis
- **Development Stage**: Banking Phase 3 (SaltEdge Integration)
- **Test Coverage**: 70%+ backend, 94.78% transaction module
- **Infrastructure**: 100% operational (CI/CD, Docker, monitoring)

---

## 📁 Project Structure Analysis

### Monorepo Architecture

```
money-wise/
├── apps/
│   ├── backend/          # NestJS API (Port 3001)
│   │   ├── src/
│   │   │   ├── auth/            ✅ Complete (JWT, 2FA, refresh tokens)
│   │   │   ├── banking/         🚧 Phase 3 (SaltEdge integration)
│   │   │   ├── accounts/        ✅ REST API complete
│   │   │   ├── transactions/    ✅ REST API complete (30 tests)
│   │   │   ├── users/           ✅ Complete
│   │   │   ├── core/            ✅ Config, logging, monitoring
│   │   │   └── database/        ✅ Prisma + migrations
│   │   └── prisma/
│   │       └── schema.prisma    ✅ 13 models, family-first design
│   │
│   ├── web/              # Next.js frontend (Port 3000)
│   │   ├── app/
│   │   │   ├── auth/            ⏸️ Pending (EPIC-2.1)
│   │   │   ├── banking/         ⏸️ Pending (Phase 4)
│   │   │   └── dashboard/       ⏸️ Pending
│   │   └── lib/                 ✅ Utils, auth helpers
│   │
│   └── mobile/           # React Native (Expo)
│       └── App.tsx              ⏸️ Pending (EPIC-2.2)
│
├── packages/
│   ├── types/            ✅ Shared TypeScript definitions
│   ├── ui/               ✅ React component library
│   ├── utils/            ✅ Shared utilities
│   └── test-utils/       ✅ Testing fixtures & factories
│
├── docs/
│   ├── planning/         📋 MVP roadmap, critical path
│   ├── development/      📈 Progress tracking, setup guides
│   ├── banking/          🏦 SaltEdge integration docs
│   └── architecture/     🏗️ ADRs, design decisions
│
├── .claude/              🤖 AI orchestration system
│   ├── agents/           13 specialized development agents
│   ├── commands/         Quick workflow commands
│   └── workflows/        Epic and story workflows
│
└── infrastructure/       🐳 Docker configs, deployment
```

### Key Architectural Decisions

1. **Family-First Design**: Every user belongs to a family (enables multi-generational features)
2. **Prisma ORM**: Migrated from TypeORM (Oct 2025) - 97 commits, complete rewrite
3. **PostgreSQL**: Using choice from user rules (no SQLite)
4. **TimescaleDB**: Time-series extension for financial data optimization
5. **Decimal for Money**: No floating-point errors (`Decimal(15,2)`)
6. **JSONB for Flexibility**: Plaid metadata, user settings, transaction details

---

## 🗄️ Database Schema Deep Dive

### Core Models (13 Tables)

#### 1. **Family** (Core Organizational Unit)
- Multi-generational finance management
- Shared accounts and budgets
- Role-based permissions (ADMIN/MEMBER/VIEWER)

#### 2. **User** (Individual Members)
```prisma
- JWT authentication with refresh tokens
- bcrypt password hashing (12 rounds)
- 2FA support (TOTP)
- Role within family context
- Audit trail (lastLoginAt, emailVerifiedAt)
```

#### 3. **Account** (Financial Accounts)
```prisma
- Dual ownership: User OR Family
- Types: CHECKING, SAVINGS, CREDIT_CARD, INVESTMENT, LOAN, MORTGAGE
- Sources: SALTEDGE, TINK, YAPILY, PLAID, MANUAL
- Sync tracking and error handling
- Balance history with Decimal precision
```

#### 4. **Transaction** (Financial Transactions)
```prisma
- Immutable history (only mark CANCELLED, never delete)
- Amount stored as absolute value + type (DEBIT/CREDIT)
- Plaid integration fields
- Location, tags, attachments (JSONB)
- Split transaction support
- Auto-categorization metadata
```

#### 5. **Category** (Hierarchical Classification)
```prisma
- Self-referential tree structure
- Parent-child relationships (e.g., Food → Restaurants → Fast Food)
- Type: INCOME, EXPENSE, TRANSFER
- Auto-categorization rules (JSONB)
- Visual customization (color, icon)
```

#### 6. **Budget** (Spending Limits)
```prisma
- Category-level budgets (not account-level)
- Period types: MONTHLY, QUARTERLY, YEARLY, CUSTOM
- Alert thresholds: [50%, 75%, 90%]
- Rollover settings
```

#### 7. **BankingConnection** (OAuth State)
```prisma
- Tracks provider link status (PENDING → AUTHORIZED)
- Provider-specific IDs (SaltEdge, Tink, Yapily)
- Expiration tracking (90 days for SaltEdge)
- OAuth redirect URLs
```

#### 8. **BankingSyncLog** (Audit Trail)
```prisma
- Immutable sync history
- Success/failure tracking
- Performance monitoring
- Error codes and messages
```

#### 9-13. **Supporting Models**
- **Achievement**: Gamification system
- **UserAchievement**: Progress tracking
- **PasswordHistory**: Security compliance
- **AuditLog**: Security events
- **BankingSyncLog**: Integration monitoring

### Database Indexes Strategy

**Time-Series Optimized**:
```sql
-- Transaction queries (most common)
idx_transactions_account_date (accountId, date)
idx_transactions_category_date (categoryId, date)
idx_transactions_status_date (status, date)
idx_transactions_merchant_date (merchantName, date)

-- Account filtering
idx_accounts_user_status (userId, status)
idx_accounts_family_status (familyId, status)
idx_accounts_provider_sync (bankingProvider, syncStatus)

-- Budget tracking
idx_budgets_family_status (familyId, status)
idx_budgets_date_range (startDate, endDate)
```

---

## 🏗️ Backend Architecture

### Module Structure

#### **Auth Module** ✅ Complete
- **Controllers**: Registration, login, logout, profile, refresh
- **Services**: AuthService, TokenService, PasswordService
- **Guards**: JwtAuthGuard, LocalAuthGuard, RateLimitGuard
- **Strategies**: JWT, JWT-Refresh, Local
- **Features**:
  - Secure registration with email validation
  - JWT access tokens (15min) + refresh tokens (7d)
  - Password complexity validation
  - 2FA support (TOTP)
  - Rate limiting (10 attempts/15min)
  - Audit logging

#### **Banking Module** 🚧 Phase 3
- **Controllers**: 6 endpoints (initiate, complete, accounts, sync, revoke, providers)
- **Services**: BankingService, SaltEdgeProvider
- **Status**: REST API complete, manual testing phase
- **Integration**: SaltEdge (approved, credentials configured)
- **Tests**: 32 unit tests passing

**Endpoints**:
```typescript
POST   /banking/initiate          # Start OAuth flow
POST   /banking/complete          # Complete connection
GET    /banking/accounts          # List linked accounts
POST   /banking/sync              # Trigger sync
DELETE /banking/revoke/:id        # Disconnect account
GET    /banking/providers         # List available providers
```

#### **Accounts Module** ✅ Complete
- CRUD operations
- Balance tracking
- Sync management
- Comprehensive validation

#### **Transactions Module** ✅ Complete
- CRUD with filtering
- Category assignment
- Bulk import support
- 30 integration tests
- 94.78% coverage

#### **Core Infrastructure** ✅ Complete
- **Config**: Type-safe Zod validation
- **Logging**: Structured LoggerService with context
- **Monitoring**: Sentry integration (backend + frontend)
- **Metrics**: PerformanceInterceptor, MetricsService
- **Health**: Database, Redis, API health checks
- **Database**: Prisma client with connection pooling

---

## 🎨 Frontend Architecture

### Web App (Next.js 15)

#### Current Status
- **Built**: ⏸️ Minimal (layout, global error handler)
- **Auth UI**: ⏸️ Pending EPIC-2.1
- **Banking UI**: ⏸️ Pending Phase 4
- **Dashboard**: ⏸️ Pending

#### Planned Structure (EPIC-2.1)
```typescript
app/
├── auth/
│   ├── register/         # Registration form
│   ├── login/            # Login form
│   └── reset-password/   # Password reset
├── banking/
│   ├── connect/          # Provider selection
│   ├── accounts/         # Account list
│   └── transactions/     # Transaction list
└── dashboard/            # Overview, charts
```

#### Tech Stack
- **Framework**: Next.js 15 with App Router
- **UI**: Radix UI + Tailwind CSS
- **Forms**: React Hook Form + Zod
- **State**: Zustand (planned)
- **API**: Axios with interceptors
- **Testing**: Vitest + React Testing Library + Playwright

---

## 📱 Mobile App (React Native)

### Current Status
- **Setup**: ✅ Expo 49 configured
- **Implementation**: ⏸️ Pending EPIC-2.2
- **Platform**: Cross-platform (iOS + Android)

### Planned Features
- Native auth screens
- Biometric authentication
- Secure token storage (react-native-keychain)
- Push notifications
- Offline support

---

## 🧪 Testing Infrastructure

### Backend Testing ✅ Complete

**Unit Tests**:
- Jest configuration
- 32 banking tests passing
- Mock factories for Prisma
- Coverage: 70%+ overall, 94.78% transactions

**Integration Tests**:
- Testcontainers for PostgreSQL
- Prisma test factories
- 30+ account + transaction tests
- Real database operations

**E2E Tests** (Planned):
- Supertest for API testing
- Full authentication flow
- Banking integration scenarios

### Frontend Testing ✅ Configured

**Unit Tests**:
- Vitest + jsdom
- React Testing Library
- Component tests
- Hook tests

**E2E Tests**:
- Playwright configured
- MCP Playwright integration
- Auth flow tests
- Banking flow tests (planned)

**Visual Testing** (Planned):
- Playwright snapshots
- Cross-browser testing

---

## 🔐 Security Implementation

### Authentication ✅ Production-Ready

**Password Security**:
- bcrypt hashing (12 rounds)
- Password history (prevent reuse)
- Complexity requirements (8 chars, upper, lower, number, special)
- Rate limiting (10 attempts/15min)

**Token Management**:
- JWT access tokens (15min expiry)
- Refresh tokens (7d expiry)
- Secure httpOnly cookies
- Token blacklist on logout

**2FA Support**:
- TOTP implementation
- QR code generation
- Backup codes

**Audit Logging**:
- All auth events tracked
- IP address + user agent
- Security event flagging

### API Security ✅ Implemented

- Helmet.js (security headers)
- CORS configuration
- Rate limiting
- Input validation (class-validator)
- SQL injection prevention (Prisma parameterized queries)

---

## 🚀 DevOps & Infrastructure

### CI/CD Pipeline ✅ Fully Operational

**GitHub Actions Workflows**:
1. **progressive-ci-cd.yml**: Main pipeline
   - Lint + typecheck + test
   - Build verification
   - Coverage reporting
   - Security scanning

2. **pr-checks.yml**: Pull request validation
   - Code quality gates
   - Test requirements
   - Documentation checks

3. **dependency-update.yml**: Automated updates
   - Dependabot PRs
   - Security advisories

### Docker Environment ✅ Production-Ready

**Services**:
```yaml
postgres:          # TimescaleDB (PostgreSQL 15)
  - Port: 5432
  - Database: moneywise
  - Extensions: TimescaleDB, uuid-ossp

redis:             # Cache & sessions
  - Port: 6379
  - Persistence enabled
```

**Development Workflow**:
```bash
pnpm docker:dev    # Start services
pnpm dev           # Start all apps (turbo)
pnpm test          # Run tests
pnpm lint          # Lint all packages
```

### Monitoring ✅ Sentry Integrated

- **Backend**: Error tracking + performance
- **Frontend**: Browser errors + user context
- **Logging**: Structured JSON logs
- **Metrics**: Custom performance tracking

---

## 📊 Current Development Status

### Completed Milestones

#### ✅ Milestone 1: Foundation (100%)
- Monorepo setup (pnpm workspaces)
- Docker environment
- CI/CD pipeline
- Testing infrastructure
- Documentation system

#### ✅ EPIC-1.5: Technical Debt (100%)
- TypeORM → Prisma migration (97 commits)
- Configuration management (type-safe)
- Monitoring integration (Sentry)
- Documentation consolidation
- Project structure optimization

#### ✅ Milestone 2: Backend Authentication (100%)
- Database schema with Prisma
- JWT authentication system
- Password security
- 2FA support
- Audit logging

#### ✅ Banking Phase 2: REST API (100%)
- 6 SaltEdge endpoints
- 32 unit tests passing
- DTOs with validation
- Error handling
- Swagger documentation

### Current Phase: Banking Phase 3 🚧

**Phase 3.1**: ✅ API Approval Check (Complete)
- SaltEdge credentials verified
- All approvals confirmed
- No blockers identified

**Phase 3.2**: ⏳ Manual API Testing (Next)
- Duration: 1-2 hours
- 6 test scenarios
- Swagger UI testing
- Documentation: `docs/planning/PHASE3.2-MANUAL-API-TESTING-PLAN.md`

**Phase 3.3**: ⏳ Integration Tests (Queued)
- banking.integration.spec.ts
- Full test coverage (80%+)
- Duration: 3-4 hours

### Pending Epics

#### EPIC-2.1: Frontend Auth UI ⏸️ Blocked
- Registration & login forms
- Auth context provider
- Protected routes
- Password reset UI
- Frontend testing
- **Estimated**: 13 points, 1-2 weeks
- **Blocker**: Waiting for Banking Phase 3 completion

#### EPIC-2.2: Mobile Auth ⏸️ Blocked
- Mobile auth screens
- Biometric authentication
- Secure storage
- **Estimated**: 8 points, 1 week

---

## 🎯 Critical Path to MVP

### Immediate Next Steps (Next 2-4 Weeks)

1. **Banking Phase 3.2-3.3** (1-2 days)
   - Manual API testing
   - Integration test suite
   - Documentation

2. **Banking Phase 4** (1 week)
   - Frontend components (6)
   - API client integration
   - State management
   - UI/UX polish

3. **EPIC-2.1** (1-2 weeks)
   - Auth UI implementation
   - Protected routes
   - Frontend testing

4. **EPIC-2.2** (1 week)
   - Mobile auth screens
   - Platform-specific features

### MVP Feature Completion (4-6 Weeks)

1. **Account Management**
   - Account CRUD operations
   - Balance tracking
   - Account linking UI

2. **Transaction Management**
   - Transaction list/filter
   - Manual entry
   - Categorization UI

3. **Dashboard**
   - Spending overview
   - Category breakdowns
   - Trend charts

---

## 🔧 Development Environment

### Prerequisites ✅ Verified
- Node.js 18+ (required)
- pnpm 8+ (package manager)
- Docker + Docker Compose
- PostgreSQL (via Docker)
- Redis (via Docker)

### Quick Start Commands

```bash
# Start services
pnpm docker:dev

# Start development servers
pnpm dev                # All apps
pnpm dev:backend        # Backend only (port 3001)
pnpm dev:web            # Frontend only (port 3000)

# Testing
pnpm test               # All tests
pnpm test:unit          # Unit tests only
pnpm test:e2e           # E2E tests

# Code quality
pnpm lint               # Lint all packages
pnpm typecheck          # Type checking
pnpm format             # Format with Prettier

# Database
pnpm db:migrate         # Run migrations
pnpm db:seed            # Seed data
pnpm db:reset           # Reset database
```

### API Endpoints

**Backend API**: http://localhost:3001
- **Swagger UI**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/api/health

**Frontend**: http://localhost:3000

---

## 📚 Documentation System

### Structure
```
docs/
├── planning/          # Requirements, roadmaps, MVP plan
├── development/       # Setup, progress tracking
├── architecture/      # ADRs, design decisions
├── api/               # API documentation
├── banking/           # SaltEdge integration
├── testing/           # Test strategies
└── archive/           # Historical documents
```

### Key Documents

**Planning**:
- `planning/README.md` - Planning hub
- `planning/critical-path.md` - 47 blocking tasks
- `planning/app-overview.md` - Product vision

**Development**:
- `development/progress.md` - Live progress tracking
- `development/setup.md` - Environment setup
- `development/PHASE-3-IMPLEMENTATION-GUIDE.md` - Banking guide

**Banking**:
- `planning/BANKING-PROVIDER-RESEARCH-PHASE4.md` - Provider comparison
- `planning/PHASE3-SUMMARY-AND-ROADMAP.md` - Banking roadmap
- `planning/PHASE3.2-MANUAL-API-TESTING-PLAN.md` - Testing plan

---

## 🤖 AI Orchestration System

### .claude/ Directory

**Purpose**: AI-powered development workflow management

**Structure**:
```
.claude/
├── agents/              # 13 specialized agents
│   ├── architect-agent.md
│   ├── backend-specialist.md
│   ├── frontend-specialist.md
│   ├── database-specialist.md
│   ├── test-specialist.md
│   ├── security-specialist.md
│   └── ... (7 more)
│
├── commands/            # Quick workflow commands
│   ├── resume-work.md
│   ├── status.md
│   └── epic-execute.md
│
└── workflows/           # Epic execution patterns
    └── epic-workflow.md
```

### Agent Capabilities

**Pattern-Based Auto-Loading**:
- Architecture → `architect-agent.md`
- Backend API → `backend-specialist.md` + `database-specialist.md`
- Frontend UI → `frontend-specialist.md`
- Testing → `test-specialist.md`
- Security → `security-specialist.md`

### Quick Commands

```bash
/resume-work            # Restore session (todos + context)
/status                 # Show execution status
/epic:init [name]       # Initialize epic
/epic:execute           # Execute with parallel agents
/feature [name]         # Standard feature development
/fix [issue-#]          # Fix GitHub issue
```

---

## 🎓 Learning Resources

### For New Developers

**Start Here**:
1. Read `README.md` - Project overview
2. Read `docs/development/setup.md` - Environment setup
3. Read `docs/planning/app-overview.md` - Product vision
4. Read `CLAUDE.md` - AI orchestration guide

**Architecture Understanding**:
1. Study `apps/backend/prisma/schema.prisma` - Database design
2. Review `apps/backend/src/auth/` - Authentication flow
3. Explore `apps/backend/src/banking/` - Banking integration

**Testing Examples**:
1. `apps/backend/__tests__/unit/` - Unit test patterns
2. `apps/backend/__tests__/integration/` - Integration tests
3. `apps/web/e2e/` - E2E test examples

### Code Patterns

**Backend Service Pattern**:
```typescript
@Injectable()
export class ExampleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.example.findMany({
      where: { userId },
    });
  }
}
```

**Frontend Component Pattern**:
```typescript
// Using Radix UI + Tailwind
export function ExampleComponent() {
  const { data, isLoading } = useQuery(['example'], fetchExample);
  
  if (isLoading) return <Spinner />;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.title}</CardTitle>
      </CardHeader>
      <CardContent>{data.content}</CardContent>
    </Card>
  );
}
```

---

## 🚨 Important Guidelines

### Git Workflow

**Branch Strategy**:
```bash
main             # Production
develop          # Integration (not yet created)
feature/*        # Feature branches
bugfix/*         # Bug fixes
epic/*           # Epic branches
```

**Never**:
- ❌ Work directly on `main`
- ❌ Force push to protected branches
- ❌ Commit without running tests
- ❌ Skip linting/typechecking

**Always**:
- ✅ Create feature branch from `main`
- ✅ Run `pnpm lint && pnpm typecheck` before commit
- ✅ Write tests for new features
- ✅ Update documentation
- ✅ Use conventional commits

### Code Quality Standards

**TypeScript**:
- Strict mode enabled
- No `any` types (use `unknown` if needed)
- Proper error handling
- JSDoc for public APIs

**Testing**:
- Unit tests for business logic
- Integration tests for APIs
- E2E tests for critical paths
- Minimum 70% coverage (85% for new code)

**Security**:
- Never commit secrets
- Use environment variables
- Validate all inputs
- Sanitize user data
- Follow OWASP guidelines

---

## 🎯 Recommended First Tasks

### For Understanding the Codebase

1. **Explore Backend Auth** (1-2 hours)
   - Read `apps/backend/src/auth/auth.service.ts`
   - Study JWT strategy
   - Review test files

2. **Understand Database Schema** (1 hour)
   - Read `apps/backend/prisma/schema.prisma`
   - Study relationships
   - Review migrations

3. **Banking Integration** (2 hours)
   - Read `docs/planning/PHASE3-SUMMARY-AND-ROADMAP.md`
   - Study `apps/backend/src/banking/`
   - Review SaltEdge provider

### For Contributing

1. **Fix Documentation** (Easy)
   - Update outdated docs
   - Add missing JSDoc comments
   - Improve README clarity

2. **Add Unit Tests** (Medium)
   - Increase coverage in low-coverage areas
   - Add edge case tests
   - Improve test descriptions

3. **Banking Phase 3.2** (High Priority)
   - Manual API testing
   - Follow `docs/planning/PHASE3.2-MANUAL-API-TESTING-PLAN.md`
   - Document results

---

## 🔮 Future Roadmap

### Short-Term (1-2 Months)
- Complete banking integration
- Frontend auth UI
- Mobile auth screens
- Dashboard MVP
- Transaction management UI

### Mid-Term (3-6 Months)
- Multiple banking providers (Tink, Yapily)
- Budget management
- Financial reports
- Category insights
- Mobile app launch

### Long-Term (6-12 Months)
- Gamification (achievements)
- Multi-family support
- Financial goals
- Investment tracking
- Tax reporting

---

## 📞 Support & Resources

### Documentation
- **Project README**: `/README.md`
- **Setup Guide**: `docs/development/setup.md`
- **API Docs**: http://localhost:3001/api (Swagger)
- **Progress Tracking**: `docs/development/progress.md`

### Development
- **Banking Guide**: `docs/development/PHASE-3-IMPLEMENTATION-GUIDE.md`
- **Testing Guide**: `docs/testing/PHASE3-SKIPPED-TESTS-INDEX.md`
- **Architecture**: `docs/architecture/` (ADRs)

### External Resources
- **Prisma Docs**: https://www.prisma.io/docs
- **NestJS Docs**: https://docs.nestjs.com
- **Next.js Docs**: https://nextjs.org/docs
- **SaltEdge API**: https://docs.saltedge.com

---

## ✅ Readiness Checklist

### Environment Setup
- [x] Node.js 18+ installed
- [x] pnpm 8+ installed
- [x] Docker running
- [x] PostgreSQL accessible (via Docker)
- [x] Redis accessible (via Docker)
- [x] Environment variables configured

### Development Tools
- [x] IDE configured (VS Code recommended)
- [x] Git configured
- [x] GitHub access
- [x] Prettier extension
- [x] ESLint extension

### Project Understanding
- [x] README reviewed
- [x] Architecture understood
- [x] Database schema studied
- [x] Testing approach clear
- [x] Git workflow understood

### Ready to Develop
- [x] Can start backend (`pnpm dev:backend`)
- [x] Can start frontend (`pnpm dev:web`)
- [x] Can run tests (`pnpm test`)
- [x] Can access Swagger UI
- [x] Can make changes confidently

---

## 🎉 Conclusion

**MoneyWise** is a well-architected, production-ready foundation for a personal finance platform. The project demonstrates:

✅ **Strong Engineering Practices**: Type-safe, tested, documented  
✅ **Modern Tech Stack**: Latest frameworks and best practices  
✅ **Clear Architecture**: Modular, scalable, maintainable  
✅ **Comprehensive Testing**: Unit, integration, E2E strategies  
✅ **Active Development**: Banking integration in progress  
✅ **Good Documentation**: Planning, guides, ADRs

### Current State: READY FOR CONTINUED DEVELOPMENT

**Immediate Focus**: Complete Banking Phase 3, then proceed to EPIC-2.1 (Frontend Auth UI)

**AI Assistant Readiness**: ✅ **FULLY PREPARED** to assist with:
- Banking integration completion
- Frontend development
- Testing strategies
- Bug fixes
- Code reviews
- Documentation improvements
- Architecture decisions

---

*Generated by AI Development Assistant*  
*Last Updated: October 30, 2025*
