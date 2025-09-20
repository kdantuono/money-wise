# MoneyWise MVP v0.1.0

> **Personal Finance Management Application - Minimum Viable Product**
>
> Clean, simple, and reliable financial tracking for personal use

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0+ and npm 8.0+
- Docker and Docker Compose
- PostgreSQL 15+ (via Docker)

### Development Setup

```bash
# Clone and setup
git clone <repository-url>
cd money-wise
npm run setup

# Start development environment
docker-compose up -d
npm run dev
```

**Services will be available at:**
- 🌐 **Web Dashboard**: http://localhost:3000
- 🔧 **API Server**: http://localhost:3002
- 📚 **API Documentation**: http://localhost:3002/api

## 🏗️ Architecture

### Monorepo Structure
```
money-wise/
├── apps/
│   ├── backend/          # NestJS API server
│   └── web/             # Next.js web dashboard
├── packages/
│   └── types/           # Shared TypeScript definitions
└── docs/               # Documentation and planning
```

### Technology Stack

**Backend (NestJS)**
- **Framework**: NestJS 10 with TypeScript
- **Database**: PostgreSQL 15 with TypeORM
- **Authentication**: JWT with bcrypt password hashing
- **Caching**: Redis for session management
- **Validation**: class-validator and class-transformer
- **Documentation**: Swagger/OpenAPI integration

**Frontend (Next.js)**
- **Framework**: Next.js 14 with App Router
- **UI Components**: Radix UI with Tailwind CSS
- **State Management**: React Context and React Hook Form
- **API Client**: Axios with proxy configuration
- **Icons**: Lucide React and React Icons

**Shared**
- **Types**: Centralized TypeScript definitions
- **Validation**: Zod schemas for client-side validation
- **Tooling**: ESLint, Prettier, and Jest

## 📋 Core Features

### MVP Functionality
- **User Authentication**: Secure registration and login
- **Account Management**: Add and manage financial accounts
- **Transaction Tracking**: Manual transaction entry and categorization
- **Basic Budgeting**: Simple budget creation and tracking
- **Dashboard**: Clean overview of financial status

### Security Features
- JWT-based authentication with 7-day expiration
- Bcrypt password hashing
- Rate limiting and request validation
- Helmet middleware for security headers
- Input sanitization and SQL injection prevention

## 🛠️ Development

### Essential Commands

```bash
# Development
npm run dev                # Start all services
npm run dev:backend       # Backend only (port 3002)
npm run dev:web          # Frontend only (port 3000)

# Building
npm run build            # Build all applications
npm run build:backend    # Build NestJS API
npm run build:web       # Build Next.js app

# Testing
npm run test            # Run all tests
npm run test:backend    # Backend Jest tests
npm run test:web       # Frontend Jest tests

# Code Quality
npm run lint           # Lint all code
npm run lint:fix       # Fix lint issues
npm run format         # Format code with Prettier
```

### Database Setup

```bash
# Database will be created automatically via Docker
# Migrations run automatically on startup
docker-compose up -d postgres redis
```

### Environment Configuration

Create `.env` files:

**Backend** (`apps/backend/.env`):
```env
NODE_ENV=development
PORT=3002
DATABASE_URL=postgresql://moneywise:password@localhost:5432/moneywise_dev
JWT_SECRET=your-jwt-secret-key
REDIS_URL=redis://localhost:6379
```

**Frontend** (`apps/web/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

## 📁 Project Structure

### Backend Modules
- **auth/**: User authentication and session management
- **transactions/**: Transaction CRUD and categorization
- **budgets/**: Budget creation and tracking
- **analytics/**: Basic financial reporting
- **banking/**: Account management
- **security/**: Security middleware and validation

### Frontend Structure
- **app/**: Next.js App Router pages and layouts
- **components/**: Reusable UI components
- **contexts/**: React Context providers
- **hooks/**: Custom React hooks
- **lib/**: Utility functions and configurations
- **types/**: Frontend-specific type definitions

## 🔒 Security & Compliance

### Authentication Flow
1. User registers with email/password
2. Password hashed with bcrypt
3. JWT token issued on successful login
4. Token required for all protected endpoints
5. Automatic token refresh on API calls

### Data Protection
- All database connections encrypted
- Sensitive data encrypted at rest
- No plaintext password storage
- Rate limiting on authentication endpoints
- CORS configuration for frontend access

## 🚦 API Documentation

Interactive API documentation available at:
- **Development**: http://localhost:3002/api
- **Swagger UI**: Complete endpoint documentation
- **Schema Validation**: Request/response examples

### Key Endpoints
```
POST /auth/register     # User registration
POST /auth/login        # User authentication
GET  /auth/profile      # User profile
GET  /transactions      # List transactions
POST /transactions      # Create transaction
GET  /budgets          # List budgets
POST /budgets          # Create budget
```

## 🧪 Testing Strategy

### Test Coverage
- **Backend**: Jest unit and integration tests
- **Frontend**: Jest and React Testing Library
- **E2E**: Playwright (future implementation)
- **Target Coverage**: 80% minimum

### Running Tests
```bash
npm run test                    # All tests
npm run test:coverage          # Coverage report
npm run test:watch            # Watch mode
```

## 📚 Documentation

- **Architecture**: `/docs/plans/architecture.md`
- **API Reference**: http://localhost:3002/api
- **Development Guide**: This README
- **Planning Docs**: `/docs/` directory

## 🎯 MVP Scope

### What's Included
✅ User registration and authentication
✅ Manual transaction entry
✅ Basic account management
✅ Simple budget tracking
✅ Clean dashboard interface
✅ Responsive web design

### Future Features (Post-MVP)
- Bank connection and automatic transaction import
- Advanced analytics and reporting
- Multi-factor authentication
- Mobile application
- AI-powered categorization
- Real-time notifications

## 🚀 Deployment

### Development
```bash
docker-compose up -d
npm run dev
```

### Production Build
```bash
npm run build
# Docker production setup coming soon
```

## 📞 Support

- **Issues**: GitHub Issues
- **Documentation**: `/docs/` directory
- **Architecture**: See architecture documentation for detailed system design

---

**MoneyWise MVP v0.1.0** - Simple, reliable personal finance management