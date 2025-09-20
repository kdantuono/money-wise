# MoneyWise Application Architecture

> **Document Type**: Technical Architecture Guide
> **Audience**: New developers, technical team members, stakeholders
> **Last Updated**: 2025-01-19
> **Version**: 1.0.0

## 🎯 **Executive Summary**

MoneyWise is a sophisticated personal finance application built as a **monorepo with microservices architecture**. It combines modern web technologies, advanced development practices, and comprehensive financial features to deliver a production-ready personal finance management platform.

### **Key Architectural Highlights**
- **Monorepo Structure**: Unified codebase with workspace management
- **Microservices Backend**: NestJS-based modular architecture
- **Modern Frontend**: Next.js 14 with App Router and advanced UI components
- **Shared Type System**: TypeScript types shared across all applications
- **Container-First**: Docker-based development and deployment
- **Advanced CI/CD**: Multi-agent orchestration with comprehensive quality gates

---

## 🏗️ **High-Level Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────┐
│                    MoneyWise Ecosystem                         │
├─────────────────────────────────────────────────────────────────┤
│  Frontend Layer                                                │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐     │
│  │ Next.js 14  │ React Native│ Admin Panel │ Mobile PWA  │     │
│  │ Web App     │ Mobile App  │ (Future)    │ (Planned)   │     │
│  └─────────────┴─────────────┴─────────────┴─────────────┘     │
├─────────────────────────────────────────────────────────────────┤
│  API Gateway & Load Balancing                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ NestJS API Gateway (Port 3002)                         │   │
│  │ • JWT Authentication • Rate Limiting • CORS            │   │
│  │ • Request Validation • Swagger Documentation           │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  Microservices Layer                                           │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐     │
│  │   Auth   │Financial │Analytics │Banking   │   ML     │     │
│  │ Service  │ Service  │ Service  │Service   │Service   │     │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘     │
├─────────────────────────────────────────────────────────────────┤
│  Data Layer                                                    │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐     │
│  │ PostgreSQL  │   Redis     │   File      │  External   │     │
│  │ Database    │   Cache     │  Storage    │   APIs      │     │
│  └─────────────┴─────────────┴─────────────┴─────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 **Project Structure Deep Dive**

### **Root Level Organization**
```
money-wise/
├── apps/                          # Application layer
│   ├── backend/                   # NestJS API application
│   ├── web/                       # Next.js web application
│   └── mobile/                    # React Native mobile app
├── packages/                      # Shared packages
│   └── types/                     # TypeScript type definitions
├── docs/                          # Comprehensive documentation
├── scripts/                       # Automation and orchestration scripts
├── docker-compose.dev.yml         # Development environment (MANDATORY)
├── package.json                   # Workspace configuration
└── [CI/CD & Config Files]         # Quality gates and deployment
```

### **Workspace Management**
- **Monorepo**: npm workspaces for unified dependency management
- **Shared Dependencies**: Common packages managed at root level
- **Cross-Application Types**: Shared TypeScript definitions via `@money-wise/types`
- **Build Orchestration**: Coordinated build process across all applications

---

## 🔧 **Backend Architecture (NestJS)**

### **Core Technologies**
- **Framework**: NestJS 10.x (Node.js, TypeScript)
- **Database**: PostgreSQL 15 with TypeORM
- **Caching**: Redis for session storage and performance
- **Authentication**: JWT with refresh tokens, passport strategies
- **Documentation**: Swagger/OpenAPI automatic generation

### **Modular Microservices Architecture**

```
apps/backend/src/
├── modules/
│   ├── auth/                      # Authentication & Authorization
│   │   ├── controllers/           # Auth endpoints
│   │   ├── services/              # Business logic
│   │   │   ├── auth.service.ts    # Core authentication
│   │   │   ├── mfa.service.ts     # Multi-factor authentication
│   │   │   ├── session.service.ts # Session management
│   │   │   └── social-auth.service.ts # OAuth providers
│   │   ├── entities/              # Database entities
│   │   ├── dto/                   # Data transfer objects
│   │   ├── guards/                # Route protection
│   │   └── tests/                 # Comprehensive test suite
│   ├── transactions/              # Financial transaction management
│   ├── analytics/                 # Financial analytics and reporting
│   ├── banking/                   # Bank integration (Plaid)
│   ├── budgets/                   # Budget management
│   ├── ml-categorization/         # Machine learning categorization
│   ├── notifications/             # Real-time notifications
│   ├── real-time-events/          # WebSocket event handling
│   └── security/                  # Security and compliance
└── main.ts                        # Application bootstrap
```

