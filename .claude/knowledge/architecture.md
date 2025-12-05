# MoneyWise Architecture

## Architecture Decision Records (ADRs)

### ADR-002: Tech Stack Consolidation (2025-10-04)
**Status**: Proposed | **File**: [adr-002-tech-stack-consolidation.md](./adr-002-tech-stack-consolidation.md)

**Decision**: Implement Sentry (application errors) + CloudWatch (infrastructure metrics) while removing CodeQL and simplifying workflows.

**Key Changes**:
- ✅ **IMPLEMENT**: Sentry backend (minimal, production-only)
- ✅ **KEEP**: CloudWatch (100% complete, production-ready)
- ❌ **REMOVE**: CodeQL (requires GitHub org, architecturally impossible)
- ✅ **KEEP**: Semgrep, pnpm audit, Dependabot, TruffleHog
- 📋 **DEFER**: Frontend Sentry (M3+), Advanced SAST (M5+)

**Impact**: Zero cost increase, 14→12 workflows (-14%), Fortune 500 quality monitoring on $0 budget.

**Quick Reference**: [Monitoring Decision Matrix](./monitoring-decision-matrix.md)

---

## System Overview

MoneyWise is a personal finance management system built as a monorepo with microservices architecture principles.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                         │
├───────────────────────────┬─────────────────────────────────┤
│      Web Application      │         Mobile (Future)         │
│       (Next.js 15)        │     (React Native 0.76/Expo 52) │
└───────────────┬───────────┴─────────────────────────────────┘
                │
┌───────────────┴─────────────────────────────────────────────┐
│                          API LAYER                           │
├─────────────────────────────────────────────────────────────┤
│                    NestJS API Server                         │
│              (REST + GraphQL + WebSocket)                    │
└───────────────┬─────────────────────────────────────────────┘
                │
┌───────────────┴─────────────────────────────────────────────┐
│                      SERVICE LAYER                           │
├───────────────┬───────────┬───────────┬────────────────────┤
│     Auth      │  Banking  │ Analytics │  Notification      │
│    Service    │  Service  │  Service  │    Service         │
└───────────────┴───────────┴───────────┴────────────────────┘
                │
┌───────────────┴─────────────────────────────────────────────┐
│                       DATA LAYER                             │
├───────────────────────┬─────────────────────────────────────┤
│     PostgreSQL 15     │            Redis 7                  │
│   (Primary Database)  │      (Cache & Sessions)             │
└───────────────────────┴─────────────────────────────────────┘
```

## Technology Stack

### Frontend (apps/web)
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5.6
- **Styling**: Tailwind CSS v4 (CSS-based configuration)
- **UI Library**: Radix UI
- **State Management**: Zustand
- **API Client**: Axios
- **Testing**: Vitest 4, React Testing Library, Playwright

### Backend (apps/backend)
- **Framework**: NestJS 11 + Express 5
- **Language**: TypeScript 5.6
- **Database ORM**: Prisma
- **Validation**: class-validator
- **Authentication**: JWT with Passport
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest 30, Supertest

### Shared (packages/)
- **types**: TypeScript type definitions
- **utils**: Shared utility functions
- **config**: Shared configuration

### Infrastructure
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Container**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
- **Build System**: Turborepo 2.6
- **Package Manager**: pnpm 10.24
- **Monitoring**: Winston logging, Sentry

## Design Patterns

### Backend Patterns
```typescript
// Repository Pattern
interface Repository<T> {
  find(options: FindOptions): Promise<T[]>
  findOne(id: string): Promise<T>
  create(entity: T): Promise<T>
  update(id: string, entity: T): Promise<T>
  delete(id: string): Promise<void>
}

// Service Pattern
@Injectable()
class TransactionService {
  constructor(
    private readonly repository: TransactionRepository,
    private readonly cache: CacheService
  ) {}
}

// Controller Pattern
@Controller('transactions')
class TransactionController {
  constructor(private readonly service: TransactionService) {}
  
  @Get()
  findAll() { return this.service.findAll() }
}
```

### Frontend Patterns
```typescript
// Component Composition
const TransactionList = ({ transactions }) => (
  <Card>
    {transactions.map(tx => (
      <TransactionItem key={tx.id} {...tx} />
    ))}
  </Card>
)

// Custom Hooks
const useTransactions = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions
  })
}

// State Management
const useStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user })
}))
```

## API Design

### RESTful Endpoints
```yaml
Authentication:
  POST   /auth/register
  POST   /auth/login
  POST   /auth/logout
  POST   /auth/refresh

Users:
  GET    /users/me
  PATCH  /users/me
  DELETE /users/me

Transactions:
  GET    /transactions      # List with pagination
  POST   /transactions      # Create
  GET    /transactions/:id  # Get one
  PATCH  /transactions/:id  # Update
  DELETE /transactions/:id  # Delete

