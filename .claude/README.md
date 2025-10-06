# .claude/ - AI Development Orchestration System

This directory contains the complete AI-assisted development infrastructure for MoneyWise, enabling Claude Code to coordinate complex development workflows through specialized agents.

## 📁 Directory Structure

```
.claude/
├── agents/              # Specialized AI agent definitions
├── commands/            # Custom slash commands for common tasks
├── config/              # Configuration files for tooling
├── guides/              # Development guides and workflows
├── knowledge/           # Project-specific knowledge base
├── orchestration/       # Multi-agent coordination patterns
├── reports/             # Generated reports and analysis
├── scripts/             # Automation scripts
├── workflows/           # Workflow state and execution tracking
├── best-practices.md    # Development standards and conventions
├── INDEX.md             # Legacy index (superseded by this README)
└── settings.local.json  # Local Claude Code settings
```

## 🤖 Specialized Agents

Located in [`agents/`](./agents/):

### Infrastructure & Architecture
- **architect-agent.md** - System design, ADRs, technology selection
- **devops-engineer.md** - Docker, CI/CD, deployment automation
- **database-specialist.md** - Schema design, migrations, query optimization

### Development Agents
- **senior-backend-dev.md** - NestJS API implementation, business logic
- **frontend-specialist.md** - React/Next.js components, UI/UX
- **test-specialist.md** - Test strategy, Jest, Playwright E2E

### Quality & Process
- **analytics-specialist.md** - Metrics, event tracking, monitoring
- **documentation-specialist.md** - Auto-docs, API documentation
- **quality-evolution-specialist.md** - Incident learning, technical debt
- **security-specialist.md** - Security review, OWASP compliance
- **code-reviewer.md** - Code quality review, standards enforcement

### Orchestration
- **project-orchestrator.md** - Multi-agent workflow coordination
- **product-manager.md** - Requirements analysis, GitHub Projects

**Usage**: Agents are invoked automatically by Claude Code based on task context, or explicitly via `.claude/orchestration/` workflows.

## 🎯 Commands

Located in [`commands/`](./commands/):

Custom slash commands for frequent operations:

- **/epic:init** - Initialize new epic with decomposition
- **/epic:execute** - Execute epic with parallel agent coordination
- **/feature** - Standard feature development workflow
- **/fix** - Fix GitHub issue with root cause analysis

**See**: [`commands/README.md`](./commands/README.md) for complete list and usage.

## 🔧 Configuration

Located in [`config/`](./config/):

- **eslint-config.json** - Shared ESLint rules
- **prettier-config.json** - Code formatting standards
- **tsconfig-base.json** - Base TypeScript configuration

## 📚 Knowledge Base

Located in [`knowledge/`](./knowledge/):

Project-specific documentation for AI context:

- **architecture.md** - System architecture and design patterns
- **domain-models.md** - Business domain entities and relationships
- **api-patterns.md** - REST API conventions and standards
- **testing-patterns.md** - Test structure and mocking strategies

## 🔄 Orchestration

Located in [`orchestration/`](./orchestration/):

Multi-agent workflow coordination:

- **board-integration.md** - GitHub Projects board-first execution
- **epic-orchestrator.md** - Epic decomposition and parallel execution
- **workflow-state.json** - Active workflow tracking
- **epic-1.5-workflow.json** - M1.5 infrastructure epic state

**Pattern**: Board → Epic → Stories → Tasks → Agents → Commits → PRs

## 📊 Reports

Located in [`reports/`](./reports/):

Generated analysis and tracking documents:

- **code-quality-report.md** - Static analysis results
- **test-coverage-report.md** - Coverage metrics and gaps
- **dependency-audit.md** - Security vulnerabilities and updates

## 🔨 Scripts

Located in [`scripts/`](./scripts/):

Automation utilities:

- **init-session.sh** - Session initialization (branch check, Docker, deps)
- **board-status.sh** - GitHub Projects status query
- **epic-decompose.sh** - Automatic epic → stories decomposition
- **merge-strategy.sh** - Safe multi-branch merge coordination

**Run**: `chmod +x .claude/scripts/*.sh` to make executable.

## 📋 Workflows

Located in [`workflows/`](./workflows/):

Workflow execution state and templates:

- **epic-workflow.md** - Epic execution pattern documentation
- **feature-workflow.md** - Standard feature development pattern
- **epic-*.json** - Active epic state tracking (workflow orchestrator)

## 🎓 Best Practices

**[best-practices.md](./best-practices.md)** - Comprehensive development standards:

- **Git Workflow** - Branching, commits, PRs, merging
- **Code Standards** - TypeScript, React, NestJS conventions
- **Testing Strategy** - Coverage targets, test patterns
- **Documentation** - Comments, README, API docs
- **Security** - Authentication, secrets, OWASP
- **Performance** - Optimization, caching, database
- **Error Handling** - Exceptions, logging, monitoring

