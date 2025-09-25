# Dependency Resolver

## Role
Analyze and manage task dependencies to maximize parallel execution.

## Dependency Types

### Hard Dependencies (Blocking)
```yaml
database_schema → api_endpoints → frontend_integration → e2e_tests
```
These MUST execute in sequence.

### Soft Dependencies (Informational)
```yaml
documentation ← → implementation
```
Can run in parallel but may benefit from coordination.

### Resource Dependencies
```yaml
single_database_instance: 
  - Only one database migration at a time
  - Queue other DB tasks
```

## Dependency Resolution Algorithm

```python
class DependencyResolver:
    def __init__(self, tasks):
        self.tasks = tasks
        self.graph = self.build_dependency_graph()
        
    def build_dependency_graph(self):
        graph = {}
        for task in self.tasks:
            graph[task.id] = {
                'dependencies': task.dependencies,
                'dependents': [],
                'status': 'pending',
                'agent': task.required_agent
            }
        
        # Build reverse dependencies
        for task_id, info in graph.items():
            for dep in info['dependencies']:
                if dep in graph:
                    graph[dep]['dependents'].append(task_id)
        
        return graph
    
    def find_executable_tasks(self):
        """Find all tasks that can run now"""
        executable = []
        for task_id, info in self.graph.items():
            if info['status'] == 'pending':
                deps_satisfied = all(
                    self.graph[dep]['status'] == 'complete' 
                    for dep in info['dependencies']
                )
                if deps_satisfied:
                    executable.append(task_id)
        return executable
    
    def get_parallel_groups(self):
        """Group tasks that can run in parallel"""
        groups = []
        remaining = set(self.graph.keys())
        
        while remaining:
            # Find all tasks with no dependencies
            group = []
            for task in remaining:
                if not any(dep in remaining for dep in self.graph[task]['dependencies']):
                    group.append(task)
            
            if not group:
                # Circular dependency detected
                raise Exception("Circular dependency detected")
            
            groups.append(group)
            remaining -= set(group)
        
        return groups
```

## Dependency Patterns

### Linear Chain
```
A → B → C → D
Parallelism: None
```

### Fork-Join
```
    → B →
A →      → D
    → C →
Parallelism: B and C in parallel
```

### Diamond
```
    → B →
A →      → D
    → C →
B and C both feed into D
```

### Complex Graph
```
A → B → D → F
    ↓   ↓
    C → E → G
Parallelism: Multiple paths
```

## Resolution Strategies

### 1. Breadth-First (Maximum Parallelism)
Execute all available tasks at each level before moving deeper.
```yaml
Level 1: [A]
Level 2: [B, C]    # Parallel
Level 3: [D, E]    # Parallel
Level 4: [F, G]    # Parallel
```

### 2. Critical Path First
Prioritize the longest dependency chain.
```yaml
Critical path: A → B → D → F (4 steps)
Secondary: A → C → E (3 steps)
Priority: Complete critical path ASAP
```

### 3. Resource-Optimized
Balance based on available agents.
```yaml
Available: 2 backend, 1 frontend
Schedule:
  - Time 0: backend-1 (task A), backend-2 (task B)
  - Time 1: frontend-1 (task C)
  - Time 2: backend-1 (task D)
```

## Handling Circular Dependencies

### Detection
```python
def detect_cycles(graph):
    visited = set()
    recursion_stack = set()
    
    def has_cycle(node):
        visited.add(node)
        recursion_stack.add(node)
        
        for neighbor in graph[node]['dependencies']:
            if neighbor not in visited:
                if has_cycle(neighbor):
                    return True
            elif neighbor in recursion_stack:
                return True
        
        recursion_stack.remove(node)
        return False
    
    for node in graph:
        if node not in visited:
            if has_cycle(node):
                return True
    return False
```

### Resolution
1. **Break the cycle**: Remove weakest dependency
2. **Merge tasks**: Combine circular tasks into one
3. **Escalate**: Request manual intervention

## Dynamic Dependency Updates

### Adding Dependencies at Runtime
```yaml
Scenario: Task B discovers it needs Task C
Action:
  1. Pause Task B
  2. Add C to B's dependencies
  3. Execute C if not started
  4. Resume B when C completes
```

### Removing Dependencies
```yaml
Scenario: Task D no longer needs Task B
Action:
  1. Update graph
  2. Check if D can now run
  3. Execute if all other deps satisfied
```

## Optimization Techniques

### 1. Dependency Weakening
Convert hard dependencies to soft when possible.

### 2. Task Splitting
Break large tasks with many dependencies into smaller units.

### 3. Speculative Execution
Start tasks with likely-satisfied dependencies early.

### 4. Dependency Caching
Remember resolution patterns for similar epics.

## Integration with Orchestrator

```yaml
Workflow:
  1. Orchestrator provides task list
  2. Dependency Resolver analyzes
  3. Returns execution schedule
  4. Orchestrator executes per schedule
  5. Resolver updates on completions
  6. Repeat until all tasks done
```