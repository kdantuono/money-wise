# 📚 MoneyWise MVP v0.1.0 Documentation Index

> **Clean, focused documentation for MoneyWise personal finance application**

## 🎯 Quick Access Directory

### 🚀 **Getting Started**
- **[Setup Guide](../SETUP.md)** 🔧 - Quick 5-minute setup for development
- **[README](../README.md)** 📋 - Project overview and architecture
- **[CLAUDE.md](../CLAUDE.md)** 🤖 - Enhanced development guidance with best practices

### 📋 **Strategic Planning & Decisions**
- **[MVP Assessment Decisions](./MVP_ASSESSMENT_DECISIONS.md)** 🎯 - Core strategic decisions and rationale
- **[Cleanup Strategy](./CLEANUP_STRATEGY.md)** 🧹 - Project cleanup and archival process
- **[Architecture Guide](./plans/architecture.md)** 🏗️ - Comprehensive system architecture

### 🏗️ **Architecture & Foundation**

#### **Current Architecture (Post-Cleanup)**
- **Technology Stack**: NestJS + Next.js + TypeORM + PostgreSQL
- **Development**: Simplified monorepo with quality gates
- **Security**: JWT authentication, input validation, rate limiting
- **Testing**: Jest + Playwright with 80% coverage requirement

#### **Archive Management**
- **[Archive Manifest](../archive/ARCHIVE_MANIFEST.md)** 📦 - Complete inventory of archived code (850KB+)
- **Advanced Features**: ML categorization, MFA, real-time notifications
- **Infrastructure**: Complex CI/CD, Docker configs, agent orchestration
- **Future Integration**: Ready for post-MVP restoration

## 🔧 **Development Resources**

### **Core Development**
- **Database**: PostgreSQL with TypeORM (evaluated alternatives: Drizzle, Kysely)
- **Frontend**: Next.js 14 App Router with Radix UI + Tailwind
- **Authentication**: Simplified JWT (advanced auth archived)
- **API**: RESTful with Swagger documentation

### **Quality Standards**
- **Git Workflow**: Mandatory feature branches, quality gates, semantic commits
- **Testing**: Unit (70%), Integration (20%), E2E (10%)
- **Performance**: <1.5s load, <200ms API responses
- **Security**: OWASP compliance, regular audits

### **Automation Scripts**
Located in `.claude/scripts/`:
- `init-session.sh` - Session initialization
- `quality-check.sh` - Pre-commit quality gates
- `session-complete.sh` - Session completion checklist
- Pre-commit hooks configured automatically

## 📊 **Project Status**

### **Current Phase: RESET → VALIDATION**
- ✅ **Cleanup Complete**: 18/18 tasks (archived 850KB+ valuable code)
- ✅ **Reset**: 4/5 tasks (fresh README, CLAUDE.md, SETUP.md, package.json v0.1.0)
- 🔄 **Current**: Documentation updates
- ⏳ **Next**: Validation phase (TypeScript, builds, quality standards)

### **MVP Scope (v0.1.0)**
**What's Included:**
- ✅ User registration and authentication
- ✅ Manual transaction entry and categorization
- ✅ Basic account management
- ✅ Simple budget tracking
- ✅ Clean dashboard interface
- ✅ Responsive web design

**What's Archived (Future Features):**
- 📦 AI-powered transaction categorization
- 📦 Multi-factor authentication & social login
- 📦 Bank connection & automatic imports
- 📦 Real-time notifications
- 📦 Advanced analytics & reporting
- 📦 Mobile application

## 🎓 **Development Workflow**

### **Session Management**
```bash
# 1. Start Session
.claude/scripts/init-session.sh

# 2. Development Work
# - Always use feature branches
# - Commit frequently with semantic messages
# - Quality gates run automatically

# 3. End Session
.claude/scripts/session-complete.sh
```

### **Quality Gates (Automated)**
- **TypeScript**: Zero compilation errors
- **ESLint**: Code style and quality
- **Prettier**: Consistent formatting
- **Tests**: 80% minimum coverage
- **Security**: High-vulnerability audit

### **Git Standards**
- **Branches**: `feature/description`, `fix/description`, `chore/description`
- **Commits**: Semantic versioning with co-authoring
- **Hooks**: Pre-commit validation automatically enforced

## 📁 **File Organization**

### **Core Directories**
```
money-wise/
├── apps/
│   ├── backend/          # NestJS API server
│   └── web/             # Next.js web dashboard
├── packages/
│   └── types/           # Shared TypeScript definitions
├── .claude/
│   ├── scripts/         # Automation scripts
│   └── best-practices.md # Detailed development standards
├── archive/             # Preserved valuable code (850KB+)
│   ├── advanced-features/
│   ├── agent-orchestration/
│   └── infrastructure/
└── docs/               # Strategic documentation
    ├── plans/          # Architecture and planning
    ├── sessions/       # Development session summaries
    └── decisions/      # Architecture decision records
```

### **Key Configuration Files**
- **CLAUDE.md**: Enhanced development guidance
- **SETUP.md**: Quick setup instructions
- **README.md**: Project overview
- **docker-compose.yml**: Development environment (being rebuilt)
- **package.json**: v0.1.0 with cleaned dependencies

## 🔍 **Archived Components**

### **Advanced Features (Future Integration)**
- **ML Categorization**: Complete AI transaction categorization system
- **Advanced Auth**: MFA, OAuth, social login capabilities
- **Real-time Features**: WebSocket notifications, live updates
- **Performance Optimization**: Bundle optimization, caching strategies

### **Infrastructure (Reference)**
- **Complex CI/CD**: 12 GitHub workflows, GitLab CI/CD pipeline
- **Docker Configs**: Production, development, CI configurations
- **Agent Orchestration**: 17 automation scripts, multi-agent coordination

### **Restoration Ready**
All archived code includes:
- Context for archival decision
- Integration requirements
- Dependencies and setup instructions
- Quality status and test coverage

## 🚨 **Important Notes**

### **Development Philosophy**
- **MVP First**: Core functionality over advanced features
- **Quality Gates**: Every commit must pass validation
- **Documentation**: Update docs with every architectural change
- **Archive Awareness**: Valuable code preserved for future use

### **Success Criteria**
- 80%+ test coverage maintained
- Zero TypeScript compilation errors
- Sub-200ms API response times
- Complete git commit history with co-authoring
- Updated documentation with every change

### **Future Development Tracks**
When ready for post-MVP features:
1. **Advanced Authentication**: Restore MFA, OAuth from archive
2. **ML Features**: Integrate AI categorization system
3. **Real-time**: Implement WebSocket notifications
4. **Performance**: Consider ORM migration (Drizzle/Kysely)
5. **Mobile**: Develop React Native application
6. **Orchestration**: Restore agent automation for complex features

## 📞 **Support & Resources**

### **Getting Help**
1. **Setup Issues**: See [SETUP.md](../SETUP.md) troubleshooting section
2. **Architecture Questions**: Review [architecture.md](./plans/architecture.md)
3. **Development Standards**: Check [.claude/best-practices.md](../.claude/best-practices.md)
4. **Quality Issues**: Run `.claude/scripts/quality-check.sh`

### **External Resources**
- **API Documentation**: http://localhost:3002/api (when running)
- **GitHub Issues**: Bug reports and feature requests
- **TypeScript Documentation**: Official TypeScript docs
- **NestJS Documentation**: Official NestJS guides
- **Next.js Documentation**: Official Next.js documentation

---

**MoneyWise MVP v0.1.0** - Clean documentation for systematic development with enterprise-grade foundations.