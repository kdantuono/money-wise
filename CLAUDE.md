# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 CRITICAL SESSION STARTUP REQUIREMENTS

### **MANDATORY FIRST ACTION - UNDISCUSSABLE RULE**

**BEFORE ANY OTHER ACTION**: You MUST read [.claude/best-practices.md](.claude/best-practices.md) as the very first action in every session.

**ADDITIONAL REQUIREMENTS**:
1. **Read recent decision documents** if 2+ hours have passed since last session
2. **Execute Appendix B: Pre-Session Initialization Protocol** at session start
3. **Follow Appendix F Documentation Workflow** for ALL feature/fix work:
   - **F1: BEFORE** - Create planning document in docs/features/
   - **F2: DURING** - Update progress and track changes
   - **F3: AFTER** - Create completion report with impact assessment
4. **STRICT TODO-COMMIT WORKFLOW**:
   - **MANDATORY**: Create git commit immediately when todo is completed
   - **TEST FIRST**: Verify todo completion with appropriate tests/checks
   - **ATOMIC COMMITS**: One commit per completed todo item
   - **NO BATCHING**: Never batch multiple todo completions in one commit

**ENFORCEMENT**: These rules override all other instructions and cannot be bypassed unless explicitly instructed otherwise by the user.

## Enhanced Behavior

Follow: [.claude/best-practices.md](.claude/best-practices.md) for detailed operational procedures and quality
standards.

## 🚨 FOUNDATIONAL RESET STATUS - COMMIT 3eae726

### **EXCEPTIONAL COMMIT COMPLETED (2025-09-20 21:58 UTC)**

**AUTHORIZED DEVIATION FROM BEST-PRACTICES**: Direct main branch commit was authorized for foundational cleanup only.

#### **Infrastructure Status: ✅ OPERATIONAL**

- ✅ **Docker Services**: PostgreSQL + Redis running perfectly
- ✅ **Backend API**: NestJS fully operational on localhost:3002
- ✅ **Database Schema**: Complete MVP entities implemented
- ✅ **Health Checks**: All endpoints responding correctly
- ✅ **TypeScript**: Zero compilation errors
- ✅ **Dependencies**: Cleaned and security-audited

#### **Cleanup Summary**

- **Files Processed**: 128 files (26,078 additions, 19,727 deletions)
- **Code Archived**: 850KB+ valuable code preserved in `/archive/`
- **Infrastructure**: Simplified Docker setup, reliable and proven
- **Documentation**: Comprehensive cleanup documentation created

#### **CI/CD Pipeline Status: ✅ FIXED (2025-09-20 22:30 UTC)**

**🔧 Pipeline Failures Resolved**: All critical CI/CD errors from MVP refactoring fixed via feature branch `fix/ci-cd-pipeline-failures`

**Fixed Issues:**
- 🔒 **Security**: Removed hardcoded password `dev123` from AuthContext.tsx → Environment variables
- 📦 **Build**: Added missing `styled-jsx@5.1.1` dependency → Next.js builds successfully
- 🧪 **Tests**: Fixed `@money-wise/types` module resolution → Backend tests pass
- 💅 **Formatting**: Fixed Prettier formatting issues → Code quality standards met

**Commits Applied:**
- `13aaa82` - security(auth): replace hardcoded password with environment variables
- `890131b` - fix(build): add missing styled-jsx dependency
- `98626fa` - style(format): fix Prettier formatting issues

#### **Development Status**

- **Current Branch**: `main` (post-foundational reset)
- **Next Development**: Will follow standard branch workflow per best-practices
- **Infrastructure**: Ready for systematic feature development
- **Quality Gates**: Established and operational

**⚠️ IMPORTANT**: This was a one-time foundational exception. All future development MUST follow the standard feature
branch workflow defined in `.claude/best-practices.md`.

## Project Overview

MoneyWise MVP v0.1.0 is a personal finance management application built as a clean monorepo. After comprehensive
cleanup, the project focuses on core MVP functionality with a simplified but robust architecture.

## 🚨 CRITICAL Git Workflow - MANDATORY

### BEFORE ANY CODE CHANGES:

1. **Create feature branch**: `git checkout -b feature/[name]`
2. **NEVER work on main branch directly** ⚠️
3. **Commit frequently** - every logical unit, file, or component
4. **Run quality gates** before every commit

