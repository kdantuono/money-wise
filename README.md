# MoneyWise - Smart Personal Finance App

MoneyWise is a comprehensive personal finance application that automatically tracks your spending, subscriptions, and
income by analyzing your financial activity. Built with a modern microservices architecture for scalability and
performance.

## 🚀 Features

- **Automatic Transaction Tracking**: Smart categorization with ML
- **Budget Management**: Create and track budgets with real-time alerts
- **Real-time Sync**: Cross-platform synchronization
- **Financial Analytics**: Detailed insights and spending trends
- **Bank Integration**: Connect multiple bank accounts (via Plaid)
- **Offline-first**: Works seamlessly without internet connection
- **Multi-platform**: Web dashboard + React Native mobile apps
- **E2E Security**: End-to-end encryption for all financial data

## 🏗️ Architecture

### Backend - Microservices (NestJS + PostgreSQL + Redis)

- **API Gateway**: Central routing and authentication
- **Transaction Service**: CRUD operations and ML categorization
- **Budget Service**: Budget management and tracking
- **Banking Service**: Bank connectivity and sync
- **Analytics Service**: Financial insights and reporting

### Frontend

- **Web**: Next.js dashboard with React components
- **Mobile**: React Native app for iOS and Android
- **Shared Types**: TypeScript type definitions

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

## 🛠️ Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/kdantuono/money-wise.git
cd money-wise

# Start all services with Docker Compose
docker-compose up -d

# The services will be available at:
# - Web Dashboard: http://localhost:3000
# - API: http://localhost:3002
# - API Docs: http://localhost:3002/api
```

### Manual Setup

1. **Install dependencies**

```bash
npm install
npm run setup
```

2. **Setup databases**

```bash
# Start PostgreSQL and Redis (or use Docker)
docker run -d --name postgres -p 5432:5432 -e POSTGRES_DB=moneywise -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=password postgres:15
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

3. **Configure environment**

```bash
# Backend configuration
cp apps/backend/.env.example apps/backend/.env
# Update database credentials if needed
```

4. **Build shared packages**

```bash
cd packages/types && npm run build
```

5. **Start the applications**

```bash
# Terminal 1 - Backend API
cd apps/backend
npm run start:dev

# Terminal 2 - Web Dashboard
cd apps/web
npm run dev

# Terminal 3 - Mobile App (optional)
cd apps/mobile
npm start
```

## 📱 Applications

### Web Dashboard (http://localhost:3000)

- Comprehensive financial dashboard
- Transaction management
- Budget tracking with visual progress
- Analytics and reports
- Account management

### Mobile App

```bash
cd apps/mobile
npm start
# Scan QR code with Expo Go app
```

### API Documentation (http://localhost:3002/api)

- Interactive Swagger documentation
- Test API endpoints
- Authentication flows

## 🔐 Authentication

The application uses JWT-based authentication:

1. **Register/Login** via `/auth/register` or `/auth/login`
2. **Include JWT token** in Authorization header: `Bearer <token>`
3. **Protected routes** require valid authentication

Demo credentials:

- Email: `demo@moneywise.com`
- Password: `password123`

## 📊 API Endpoints

### Authentication

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user

### Transactions

- `GET /transactions` - List transactions
- `POST /transactions` - Create transaction
- `PUT /transactions/:id` - Update transaction
- `DELETE /transactions/:id` - Delete transaction
- `GET /transactions/analytics/by-category` - Category analytics

### Budgets

- `GET /budgets` - List budgets
- `POST /budgets` - Create budget
- `PUT /budgets/:id` - Update budget
- `DELETE /budgets/:id` - Delete budget
- `GET /budgets/performance` - Budget performance

### Analytics

- `GET /analytics/dashboard` - Dashboard overview
- `GET /analytics/spending-trends` - Spending trends
- `GET /analytics/category-analytics` - Category breakdown

### Banking

- `GET /banking/connections` - Bank connections
- `POST /banking/connect` - Connect bank
- `POST /banking/sync/:id` - Sync transactions

## 🗄️ Database Schema

### Core Tables

- `users` - User accounts and profiles
- `accounts` - Financial accounts (bank, credit, etc.)
- `transactions` - Financial transactions
- `budgets` - Budget definitions and tracking
- `categories` - Transaction categories
- `bank_connections` - Bank integration data

### Key Relationships

- Users → Accounts (1:many)
- Accounts → Transactions (1:many)
- Users → Budgets (1:many)
- Users → Bank Connections (1:many)

## 🔧 Development

### Available Scripts

```bash
# Root level
npm run dev          # Start all services
npm run build        # Build all applications
npm run test         # Run all tests
npm run lint         # Lint all code

# Backend specific
npm run dev:backend      # Start backend in dev mode
npm run build:backend    # Build backend
npm run test:backend     # Test backend

# Web specific
npm run dev:web      # Start web app in dev mode
npm run build:web    # Build web app
npm run test:web     # Test web app

# Mobile specific
npm run dev:mobile   # Start mobile app
```

### Code Structure

```
money-wise/
├── apps/
│   ├── backend/         # NestJS API
│   │   ├── src/
│   │   │   ├── modules/ # Feature modules
│   │   │   ├── common/  # Shared utilities
│   │   │   └── config/  # Configuration
│   │   └── test/        # Tests
│   ├── web/            # Next.js web app
│   │   ├── src/
│   │   │   ├── app/     # App router pages
│   │   │   ├── components/ # React components
│   │   │   ├── lib/     # Utilities
│   │   │   └── hooks/   # Custom hooks
│   └── mobile/         # React Native app
│       ├── src/
│       │   ├── screens/ # App screens
│       │   ├── components/ # RN components
│       │   └── navigation/ # Navigation
└── packages/
    ├── types/          # Shared TypeScript types
    └── shared/         # Shared utilities
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Backend tests
cd apps/backend && npm test

# Web tests
cd apps/web && npm test

# E2E tests
npm run test:e2e
```

## 🚀 Deployment

### Production Environment Variables

```bash
# Backend (.env)
NODE_ENV=production
DB_HOST=your-postgres-host
DB_PASSWORD=secure-password
JWT_SECRET=super-secure-jwt-secret
REDIS_HOST=your-redis-host

# External APIs
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret
PLAID_ENV=production
```

### Docker Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🏭 Roadmap

- [ ] Plaid integration for bank connectivity
- [ ] Machine learning transaction categorization
- [ ] Receipt scanning with OCR
- [ ] Bill tracking and reminders
- [ ] Investment portfolio tracking
- [ ] Financial goal setting and tracking
- [ ] Multi-currency support
- [ ] Advanced reporting and exports
- [ ] Mobile notifications
- [ ] Subscription management

## 📞 Support

For support, email support@moneywise.app or join our [Discord community](https://discord.gg/moneywise).

## 🙏 Acknowledgments

- [Razor-eng/financial-dashboard](https://github.com/Razor-eng/financial-dashboard) - Web dashboard inspiration
- [noelzappy/react-native-finance-app-ui-demo](https://github.com/noelzappy/react-native-finance-app-ui-demo) - Mobile
  UI reference
- NestJS, Next.js, React Native communities
