# MoneyWise

Personal finance management application with cross-platform support

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/kdantuono/money-wise)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![Package Manager](https://img.shields.io/badge/package%20manager-pnpm%20%3E%3D8.0.0-orange.svg)](https://pnpm.io/)

## 🎯 Project Overview

MoneyWise is a comprehensive personal finance management application built with modern technologies and cross-platform compatibility. The application helps users track expenses, manage budgets, and gain insights into their financial health.

### **Current Status: MVP Development (v0.1.0)**
- ✅ Project infrastructure and monorepo setup complete
- ✅ Documentation and planning organization complete
- 🚧 Core financial features in development
- 📋 [View Development Progress](./docs/development/progress.md)

## 🚀 Quick Start (5 Minutes)

Get MoneyWise running locally in 5 minutes:

### **Prerequisites**
- Node.js 18+ (check with: `node --version`)
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

# 3. Start development services
pnpm docker:dev

# 4. Start development servers
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
│   ├── web/          # Next.js web application
│   ├── mobile/       # React Native mobile app
│   └── backend/      # NestJS API server
├── packages/         # Shared packages
│   ├── ui/          # Shared UI components
│   ├── types/       # TypeScript definitions
│   └── utils/       # Utility functions
└── docs/            # Documentation
```

### **Technology Stack**
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Mobile**: React Native, Expo
- **Backend**: NestJS, TypeScript, TypeORM
- **Database**: PostgreSQL, Redis
- **Testing**: Jest, Playwright, React Testing Library
- **DevOps**: Docker, Docker Compose, GitHub Actions
- **Package Management**: pnpm workspaces

## 📋 Available Scripts

### **Development**
```bash
pnpm dev              # Start all development servers
pnpm dev:backend      # Start backend API server only
pnpm dev:web          # Start web frontend only
pnpm dev:mobile       # Start mobile development server
```

### **Building**
```bash
pnpm build            # Build all applications
pnpm build:backend    # Build backend only
pnpm build:web        # Build web app only
pnpm build:mobile     # Build mobile app only
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

## 🎯 Features

### **Core Features (MVP)**
- [ ] **User Authentication & Authorization**
  - User registration and login
  - JWT-based authentication
  - Profile management

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

- Built with [NestJS](https://nestjs.com/) for robust backend architecture
- Powered by [Next.js](https://nextjs.org/) for modern web development
- UI components with [React](https://reactjs.org/) and [Tailwind CSS](https://tailwindcss.com/)
- Database management with [PostgreSQL](https://postgresql.org/)

---

**Version**: 0.1.0 | **Status**: MVP Development | **Last Updated**: 2025-01-26

For questions or support, please create an issue or contact the maintainers.