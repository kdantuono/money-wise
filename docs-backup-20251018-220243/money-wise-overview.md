# MoneyWise - Project Overview

## Executive Summary

MoneyWise is a modern personal finance management application designed for cross-platform deployment (iOS, Android,
Web). The project emphasizes clean architecture, real-time synchronization, and intuitive UX with a focus on delivering
an MVP that handles core financial tracking needs.

## Core Objective

Build a financial tracking application that allows users to:

- Track transactions and account balances
- Visualize spending patterns
- Manage budgets
- Transfer money between accounts
- Categorize expenses automatically

## Technical Stack

### Frontend

- **Primary**: Next.js 14+ with React 18
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: Zustand or Context API
- **Charts**: Recharts for data visualization
- **Mobile**: React Native with Expo (future phase)

### Backend

- **API**: NestJS with TypeScript
- **Database**: PostgreSQL 15
- **Cache**: Redis
- **Authentication**: JWT with refresh tokens
- **Real-time**: WebSockets for live updates

### DevOps

- **Version Control**: Git with GitHub
- **CI/CD**: GitHub Actions
- **Containerization**: Docker
- **Monitoring**: Sentry for error tracking

## Database Schema

### Core Tables

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Account Types
CREATE TABLE account_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL, -- 'checking', 'savings', 'credit_card', 'investment'
    icon VARCHAR(50)
);

-- Accounts
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    account_type_id INT REFERENCES account_types(id),
    name VARCHAR(100) NOT NULL,
    balance DECIMAL(12, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    card_number VARCHAR(20), -- masked, last 4 digits only
    color VARCHAR(7), -- hex color for UI
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7),
    parent_id INT REFERENCES categories(id), -- for subcategories
    user_id UUID REFERENCES users(id), -- null for system categories
    is_system BOOLEAN DEFAULT false
);

-- Transaction Types
CREATE TABLE transaction_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20) NOT NULL -- 'income', 'expense', 'transfer'
);

-- Transactions
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id),
    category_id INT REFERENCES categories(id),
    transaction_type_id INT REFERENCES transaction_types(id),
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    transaction_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budgets
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id),
    amount DECIMAL(12, 2) NOT NULL,
    period VARCHAR(20) NOT NULL, -- 'monthly', 'weekly', 'yearly'
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true
);
```

## MVP Features (Phase 1 - 3 months)

### 1. Authentication & User Management

- [ ] User registration with email verification
- [ ] Secure login with JWT
- [ ] Password reset functionality
- [ ] User profile management

### 2. Dashboard

- [ ] Overview cards showing account balances
- [ ] Recent transactions list (last 5-10)
- [ ] Weekly activity chart (deposits vs withdrawals)
- [ ] Expense statistics pie chart
- [ ] Quick transfer between accounts

### 3. Transaction Management

- [ ] Add/Edit/Delete transactions
- [ ] Categorize transactions
- [ ] Filter by date range, category, account
- [ ] Search transactions by description
- [ ] Bulk import (CSV)

### 4. Account Management

- [ ] Add multiple accounts (checking, savings, credit cards)
- [ ] View account details and balance
- [ ] Account cards with visual differentiation
- [ ] Archive/deactivate accounts

### 5. Basic Analytics

- [ ] Monthly spending by category
- [ ] Balance history line chart
- [ ] Income vs expenses comparison
- [ ] Top spending categories

## UI/UX Requirements

### Visual Design (Based on Dashboard Reference)

- **Color Scheme**: Dark primary cards (#1F2937), light secondary cards (#FFFFFF)
- **Typography**: Clean, modern sans-serif (Inter or similar)
- **Card Design**: Rounded corners, subtle shadows, clear hierarchy
- **Data Visualization**: Blue for positive (deposits), dark for negative (withdrawals)
- **Responsive**: Mobile-first design approach

### Key UI Components

1. **Card Component**: Display account info with balance, card number (masked), validity
2. **Transaction List Item**: Icon, description, date, amount with color coding
3. **Chart Components**: Reusable wrappers for bar charts, pie charts, line graphs
4. **Quick Action Buttons**: Floating or fixed position for add transaction
5. **Navigation**: Side navigation for desktop, bottom tabs for mobile

## Development Best Practices

### Code Organization

```
moneywise/
├── apps/
│   ├── web/           # Next.js application
│   └── api/           # NestJS backend
├── packages/
│   ├── ui/            # Shared UI components
│   ├── utils/         # Shared utilities
│   └── types/         # TypeScript type definitions
└── docs/              # Documentation
```

### Clean Code Principles

1. **Single Responsibility**: Each function/class handles one thing
2. **DRY**: Avoid code duplication, use shared components
3. **SOLID**: Apply SOLID principles for maintainable architecture
4. **Type Safety**: Leverage TypeScript for compile-time checks
5. **Error Handling**: Comprehensive error boundaries and logging

### Testing Strategy (TDD)

- **Unit Tests**: Jest for business logic (target: 80% coverage)
- **Integration Tests**: Test API endpoints with Supertest
- **E2E Tests**: Cypress for critical user flows
- **Component Tests**: React Testing Library

### Code Review Checklist

- [ ] Passes all automated tests
- [ ] Follows naming conventions
- [ ] No console.logs in production code
- [ ] Proper error handling
- [ ] Database queries optimized
- [ ] Security best practices followed
- [ ] Documentation updated

## API Design

### RESTful Endpoints

```
GET    /api/accounts          # List user accounts
POST   /api/accounts          # Create account
GET    /api/accounts/:id      # Get account details
PUT    /api/accounts/:id      # Update account
DELETE /api/accounts/:id      # Delete account

GET    /api/transactions      # List transactions (paginated)
POST   /api/transactions      # Create transaction
GET    /api/transactions/:id  # Get transaction
PUT    /api/transactions/:id  # Update transaction
DELETE /api/transactions/:id  # Delete transaction

GET    /api/categories        # List categories
GET    /api/analytics/summary # Dashboard summary
GET    /api/analytics/charts  # Chart data
```

## Security Requirements

- HTTPS only
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS protection
- CSRF tokens
- Rate limiting
- Secure password storage (bcrypt)
- Sensitive data encryption

## Performance Targets

- Page load: < 2 seconds
- API response: < 200ms for simple queries
- Database queries: Indexed appropriately
- Client-side caching for static data
- Pagination for large datasets (limit: 50 items)

## Success Metrics

- User can create account and add first transaction in < 3 minutes
- Dashboard loads with all widgets in < 2 seconds
- 95% uptime
- Zero critical security vulnerabilities
- Mobile responsive on all common devices

## Next Steps After MVP

1. Mobile apps (React Native)
2. Bank integration (Plaid API)
3. Advanced budgeting tools
4. ML-powered categorization
5. Multi-currency support
6. Family/shared accounts

## References

- UI Inspiration: [Dashboard Screenshot Provided]
- Frontend Reference: github.com/Razor-eng/financial-dashboard
- Mobile UI Reference: github.com/noelzappy/react-native-finance-app-ui-demo

---

**Note**: This document serves as the single source of truth for the MoneyWise MVP. All development decisions should
align with these specifications.
