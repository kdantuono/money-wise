# Execute Epic Command

## Usage
`/epic:execute [epic-name]`

## Description
Execute epic using parallel multi-agent orchestration with automatic task distribution.

## Pre-requisites
- Epic must be initialized (`/epic:init`)
- Worktrees must be created (`spawn-worktree.sh`)
- Docker services must be running

## Execution Flow

### Phase 1: Load Epic State
```bash
EPIC_NAME="$1"
STATE_FILE=".claude/orchestration/state/epics/$EPIC_NAME/state.json"

# Verify epic is ready
if [ ! -f "$STATE_FILE" ]; then
  ERROR: "Epic not found. Run /epic:init first"
fi

# Load dependencies
DEPENDENCIES=$(cat "$STATE_FILE" | jq '.dependencies')
```

### Phase 2: Agent Pool Initialization
```yaml
Available Pool:
  backend-specialist: 3 instances
  frontend-specialist: 2 instances
  database-specialist: 1 instance
  test-specialist: 3 instances
  security-specialist: 1 instance

Allocation:
  - Reserve agents based on task requirements
  - Queue tasks if agents unavailable
  - Release agents when tasks complete
```

### Phase 3: Parallel Execution Strategy

#### Identify Parallel Groups
```python
def find_executable_tasks():
    tasks = []
    for task in all_tasks:
        if task.status == 'pending':
            if all(dep.status == 'complete' for dep in task.dependencies):
                tasks.append(task)
    return tasks

# Execute in waves
while incomplete_tasks():
    parallel_batch = find_executable_tasks()
    execute_parallel(parallel_batch)
    wait_for_completion(parallel_batch)
    merge_completed_tasks()
```

#### Agent Dispatch
```bash
# For each task in parallel batch
for task in $PARALLEL_TASKS; do
  AGENT=$(get_required_agent $task)
  WORKTREE=$(get_task_worktree $task)
  
  # Execute task in background
  (
    echo "🚀 Starting: $task with $AGENT"
    cd "$WORKTREE"
    
    # Agent executes based on task type
    case $AGENT in
      backend-specialist)
        execute_backend_task $task
        ;;
      frontend-specialist)
        execute_frontend_task $task
        ;;
      database-specialist)
        execute_database_task $task
        ;;
      test-specialist)
        execute_test_task $task
        ;;
    esac
    
    # Mark complete
    update_task_status $task "complete"
  ) &
done

wait # Wait for parallel batch to complete
```

### Phase 4: Task Execution Details

#### Backend Task Execution
```bash
execute_backend_task() {
  task=$1
  
  # 1. Create/update API endpoints
  # 2. Implement business logic
  # 3. Add validation
  # 4. Write unit tests
  # 5. Update documentation
  
  # Run validations
  npm run lint
  npm run test:unit
  npm run build
}
```

#### Frontend Task Execution
```bash
execute_frontend_task() {
  task=$1
  
  # 1. Create React components
  # 2. Implement state management
  # 3. Add styling
  # 4. Write component tests
  # 5. Verify accessibility
  
  # Run validations
  npm run lint
  npm run test:components
  npm run build:web
}
```

#### Database Task Execution
```bash
execute_database_task() {
  task=$1
  
  # 1. Create migration files
  # 2. Define schema
  # 3. Add indexes
  # 4. Test migrations (up/down)
  # 5. Document schema
  
  # Run migrations
  npm run migration:run
  npm run migration:test
}
```

### Phase 5: Progressive Merging

```bash
# After each task completes
merge_task_to_story() {
  TASK_BRANCH=$1
  STORY_BRANCH=$2
  
  .claude/scripts/merge-progressive.sh \
    "$TASK_BRANCH" \
    "$STORY_BRANCH" \
    "$EPIC_NAME"
}

# After all story tasks complete
merge_story_to_epic() {
  STORY_BRANCH=$1
  EPIC_BRANCH="epic/$EPIC_NAME"
  
  .claude/scripts/merge-progressive.sh \
    "$STORY_BRANCH" \
    "$EPIC_BRANCH" \
    "$EPIC_NAME"
}
```

### Phase 6: Real-time Monitoring

```bash
# Display execution dashboard
show_progress() {
  clear
  echo "════════════════════════════════════════════"
  echo " Epic: $EPIC_NAME"
  echo " Progress: $(calculate_progress)%"
  echo "════════════════════════════════════════════"
  echo ""
  echo "Stories:"
  for story in $(get_stories); do
    status=$(get_story_status $story)
    echo "  ├─ $story: $status"
    
    for task in $(get_story_tasks $story); do
      task_status=$(get_task_status $task)
      agent=$(get_task_agent $task)
      echo "  │  └─ $task ($agent): $task_status"
    done
  done
  echo ""
  echo "Active Agents: $(count_active_agents) / $(count_total_agents)"
  echo "Completed Tasks: $(count_completed) / $(count_total)"
  echo ""
  echo "Recent Activity:"
  tail -n 5 .claude/orchestration/state/activity.log
}

# Update every 5 seconds
while epic_in_progress; do
  show_progress
  sleep 5
done
```

### Phase 7: Completion & Validation

```bash
# When all tasks complete
finalize_epic() {
  # 1. Merge epic to dev
  git checkout dev
  git merge --no-ff "epic/$EPIC_NAME"
  
  # 2. Run full test suite
  npm run test:all
  
  # 3. Run security scan
  npm run security:scan
  
  # 4. Performance validation
  npm run test:performance
  
  # 5. Generate report
  generate_completion_report
}
```

## Example Execution

```bash
# Start execution
claude "/epic:execute authentication"

# Output:
🚀 Starting Epic Execution: authentication
═══════════════════════════════════════════
 Epic: authentication
 Progress: 0%
═══════════════════════════════════════════

Phase 1: Starting parallel tasks...
  ✓ task-001 (database-specialist): Creating user schema...
  ✓ task-005 (database-specialist): Creating session table...
  
Phase 2: Dependencies satisfied, starting next wave...
  ✓ task-002 (backend-specialist): Implementing registration API...
  ✓ task-006 (backend-specialist): Implementing login API...
  
Phase 3: Backend complete, starting frontend...
  ✓ task-003 (frontend-specialist): Building registration UI...
  ✓ task-007 (frontend-specialist): Building login UI...

[... continues until completion ...]

✅ Epic Complete!
- Duration: 3 hours 47 minutes
- Tasks Completed: 12/12
- Tests Passing: 100%
- Ready for deployment
```

## Error Handling

### Task Failure
```yaml
On Failure:
  1. Capture error logs
  2. Attempt auto-fix with specialist
  3. If unresolvable:
     - Mark task as blocked
     - Continue non-dependent tasks
     - Alert user with details
```

### Merge Conflict
```yaml
On Conflict:
  1. Attempt auto-resolution
  2. If complex:
     - Pause affected branch
     - Continue other branches
     - Request manual intervention
```

## Completion Criteria
- All tasks status: "complete"
- All tests passing
- Security scan clean
- Performance benchmarks met
- Epic branch ready for dev merge