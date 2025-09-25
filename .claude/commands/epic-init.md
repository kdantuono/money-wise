# Initialize Epic Command

## Usage
`/epic:init [epic-name]`

## Description
Initialize a new epic with automatic decomposition into stories and tasks.

## Execution Steps

### Step 1: Capture Epic Details
```bash
EPIC_NAME="$1"
EPIC_DESC="Decompose and plan epic: $EPIC_NAME"

# Validate epic name
if [[ ! "$EPIC_NAME" =~ ^[a-z0-9-]+$ ]]; then
  ERROR: "Epic name must be lowercase with hyphens only"
fi
```

### Step 2: Create Epic Structure
```bash
# Create state directory
mkdir -p .claude/orchestration/state/epics/$EPIC_NAME

# Initialize epic state
cat > .claude/orchestration/state/epics/$EPIC_NAME/state.json << EOF
{
  "epic": "$EPIC_NAME",
  "status": "planning",
  "created_at": "$(date -Iseconds)",
  "stories": [],
  "total_points": 0
}
EOF
```

### Step 3: Decompose into Stories
Based on epic name, identify logical user stories:

```yaml
Example: Authentication Epic
Stories:
  1. User Registration (8 points)
     - Database schema for users
     - Registration API endpoint
     - Registration UI form
     - Email verification
     
  2. Login/Logout (5 points)
     - JWT implementation
     - Login API endpoint
     - Login UI
     - Session management
     
  3. Password Reset (5 points)
     - Reset token generation
     - Email service
     - Reset UI flow
     - Security validation
```

### Step 4: Generate Task Breakdown
For each story, create atomic tasks:

```yaml
Story: User Registration
Tasks:
  - task-001: Create user table migration
    agent: database-specialist
    dependencies: []
    points: 2
    
  - task-002: Implement registration API
    agent: backend-specialist
    dependencies: [task-001]
    points: 3
    
  - task-003: Build registration form
    agent: frontend-specialist
    dependencies: [task-002]
    points: 2
    
  - task-004: Add integration tests
    agent: test-specialist
    dependencies: [task-002, task-003]
    points: 1
```

### Step 5: Create Dependency Graph
```python
# Generate dependency graph
dependencies = {
  "story-1": {
    "task-001": [],
    "task-002": ["task-001"],
    "task-003": ["task-002"],
    "task-004": ["task-002", "task-003"]
  },
  "story-2": {
    "task-005": [],
    "task-006": ["task-005"],
    "task-007": ["task-006"]
  }
}

# Identify parallel execution opportunities
parallel_groups = identify_parallel_tasks(dependencies)
```

### Step 6: Assign Agents
```yaml
Agent Assignment:
  backend-specialist:
    - task-002: Registration API
    - task-006: Login API
    - task-010: Password reset API
    
  frontend-specialist:
    - task-003: Registration form
    - task-007: Login form
    - task-011: Reset form
    
  database-specialist:
    - task-001: User schema
    - task-005: Session table
    
  test-specialist:
    - task-004: Registration tests
    - task-008: Login tests
    - task-012: Reset tests
```

### Step 7: Generate GitHub Issues
```bash
# Create GitHub issues for tracking
for story in $stories; do
  gh issue create \
    --title "Epic: $EPIC_NAME - Story: $story" \
    --body "$(generate_story_description $story)" \
    --label "epic,$EPIC_NAME,story" \
    --project "MoneyWise MVP"
    
  for task in $story.tasks; do
    gh issue create \
      --title "Task: $task.name" \
      --body "$(generate_task_description $task)" \
      --label "task,$story" \
      --assignee "@$task.agent"
  done
done
```

### Step 8: Create Execution Plan
```yaml
Execution Plan:
  Phase 1 (Parallel):
    - task-001 (database-specialist)
    - task-005 (database-specialist-2)
    
  Phase 2 (Parallel):
    - task-002 (backend-specialist)
    - task-006 (backend-specialist-2)
    
  Phase 3 (Parallel):
    - task-003 (frontend-specialist)
    - task-007 (frontend-specialist-2)
    - task-010 (backend-specialist-3)
    
  Phase 4 (Sequential):
    - task-004 (test-specialist)
    - task-008 (test-specialist)
    - task-012 (test-specialist)
```

### Step 9: Output Summary
```markdown
# Epic Initialized: $EPIC_NAME

## Summary
- Stories: 3
- Total Tasks: 12
- Total Points: 18
- Estimated Duration: 3-4 days with 4 parallel agents

## Parallel Execution Possible
- Phase 1: 2 tasks in parallel
- Phase 2: 2 tasks in parallel
- Phase 3: 3 tasks in parallel

## Next Steps
1. Review decomposition in: .claude/orchestration/state/epics/$EPIC_NAME
2. Create worktrees: .claude/scripts/spawn-worktree.sh $EPIC_NAME
3. Execute: claude '/epic:execute $EPIC_NAME'

## GitHub Issues Created
- Epic issue: #101
- Story issues: #102, #103, #104
- Task issues: #105-116
```