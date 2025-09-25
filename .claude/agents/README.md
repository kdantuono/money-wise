# MoneyWise Agent System

## Overview
Specialized AI agents that handle specific domains of the MoneyWise application development.

## Available Agents

### Architecture & Design
| Agent | Specialization | Max Instances | Trigger Keywords |
|-------|---------------|---------------|------------------|
| `architect` | System Design, Scalability | 1 | architecture, design, scalability, pattern |

### Core Development
| Agent | Specialization | Max Instances | Trigger Keywords |
|-------|---------------|---------------|------------------|
| `backend-specialist` | NestJS, API, Services | 3 | api, endpoint, service, backend |
| `frontend-specialist` | React, Next.js, UI | 2 | ui, component, frontend, react |
| `database-specialist` | PostgreSQL, TypeORM | 1 | database, schema, migration, query |

### Quality & Security
| Agent | Specialization | Max Instances | Trigger Keywords |
|-------|---------------|---------------|------------------|
| `test-specialist` | Jest, Playwright, Coverage | 3 | test, coverage, e2e, jest |
| `security-specialist` | OWASP, Auth, Vulnerabilities | 1 | security, vulnerability, auth |

### Operations
| Agent | Specialization | Max Instances | Trigger Keywords |
|-------|---------------|---------------|------------------|
| `devops-specialist` | Docker, CI/CD, Deployment | 1 | deploy, docker, ci, pipeline |
| `orchestrator` | Multi-agent coordination | 1 | epic, orchestrate, parallel |
| `product-manager` | Requirements, Stories | 1 | story, requirement, acceptance |

## Agent Capabilities

### Architect
- ✅ System architecture design and review
- ✅ Technology stack evaluation and ADRs
- ✅ Scalability and performance planning
- ✅ Microservices and distributed systems
- ✅ API design patterns and standards
- ✅ Cloud architecture frameworks

### Backend Specialist
- ✅ API design and implementation
- ✅ Business logic development
- ✅ Database integration
- ✅ Authentication/Authorization
- ✅ Performance optimization
- ✅ Unit and integration testing

### Frontend Specialist
- ✅ React component development
- ✅ Next.js page routing
- ✅ State management (Zustand)
- ✅ Responsive design
- ✅ Accessibility (WCAG)
- ✅ Component testing

### Database Specialist
- ✅ Schema design
- ✅ Migration creation
- ✅ Query optimization
- ✅ Index strategy
- ✅ Data modeling
- ✅ Redis caching

### Test Specialist
- ✅ Test strategy design
- ✅ Unit test creation
- ✅ Integration testing
- ✅ E2E test automation
- ✅ Coverage analysis
- ✅ Performance testing

### Security Specialist
- ✅ Vulnerability assessment
- ✅ OWASP Top 10 validation
- ✅ Authentication review
- ✅ Authorization checks
- ✅ Dependency scanning
- ✅ Security best practices

### DevOps Specialist
- ✅ Docker containerization
- ✅ CI/CD pipeline setup
- ✅ GitHub Actions workflows
- ✅ Deployment automation
- ✅ Infrastructure as code
- ✅ Monitoring setup

### Orchestrator
- ✅ Epic decomposition
- ✅ Multi-agent coordination
- ✅ Parallel task execution
- ✅ Dependency management
- ✅ Progress tracking
- ✅ Merge orchestration

### Product Manager
- ✅ User story creation
- ✅ Acceptance criteria
- ✅ GitHub issue management
- ✅ Sprint planning
- ✅ Requirements analysis
- ✅ Stakeholder communication

## Usage Examples

### Single Agent
```bash
# Direct agent invocation
claude "As backend-specialist, implement user authentication API"
```

### Multiple Agents
```bash
# Coordinated agents
claude "Use backend and frontend specialists to implement transaction feature"
```

### Epic Orchestration
```bash
# Full orchestration
claude "/epic:init user-authentication"
claude "/epic:execute user-authentication"
```

## Agent Communication

Agents communicate through:
1. **Shared context store** (read-only)
2. **Task handoffs** via orchestrator
3. **Merge events** in git workflow
4. **Status updates** in state files

## Agent Selection Matrix

The system automatically selects agents based on task keywords:

```yaml
IF contains("architecture", "design", "scalability"):
  SELECT architect
  PRIORITY critical

IF contains("api", "backend", "service"):
  SELECT backend-specialist

IF contains("ui", "component", "react"):
  SELECT frontend-specialist

IF contains("test", "coverage"):
  SELECT test-specialist

IF contains("security", "vulnerability"):
  SELECT security-specialist
  PRIORITY critical
```

## Performance Considerations

- **Stateless agents**: Can run multiple instances
- **Stateful agents**: Single instance only (database, orchestrator)
- **Memory limits**: 32MB per agent (64MB for orchestrator)
- **Parallel execution**: Up to 10 agents simultaneously

## Best Practices

1. **Let agents specialize** - Don't ask backend agent to do frontend work
2. **Use orchestrator for complex tasks** - Multiple stories or parallel work
3. **Chain agents properly** - Database → Backend → Frontend → Test
4. **Monitor agent load** - Check pool availability before large epics
5. **Trust agent decisions** - They know their domain best

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Agent not responding | Check if max instances reached |
| Wrong agent selected | Use explicit agent directive |
| Agent conflict | Let orchestrator resolve |
| Agent blocked | Check dependency status |
| Agent error | Review agent-specific logs |

## Extension

To add a new agent:
1. Create `.claude/agents/[agent-name].md`
2. Add to `agent-matrix.yaml`
3. Define capabilities and triggers
4. Test with sample task
5. Document in this README