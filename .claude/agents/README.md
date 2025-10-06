# Specialized AI Agents

This directory contains definitions for specialized AI agents that work together to implement MoneyWise features. Each agent has specific expertise and responsibilities within the development workflow.

## 🎯 Agent Categories

### 1️⃣ Infrastructure & Architecture

#### Architect Agent
**File**: `architect-agent.md`
**Triggers**: architecture, design, scalability, patterns, ADR
**Expertise**: System design, technology selection, architectural decision records
**Outputs**: ADRs, design documents, architectural diagrams

#### DevOps Engineer
**File**: `devops-engineer.md`
**Triggers**: deploy, docker, ci/cd, infrastructure, pipeline
**Expertise**: Containerization, GitHub Actions, AWS deployment, monitoring setup
**Outputs**: Dockerfiles, CI/CD configs, deployment scripts

#### Database Specialist
**File**: `database-specialist.md`
**Triggers**: schema, migration, query, database, sql
**Expertise**: PostgreSQL, TypeORM, TimescaleDB, query optimization
**Outputs**: Entity definitions, migrations, database documentation

### 2️⃣ Development Agents

#### Senior Backend Developer
**File**: `senior-backend-dev.md`
**Triggers**: api, endpoint, service, controller, backend
**Expertise**: NestJS, TypeScript, REST APIs, business logic, authentication
**Outputs**: Controllers, services, DTOs, validation, API tests

#### Frontend Specialist
**File**: `frontend-specialist.md`
**Triggers**: component, ui, react, next.js, frontend
**Expertise**: Next.js, React, TypeScript, Tailwind CSS, accessibility
**Outputs**: React components, pages, forms, client-side state management

#### Test Specialist
**File**: `test-specialist.md`
**Triggers**: test, coverage, e2e, integration, unit
**Expertise**: Jest, React Testing Library, Playwright, test strategy
**Outputs**: Unit tests, integration tests, E2E tests, coverage reports

### 3️⃣ Quality & Process

#### Analytics Specialist
**File**: `analytics-specialist.md`
**Triggers**: analytics, metrics, tracking, events, monitoring
**Expertise**: Event tracking, user behavior analysis, performance metrics
**Outputs**: Analytics implementation, event schemas, dashboards

#### Documentation Specialist
**File**: `documentation-specialist.md`
**Triggers**: docs, documentation, readme, api-docs
**Expertise**: API documentation, README files, onboarding guides
**Outputs**: API docs, architecture docs, setup guides, newcomer docs

#### Quality Evolution Specialist
**File**: `quality-evolution-specialist.md`
**Triggers**: incident, postmortem, technical debt, quality
**Expertise**: Incident analysis, continuous improvement, debt management
**Outputs**: Incident reports, improvement roadmaps, refactoring plans

#### Security Specialist
**File**: `security-specialist.md`
**Triggers**: security, vulnerability, auth, owasp
**Expertise**: Security review, OWASP compliance, authentication patterns
**Outputs**: Security audits, vulnerability fixes, auth implementations

#### Code Reviewer
**File**: `code-reviewer.md`
**Triggers**: review, quality, standards, refactor
**Expertise**: Code quality assessment, standards enforcement, refactoring
**Outputs**: Code review reports, refactoring suggestions, style fixes

### 4️⃣ Orchestration

#### Project Orchestrator
**File**: `project-orchestrator.md`
**Triggers**: epic, orchestrate, coordinate, workflow
**Expertise**: Multi-agent coordination, workflow management, GitHub Projects
**Outputs**: Workflow states, task assignments, progress tracking

#### Product Manager
**File**: `product-manager.md`
**Triggers**: story, requirements, acceptance criteria
**Expertise**: Requirements analysis, user story creation, backlog management
**Outputs**: User stories, acceptance criteria, story decomposition

## 🚀 Agent Invocation

### Automatic Selection

Claude Code automatically selects agents based on keywords in your request:

```
User: "Design the authentication system architecture"
→ Triggers: "architecture", "system"
→ Agent Selected: architect-agent

User: "Implement user login endpoint"
→ Triggers: "implement", "endpoint"
→ Agent Selected: senior-backend-dev

User: "Create a dashboard component"
→ Triggers: "create", "component"
→ Agent Selected: frontend-specialist
```

### Explicit Invocation

You can explicitly request an agent:

```
"Use the database-specialist agent to design the transactions schema"
"Have the test-specialist agent add coverage for auth service"
"Ask the security-specialist to review the password reset flow"
```

### Multi-Agent Workflows

For complex tasks, multiple agents work in sequence or parallel:

