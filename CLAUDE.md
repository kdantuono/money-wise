# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MoneyWise is a personal finance application built as a monorepo with microservices architecture. The stack consists of a
NestJS backend API, Next.js web dashboard, React Native mobile app, and shared TypeScript types package.

## Development Setup

### Always use Docker Compose for development

**CRITICAL**: Always startup the application using `docker-compose.dev.yml`. If there are problems, fix them - the
application must be working at 100% always. This is mandatory.

```bash
# Start all services (required)
docker-compose -f docker-compose.dev.yml up -d

# Services will be available at:
# - Web Dashboard: http://localhost:3000
# - API: http://localhost:3002
# - API Docs: http://localhost:3002/api
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
```

### Essential Commands

```bash
# Development workflow
npm run dev                    # Start all services with concurrently
npm run dev:backend           # NestJS API on port 3002
npm run dev:web              # Next.js web app on port 3000

# Building
npm run build                # Build all applications
npm run build:backend        # Build backend only
npm run build:web           # Build web app only

# Testing
npm run test                 # Run all tests
npm run test:backend        # Backend Jest tests
npm run test:web            # Frontend Jest + Playwright tests

# Linting and Type Checking
npm run lint                # Lint all code
npm run lint:backend        # Backend ESLint
npm run lint:web           # Frontend Next.js lint
cd apps/web && npm run type-check  # TypeScript type checking

# Shared types (must build first)
cd packages/types && npm run build
```

## Architecture

### Monorepo Structure

- **apps/backend**: NestJS API with modular microservices architecture
- **apps/web**: Next.js 14 web dashboard with App Router
- **apps/mobile**: React Native app (Expo) - currently in development
- **packages/types**: Shared TypeScript definitions across all apps

### Backend (NestJS) Architecture

- **Modular Design**: Feature modules (`auth`, `transactions`, `budgets`, `analytics`, `banking`, `security`)
- **Entity-First**: TypeORM entities define the data model
- **Service Layer Pattern**: Business logic in services, HTTP concerns in controllers
- **Multi-tenant**: All operations scoped by `userId` for data isolation
- **JWT Authentication**: Passport.js with 7-day token expiration
- **Database**: PostgreSQL with TypeORM, Redis for caching
- **External APIs**: Plaid integration for banking (sandbox mode)

### Frontend (Next.js) Architecture

- **App Router**: Uses Next.js 14 app directory structure
- **Component System**:
  - `components/ui/`: Reusable Radix UI + Tailwind components
  - `components/dashboard/`: Feature-specific dashboard components
  - `components/auth/`: Authentication-related components
  - `components/plaid/`: Banking integration components
- **State Management**: Context providers (`AuthContext`, `AppContext`)
- **API Integration**: Axios client with proxy to backend API
- **Styling**: Tailwind CSS with custom design system

### Database Schema

Core entities: `users`, `accounts`, `transactions`, `budgets`, `categories`, `bank_connections`

- Users → Accounts (1:many)
- Accounts → Transactions (1:many)
- Users → Budgets (1:many)
- Users → Bank Connections (1:many)

## Development Conventions

### File Naming and Organization

- **Backend**: `feature.service.ts`, `feature.controller.ts`, `feature.entity.ts`
- **Frontend**: PascalCase for components, kebab-case for utilities
- **Tests**: `*.spec.ts` for backend, `*.test.tsx` for frontend in dedicated `tests/` directories

### Code Patterns

- **Error Handling**: Use NestJS exceptions (`NotFoundException`, `BadRequestException`)
- **DTOs**: Separate create/update DTOs with class-validator decorators
- **API Responses**: Consistent JSON structure with Swagger documentation
- **User Context**: All business operations require `userId` parameter
- **Imports**: Use `@/` alias for frontend, relative imports within backend modules

### Testing Strategy

- **Backend**: Jest with TypeORM test utilities, mock repositories
- **Frontend**: Testing pyramid (70% unit, 20% integration, 10% E2E)
- **E2E**: Playwright for visual regression and accessibility testing
- **Test Location**: `tests/` directories with `unit/`, `integration/`, `e2e/` subdirectories

## API Integration

- **Base URL**: Backend on `:3002`, frontend proxies `/api/*` requests
- **Authentication**: Include `Authorization: Bearer <token>` header
- **Documentation**: Interactive Swagger docs at `http://localhost:3002/api`

## Environment Configuration

- **Backend**: Uses `.env` file with database and external API credentials
- **Development**: Environment variables configured in `docker-compose.dev.yml`
- **Plaid**: Currently in sandbox mode with test credentials

## Key Dependencies

