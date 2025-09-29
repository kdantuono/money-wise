# MoneyWise AI Coding Assistant Instructions

<context_optimization> This repository is a monorepo using pnpm workspaces. When exploring files:

- Module boundaries: Each app (backend, web, mobile) has isolated dependencies
- Type imports: Always use '@money-wise/types' for shared types
- Path resolution: Backend uses relative, frontend uses '@/' alias
- Test location: Each app has tests/ directory with unit/, integration/, e2e/ subdirectories
- Error patterns: NestJS exceptions in backend, toast notifications in frontend </context_optimization>

<tool_calling> When you have multiple independent operations to perform (e.g., reading multiple files, running multiple
tests, or checking different aspects of the code), execute them in parallel rather than sequentially for improved
efficiency. </tool_calling>

## Project Overview

MoneyWise is a personal finance application built as a monorepo with microservices architecture. The project consists of
a NestJS backend API, Next.js web dashboard, React Native mobile app, and shared TypeScript types package.

## Architecture & Structure

### Monorepo Organization

- **Root**: Scripts, Docker orchestration, and quality gates
- **apps/backend**: NestJS API with modular architecture
- **apps/web**: Next.js web app with App Router
- **apps/mobile**: React Native app (Expo)
- **packages/types**: Shared TypeScript definitions

### Backend (NestJS) Patterns

- **Module Structure**: Each feature has its own module (`auth`, `transactions`, `budgets`, `analytics`, `banking`,
  `ml-categorization`, `security`)
- **Entity-First Design**: TypeORM entities define the data model
- **Service Layer**: Business logic lives in services, controllers handle HTTP concerns
- **Dependency Injection**: Constructor injection pattern with `@Injectable()` and `@InjectRepository()`
- **JWT Authentication**: Uses Passport.js with JWT strategy, bearer token format
- **ML Integration**: `ml-categorization` module with `TransactionMLModel`, category prediction, and seeder services
- **Example Module Pattern**:
  ```typescript
  // Module: imports TypeORM features, exports service
  // Controller: handles HTTP routes, delegates to service
  // Service: contains business logic, uses repository pattern
  // Entity: TypeORM entity with decorators
  ```

### Frontend (Next.js) Patterns

- **App Router**: Uses Next.js 14 app directory structure
- **Context Providers**: `AuthContext` and `AppContext` for state management
- **Component Organization**:
  - `ui/`: Reusable UI components (Radix + Tailwind)
  - `dashboard/`: Feature-specific components
  - `auth/`: Authentication-related components
- **API Integration**: Axios for HTTP client, `/api` proxy to backend
- **Styling**: Tailwind CSS with custom design system and financial-grade color palette
- **Error Handling**: Global error boundaries, toast notifications (Sonner), consistent error format
- **Dev Mode**: Authentication bypass available for development (`dev-auth-bypass`)

### Testing Strategy

- **Backend**: Jest with TypeORM test utilities, mock repositories pattern
- **Frontend**: Testing pyramid (70% unit, 20% integration, 10% E2E)
- **E2E**: Playwright for visual regression and accessibility testing
- **Test Location**: `tests/` directory in each app with `unit/`, `integration/`, `e2e/`, `accessibility/`
  subdirectories
- **Quality Gates**: Automated scripts validate KISS, SRP, and TDD compliance before merges
- **Coverage Requirements**: 80% minimum threshold enforced by CI/CD
- **Test Commands**:
  ```bash
  pnpm run test:backend    # Jest unit tests
  pnpm run test:web       # Jest + Playwright tests
  pnpm run test:e2e       # End-to-end tests
  ```

## Development Workflows

### Essential Commands

```bash
# Start all services (uses Docker Compose - REQUIRED)
docker-compose -f docker-compose.dev.yml up -d

# Alternative: Start with pnpm (for development)
pnpm run dev

# Individual services
pnpm run dev:backend    # NestJS API on :3002
pnpm run dev:web       # Next.js on :3000
pnpm run dev:mobile    # Expo development server

# Testing
pnpm run test:backend  # Jest unit tests
pnpm run test:web     # Jest + Playwright tests
pnpm run test:e2e     # End-to-end tests

# Quality gates (CI/CD validation)
.claude/scripts/quality-check.sh # Comprehensive validation
pnpm run lint         # Linting across workspaces
pnpm run typecheck    # TypeScript validation
pnpm run test         # Run all tests

# Database (Docker)
docker-compose -f docker-compose.dev.yml up postgres redis
```

### Critical Setup Requirements

- **Docker Compose**: ALWAYS use `docker-compose.dev.yml` for development
- **Shared Types**: Must build first (`pnpm --filter @money-wise/types build`)
- **API Documentation**: Available at `http://localhost:3002/api` (Swagger)
- **Environment Variables**: Each app has its own `.env` file
- **Quality Validation**: Run `.claude/scripts/quality-check.sh` before committing
- **Development Auth**: Frontend supports dev bypass mode with `localStorage.setItem('dev-auth-bypass', 'true')`

