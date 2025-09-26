# MoneyWise .claude Directory Index

> **AI Orchestration System** - Operational instructions for Claude agents

## 🗺️ Quick Navigation

### 📋 Project Planning & Requirements
**Location**: `docs/planning/` (moved for better organization)
- MVP development plans and roadmaps
- Detailed milestones and specifications
- Integration requirements and critical paths

### 🤖 AI Orchestration (This Directory)

### 🤖 Agents (Specialists)

#### 🏗️ Architecture & Design
- [`architect-agent.md`](agents/architect-agent.md) - System design, scalability, patterns

#### ⚡ Core Development
- [`backend-specialist.md`](agents/backend-specialist.md) - API, services, business logic
- [`frontend-specialist.md`](agents/frontend-specialist.md) - UI, React, user experience
- [`database-specialist.md`](agents/database-specialist.md) - Schema, queries, optimization

#### 🛡️ Quality & Security
- [`test-specialist.md`](agents/test-specialist.md) - Testing, coverage, quality
- [`security-specialist.md`](agents/security-specialist.md) - Security, auth, vulnerabilities

#### 📊 Process & Quality Evolution
- [`analytics-specialist.md`](agents/analytics-specialist.md) - Monitoring, events, metrics
- [`documentation-specialist.md`](agents/documentation-specialist.md) - Docs automation, standards
- [`quality-evolution-specialist.md`](agents/quality-evolution-specialist.md) - Continuous improvement

#### ⚙️ Operations & Coordination
- [`orchestrator.md`](agents/orchestrator.md) - Multi-agent coordination
- [`product-manager.md`](agents/product-manager.md) - Requirements, stories, planning
- [`devops-specialist.md`](agents/devops-specialist.md) - CI/CD, deployment, infrastructure

### ⚡ Commands (Shortcuts)
- [`epic-init.md`](commands/epic-init.md) - Initialize new epic
- [`epic-execute.md`](commands/epic-execute.md) - Execute epic with parallel agents
- [`full-feature.md`](commands/full-feature.md) - Complete feature implementation
- [`secure-refactor.md`](commands/secure-refactor.md) - Safe refactoring workflow
- [`status.md`](commands/status.md) - Show current execution status

### 🔄 Workflows
- [`git-flow.md`](workflows/git-flow.md) - Git branching strategy and rules
- [`epic-workflow.md`](workflows/epic-workflow.md) - Epic execution process
- [`feature-workflow.md`](workflows/feature-workflow.md) - Standard feature development

### 🎯 Orchestration
- [`epic-orchestrator.md`](orchestration/epic-orchestrator.md) - Epic decomposition and execution
- [`dependency-resolver.md`](orchestration/dependency-resolver.md) - Task dependency management
- [`merge-protocol.md`](orchestration/merge-protocol.md) - Progressive merge strategy
- [`board-integration.md`](orchestration/board-integration.md) - GitHub Projects board-first workflow

### 🔧 Scripts
- [`init-session.sh`](scripts/init-session.sh) - Session initialization
- [`spawn-worktree.sh`](scripts/spawn-worktree.sh) - Create parallel worktrees
- [`merge-progressive.sh`](scripts/merge-progressive.sh) - Progressive merging
- [`rollback.sh`](scripts/rollback.sh) - Emergency rollback
- [`monitor-epic.sh`](scripts/monitor-epic.sh) - Epic execution monitoring

### 📚 Knowledge Base
- [`architecture.md`](knowledge/architecture.md) - System architecture
- [`decisions/`](knowledge/decisions/) - Architecture Decision Records

## 🚀 Common Workflows

### Starting a New Feature
```bash
claude "/feature transaction-export"
```

### Executing an Epic
```bash
claude "Initialize epic: User Authentication"
claude "/epic:execute authentication"
```

### Fixing a Bug
```bash
claude "/fix 123"  # Fixes GitHub issue #123
```

### Checking Status
```bash
claude "/status"
```

## 📋 Agent Selection Matrix

| Task Type | Primary Agent | Supporting Agents |
|-----------|---------------|-------------------|
| **System Design** | architect | backend, database |
| **API Development** | backend-specialist | database, test |
| **UI Development** | frontend-specialist | test |
| **Database Work** | database-specialist | backend |
| **Bug Fix** | test-specialist | domain-specific |
| **Security Audit** | security-specialist | backend |
| **Analytics Setup** | analytics-specialist | frontend, backend |
| **Documentation** | documentation-specialist | architect |
| **Quality Review** | quality-evolution-specialist | test, security |
| **Board Management** | orchestrator + board-integration | product-manager |
| **Epic Coordination** | orchestrator | all |
| **Deployment** | devops-specialist | test, security |

## 🔑 Key Principles

1. **Never work on main branch**
2. **Atomic commits per component**
3. **Test before merge**
4. **Progressive integration**
5. **Auto-rollback on failure**