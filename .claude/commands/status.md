# Status Command

## Usage
`/status [scope]`

## Description
Show current system status including active epics, running tasks, and agent pool.

## Scopes
- `all` - Complete system overview (default)
- `epics` - Active epic status
- `agents` - Agent pool status
- `tasks` - Running tasks
- `merges` - Recent merge activity

## Execution

### Step 1: Gather System State
```bash
# Check for active epics
EPICS=$(ls -d .claude/orchestration/state/epics/*/ 2>/dev/null | wc -l)

# Count running tasks
TASKS=$(find .claude/work -name "task_*" -type d 2>/dev/null | wc -l)

# Check agent pool
AGENTS_ACTIVE=$(ps aux | grep -c "\[agent-" || echo 0)
AGENTS_TOTAL=10  # Default pool size

# Recent merges
MERGES=$(tail -5 .claude/orchestration/state/merge.log 2>/dev/null)
```

### Step 2: Display Dashboard
```
════════════════════════════════════════════════
  MoneyWise Development Status
  $(date '+%Y-%m-%d %H:%M:%S')
════════════════════════════════════════════════

📊 OVERVIEW
  Branch: $(git branch --show-current)
  Uncommitted: $(git status --porcelain | wc -l) files
  Docker: $(docker compose ps --services | wc -l) services

🎯 ACTIVE EPICS: $EPICS
  $(for epic in epics/*; do
    name=$(basename $epic)
    progress=$(calculate_progress $epic)
    echo "  └─ $name: $progress%"
  done)

🤖 AGENT POOL: $AGENTS_ACTIVE / $AGENTS_TOTAL
  Backend: 1/3 busy
  Frontend: 0/2 busy  
  Database: 0/1 busy
  Test: 2/3 busy
  Security: 0/1 busy

📝 RUNNING TASKS: $TASKS
  $(for task in active_tasks; do
    echo "  └─ $task.name ($task.agent): $task.status"
  done)

🔄 RECENT MERGES
  $(echo "$MERGES" | tail -5)

⚠️ BLOCKED TASKS: $(count_blocked)
  $(for blocked in blocked_tasks; do
    echo "  └─ $blocked: waiting for $blocked.dependency"
  done)

📈 METRICS (Last 24h)
  Completed: 12 tasks
  Failed: 1 task
  Avg Duration: 47 minutes
  Rollbacks: 0
```

### Step 3: Scope-Specific Views

#### Epic Status (`/status epics`)
```yaml
Epic: authentication
Started: 2024-01-20 14:30
Progress: 67% (8/12 tasks)
Estimated: 2 hours remaining

Stories:
  ✅ user-registration (complete)
  🔄 login-logout (in progress)
  ⏳ password-reset (pending)

Next Tasks:
  - Implement JWT refresh
  - Add remember me option
  - Create logout endpoint
```

#### Agent Status (`/status agents`)
```yaml
Agent Pool Status:

backend-specialist:
  Instances: 3
  Active: 1
  Queue: 2 tasks
  Current: Implementing user API
  
frontend-specialist:
  Instances: 2
  Active: 0
  Queue: 0 tasks
  Status: Idle

[continues for all agents...]
```

#### Task Status (`/status tasks`)
```yaml
Running Tasks:

task-001:
  Name: Create user schema
  Agent: database-specialist
  Status: Running (75%)
  Duration: 12 minutes
  Branch: task/auth-user-schema
  
task-002:
  Name: User registration API
  Agent: backend-specialist
  Status: Waiting (blocked by task-001)
  Dependencies: [task-001]
  
[continues for all tasks...]
```

### Step 4: Health Checks
```bash
# System health indicators
check_health() {
  # Git status
  if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️ Uncommitted changes detected"
  fi
  
  # Docker services
  if ! docker compose ps | grep -q "healthy"; then
    echo "❌ Docker services unhealthy"
  fi
  
  # Test status
  if [ -f ".test-failures" ]; then
    echo "❌ Test failures present"
  fi
  
  # Disk space
  DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
  if [ $DISK_USAGE -gt 80 ]; then
    echo "⚠️ Low disk space: ${DISK_USAGE}%"
  fi
}
```

### Step 5: Actionable Insights
```yaml
Recommendations:
  - 2 tasks ready to execute (no dependencies)
  - frontend-specialist idle, can take new work
  - Consider merging completed story/login
  - Database migration pending review
  
Warnings:
  - task-007 blocked for >1 hour
  - High memory usage in backend service
  - 3 PRs awaiting review
  
Actions Available:
  - /epic:execute authentication (resume)
  - /merge story/login (ready)
  - /agents allocate (optimize pool)
```

## Options

### Verbose Mode
```bash
/status --verbose
# Shows detailed logs and full state
```

### JSON Output
```bash
/status --json
# Returns structured JSON for automation
```

### Watch Mode
```bash
/status --watch
# Updates every 5 seconds
```

### Filter by Epic
```bash
/status --epic authentication
# Shows only authentication epic status
```

## Integration

Status command integrates with:
- Epic orchestrator for progress
- Agent pool for availability
- Git for branch status
- Docker for service health
- GitHub for issue tracking

## Error States

The command handles various error conditions:
```yaml
No epics active:
  Message: "No active epics. Use /epic:init to start."
  
Agent pool exhausted:
  Message: "All agents busy. Queue depth: X"
  Warning: Performance degraded
  
Services down:
  Message: "Critical: Docker services not running"
  Action: Run 'docker compose up'
  
Merge conflicts:
  Message: "Merge blocked by conflicts in: [files]"
  Action: Manual resolution required
```