### **Authentication System**
- **JWT Strategy**: RS256 algorithm with 7-day token expiration
- **Multi-Factor Authentication**: TOTP-based 2FA with QR code generation
- **Social Authentication**: Google, Apple, Microsoft OAuth integration
- **Session Management**: Redis-based session storage
- **Password Security**: bcrypt hashing with configurable salt rounds

### **Database Design**
- **Entity-First Approach**: TypeORM entities define the data model
- **Multi-Tenant**: All operations scoped by `userId` for data isolation
- **Relationship Management**: Complex financial data relationships
- **Migration System**: Versioned database schema changes

### **External Integrations**
- **Plaid Banking API**: Sandbox environment for bank account integration
- **Real-time Updates**: WebSocket connections for live data
- **ML Categorization**: Automated transaction categorization

---

## 🎨 **Frontend Architecture (Next.js)**

### **Core Technologies**
- **Framework**: Next.js 14 with App Router
- **UI Library**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: Context API with custom providers
- **API Client**: Axios with interceptors and error handling

### **Application Structure**

```
apps/web/src/
├── app/                           # Next.js App Router
│   ├── layout.tsx                 # Root layout with providers
│   ├── page.tsx                   # Dashboard homepage
│   ├── login/                     # Authentication pages
│   ├── register/                  # User registration
│   ├── settings/                  # User settings
│   └── components/                # Page-specific components
├── components/                    # Reusable UI components
│   ├── ui/                        # shadcn/ui base components
│   ├── dashboard/                 # Dashboard-specific components
│   ├── auth/                      # Authentication components
│   └── plaid/                     # Banking integration UI
├── context/                       # React Context providers
│   ├── AuthContext.tsx            # Authentication state
│   └── AppContext.tsx             # Application state
├── hooks/                         # Custom React hooks
│   ├── useAuthentication.ts       # Auth hook
│   └── usePlaidLink.ts           # Banking integration
└── lib/                          # Utility functions and configurations
    ├── api/                       # API client configuration
    ├── utils.ts                   # Shared utilities
    └── design-tokens.ts           # Design system tokens
```

### **Design System**
- **Component Library**: shadcn/ui with Radix UI primitives
- **Theme System**: Custom design tokens with dark mode support
- **Responsive Design**: Mobile-first approach with Tailwind breakpoints
- **Accessibility**: WCAG 2.1 AA compliance with automated testing
- **Animation**: Framer Motion for smooth transitions and interactions

### **State Management Pattern**
- **Authentication Context**: Global auth state management
- **App Context**: Application-wide state and settings
- **Local State**: Component-level state with React hooks
- **API State**: Server state management with React Query (planned)

### **Performance Optimizations**
- **Code Splitting**: Route-based and component-based splitting
- **Image Optimization**: Next.js automatic image optimization
- **Bundle Analysis**: Webpack bundle analyzer integration
- **Lazy Loading**: Components and routes loaded on demand

---

## 📱 **Mobile Architecture (React Native)**

### **Current Implementation**
- **Framework**: React Native with Expo
- **Platform**: iOS and Android cross-platform development
- **State Management**: Shared context patterns with web app
- **Navigation**: React Navigation for cross-platform routing

### **Development Status**
- **Phase**: Early development stage
- **Integration**: Shared types and API client with web application
- **Future Plans**: Full feature parity with web application

---

## 🔗 **Shared Type System**

