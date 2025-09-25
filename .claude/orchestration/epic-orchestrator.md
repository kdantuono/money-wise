# Epic Orchestrator

## Activation
TRIGGERED_BY: epic, stories, decompose, parallel execution

## Role
Coordinate multiple agents working in parallel on epic decomposition and execution.

## Execution Protocol

### Phase 1: Epic Decomposition
```yaml
Input: Epic description
Output: 
  - User stories with acceptance criteria
  - Task breakdown per story
  - Dependency graph
  - Agent assignments
```

### Phase 2: Dependency Analysis
```python
def analyze_dependencies(stories):
    """
    Identifies which tasks can run in parallel
    """
    dependency_graph = {}
    for story in stories:
        for task in story.tasks:
            dependency_graph[task.id] = {
                'depends_on': task.dependencies,
                'required_agents': identify_agents(task),
                'can_parallel': len(task.dependencies) == 0
            }
    return dependency_graph
```

### Phase 3: Worktree Setup
```bash
# Create isolated work environments
epic_name="$1"
base_branch="epic/$epic_name"

# Create epic branch
git checkout -b "$base_branch"

# For each story
for story_id in $story_ids; do
  git worktree add ".claude/work/$epic_name/$story_id" -b "story/$story_id"
  
  # For each task in story
  for task_id in $task_ids; do
    cd ".claude/work/$epic_name/$story_id"
    git worktree add "task-$task_id" -b "task/$task_id"
  done
done
```

### Phase 4: Agent Pool Management
```yaml
Available Agents:
  backend-specialist: 3 instances max
  frontend-specialist: 2 instances max
  database-specialist: 1 instance (singleton)
  test-specialist: 3 instances max
  security-specialist: 1 instance
  devops-specialist: 1 instance

Allocation Strategy:
  1. Identify required agents per task
  2. Check availability in pool
  3. Queue if no instances available
  4. Assign to worktree when available
  5. Release back to pool when complete
```

### Phase 5: Parallel Execution
```bash
# Execute parallel tasks
execute_parallel() {
  local ready_tasks=$(find_ready_tasks)
  
  for task in $ready_tasks; do
    agent=$(allocate_agent_for_task $task)
    worktree=$(get_worktree_for_task $task)
    
    # Execute in background
    (
      cd "$worktree"
      $agent execute "$task"
      mark_task_complete "$task"
      release_agent "$agent"
    ) &
  done
  
  wait # Wait for all parallel tasks
}
```

### Phase 6: Progressive Merging
```yaml
Merge Strategy:
  task → story:
    - Run task-level tests
    - If pass: merge to story branch
    - If fail: rollback and alert
    
  story → epic:
    - All tasks complete
    - Run integration tests
    - Merge to epic branch
    
  epic → dev:
    - All stories complete
    - Full E2E test suite
    - Performance validation
    - Security scan
    - Merge to dev branch
```

### Phase 7: Monitoring & Reporting
```bash
# Real-time status dashboard
show_epic_status() {
  echo "═══════════════════════════════════"
  echo "Epic: $epic_name"
  echo "Progress: $(calculate_progress)%"
  echo "═══════════════════════════════════"
  echo ""
  echo "Stories:"
  for story in $stories; do
    echo "  └─ $story: $(get_story_status $story)"
  done
  echo ""
  echo "Active Tasks: $(count_active_tasks)"
  echo "Agent Pool: $(get_agent_usage)/$(get_total_agents)"
  echo ""
  echo "Recent Activity:"
  tail -n 5 .claude/orchestration/state/activity.log
}
```

## Example: Authentication Epic

### Decomposition
```yaml
Epic: User Authentication
Stories:
  1. User Registration
     Tasks:
       - Create user schema (database-specialist)
       - Build registration API (backend-specialist)
       - Create registration UI (frontend-specialist)
       - Add validation tests (test-specialist)
       
  2. Login/Logout
     Tasks:
       - Implement JWT service (backend-specialist)
       - Create login API (backend-specialist)
       - Build login UI (frontend-specialist)
       - Session management (backend-specialist)
       
  3. Password Reset
     Tasks:
       - Email service setup (backend-specialist)
       - Reset token logic (backend-specialist)
       - Reset UI flow (frontend-specialist)
       - Security audit (security-specialist)
```

### Execution Plan
```
Parallel Track 1: User Registration
  - database-specialist → schema
  - Then: backend-specialist → API
  - Then: frontend-specialist → UI
  - Finally: test-specialist → validation

Parallel Track 2: Login/Logout
  - backend-specialist → JWT service
  - Then: parallel(
      backend-specialist-2 → login API,
      frontend-specialist → login UI
    )
    
Parallel Track 3: Password Reset
  - backend-specialist-3 → email service
  - Then: security review
```

## Error Handling

### On Task Failure
1. Capture error context and logs
2. Attempt auto-fix with relevant specialist
3. If unresolvable:
   - Mark task as blocked
   - Continue non-dependent tasks
   - Alert user with details

### On Merge Conflict
1. Invoke orchestrator for resolution
2. If auto-resolvable: apply fix
3. If not: escalate to user

## Completion Criteria
- All stories merged to epic branch
- All tests passing (unit, integration, E2E)
- Security scan clean
- Performance benchmarks met
- Documentation updated