```
Epic: "User Authentication System"
├─ architect-agent: Design authentication architecture
├─ security-specialist: Review security requirements
├─ database-specialist: Create users/sessions schema (parallel)
├─ senior-backend-dev: Implement auth API (parallel)
├─ frontend-specialist: Build login/register UI (parallel)
└─ test-specialist: Add E2E authentication tests

Coordination: project-orchestrator
```

## 📋 Agent Responsibilities Matrix

| Agent | Plan | Design | Implement | Test | Review | Deploy | Document |
|-------|------|--------|-----------|------|--------|--------|----------|
| Architect | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| DevOps | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Database | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Backend Dev | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Frontend | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Test Specialist | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Analytics | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Documentation | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Quality Evol. | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Security | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Code Reviewer | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Orchestrator | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Product Mgr | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## 🔄 Workflow Patterns

### Pattern 1: Feature Development

```
1. product-manager: Decompose feature → user stories
2. architect-agent: Design technical approach (if complex)
3. database-specialist: Create schema/migrations (if needed)
4. [backend-dev | frontend-specialist]: Implement feature
5. test-specialist: Add comprehensive tests
6. code-reviewer: Review implementation
7. documentation-specialist: Update docs
```

### Pattern 2: Bug Fix

```
1. [Relevant agent]: Reproduce and diagnose
2. [Relevant agent]: Implement fix
3. test-specialist: Add regression test
4. code-reviewer: Verify fix quality
```

### Pattern 3: Epic Implementation

```
1. project-orchestrator: Decompose epic → stories
2. Multiple agents: Work in parallel on stories
3. project-orchestrator: Coordinate merges
4. quality-evolution: Post-epic retrospective
```

### Pattern 4: Security Audit

```
1. security-specialist: Scan for vulnerabilities
2. [Relevant agents]: Fix identified issues
3. test-specialist: Add security tests
4. documentation-specialist: Document security measures
```

## 🎯 Best Practices

### 1. Agent Specialization

✅ **Do**: Use agents for their specialized domain
```
"Use database-specialist to optimize the transactions query"
```

❌ **Don't**: Ask agents to work outside their expertise
```
"Have database-specialist build the React login form"
```

### 2. Incremental Work

✅ **Do**: Break large tasks into agent-sized chunks
```
Story 1: database-specialist creates schema
Story 2: backend-dev implements CRUD
Story 3: frontend creates UI
```

❌ **Don't**: Give agents overwhelming scope
```
"Implement entire authentication system end-to-end"
```

### 3. Parallel Execution

✅ **Do**: Run independent agents concurrently
```
Parallel:
- database-specialist: users schema
- backend-dev: email service
- frontend: dashboard layout
```

❌ **Don't**: Run dependent agents in parallel
```
Bad: backend-dev starts before database-specialist finishes schema
```

### 4. Context Management

✅ **Do**: Provide clear, focused context
```
"Use senior-backend-dev to add password reset endpoint.
 Schema already exists. Follow auth patterns from ADR-002."
```

❌ **Don't**: Assume agents have implicit context
```
"Add the reset thing" (vague, no context)
```

## 📊 Agent Performance Metrics

Track agent effectiveness in `../.claude/reports/agent-metrics.md`:

- **Invocation Count**: How often each agent is used
- **Success Rate**: % of agent tasks completed successfully
- **Token Usage**: Average tokens consumed per invocation
- **Commit Quality**: PR approval rate for agent-generated code
- **Parallel Efficiency**: % of time multiple agents run concurrently

## 🔧 Customization

### Adding a New Agent

1. **Create Agent File**:
   ```bash
   touch .claude/agents/my-agent.md
   ```

2. **Use Template**:
   ```markdown
   # My Agent

   ## Role
   [Specialized responsibility]

   ## Expertise
   - [Skill 1]
   - [Skill 2]

   ## Triggers
   [Keywords that invoke this agent]

   ## Workflow
   1. [Step 1]
   2. [Step 2]

   ## Outputs
   - [Artifact 1]
   - [Artifact 2]

   ## Dependencies
   - [Required agent 1]
   - [Required agent 2]
   ```

3. **Update Root CLAUDE.md**:
   Add trigger keywords to agent selection logic.

4. **Test Invocation**:
   ```
   "Use my-agent to [task description]"
   ```

### Modifying Existing Agent

1. Read current agent file
2. Update responsibilities/triggers
3. Test with sample invocations
4. Update this README if triggers change

## 🔗 Related Documentation

- **[Orchestration Patterns](../orchestration/README.md)** - Multi-agent workflows
- **[Epic Workflow](../workflows/epic-workflow.md)** - Epic → Stories → Agents
- **[Board Integration](../orchestration/board-integration.md)** - GitHub Projects sync
- **[Best Practices](../best-practices.md)** - Development standards

---

**Agent Count**: 13 specialized agents
**Last Updated**: 2025-10-06
**Maintained By**: Development Team