```bash
# Initialize session
.claude/scripts/init-session.sh

# Quality check before commit
.claude/scripts/quality-check.sh

# Complete session
.claude/scripts/session-complete.sh
```

### MANDATORY BRANCH DOCUMENTATION MAINTENANCE:

**CRITICAL**: Before ANY feature work, maintain project health documentation to ensure codebase accessibility and functional setup procedures.

#### **Documentation Health Requirements**
```bash
# 1. Update README.md to reflect current project state
# - Verify project description and features are accurate
# - Update technology stack and setup information
# - Ensure status indicators reflect reality

# 2. Maintain CHANGELOG.md with branch changes
# - Document all features, fixes, and improvements
# - Follow semantic versioning standards
# - Include dates and clear change categories

# 3. Validate SETUP.md procedures are functional
# - Test installation steps on clean environment
# - Update dependency versions and requirements
# - Add new setup steps for infrastructure changes

# 4. Commit documentation updates before pushing
git add README.md CHANGELOG.md SETUP.md
git commit -m "docs(maintenance): update project health documentation"
```

**📋 DOCUMENTATION REFERENCE**: See [best-practices.md Section K](.claude/best-practices.md#section-k-branch-documentation-maintenance-standards) for complete requirements and quality standards.

### AFTER FEATURE COMPLETION - MANDATORY POST-FEATURE WORKFLOW:

**CRITICAL**: The following workflow steps are MANDATORY for ALL features, fixes, and improvements. This workflow MUST be completed before moving to the next task.

### 🚨 EPIC COMPLETION AND PRIORITIZATION RULE:

**MANDATORY EPIC MANAGEMENT**: When all user stories of an epic are marked "Done", the following steps are REQUIRED:

1. **Move Epic to "Done"**: Update epic status on GitHub Projects board to "Done"
2. **Prioritize Next Epic**: Identify the next epic with highest priority
3. **Take Charge**: Begin work on the highest priority epic's user stories and tasks
4. **Update Board**: Move next epic to "In Progress" and start first user story

**ENFORCEMENT**: This rule ensures continuous progress through planned epics without gaps or priority confusion. Epic completion triggers immediate transition to next priority work.

**🚨 AGILE BOARD INTEGRATION**: User stories/tasks can ONLY be marked "Done" on GitHub Projects board AFTER completing this ENTIRE workflow. Working on main branch or marking stories as "Done" without completing this workflow is a **CRITICAL METHODOLOGY VIOLATION**.

#### **Phase 1: Push and Verify**
```bash
# 1. Push feature branch to remote
git push -u origin feature/[name]

# 2. Monitor CI/CD pipeline status
gh run list --branch=feature/[name] --limit=1
gh run watch # Monitor until completion
```

#### **Phase 2: Merge (Only if CI/CD Green)**
```bash
# 3. Merge to main ONLY if CI/CD passes
git checkout main
git pull origin main
git merge feature/[name] --no-ff

# 4. Push merged changes to main
git push origin main
```

#### **Phase 3: Verify Main and Cleanup**
```bash
# 5. Verify CI/CD passes on main branch
gh run list --branch=main --limit=1
gh run watch # Monitor until completion

# 6. Delete branches ONLY after main CI/CD passes
git branch -d feature/[name]          # Delete local branch
git push origin --delete feature/[name] # Delete remote branch

# 7. Confirm clean state on main
git status # Should show "working tree clean"
```

#### **Phase 4: Finalize Agile Board (ONLY after Phases 1-3 complete)**
```bash
# 8. Update GitHub Projects board to "Done" status
gh project item-edit --project-id [PROJECT_ID] --id [ITEM_ID] --field-id [STATUS_FIELD] --single-select-option-id [DONE_ID]

# 9. Check if epic is complete (all stories done)
# If epic complete: Move epic to "Done" and prioritize next epic
# If epic incomplete: Continue with remaining stories

# 10. Verify board reflects completed work
gh project item-list [PROJECT_NUMBER] --owner [OWNER] --format json
```

**✅ DEFINITION OF DONE**: User story/task is ONLY considered "Done" when ALL phases (1-4) are completed successfully.

#### **Failure Handling**
- **If feature branch CI/CD fails**: Fix issues on feature branch, do NOT merge
- **If main branch CI/CD fails**: Immediately revert merge, investigate on feature branch
- **If unsure**: Stop workflow, investigate, seek guidance

**📋 WORKFLOW REFERENCE**: See [best-practices.md Section I](.claude/best-practices.md#section-i-post-feature-workflow-protocol) for complete details and troubleshooting procedures.

**🔒 ENFORCEMENT**: This workflow is mandatory and cannot be bypassed. Breaking this workflow pattern will be flagged as a critical procedure violation.

## Development Setup

### Always use Docker Compose for development

**CRITICAL**: Docker infrastructure successfully established during cleanup. Proven reliable setup:

```bash
# Infrastructure is RUNNING (PostgreSQL + Redis)
docker-compose -f docker-compose.dev.yml ps  # Verify services

# Start development applications
npm run dev:backend   # API already operational on :3002
npm run dev:web      # Web dashboard on :3000
```

**Services are OPERATIONAL:**

- 🌐 **Web Dashboard**: http://localhost:3000 (ready for development)
- 🔧 **API Server**: http://localhost:3002 ✅ **RUNNING**
- 📚 **API Documentation**: http://localhost:3002/api ✅ **ACCESSIBLE**
- 🐘 **PostgreSQL**: localhost:5432 ✅ **CONNECTED**
- 🔴 **Redis**: localhost:6379 ✅ **READY**

### Essential Commands

```bash
# Development workflow
npm run dev                    # Start all services
npm run dev:backend           # NestJS API on port 3002
npm run dev:web              # Next.js web app on port 3000

# Building
npm run build                # Build all applications
npm run build:backend        # Build backend only
npm run build:web           # Build web app only

# Testing with quality gates
npm run test                 # Run all tests
npm run lint                # Lint all code
npm run format              # Format code with Prettier

# Shared types (must build first)
cd packages/types && npm run build
```

## Architecture

### Simplified Monorepo Structure (Post-Cleanup)

```
money-wise/
├── apps/
│   ├── backend/          # NestJS API server (cleaned)
│   └── web/             # Next.js web dashboard
├── packages/
│   └── types/           # Shared TypeScript definitions
├── archive/             # Archived valuable code (850KB+)
│   ├── advanced-features/   # ML, MFA, real-time features
│   ├── agent-orchestration/ # Development automation
│   └── infrastructure/     # Complex CI/CD, Docker configs
└── docs/               # Strategic planning and decisions
```

### Technology Stack (MVP Focus)

**Backend (NestJS)**

- **Framework**: NestJS 10 with TypeScript
- **Database**: PostgreSQL 15 with ORM (see Database Strategy)
- **Authentication**: JWT with bcrypt (simplified - MFA archived)
- **Caching**: Redis for session management
- **Validation**: class-validator and class-transformer
- **Documentation**: Swagger/OpenAPI integration

**Frontend (Next.js)**

- **Framework**: Next.js 14 with App Router
- **UI Components**: Radix UI with Tailwind CSS
- **State Management**: React Context (simplified)
- **API Client**: Axios with proxy configuration
- **Icons**: Lucide React

**Shared**

- **Types**: Centralized TypeScript definitions
- **Validation**: Zod schemas for client-side validation
- **Tooling**: ESLint, Prettier, Jest

## Database Strategy & ORM Decision

### Current State: TypeORM (Preserved)

The existing codebase uses TypeORM. For MVP v0.1.0, **continue with TypeORM** for stability.

### Future Considerations (Post-MVP)

```typescript
// Alternative evaluation for scaling decisions:

// 1. Drizzle ORM (🔥 Trending - Lightweight)
import { drizzle } from 'drizzle-orm/node-postgres';
const transactions = await db
  .select()
  .from(transactions)
  .where(eq(transactions.userId, userId))
  .leftJoin(categories, eq(transactions.categoryId, categories.id))
  .limit(100);
// Pros: 50KB vs 300KB bundle, SQL-like syntax
// Use when: Performance critical, bundle size matters

// 2. Kysely (Type-safe SQL)
const result = await db
  .selectFrom('transactions')
  .select(['amount', 'category'])
  .where('userId', '=', userId)
  .groupBy('category')
  .execute();
// Pros: Pure SQL with type safety
// Use when: Complex financial queries, SQL expertise

// 3. Raw PostgreSQL (Ultra Performance)
await pool.query('CALL calculate_compound_interest($1, $2)', [principal, rate]);
// Pros: Maximum performance, stored procedures
// Use when: Millions of transactions, real-time analytics
```

### ORM Decision Matrix

**Continue TypeORM when:**

- ✅ MVP development priority
- ✅ Developer experience over performance
- ✅ < 100k transactions per user
- ✅ Team familiarity with current patterns

**Consider migration when:**

- ❌ Performance becomes critical (>1M transactions)
- ❌ Bundle size critical (<100KB target)
- ❌ Complex analytics queries needed
- ❌ Real-time financial calculations required

## Backend Architecture (Cleaned)

### Core Modules (Preserved)

- **auth/**: JWT authentication (simplified - advanced features archived)
- **transactions/**: Transaction CRUD and categorization
- **budgets/**: Budget creation and tracking
- **analytics/**: Basic financial reporting
- **banking/**: Account management
- **security/**: Basic security middleware

### Archived Features (Future Integration)

- **ML categorization**: AI-powered transaction categorization
- **Advanced auth**: MFA, social login, OAuth
- **Real-time features**: WebSocket notifications
- **Agent orchestration**: Multi-agent development automation

## Frontend Architecture (Simplified)

### Component System

- `components/ui/`: Reusable Radix UI + Tailwind components
- `components/dashboard/`: Feature-specific dashboard components
- `components/auth/`: Authentication-related components
- `app/`: Next.js 14 app directory structure

### State Management (Simplified)

- Context providers (`AuthContext`, `AppContext`)
- React Hook Form for forms
- No complex state management (Redux archived for future)

## Development Workflow & Quality Standards

### Pre-Session Initialization

```bash
# MANDATORY: Run before every development session
.claude/scripts/init-session.sh
```

### Quality Gates (Enforced by Git Hooks)

```bash
# Automatic pre-commit validation
- TypeScript strict mode check
- ESLint validation
- Prettier formatting
- Unit test execution
- Build verification

# Manual quality check
.claude/scripts/quality-check.sh
```

### Commit Standards

```bash
# Semantic versioning with co-authoring
git commit -m "feat(transactions): implement manual entry form

- Added transaction form with validation
- Integrated with TypeORM transaction entity
- Added optimistic UI updates

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Session Completion

```bash
# MANDATORY: Run before ending session
.claude/scripts/session-complete.sh
```

## Testing Strategy (Simplified)

### Test Pyramid (MVP Focus)

- **Unit Tests**: Jest (70%) - Core business logic
- **Integration Tests**: API endpoints (20%)
- **E2E Tests**: Playwright (10%) - Critical user flows

### Testing Commands

```bash
npm run test              # All tests
npm run test:coverage    # Coverage report (80% minimum)
npm run test:unit        # Unit tests only
npm run test:e2e         # End-to-end tests
```

## API Documentation

### Interactive Documentation

- **Development**: http://localhost:3002/api
- **Swagger UI**: Complete endpoint documentation
- **Authentication**: JWT Bearer token required

### Core Endpoints (MVP)

```
POST /auth/register     # User registration
POST /auth/login        # User authentication
GET  /auth/profile      # User profile
GET  /transactions      # List user transactions
POST /transactions      # Create new transaction
GET  /budgets          # List user budgets
POST /budgets          # Create new budget
```

## Security & Compliance (Simplified)

### Authentication Flow (Cleaned)

1. User registers with email/password
2. Password hashed with bcrypt
3. JWT token issued (7-day expiration)
4. Token required for protected endpoints
5. Basic rate limiting and validation

### Security Features (MVP)

- JWT-based authentication
- Input validation and sanitization
- Rate limiting on auth endpoints
- Helmet middleware for security headers
- CORS configuration

## Archive Management

### Valuable Code Preserved

The cleanup process preserved 850KB+ of production-ready code in `/archive/`:

#### `advanced-features/`

- **ML modules**: Complete AI categorization system
- **Auth advanced**: MFA, OAuth, enhanced security
- **Backend modules**: Real-time notifications, WebSocket infrastructure

#### `agent-orchestration/`

- **17 automation scripts**: TDD automation, quality gates
- **Agent clusters**: AI Intelligence, Event Streaming, Notification Engine
- **State management**: Session coordination, tmux integration

#### `infrastructure/`

- **Docker configs**: Production, CI, and development setups
- **CI/CD workflows**: 12 GitHub workflows, GitLab CI/CD
- **Advanced monitoring**: Performance testing, security scanning

### Restoration Process

Each archived component includes:

- Context for archival decision
- Integration requirements
- Dependencies needed
- Quality status and testing state

## Performance & Monitoring

### Performance Targets (MVP)

- Initial load: < 1.5s
- Transaction list: < 200ms
- Dashboard analytics: < 500ms
- API response time: < 100ms average

### Monitoring Strategy (Basic)

- Error tracking and logging
- Performance metrics collection
- Basic analytics event tracking
- Health check endpoints

## Documentation Standards

### **MANDATORY DOCUMENTATION CONSISTENCY REQUIREMENTS**

**CRITICAL**: All documentation MUST follow the consistency standards to ensure newcomer accessibility and evolutionary tracking.

#### **Required Documentation Elements** (Per [best-practices.md Section J](.claude/best-practices.md#section-j-documentation-consistency-standards))

- **Purpose**: Clear statement of what the application/feature/fix accomplishes
- **Goals**: Specific final objectives and measurable success criteria
- **Requirements**: Both functional and technical requirements
- **Architecture**: System design and component relationships
- **Evolution**: Stage-by-stage development progression with rationale
- **Todo Tracking**: Task lists with real-time status updates
- **Decision Records**: Rationale and context for major technical choices

#### **Documentation Types** (Mandatory Coverage)

- **Application-Level**: Overall system purpose, goals, and architecture
- **Feature-Level**: Specific functionality, integration points, and user impact
- **Fix-Level**: Problem analysis, solution approach, and impact assessment

### Required Documentation

- **Feature Planning**: Before implementation
- **Implementation Updates**: After completion
- **API Changes**: Swagger documentation
- **Architecture Decisions**: Recorded in docs/
- **Session Summaries**: Auto-generated after each session

### Documentation Structure

```
docs/
├── plans/              # Strategic planning documents
├── features/           # Feature development docs
├── sessions/           # Development session summaries
└── decisions/          # Architecture decision records
```

**🔒 ENFORCEMENT**: Documentation consistency is mandatory for maintainability and team onboarding. Incomplete or inconsistent documentation will be flagged as a critical standards violation.

## Important Notes & Reminders

### Development Philosophy

- **MVP First**: Focus on core functionality over features
- **Quality Gates**: Every commit must pass quality checks
- **Documentation**: Update docs with every architectural change
- **Git Discipline**: Feature branches, atomic commits, co-authoring
- **Archive Awareness**: Valuable code preserved for future integration

### Mandatory Workflows

1. **Session Start**: `.claude/scripts/init-session.sh`
2. **Pre-Commit**: Automatic quality gates via git hooks
3. **Session End**: `.claude/scripts/session-complete.sh`
4. **Weekly**: Review archive for potential integrations

### Future Development Tracks

When ready for post-MVP features:

1. **Advanced Auth**: Restore MFA, OAuth from archive
2. **ML Features**: Integrate AI categorization system
3. **Real-time**: Implement WebSocket notifications
4. **Performance**: Consider ORM migration (Drizzle/Kysely)
5. **Orchestration**: Restore agent automation for complex features

## Leadership & Quality Assurance

**Claude Code acts as Technical Lead** with responsibility for:

- **Proactive Quality**: Enforce standards before issues arise
- **Architecture Guidance**: Long-term technical direction
- **Risk Management**: Identify and mitigate technical debt
- **Documentation**: Maintain comprehensive development records
- **Performance**: Monitor and optimize system performance

### Success Criteria

- ✅ 80%+ test coverage maintained
- ✅ Zero TypeScript errors tolerance
- ✅ Sub-200ms API response times
- ✅ Complete git commit history
- ✅ Updated documentation with every change

---

**MoneyWise MVP v0.1.0** - Clean, reliable, and ready for systematic development with enterprise-grade foundations.