**CRITICAL**: Read at session start (enforced by CLAUDE.md global rule).

## 🚀 Quick Start

### For Claude Code Sessions

1. **Session Init** (automatic via hook):
   ```bash
   .claude/scripts/init-session.sh
   ```

2. **Check Project Status**:
   ```bash
   .claude/scripts/board-status.sh list
   ```

3. **Start Feature Development**:
   - Use `/feature [name]` command, OR
   - Manually invoke agents: "Use senior-backend-dev agent to implement..."

### For Epic-Based Development

1. **Initialize Epic**:
   ```bash
   /epic:init [epic-name]
   # OR: Read orchestration/epic-orchestrator.md for manual setup
   ```

2. **Execute with Parallel Agents**:
   ```bash
   /epic:execute
   # Automatically decomposes, assigns agents, coordinates work
   ```

3. **Monitor Progress**:
   ```bash
   # Check workflow state
   cat .claude/workflows/epic-*.json

   # Check board status
   .claude/scripts/board-status.sh status
   ```

## 📖 Key Patterns

### Agent Selection (Auto)

Claude Code automatically selects agents based on keywords:

- **"architecture"** → architect-agent
- **"api", "endpoint"** → senior-backend-dev
- **"component", "ui"** → frontend-specialist
- **"schema", "migration"** → database-specialist
- **"test", "coverage"** → test-specialist
- **"security", "vulnerability"** → security-specialist

### Board-First Execution

1. User adds issue to GitHub Projects "To Do" column
2. Project Orchestrator agent polls board
3. Auto-decomposes into stories with subtasks
4. Assigns stories to specialized agents
5. Agents work in parallel where possible
6. Merges completed work → epic branch → main

### Epic Workflow

```
EPIC-X (Feature/Milestone)
├── STORY-X.1 (Subtask 1) → agent-1
├── STORY-X.2 (Subtask 2) → agent-2 (parallel)
├── STORY-X.3 (Subtask 3) → agent-3 (parallel)
└── STORY-X.4 (Subtask 4) → agent-4 (depends on X.1-X.3)

Branch Strategy:
task/X.1 ──┐
task/X.2 ──┼─→ story/X.2 ──┐
task/X.3 ──┘               ├─→ epic/X ──→ develop ──→ main
task/X.4 ──────────────────┘
```

## 🔍 Troubleshooting

### Common Issues

**Issue**: Agent exceeds 32K token output limit
**Solution**: Break task into smaller subtasks, commit incrementally

**Issue**: Branch conflicts during epic merge
**Solution**: Use `scripts/merge-strategy.sh --conflict-resolution`

**Issue**: GitHub Projects sync failures
**Solution**: Check `gh auth status`, re-authenticate if needed

**Issue**: Docker services not running
**Solution**: `docker compose -f docker-compose.dev.yml up -d`

## 🔗 Related Documentation

- **[Project Planning](../docs/planning/README.md)** - MVP roadmap, features
- **[Architecture](../docs/architecture/README.md)** - ADRs, tech decisions
- **[Development Setup](../docs/development/setup.md)** - Environment config
- **[Root CLAUDE.md](../CLAUDE.md)** - Top-level orchestration rules

## 📝 Contributing

### Adding New Agents

1. Create `agents/[agent-name].md` with template:
   ```markdown
   # [Agent Name] Agent

   ## Role
   [Clear description of responsibilities]

   ## Triggers
   [Keywords that invoke this agent]

   ## Capabilities
   - [Capability 1]
   - [Capability 2]

   ## Workflow
   [Step-by-step execution pattern]
   ```

2. Update `agents/_README.md` with new agent listing
3. Add trigger keywords to root `CLAUDE.md`

### Adding Custom Commands

1. Create `commands/[command-name].md`
2. Update `commands/README.md`
3. Test with `/[command-name]` in Claude Code

### Updating Workflows

1. Modify `workflows/[workflow-type].md`
2. Update active state files (`*-workflow.json`)
3. Document changes in this README

## 📊 Metrics

Track AI orchestration effectiveness:

- **Agent Utilization**: Which agents are invoked most frequently
- **Parallel Efficiency**: How many tasks run concurrently
- **Token Usage**: Average tokens per agent invocation
- **Task Completion**: Time from assignment to merge

**Location**: `reports/orchestration-metrics.md`

## 🎯 Goals

1. **Maximize Parallelism**: Use multiple agents concurrently
2. **Minimize Context Switches**: Keep agents focused on single domain
3. **Automate Boilerplate**: Generate tests, docs, configs automatically
4. **Enforce Standards**: Use code-reviewer agent on all PRs
5. **Board Sync**: Keep GitHub Projects always up-to-date

---

**Last Updated**: 2025-10-06
**Maintained By**: Development Team + AI Orchestration System
**Version**: 2.0 (Post-M1.5 Infrastructure Cleanup)