### **Package Structure**
```typescript
packages/types/src/index.ts
├── Core Entities
│   ├── User                       # User account information
│   ├── Account                    # Financial accounts
│   ├── Transaction                # Financial transactions
│   ├── Budget                     # Budget management
│   └── Category                   # Transaction categories
├── Advanced Features
│   ├── BankConnection             # Banking integration
│   ├── Subscription              # Recurring payments
│   ├── FinancialGoal             # Financial objectives
│   └── Analytics                  # Financial analytics
├── API Types
│   ├── ApiResponse<T>             # Standardized API responses
│   ├── PaginatedResponse<T>       # Paginated data
│   └── Request/Response DTOs       # API contract definitions
└── ML Types
    ├── MLFeatures                 # Machine learning features
    └── MLPrediction               # Categorization predictions
```

### **Type Safety Benefits**
- **Cross-Application Consistency**: Shared types prevent mismatches
- **API Contract Enforcement**: Compile-time validation of API calls
- **Refactoring Safety**: TypeScript ensures changes propagate correctly
- **Developer Experience**: IntelliSense and auto-completion across apps

---

## 🐳 **Infrastructure & DevOps**

### **Container Architecture**

#### **Development Environment** (`docker-compose.dev.yml`)
```yaml
Services:
  postgres:          # PostgreSQL 15 database
    - Port: 5432
    - Health checks enabled
    - Persistent data volumes

  redis:             # Redis cache/session store
    - Port: 6379
    - Alpine Linux optimized
    - Health monitoring

  backend:           # NestJS API service
    - Port: 3002
    - Hot reload enabled
    - Swagger docs: /api

  web:               # Next.js frontend
    - Port: 3000
    - Development server
    - API proxy configuration
```

#### **Network Architecture**
- **Custom Network**: `moneywise_network` bridge driver
- **Service Discovery**: Container name-based DNS resolution
- **Health Checks**: Comprehensive health monitoring for all services
- **Data Persistence**: Named volumes for database and cache data

### **Development Workflow**
```bash
# MANDATORY: Always use Docker Compose for development
docker-compose -f docker-compose.dev.yml up -d

# Application Access Points
Web Dashboard:    http://localhost:3000
API Gateway:      http://localhost:3002
API Documentation: http://localhost:3002/api
Database:         localhost:5432
Redis Cache:      localhost:6379
```

---

## 🔐 **Security Architecture**

### **Authentication & Authorization**
- **JWT Tokens**: Short-lived access tokens (15 minutes) with refresh tokens
- **Multi-Factor Authentication**: TOTP-based 2FA with backup codes
- **OAuth Integration**: Google, Apple, Microsoft social login
- **Session Security**: HttpOnly cookies with CSRF protection

### **API Security**
- **Rate Limiting**: Express rate limiter with Redis backing
- **Input Validation**: class-validator for all API inputs
- **CORS Configuration**: Strict origin policy for cross-origin requests
- **Helmet Integration**: Security headers and protection middleware

### **Data Protection**
- **Database Security**: Parameterized queries preventing SQL injection
- **Password Security**: bcrypt hashing with configurable rounds
- **Sensitive Data**: Environment variable configuration
- **HTTPS Enforcement**: Production-only secure communication

### **Compliance Framework**
- **GDPR Ready**: Data protection and user rights implementation
- **SOC 2 Controls**: Security, availability, processing integrity
- **PCI DSS Preparation**: Payment card industry readiness
- **WCAG 2.1 AA**: Web accessibility compliance

---

## ⚡ **Performance & Monitoring**

### **Performance Targets**
- **Page Load Time**: < 2 seconds for dashboard
- **API Response Time**: < 200ms for authentication, < 300ms for data queries
- **Core Web Vitals**: FCP <2s, LCP <2.5s, FID <100ms, CLS <0.1
- **Database Queries**: Optimized indexing and query performance

### **Monitoring Strategy**
- **Application Monitoring**: Real-time performance tracking
- **Infrastructure Monitoring**: Container and service health
- **User Experience Monitoring**: Client-side performance metrics
- **Error Tracking**: Comprehensive error logging and alerting

### **Optimization Techniques**
- **Backend Caching**: Redis for session data and API responses
- **Frontend Optimization**: Code splitting, lazy loading, bundle optimization
- **Database Optimization**: Query optimization, indexing strategy, connection pooling
- **CDN Integration**: Static asset delivery optimization

