# MoneyWise - AI Development Orchestration

## 🚨 CRITICAL: Session Initialization

**MANDATORY**: Execute `.claude/scripts/init-session.sh` at session start
**FALLBACK**: If script fails, manually verify:
1. NOT on main branch (`git branch --show-current`)
2. Docker services running (`docker compose ps`)
3. Dependencies installed (`pnpm install`)

## 🎯 Intelligent Agent Selection

### Pattern-Based Auto-Loading
```yaml
IF architecture || design || scalability:
   LOAD: .claude/agents/architect-agent.md
   PRIORITY: Critical

IF epic || stories || decompose:
   LOAD: .claude/orchestration/epic-orchestrator.md
   EXECUTE: Parallel multi-agent workflow

IF analytics || monitoring || events:
   LOAD: .claude/agents/analytics-specialist.md
   EXECUTE: Analytics implementation workflow

IF documentation || docs || readme:
   LOAD: .claude/agents/documentation-specialist.md
   EXECUTE: Documentation maintenance workflow

IF quality || incident || review:
   LOAD: .claude/agents/quality-evolution-specialist.md
   EXECUTE: Continuous improvement workflow

IF board || project || tracking:
   LOAD: .claude/orchestration/board-integration.md
   EXECUTE: Board-first execution pattern

IF api || backend || service:
   LOAD: .claude/agents/backend-specialist.md
   LOAD: .claude/agents/database-specialist.md

IF ui || component || frontend:
   LOAD: .claude/agents/frontend-specialist.md

IF test || coverage || e2e:
   LOAD: .claude/agents/test-specialist.md

IF security || vulnerability:
   LOAD: .claude/agents/security-specialist.md
   PRIORITY: Critical

IF bug || fix || issue:
   ANALYZE: Domain → Load appropriate specialists
```

## ⚡ Quick Commands

- `/epic:init [name]` - Initialize epic with decomposition
- `/epic:execute` - Execute with parallel agents  
- `/feature [name]` - Standard feature development
- `/fix [issue-#]` - Fix GitHub issue
- `/status` - Show execution status

## 🔄 Git Workflow (NEVER OVERRIDE)

```bash
# ⛔ NEVER work on main
git checkout -b feature/[name]  # ALWAYS

# Commit atomically
git add [specific-files]
git commit -m "type(scope): description"

# Progressive merge
task → story → epic → dev → main
```

## 📊 Project Context

**Application**: MoneyWise Personal Finance
**Stack**: NestJS + Next.js + PostgreSQL + Redis
**Stage**: MVP Development
**Architecture**: Monorepo (apps/, packages/)

## 🤖 Available Agents (12 Specialists)

| Agent | Trigger Keywords | Specialization |
|-------|-----------------|----------------|
| **architect** | architecture, design, scalability | System design, ADR, patterns |
| **analytics-specialist** | analytics, monitoring, events | Metrics, tracking, behavior analysis |
| **documentation-specialist** | documentation, docs, readme | Auto-docs, standards, newcomer accessibility |
| **quality-evolution-specialist** | quality, incident, review | Continuous improvement, technical debt |
| backend-specialist | api, endpoint, service | NestJS, TypeORM, REST |
| frontend-specialist | ui, component, react | Next.js, React, Tailwind |
| database-specialist | schema, migration, query | PostgreSQL, Redis |
| test-specialist | test, coverage, e2e | Jest, Playwright |
| security-specialist | security, auth, vulnerability | OWASP, JWT |
| orchestrator | epic, orchestrate | Multi-agent coordination |
| product-manager | story, requirement | GitHub Projects |
| devops-specialist | deploy, ci, pipeline | Docker, GitHub Actions |

## 📚 References

- **Agent Details**: `.claude/agents/README.md`
- **Process Agents**: `.claude/agents/[analytics|documentation|quality]-specialist.md`
- **Board Integration**: `.claude/orchestration/board-integration.md`
- **Commands**: `.claude/commands/README.md`
- **Epic Workflow**: `.claude/workflows/epic-workflow.md`
- **Architecture**: `.claude/knowledge/architecture.md`
- **Legacy Standards**: `.claude/best-practices.md` (selective sections)

---
*Version: 3.0.0 | Orchestration-Enabled*