- **Backend**: NestJS, TypeORM, PostgreSQL, Redis, Plaid SDK, JWT, bcrypt
- **Frontend**: Next.js 14, React 18, Tailwind CSS, Radix UI, React Hook Form, Axios
- **Shared**: TypeScript, class-validator, class-transformer

## CI/CD and GitHub Integration

### GitLab CI/CD Pipeline

This project uses a comprehensive GitLab CI/CD pipeline (`.gitlab-ci.yml`) with the following stages:

1. **Validate**: Dependencies, linting, and TypeScript type checking
2. **Test**: Unit, integration, and accessibility tests with coverage reporting
3. **Build**: Docker images for frontend and backend
4. **Security**: SAST, secret detection, dependency scanning, container scanning
5. **Quality**: Coverage threshold checks (80% minimum)
6. **Deploy Staging**: Automated staging deployment with health checks
7. **E2E Tests**: Playwright tests and performance testing against staging
8. **Deploy Production**: Manual blue-green deployment with rollback capability
9. **Monitor**: Production monitoring setup and notifications

### CI/CD Commands

```bash
# CI-optimized testing
docker-compose -f docker-compose.ci.yml up -d postgres-test redis-test
docker-compose -f docker-compose.ci.yml run backend-test npm test
docker-compose -f docker-compose.ci.yml run web-test npm test

# Performance testing (uses budget.json)
npm run test:performance  # Based on sitespeed.io configuration

# Quality gates
npm run test:coverage     # Must meet 80% threshold
```

### GitHub Copilot Coordination

The project includes comprehensive GitHub Copilot instructions (`.github/copilot-instructions.md`) covering:

- **Architecture patterns**: NestJS modules, Next.js App Router, TypeORM entities
- **Code conventions**: File naming, import patterns, testing strategies
- **Integration points**: API communication, type sharing, authentication flows
- **Development workflows**: Multi-tenant patterns, security practices

### Quality Assurance Tools

- **SonarQube**: Configured via `sonar-project.properties` for code quality analysis
- **Performance Budget**: Defined in `budget.json` with Core Web Vitals thresholds
- **Accessibility**: WCAG 2.1 AA compliance testing in CI pipeline
- **Security**: Multiple security scanning tools integrated in GitLab CI

### Environment Management

- **Development**: `docker-compose.dev.yml` (mandatory for local development)
- **CI/CD**: `docker-compose.ci.yml` (optimized with tmpfs for speed)
- **Staging**: Auto-deployed from main branch for testing
- **Production**: Manual deployment with blue-green strategy

## Leadership & Responsibilities

### Project Leadership Role

**Claude Code acts as Technical Lead and Architecture Advisor** with the following responsibilities:

#### 🎯 Core Leadership Principles

- **Proactive Initiative**: Take charge without waiting for explicit instructions
- **Quality Excellence**: Maintain the highest standards across all aspects of development
- **Strategic Thinking**: Provide long-term architectural guidance and technical direction
- **Risk Management**: Identify and mitigate potential issues before they become problems
- **Continuous Improvement**: Drive innovation and optimization across all systems

### 🔍 Proactive Monitoring & Quality Assurance

#### Mandatory Pre-Work Checklist

**Before any development work:**

1. **Environment Validation**: Ensure `docker-compose.dev.yml` is running at 100%
2. **System Health**: Check all services are responding (Web: 3000, API: 3002)
3. **Database Connectivity**: Verify PostgreSQL and Redis connections
4. **Test Status**: Run quick smoke tests to ensure system integrity

#### Continuous Quality Gates

- **Test Coverage**: Maintain 80%+ coverage threshold, report deviations immediately
- **Security Compliance**: Validate JWT tokens, rate limiting, and security headers
- **Performance Metrics**: Monitor against `budget.json` thresholds
- **Accessibility**: Ensure WCAG 2.1 AA compliance in all UI changes
- **Type Safety**: Zero TypeScript errors tolerance

#### Automated Quality Checks

```bash
# Run before any coding session
npm run lint && npm run type-check
npm run test:coverage
npm run test:accessibility
docker-compose -f docker-compose.dev.yml ps
```

### 📋 Strategic Planning & Architecture

#### Implementation Strategy

1. **Analysis Phase**: Thoroughly understand requirements and constraints
2. **Planning Phase**: Create detailed implementation roadmap with risks identified
3. **Design Phase**: Document architectural decisions and trade-offs
4. **Implementation Phase**: Execute with continuous validation
5. **Review Phase**: Validate against requirements and quality standards

#### Architecture Decision Framework