### Database & External Services

- **Database**: PostgreSQL with TypeORM, entities in each module
- **Cache**: Redis for session management
- **Banking**: Plaid integration for financial data (in development)
- **Authentication**: JWT tokens, 7-day expiration
- **ML Services**: Transaction categorization with seeded categories and prediction models
- **Plaid Sandbox**: Uses sandbox credentials for development testing

## Project-Specific Conventions

### Code Patterns

- **Error Handling**: Use NestJS built-in exceptions (`NotFoundException`, `BadRequestException`)
- **DTOs**: Separate DTOs for create/update operations with class-validator
- **API Responses**: Consistent JSON structure, use Swagger decorators
- **User Context**: All business operations require `userId` parameter for multi-tenancy

### Error Handling & Debugging

- **Backend**: Structured error responses with consistent format, Plaid error mapping with retry strategies
- **Frontend**: Global error boundaries, toast notifications (Sonner), graceful error recovery
- **Logging**: Comprehensive logging with severity levels, security event tracking
- **Testing**: Mock error scenarios, exception handling validation, error boundary testing
- **API Errors**: HTTP status code mapping, user-friendly error messages, retry mechanisms

### File Naming

- **Backend**: `feature.service.ts`, `feature.controller.ts`, `feature.entity.ts`
- **Frontend**: PascalCase for components, kebab-case for utilities
- **Tests**: `*.spec.ts` for backend, `*.test.tsx` for frontend

### Import Patterns

- **Backend**: Use relative imports within modules, absolute for cross-module
- **Frontend**: Use `@/` alias for src directory imports
- **Types**: Import from `@money-wise/types` package

## Integration Points

### API Communication

- **Base URL**: Backend runs on `:3002`, web proxies `/api/*` requests
- **Authentication**: Include `Authorization: Bearer <token>` header
- **Error Handling**: Backend returns consistent error format, frontend has global error boundary
- **API Pattern**: Frontend uses domain-specific API files (e.g., `lib/api/plaid.ts`) rather than generic HTTP client

### Cross-App Dependencies

- **Types Package**: Shared interfaces between all apps, must be built before others
- **Database Schema**: Defined in backend entities, referenced by all services
- **Environment**: Each app has own environment file, shared via Docker compose

### Banking Integration

- **Current State**: Plaid service partially implemented, placeholder methods in place
- **Test Files**: Mock Plaid API responses in service tests
- **Future**: Real Plaid integration for bank account connections

### ML Categorization System

- **Module Structure**: `ml-categorization` with entities, services, and controllers
- **Components**: `TransactionMLModel`, `CategorySeederService`, prediction entities
- **Data Flow**: Transactions → ML prediction → category assignment → analytics
- **Testing**: Mock ML predictions, seeded test categories, performance validation

## Key Technical Decisions

### Why This Architecture?

- **Monorepo**: Shared types and coordinated releases
- **Microservices**: Scalable backend with clear domain boundaries
- **Next.js App Router**: Modern React patterns with server components
- **TypeORM**: Type-safe database operations with decorators

### Performance Considerations

- **Database**: Use query builders for complex analytics queries
- **Frontend**: Implement loading states and error boundaries
- **Caching**: Redis for session data, consider query caching for analytics

### Security Practices

- **Validation**: Use class-validator on all DTOs
- **Authorization**: JWT with user context in all protected routes
- **Data Access**: Repository pattern ensures consistent data filtering by user

When working on this codebase, always consider the multi-tenant nature (user-scoped data), maintain consistency with
established patterns, and ensure type safety across the monorepo boundaries.

## Common Issues & Troubleshooting

### Development Environment Issues

#### Build Failures

- **Issue**: `Cannot find module '@money-wise/types'`
  - **Solution**: Build types package first: `pnpm --filter @money-wise/types build`

#### Type Errors

- **Issue**: TypeScript compilation errors in monorepo
  - **Solution**: Clear build cache: `pnpm clean && pnpm install && pnpm build`

#### Docker Issues

- **Issue**: Services not starting
  - **Solution**: Ensure Docker is running, then:
    `docker-compose -f docker-compose.dev.yml down && docker-compose -f docker-compose.dev.yml up -d`

### Dependency Issues

#### Installation Problems

- **Issue**: `pnpm install` fails
  - **Solution**: Clear cache: `pnpm store prune && pnpm install`

#### Workspace Conflicts

- **Issue**: Version mismatches in workspace
  - **Solution**: Use workspace protocol: `pnpm add -w <package>` for root, `pnpm add --filter <workspace> <package>`
    for specific workspace

### Performance Guidelines

#### Bundle Size

- Monitor with: `pnpm --filter web analyze`
- Keep chunks under 250KB
- Use dynamic imports for large features

#### Database Queries

- Use query builders for complex queries
- Implement pagination for lists
- Add indexes for frequently queried fields

#### Error Boundaries

- Frontend: Wrap features in error boundaries
- Backend: Use NestJS exception filters
- Always log errors with context