Categories:
  GET    /categories
  POST   /categories
  PATCH  /categories/:id
  DELETE /categories/:id
```

### Response Format
```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2024-01-20T10:30:00Z",
    "version": "1.0.0"
  }
}
```

### Error Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": []
  }
}
```

## Database Schema

### Core Tables
```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  balance DECIMAL(19,4) DEFAULT 0
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  amount DECIMAL(19,4) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7)
);
```

## Security Architecture

### Authentication Flow
```
1. User login with credentials
2. Server validates and issues JWT
3. Client stores JWT in httpOnly cookie
4. Client includes JWT in requests
5. Server validates JWT on each request
```

### Security Measures
- Password hashing with bcrypt (rounds: 12)
- JWT with RS256 algorithm
- Rate limiting on auth endpoints
- Input validation and sanitization
- SQL injection prevention via parameterized queries
- XSS protection with CSP headers
- CORS configuration

## Account Lifecycle Management

### Three-Tier Account Status System

MoneyWise implements a YNAB-inspired account lifecycle to preserve data integrity:

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ ACTIVE  │ ──▶ │ HIDDEN  │ ──▶ │ DELETED │
└─────────┘     └─────────┘     └─────────┘
     │               │               │
   Normal        Soft delete     Hard delete
   operation     Preserves       Only if no
                 history         linked transfers
```

### Account Status Values

| Status | Description | Use Case |
|--------|-------------|----------|
| ACTIVE | Normal operating account | Default state |
| HIDDEN | Soft-deleted, preserved | Account no longer needed but has history |
| INACTIVE | Temporarily disabled | Paused accounts |
| CLOSED | Officially closed | Bank-closed accounts |
| ERROR | Sync/connection issues | Linked account problems |

### Transfer Integrity Validation

**Problem**: Deleting an account with transfer transactions creates orphan entries.

**Solution**: Block hard deletion when linked transfers exist.

```typescript
// API: GET /accounts/:id/deletion-eligibility
{
  canDelete: false,
  canHide: true,
  blockReason: "Account has 3 transfers linked to other accounts",
  blockers: [
    {
      transactionId: "uuid",
      linkedAccountName: "Savings",
      amount: 500,
      transferRole: "SOURCE"
    }
  ]
}
```

### Account API Endpoints

```yaml
Account Lifecycle:
  GET    /accounts/:id/deletion-eligibility  # Check before delete
  PATCH  /accounts/:id/hide                   # Soft delete (HIDDEN)
  PATCH  /accounts/:id/restore                # Restore to ACTIVE
  DELETE /accounts/:id                        # Hard delete (blocked if transfers)
```

### Business Rules

1. **HIDDEN accounts** are excluded from active views by default
2. **Hard delete** requires zero linked transfers
3. **Hide** preserves all transactions and transfer pairs
4. **Restore** sets status back to ACTIVE

**Reference**: [YNAB Account Close vs Delete](https://support.ynab.com/en_us/how-to-close-or-delete-an-account-in-ynab-ry_409Gko)

---

## Performance Optimizations

### Backend
- Database query optimization with indexes
- Redis caching for frequently accessed data
- Connection pooling
- Lazy loading for relations
- Pagination for large datasets

### Frontend
- Code splitting and lazy loading
- Image optimization with next/image
- Static generation where possible
- React.memo for expensive components
- Virtual scrolling for large lists

## Scalability Considerations

### Horizontal Scaling
- Stateless API servers
- Redis for session management
- Database read replicas
- Load balancer ready

### Vertical Scaling
- Optimized database queries
- Efficient caching strategies
- Background job processing
- Resource monitoring

## Development Workflow

### Branch Strategy
```
main (production)
├── dev (staging)
│   ├── epic/[name]
│   │   ├── story/[name]
│   │   │   └── task/[name]
│   │   └── story/[name]
│   └── feature/[name]
└── hotfix/[name]
```

### Deployment Pipeline
```
1. Code → GitHub
2. GitHub Actions CI
3. Build & Test
4. Docker Image Build
5. Push to Registry
6. Deploy to Environment
7. Health Checks
8. Monitoring
```

## Monitoring & Observability

### Logging
- Winston for structured logging
- Log levels: error, warn, info, debug
- Centralized log aggregation

### Metrics
- Response time tracking
- Error rate monitoring
- Database query performance
- Cache hit rates

### Alerts
- Error rate threshold
- Response time degradation
- Memory usage
- Database connection pool

## Future Enhancements

### Phase 2
- Plaid integration for bank connections
- Real-time notifications with WebSocket
- Advanced analytics and reporting
- Multi-currency support

### Phase 3
- Mobile application
- Machine learning for categorization
- Budget recommendations
- Investment tracking

### Phase 4
- Multi-user support (families)
- Bill reminders
- Tax reporting
- API for third-party integrations