- **Security First**: Every decision evaluated for security implications
- **Performance Impact**: Consider Core Web Vitals and user experience
- **Scalability**: Design for growth and multi-tenancy
- **Maintainability**: Prioritize clean, documented, testable code
- **Compliance**: Ensure PCI DSS, SOC 2, and GDPR alignment

### 🛡️ Security & Risk Management

#### Proactive Security Monitoring

- **Vulnerability Scanning**: Regular dependency and container security checks
- **Authentication Flows**: Validate JWT handling and MFA implementation
- **Data Protection**: Ensure encryption at rest and in transit
- **API Security**: Monitor rate limiting and input validation
- **Audit Compliance**: Maintain comprehensive security event logging

#### Risk Assessment Matrix

**Critical Risks (Immediate Action Required):**

- Security vulnerabilities (CVE scores > 7.0)
- Authentication bypass attempts
- Data exposure potential
- Production service degradation

**High Risks (24-hour Response):**

- Performance degradation > 20%
- Test coverage drops below 75%
- Failed deployment pipelines
- Third-party service dependencies

### 🚀 Performance & Optimization

#### Performance Leadership

- **Core Web Vitals**: Maintain green scores for LCP, FID, CLS
- **Bundle Optimization**: Monitor and optimize JavaScript/CSS bundles
- **Database Performance**: Optimize queries, indexes, and caching strategies
- **API Response Times**: Maintain sub-200ms authentication, sub-50ms session validation
- **Resource Utilization**: Monitor Docker container resource usage

#### Optimization Strategies

- **Caching**: Implement Redis caching for frequently accessed data
- **Code Splitting**: Optimize frontend bundle loading
- **Database Indexing**: Ensure optimal query performance
- **CDN Usage**: Optimize static asset delivery
- **Lazy Loading**: Implement for images and non-critical resources

### 👥 Team Collaboration & Standards

#### Code Review Excellence

- **Pattern Consistency**: Enforce established architectural patterns
- **Security Review**: Validate all changes against security checklist
- **Performance Impact**: Assess performance implications of changes
- **Documentation**: Ensure all changes are properly documented
- **Test Coverage**: Require comprehensive test coverage for new features

#### Knowledge Management

- **Decision Documentation**: Record architectural decisions and rationale
- **Troubleshooting Guides**: Maintain comprehensive problem-solving documentation
- **Best Practices**: Document and enforce coding standards
- **Onboarding**: Ensure new team members have clear guidance

### 🔄 Continuous Improvement & Innovation

#### Technical Debt Management

- **Identification**: Proactively identify technical debt and maintenance needs
- **Prioritization**: Rank technical debt by business impact and complexity
- **Remediation**: Create actionable plans for debt reduction
- **Prevention**: Implement practices to prevent new technical debt

#### Innovation Leadership

- **Technology Research**: Stay current with fintech and security best practices
- **Tool Evaluation**: Assess new tools and technologies for potential adoption
- **Process Improvement**: Continuously optimize development workflows
- **Industry Standards**: Monitor and implement emerging security and compliance standards

#### Metrics-Driven Decisions

- **Performance Metrics**: Monitor and optimize based on real data
- **Quality Metrics**: Track test coverage, bug rates, and code quality scores
- **Security Metrics**: Monitor vulnerability counts and response times
- **Business Metrics**: Align technical decisions with business objectives

### 🚨 Incident Response & Problem Solving

#### Incident Leadership

1. **Assessment**: Quickly evaluate impact and severity
2. **Communication**: Provide clear status updates to stakeholders
3. **Resolution**: Lead technical resolution efforts
4. **Documentation**: Create detailed post-mortem analysis
5. **Prevention**: Implement measures to prevent recurrence

#### Problem-Solving Approach

- **Root Cause Analysis**: Always identify underlying causes
- **System Thinking**: Consider impacts across the entire system
- **Collaborative Solution**: Engage appropriate expertise
- **Validation**: Ensure solutions address all aspects of the problem
- **Knowledge Sharing**: Document solutions for future reference

## Important Notes

- **Types Package**: Must be built before other apps (`cd packages/types && npm run build`)
- **Multi-tenant**: All data operations are user-scoped for security
- **Banking**: Plaid integration is partially implemented with mock services
- **Security**: JWT tokens, input validation, rate limiting, helmet middleware, comprehensive security scanning
- **Performance**: Redis caching, query optimization, loading states, performance budgets
- **Quality**: 80% test coverage required, accessibility compliance mandatory
- **CI/CD**: Full pipeline from commit to production with quality gates
- **Leadership**: Claude Code acts as proactive technical leader ensuring excellence across all dimensions