---

## 🧪 **Testing Architecture**

### **Testing Pyramid Distribution**
- **Unit Tests (70%)**: Component and function-level testing
- **Integration Tests (20%)**: API and service integration testing
- **End-to-End Tests (10%)**: Complete user workflow testing

### **Testing Technologies**
- **Backend Testing**: Jest with Supertest for API testing
- **Frontend Testing**: Jest with Testing Library for component testing
- **E2E Testing**: Playwright for cross-browser testing
- **Accessibility Testing**: axe-core for automated accessibility validation

### **Quality Standards**
- **Code Coverage**: Minimum 80% (85% for production components)
- **Test Automation**: All tests run in CI/CD pipeline
- **Performance Testing**: Automated performance budget validation
- **Security Testing**: Automated vulnerability scanning

---

## 🔄 **CI/CD & Development Process**

### **Advanced Agent Orchestration System**
MoneyWise implements a sophisticated **multi-agent orchestration system** that revolutionizes the development process:

#### **5-Phase Development Workflow**
1. **Brainstorming**: AI-powered requirement analysis and task breakdown
2. **Assignment**: Intelligent agent role assignment based on capabilities
3. **Development**: TDD methodology with micro-commits and real-time validation
4. **Validation**: Cross-agent review and comprehensive quality gates
5. **Integration**: Automated merge with CI/CD pipeline validation

#### **Multi-Agent Clusters**
- **AI Intelligence Cluster**: Architect, Backend, Security, Frontend agents
- **Notification Engine Cluster**: Backend, Frontend, Mobile, Tester agents
- **Event Streaming Cluster**: Core, Performance, Alt-Backend, Tester agents

#### **Quality Gates System**
- **Quality Gate 1**: Foundation validation (85% coverage + security scan)
- **Quality Gate 2**: Frontend validation (Core Web Vitals + WCAG 2.1 AA)
- **Quality Gate 3**: Core features validation (load testing + security audit)
- **Quality Gate 4**: Full system validation (stress testing + final audit)

### **GitHub Integration**
- **MCP Integration**: Automated PR creation and monitoring
- **CI/CD Pipeline**: Comprehensive validation with parallel execution
- **Security Scanning**: Continuous vulnerability assessment
- **Performance Monitoring**: Automated performance budget enforcement

---

## 🚀 **Deployment Architecture**

### **Environment Strategy**
- **Development**: Docker Compose with hot reloading
- **Staging**: Automated deployment from develop branch
- **Production**: Manual approval with blue-green deployment

### **Deployment Features**
- **Blue-Green Deployment**: Zero-downtime updates with instant rollback
- **Health Monitoring**: Comprehensive health checks and validation
- **Rollback Capability**: Automated rollback on failure detection
- **Infrastructure as Code**: Containerized deployment configuration

---

## 📈 **Scalability & Future Architecture**

### **Horizontal Scaling Strategy**
- **Microservices**: Independent service scaling based on demand
- **Database Scaling**: Read replicas and connection pooling
- **Cache Scaling**: Redis cluster for distributed caching
- **Load Balancing**: API gateway with intelligent routing

### **Future Enhancements**
- **Message Queue**: Event-driven architecture with Redis/RabbitMQ
- **Microservices Split**: Independent deployment of business domains
- **CDN Integration**: Global content delivery network
- **Multi-Region**: Geographical distribution for global users

---

## 🔍 **Development Guidelines**

### **For New Developers**

#### **Getting Started Checklist**
1. **Environment Setup**: Follow [SETUP.md](../SETUP.md) for local development
2. **Docker Environment**: Ensure `docker-compose.dev.yml` runs at 100%
3. **Agent Orchestration**: Understand the 5-phase development workflow
4. **Quality Standards**: Review testing and code coverage requirements

#### **Key Development Principles**
- **Docker-First**: Always use Docker Compose for development (mandatory)
- **Type Safety**: Leverage shared TypeScript types across applications
- **Quality Gates**: All code must pass comprehensive quality validation
- **TDD Methodology**: Test-driven development with micro-commits
- **Security-First**: Security validation integrated throughout development

