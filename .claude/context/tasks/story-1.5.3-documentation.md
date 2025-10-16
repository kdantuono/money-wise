# Task: Documentation Consolidation & Architecture

**Issue**: #105
**Domain**: documentation
**Assigned To**: documentation-specialist
**Branch**: feat/documentation-architecture
**Base Branch**: epic/1.5-infrastructure
**Status**: assigned
**Dependencies**: None (can start immediately)

## Full Context (Self-Contained)

### Objective
Consolidate all documentation across the MoneyWise project, establish documentation architecture standards, and create comprehensive developer guides for rapid onboarding and knowledge transfer.

### Requirements
1. Consolidate planning documents from `docs/planning/` into coherent structure with no duplicates
2. Create Architecture Decision Records (ADRs) for all major technical decisions
3. Generate complete API documentation using automated tools
4. Update README.md with accurate setup instructions and project overview
5. Create developer onboarding guide reducing time-to-productivity to < 2 hours

### Technical Specifications

#### Current Documentation Structure
```
docs/
├── planning/         # MVP roadmaps, milestones (needs consolidation)
│   ├── app-overview.md
│   ├── critical-path.md
│   └── milestones/
├── development/      # Setup guides, progress tracking
│   ├── setup.md
│   └── progress.md
├── architecture/     # (TO BE CREATED) ADRs and system design
└── api/             # (TO BE CREATED) API documentation
```

#### Target Documentation Architecture
```
docs/
├── README.md                    # Project overview, quick start
├── architecture/
│   ├── README.md               # Architecture overview
│   ├── decisions/              # ADRs (001-xxx)
│   │   ├── 001-monorepo.md
│   │   ├── 002-nestjs-nextjs.md
│   │   └── 003-postgresql-redis.md
│   └── diagrams/               # System diagrams (mermaid)
├── development/
│   ├── setup.md                # Complete setup guide
│   ├── onboarding.md           # New developer guide
│   ├── contributing.md         # Contribution guidelines
│   └── troubleshooting.md      # Common issues
├── api/
│   ├── README.md               # API overview
│   ├── authentication.md       # Auth endpoints
│   ├── accounts.md             # Account management
│   ├── transactions.md         # Transaction APIs
│   └── openapi.yaml            # OpenAPI spec (generated)
└── planning/
    ├── README.md               # Planning overview
    ├── roadmap.md              # Consolidated roadmap
    └── archive/                # Old planning docs
```

### Files to Create/Modify

#### High Priority Files
- `/home/nemesi/dev/money-wise/README.md` - Complete rewrite with sections: Overview, Features, Quick Start, Architecture, Development, Contributing
- `/home/nemesi/dev/money-wise/docs/architecture/README.md` - Architecture overview with technology stack details
- `/home/nemesi/dev/money-wise/docs/development/onboarding.md` - Step-by-step guide for new developers
- `/home/nemesi/dev/money-wise/docs/api/openapi.yaml` - Generated from NestJS decorators

#### ADR Templates
Create ADRs following this format:
```markdown
# ADR-001: Use of Monorepo Structure

## Status
Accepted

## Context
The MoneyWise project needs to manage multiple applications (backend API, web frontend, mobile) and shared packages.

## Decision
We will use a monorepo structure with pnpm workspaces and Turborepo for build orchestration.

## Consequences
### Positive
- Shared code reuse
- Atomic commits across apps
- Simplified dependency management

### Negative
- Larger repository size
- More complex CI/CD setup
```

### Code Examples

#### API Documentation Generation (NestJS)
```typescript
// apps/backend/src/main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const config = new DocumentBuilder()
  .setTitle('MoneyWise API')
  .setDescription('Personal finance management API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
// Export to file for static docs
fs.writeFileSync('./docs/api/openapi.yaml', yaml.dump(document));
```

#### README.md Structure
```markdown
# MoneyWise 💰

> AI-powered personal finance management platform

## 🚀 Quick Start

\`\`\`bash
# Prerequisites
node >= 18.0.0
pnpm >= 8.0.0
docker >= 20.0.0

# Setup
git clone https://github.com/kdantuono/money-wise
cd money-wise
pnpm install
docker compose up -d
pnpm dev
\`\`\`

## 🏗 Architecture

MoneyWise is built as a monorepo with:
- **Backend**: NestJS + PostgreSQL + Redis
- **Frontend**: Next.js 14 + Tailwind CSS
- **Shared**: TypeScript packages

[View Architecture Docs](./docs/architecture/)
```

### Dependencies Completed
None - this is a parallel-executable story

### Definition of Done
- [ ] All planning documents consolidated with no duplicates
- [ ] At least 5 ADRs created for core decisions
- [ ] API documentation auto-generated and complete
- [ ] README.md updated with all sections
- [ ] Developer onboarding guide tested (< 2 hours to productivity)
- [ ] Documentation structure follows best practices
- [ ] All documentation linted (markdownlint)
- [ ] Documentation coverage badge added to README

### Integration Notes
- This story can run in parallel with other stories
- Documentation should reference completed work from STORY-1.5.2 (Sentry integration)
- Will provide foundation for future development velocity

## Commands for Agent
```bash
# Create branch
git checkout epic/1.5-infrastructure
git pull origin epic/1.5-infrastructure
git checkout -b feat/documentation-architecture

# Work on documentation
mkdir -p docs/architecture/decisions
mkdir -p docs/api
# ... create files ...

# Generate API docs
cd apps/backend
pnpm run docs:generate

# Commit and push
git add .
git commit -m "docs(architecture): consolidate documentation and create ADRs"
git push origin feat/documentation-architecture

# Create PR
gh pr create --title "[STORY-1.5.3] Documentation Consolidation & Architecture" \
  --body "Closes #105" \
  --base epic/1.5-infrastructure \
  --head feat/documentation-architecture
```