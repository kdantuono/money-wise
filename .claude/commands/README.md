# MoneyWise Command Reference

## Overview
Custom commands for accelerated development workflows. Use these with `/command-name` syntax.

## Command Categories

### 📊 Epic Management
Commands for handling large features with multiple stories.

| Command | Description | Usage |
|---------|-------------|-------|
| `/epic:init` | Initialize new epic with decomposition | `/epic:init authentication` |
| `/epic:execute` | Execute epic with parallel agents | `/epic:execute authentication` |
| `/epic:status` | Show epic execution status | `/epic:status authentication` |

### 🚀 Development
Commands for standard development workflows.

| Command | Description | Usage |
|---------|-------------|-------|
| `/feature` | Implement new feature | `/feature transaction-export` |
| `/fix` | Fix GitHub issue | `/fix 123` |
| `/refactor` | Safe refactoring with tests | `/refactor user-service` |

### 🔍 Status & Monitoring
Commands for tracking progress and system state.

| Command | Description | Usage |
|---------|-------------|-------|
| `/status` | Show overall system status | `/status` |
| `/agents` | Show agent pool status | `/agents` |
| `/tasks` | List active tasks | `/tasks` |
| `/resume-work` | **Recover last session (todos + context)** | `/resume-work` |

## Command Details

### Epic Commands

#### `/epic:init [name]`
Initializes a new epic with automatic decomposition.
```yaml
Process:
  1. Create epic structure
  2. Decompose into stories
  3. Break down into tasks
  4. Identify dependencies
  5. Assign agents
  6. Generate GitHub issues
  
Output:
  - Epic state file
  - Dependency graph
  - Execution plan
  - Time estimate
```

#### `/epic:execute [name]`
Executes epic using multi-agent orchestration.
```yaml
Prerequisites:
  - Epic must be initialized
  - Worktrees created
  - Docker services running
  
Process:
  1. Load epic state
  2. Allocate agent pool
  3. Execute tasks in parallel
  4. Progressive merging
  5. Real-time monitoring
  
Output:
  - Live progress dashboard
  - Completion report
  - Merged code
```

### Development Commands

#### `/feature [description]`
Standard feature implementation.
```yaml
Process:
  1. Analyze requirements
  2. Create feature branch
  3. Implement backend
  4. Implement frontend
  5. Add tests
  6. Create PR
  
Agents:
  - backend-specialist
  - frontend-specialist
  - test-specialist
```

#### `/fix [issue-number]`
Fix GitHub issue with automatic context.
```yaml
Process:
  1. Fetch issue from GitHub
  2. Analyze affected code
  3. Create fix branch
  4. Implement solution
  5. Add regression tests
  6. Create PR with fix
  
Auto-detects:
  - Issue type (bug, feature, chore)
  - Affected components
  - Required agents
```

#### `/secure-refactor [target]`
Safe refactoring with full test coverage.
```yaml
Process:
  1. Analyze refactor scope
  2. Create comprehensive tests
  3. Refactor incrementally
  4. Validate no regression
  5. Update documentation
  
Safety:
  - Checkpoint before changes
  - Test after each change
  - Automatic rollback on failure
```

### Status Commands

#### `/status`
Overall system status.
```yaml
Shows:
  - Active epics
  - Running tasks
  - Agent pool usage
  - Recent merges
  - Failed tasks
  - Queue depth
```

#### `/agents`
Agent pool status.
```yaml
Shows:
  - Available agents
  - Busy agents
  - Agent assignments
  - Queue per agent
  - Performance metrics
```

#### `/resume-work`
**Automatic session recovery at start of new session.**
```yaml
Process:
  1. Find most recent todo file
  2. Parse and restore todo list
  3. Gather git context (commits, branch, status)
  4. Check recent documentation changes
  5. Check project board status
  6. Synthesize "where we left off" summary

Auto-executes:
  - No permission prompts
  - Restores todos with exact status
  - Provides actionable next steps

Best Practice:
  - Run at start of EVERY new session
  - Ensures continuity across sessions
  - Prevents context loss
```

## Command Arguments

### Positional Arguments
```bash
/epic:init authentication        # 'authentication' is the epic name
/fix 123                         # '123' is the issue number
```

### Named Arguments
```bash
/feature "Export transactions" --priority high
/epic:execute authentication --parallel 4
```

### Flags
```bash
/status --verbose               # Detailed output
/epic:init auth --skip-issues   # Don't create GitHub issues
/fix 123 --no-test             # Skip test creation (not recommended)
```

## Command Chaining

Commands can be chained for complex workflows:
```bash
# Initialize and execute epic
/epic:init authentication && /epic:execute authentication

# Fix issue and deploy
/fix 123 && /deploy staging
```

## Custom Commands

To create a new command:

1. **Create command file**
```markdown
<!-- .claude/commands/my-command.md -->
description: What this command does

# Command logic here
Process: $ARGUMENTS
```

2. **Register in commands/README.md**
Add to appropriate section.

3. **Test command**
```bash
claude "/my-command test-argument"
```

## Error Handling

Commands handle errors gracefully:
```yaml
On Error:
  1. Capture error context
  2. Attempt auto-recovery
  3. If unrecoverable:
     - Save state
     - Report error
     - Suggest fixes
     - Rollback if needed
```

## Performance Tips

1. **Use specific commands** - `/fix` instead of generic "fix bug"
2. **Batch related work** - Use epics for related features
3. **Monitor progress** - Keep `/status` open in another terminal
4. **Trust automation** - Let commands handle details
5. **Review output** - Check completion reports

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Command not found | Check spelling, use `/` prefix |
| Command fails | Review prerequisites, check logs |
| Wrong behavior | Use `--dry-run` flag to preview |
| Slow execution | Check agent pool availability |
| Merge conflicts | Command will auto-resolve or escalate |