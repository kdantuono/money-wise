# Archive Manifest

> **Complete inventory of archived components during MVP cleanup**
> **Date**: 2025-01-19

## 📊 Archive Summary

| Category | Items | Total Size | Future Value |
|----------|-------|------------|--------------|
| Infrastructure | 17 configs/workflows | ~50KB | Medium |
| Agent Orchestration | 20+ scripts/dirs | ~500KB | High |
| Advanced Features | 8 modules/components | ~200KB | Very High |
| Documentation | 5 workflow docs | ~100KB | Medium |
| **TOTAL** | **50+ items** | **~850KB** | **High** |

## 🗂️ Detailed Inventory

### Infrastructure (archive/infrastructure/)

**Docker Configurations** (`docker-configs/`):
- `docker-compose.dev.yml.broken` - Path mismatches, reliability issues
- `docker-compose.ci.yml` - CI-specific config, complex
- `docker-compose.simple.yml` - Alternate config
- `docker-compose.yml` - Production config
- `gitlab-ci.yml.unused` - Complete GitLab CI/CD (unused platform)

**GitHub Workflows** (`github-workflows-excess/`):
- `claude-ci-auto-fix.yml` - Auto-fix CI failures
- `claude-issue-deduplication.yml` - Issue management
- `claude-issue-triage.yml` - Issue automation
- `claude-manual-analysis.yml` - Manual code analysis
- `claude-pr-review-comprehensive.yml` - Comprehensive PR review
- `claude-pr-review-frontend.yml` - Frontend-focused review
- `claude-pr-review-security.yml` - Security-focused review
- `feature-integration.yml` - Feature integration pipeline
- `master-protection.yml` - Branch protection rules
- Plus 3 additional Claude-specific workflows

### Agent Orchestration (archive/agent-orchestration/)

**Scripts** (`scripts/`):
1. `agent-communication.sh` (15KB) - Inter-agent communication
2. `agent-micro-commit.sh` (12KB) - Micro-commit automation
3. `agent-monitoring.sh` (14KB) - Real-time monitoring
4. `agent-tdd-automation.sh` (21KB) - TDD process automation
5. `agent-workflow-orchestrator.sh` (21KB) - Main orchestrator
6. `agile-micro-commit-enforcer.sh` (15KB) - Commit enforcement
7. `branch-sync-orchestrator.sh` (24KB) - Branch synchronization
8. `enhanced-agent-orchestrator.sh` (22KB) - Enhanced version
9. `generate-test-report.js` (18KB) - Test reporting
10. `merge-orchestrator.sh` (11KB) - Merge coordination
11. `migrate-branches-to-future.sh` (13KB) - Branch migration
12. `notify-slack.sh` (7KB) - Slack notifications
13. `orchestra-monitor.sh` (5KB) - Orchestra monitoring
14. `orchestration-integration.sh` (16KB) - Integration scripts
15. `quality-gates.sh` (11KB) - Quality gate enforcement
16. `tmux-agent-orchestrator.sh` (15KB) - Session management

**Clusters** (`clusters/`):
- `ai-intelligence-cluster.sh` (9KB) - AI development cluster
- `event-streaming-cluster.sh` (9KB) - Streaming infrastructure
- `notification-engine-cluster.sh` (9KB) - Notification system

**State Directories** (`state-dirs/`):
- `.agent-comm/` - Agent communication state
- `.agent-reasoning/` - Agent reasoning logs
- `.agent-review/` - Code review state
- `.agent-state/` - General agent state
- `.user-agents/` - User interaction state
- `.workflow-state/` - Workflow session state

### Advanced Features (archive/advanced-features/)

**Auth Advanced** (`auth-advanced/`):
- `services/social-auth.service.ts` (11KB) - OAuth integrations
- `services/mfa.service.ts` (6KB) - Multi-factor authentication
- `entities/user-mfa-settings.entity.ts` - MFA entity
- `controllers/auth-enhanced.controller.ts` (400+ lines) - Enhanced auth API
- `dto/auth-enhanced.dto.ts` (159 lines) - Advanced DTOs

**ML Modules** (`ml-modules/`):
- `ml-categorization/` (complete module) - AI transaction categorization
  - `controllers/` - ML API endpoints
  - `services/` - ML processing logic
  - `models/` - Machine learning models
  - `entities/` - ML data entities

**Backend Modules** (`backend-modules/`):
- `notifications/` - Real-time notification system
- `real-time-events/` - WebSocket event streaming

### Documentation (archive/documentation/)

**Workflow Documentation**:
- `AGENT_ORCHESTRATION_WORKFLOW.md` - 5-phase workflow guide
- `MULTI_AGENT_ORCHESTRATION.md` - Advanced coordination
- `CI_CD_RESTRUCTURING_COMPLETE.md` - Implementation results

## 🔄 Restoration Process

Each archived component includes:
1. **Context**: Why it was archived
2. **Dependencies**: What it needs to function
3. **Integration Notes**: How to restore it
4. **Quality Status**: Testing and validation state

## ⚠️ Archive Integrity

- **Backup Created**: 2025-01-19
- **Validation**: All files copied successfully
- **Dependencies**: Documented for each component
- **Future Compatibility**: May need dependency updates

---

**Total Value Preserved**: ~850KB of production-ready, enterprise-grade code