#### **Common Development Commands**
```bash
# Start development environment (MANDATORY)
docker-compose -f docker-compose.dev.yml up -d

# Development workflow
npm run dev                    # Start all services
npm run test                   # Run test suites
npm run lint                   # Code quality validation
npm run build                  # Build all applications

# Quality gates
npm run quality:gates          # Run comprehensive quality validation
npm run quality:tdd            # TDD-specific quality checks
```

### **Architecture Decision Records**
- **Database Choice**: PostgreSQL selected for ACID compliance and JSON support
- **Frontend Framework**: Next.js 14 chosen for SSR, performance, and developer experience
- **State Management**: Context API preferred over Redux for simplicity
- **Authentication**: JWT with refresh tokens for security and scalability
- **Container Strategy**: Docker Compose for development, Kubernetes for production

---

## 🎯 **Success Metrics & KPIs**

### **Technical Metrics**
- **Code Quality**: 85%+ test coverage, zero critical vulnerabilities
- **Performance**: All Core Web Vitals green, <2s page load time
- **Reliability**: 99.9% uptime, <1% error rate
- **Security**: Zero critical security issues, regular vulnerability assessments

### **Business Metrics**
- **User Experience**: <3 minutes from registration to first transaction
- **Feature Adoption**: 80% of core features used within first week
- **Data Accuracy**: 100% accuracy in financial calculations
- **Cross-Platform**: Consistent experience across web and mobile

---

## 🔧 **Troubleshooting & Maintenance**

### **Common Issues & Solutions**

#### **Development Environment**
- **Docker Issues**: Ensure Docker Compose runs at 100% reliability
- **Port Conflicts**: Check ports 3000, 3002, 5432, 6379 availability
- **Type Errors**: Rebuild shared types package after schema changes
- **Build Failures**: Clear node_modules and rebuild dependency tree

#### **Performance Issues**
- **Slow Database**: Check query optimization and indexing
- **Frontend Lag**: Analyze bundle size and lazy loading implementation
- **API Latency**: Review caching strategy and database connection pooling

### **Health Monitoring**
- **Application Health**: `/health` endpoints for all services
- **Database Health**: Connection and query performance monitoring
- **Cache Health**: Redis connectivity and memory usage tracking
- **Container Health**: Docker health checks and resource monitoring

---

## 📚 **Additional Resources**

### **Documentation Navigation**
- **[MVP Implementation Plans](../mvp_eng_enriched_plan.md)**: Strategic development roadmap
- **[Agent Orchestration Workflow](../workflow/AGENT_ORCHESTRATION_WORKFLOW.md)**: Development process guide
- **[CI/CD Architecture](../architecture/CI_CD_ARCHITECTURE.md)**: Pipeline and quality gates
- **[Testing Standards](../architecture/TESTING_STANDARDS.md)**: Comprehensive testing guide

### **External Resources**
- **NestJS Documentation**: [nestjs.com](https://nestjs.com)
- **Next.js Documentation**: [nextjs.org](https://nextjs.org)
- **TypeORM Documentation**: [typeorm.io](https://typeorm.io)
- **Docker Compose Reference**: [docs.docker.com](https://docs.docker.com/compose/)

---

## 🎉 **Conclusion**

MoneyWise represents a **world-class financial application architecture** that combines:

- **Modern Technology Stack**: Latest versions of proven technologies
- **Sophisticated Development Process**: Multi-agent orchestration with quality gates
- **Enterprise-Grade Security**: Comprehensive security and compliance framework
- **Performance Excellence**: Optimized for speed, scalability, and user experience
- **Developer Experience**: Well-structured, documented, and maintainable codebase

This architecture provides a **solid foundation for rapid MVP development** while ensuring **long-term scalability and maintainability**. The sophisticated infrastructure and development processes enable **fast, high-quality delivery** while maintaining **enterprise-grade standards**.

**The system is production-ready and optimized for success.** 🚀

---

**Last Updated**: 2025-01-19 | **Next Review**: Monthly Architecture Review