# Task: .claude/ Directory Cleanup & Organization

**Issue**: #107
**Domain**: quality
**Assigned To**: quality-evolution-specialist
**Branch**: feat/claude-organization
**Base Branch**: epic/1.5-infrastructure
**Status**: assigned
**Dependencies**: None (can start immediately)

## Full Context (Self-Contained)

### Objective
Clean up and organize the `.claude/` directory to eliminate redundancy, improve agent coordination, and establish clear workflows for AI-assisted development.

### Requirements
1. Eliminate duplicate agent definitions and consolidate into single source of truth
2. Organize workflows into clear, actionable patterns
3. Remove outdated or conflicting instructions
4. Create index/navigation documentation for quick agent discovery
5. Establish naming conventions and directory structure standards

### Technical Specifications

#### Current .claude/ Structure (Problematic)
```
.claude/
├── agents/           # 12+ agent files with overlaps
├── commands/         # Custom slash commands
├── context/          # Task contexts
├── knowledge/        # Architecture decisions
├── orchestration/    # Epic workflows
├── prompts/          # Legacy prompts (redundant)
├── quality/          # Quality tracking
├── scripts/          # Utility scripts
├── settings/         # Local settings
├── workflows/        # Workflow definitions
└── best-practices.md # Outdated, conflicts with CLAUDE.md
```

#### Target .claude/ Structure (Optimized)
```
.claude/
├── README.md                    # Navigation index
├── agents/
│   ├── _README.md              # Agent catalog & selection guide
│   ├── core/                   # Essential agents (5)
│   │   ├── architect.md
│   │   ├── backend-specialist.md
│   │   ├── frontend-specialist.md
│   │   ├── devops-engineer.md
│   │   └── qa-engineer.md
│   └── specialized/            # Domain-specific agents (7)
│       ├── analytics-specialist.md
│       ├── database-specialist.md
│       ├── documentation-specialist.md
│       ├── quality-evolution-specialist.md
│       └── security-specialist.md
├── workflows/
│   ├── README.md               # Workflow patterns
│   ├── epic-workflow.json      # Epic orchestration
│   ├── feature-workflow.json   # Feature development
│   └── hotfix-workflow.json    # Emergency fixes
├── context/
│   ├── active/                 # Current task contexts
│   └── archive/                # Completed contexts
├── orchestration/
│   ├── board-integration.md    # GitHub Projects sync
│   └── epic-orchestrator.md    # Multi-agent coordination
├── commands/                    # Slash commands
│   └── README.md               # Command reference
└── scripts/
    ├── init-session.sh         # Session initialization
    └── cleanup.sh              # Maintenance scripts
```

### Files to Create/Modify

#### Priority 1: Create Navigation Index
- `/home/nemesi/dev/money-wise/.claude/README.md` - Complete navigation guide

```markdown
# Claude AI Development Environment

## 🚀 Quick Start
- **New Feature**: Load `agents/core/backend-specialist.md`
- **Epic Work**: Load `orchestration/epic-orchestrator.md`
- **Bug Fix**: Load `agents/specialized/qa-engineer.md`
- **Documentation**: Load `agents/specialized/documentation-specialist.md`

## 📁 Directory Structure
[detailed structure map]

## 🤖 Agent Selection Guide
| Task Type | Primary Agent | Support Agents |
|-----------|---------------|----------------|
| API Development | backend-specialist | database, security |
| UI Components | frontend-specialist | - |
| Epic Coordination | orchestrator | all specialists |
| Performance | devops-engineer | backend, database |

## 🔄 Workflow Patterns
1. **Epic Development**: See `workflows/epic-workflow.json`
2. **Feature Branch**: See `workflows/feature-workflow.json`
3. **Hotfix**: See `workflows/hotfix-workflow.json`
```

#### Priority 2: Consolidate Agents
Merge duplicate content from:
- `agents/senior-backend-dev.md` → `agents/core/backend-specialist.md`
- `agents/ui-ux-specialist.md` → `agents/core/frontend-specialist.md`
- Remove redundant files

#### Priority 3: Archive Legacy Content
Move to `.claude/archive/`:
- `prompts/` directory (obsolete)
- `best-practices.md` (replaced by CLAUDE.md)
- Outdated workflow files

### Code Examples

#### Agent Catalog Structure
```markdown
# agents/_README.md

## Core Agents (Always Available)

### 🏗️ architect
**Triggers**: architecture, design, scalability
**Specialization**: System design, patterns, ADRs
**Load**: `.claude/agents/core/architect.md`

### 🔧 backend-specialist
**Triggers**: api, endpoint, service
**Specialization**: NestJS, TypeORM, REST/GraphQL
**Load**: `.claude/agents/core/backend-specialist.md`

## Specialized Agents (Domain-Specific)

### 📊 analytics-specialist
**Triggers**: analytics, monitoring, metrics
**Specialization**: Event tracking, user behavior
**Load**: `.claude/agents/specialized/analytics-specialist.md`
```

#### Workflow JSON Schema
```json
{
  "$schema": "workflow-schema.json",
  "name": "epic-workflow",
  "version": "2.0.0",
  "stages": [
    {
      "name": "decomposition",
      "agent": "orchestrator",
      "outputs": ["task-list", "dependency-graph"]
    },
    {
      "name": "parallel-execution",
      "agents": ["backend", "frontend", "qa"],
      "max_concurrent": 3
    }
  ]
}
```

### Dependencies Completed
None - this is a parallel-executable story

### Definition of Done
- [ ] `.claude/README.md` created with complete navigation
- [ ] All duplicate agents consolidated
- [ ] Legacy content archived to `.claude/archive/`
- [ ] Directory structure matches target layout
- [ ] Agent catalog with selection guide complete
- [ ] Workflow patterns documented
- [ ] File count reduced by >40%
- [ ] No conflicting instructions remain
- [ ] All agents tested for proper loading

### Integration Notes
- This cleanup enables better multi-agent coordination
- Simplified structure reduces context confusion
- Clear navigation improves development velocity

## Commands for Agent
```bash
# Create branch
git checkout epic/1.5-infrastructure
git pull origin epic/1.5-infrastructure
git checkout -b feat/claude-organization

# Reorganize structure
cd .claude
mkdir -p agents/core agents/specialized
mkdir -p context/active context/archive
mkdir -p archive

# Move and consolidate files
mv prompts archive/
mv best-practices.md archive/
# ... continue reorganization ...

# Create navigation index
cat > README.md << 'EOF'
# Claude AI Development Environment
[content as specified]
EOF

# Commit changes
git add .
git commit -m "refactor(claude): reorganize and cleanup .claude directory"
git push origin feat/claude-organization

# Create PR
gh pr create --title "[STORY-1.5.5] .claude/ Directory Cleanup & Organization" \
  --body "Closes #107" \
  --base epic/1.5-infrastructure \
  --head feat/claude-organization
```