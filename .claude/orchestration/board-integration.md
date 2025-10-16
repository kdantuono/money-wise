# Board-First Execution Pattern & GitHub Projects Integration

## Overview

This orchestration pattern implements a **Board-First Development Workflow** that ensures complete traceability and agile transparency by requiring GitHub Projects board updates BEFORE any code work begins. This pattern transforms the development workflow from reactive documentation to proactive planning and real-time status tracking.

## Core Philosophy: Traceability → Execution

### Traditional Anti-Pattern (AVOID)
```
Code → Document → Board Update (reactive)
```

### Board-First Pattern (REQUIRED)
```
Board Update → Plan → Execute → Verify → Iterate (proactive)
```

## Mandatory Workflow Sequence

### Phase 0: Board Status Initialization (BEFORE any code)
```bash
# CRITICAL: Update board status FIRST - before any code changes
gh project item-edit --project-id [PROJECT_ID] --id [ITEM_ID] --field-id [STATUS_FIELD] --single-select-option-id [IN_PROGRESS_ID]
```

### Phase 1: Micro-Iteration Development Pattern
```
FOR each micro-task in user story:
  1. Define micro-task (atomic, testable)
  2. Execute micro-task implementation
  3. Commit changes atomically
  4. Verify with tests/CLI validation
  5. Document progress and decisions
  6. Update board with progress notes (optional)
  7. Repeat until story complete
```

### Phase 2: Completion and Quality Gates
```bash
# MANDATORY: Follow complete post-feature workflow
# 1. Feature branch CI/CD verification
# 2. Code review and approval
# 3. Merge to main branch
# 4. Main branch CI/CD verification
# 5. Branch cleanup
# 6. ONLY THEN update board to "Done"
```

## GitHub CLI Integration Commands

### Project Discovery and Setup
```bash
# 1. List all projects for the organization/user
gh project list --owner [OWNER]

# 2. Get specific project details
gh project view [PROJECT_NUMBER] --owner [OWNER]

# 3. List all items in a project
gh project item-list [PROJECT_NUMBER] --owner [OWNER] --format json

# 4. Get field information (status, priority, etc.)
gh project field-list [PROJECT_NUMBER] --owner [OWNER] --format json
```

### Status Management Commands
```bash
# Get current item status
gh project item-list [PROJECT_NUMBER] --owner [OWNER] --format json | jq '.[] | select(.title=="[STORY_TITLE]") | {id: .id, status: .status}'

# Update item to "In Progress"
gh project item-edit --project-id [PROJECT_ID] --id [ITEM_ID] --field-id [STATUS_FIELD] --single-select-option-id [IN_PROGRESS_ID]

# Update item to "Done" (ONLY after complete workflow)
gh project item-edit --project-id [PROJECT_ID] --id [ITEM_ID] --field-id [STATUS_FIELD] --single-select-option-id [DONE_ID]

# Add progress notes/comments
gh project item-edit --project-id [PROJECT_ID] --id [ITEM_ID] --field-id [NOTES_FIELD] --text "Progress update: [DESCRIPTION]"
```

### Automated Status Detection
```bash
#!/bin/bash
# .claude/scripts/board-status.sh
# Automated board status management

PROJECT_NUMBER="3"
OWNER="kdantuono"

# Function to get project field IDs
get_field_ids() {
    gh project field-list $PROJECT_NUMBER --owner $OWNER --format json | jq -r '
        .[] | select(.name=="Status") | .id
    '
}

# Function to get status option IDs
get_status_options() {
    gh project field-list $PROJECT_NUMBER --owner $OWNER --format json | jq -r '
        .[] | select(.name=="Status") | .options[] | "\(.name):\(.id)"
    '
}

# Function to find item by title
find_item_by_title() {
    local title="$1"
    gh project item-list $PROJECT_NUMBER --owner $OWNER --format json | jq -r "
        .[] | select(.title | contains(\"$title\")) | .id
    "
}

# Function to update item status
update_item_status() {
    local item_id="$1"
    local status_option_id="$2"
    local field_id=$(get_field_ids)

    gh project item-edit --project-id PVT_kwHOADnPXc4BDdMt --id "$item_id" --field-id "$field_id" --single-select-option-id "$status_option_id"
}

# Usage examples:
# ./board-status.sh start "Transaction Import Feature"  # Move to In Progress
# ./board-status.sh complete "Transaction Import Feature"  # Move to Done
```

## Micro-Task Decomposition Framework

### User Story Breakdown Pattern
```markdown
## Epic: [Epic Name]
### User Story: [Story Title]

#### Micro-Tasks (Atomic Implementation Units)
1. **Setup & Configuration**
   - [ ] Create feature branch
   - [ ] Update board status to "In Progress"
   - [ ] Setup environment/dependencies

2. **Backend Implementation** (if applicable)
   - [ ] Create API endpoint structure
   - [ ] Implement business logic
   - [ ] Add input validation
   - [ ] Add error handling
   - [ ] Write unit tests
   - [ ] Update API documentation

3. **Frontend Implementation** (if applicable)
   - [ ] Create component structure
   - [ ] Implement UI logic
   - [ ] Add form validation
   - [ ] Integrate with API
   - [ ] Add loading/error states
   - [ ] Write component tests

4. **Integration & Testing**
   - [ ] Integration testing
   - [ ] E2E testing
   - [ ] Performance validation
   - [ ] Security review

5. **Documentation & Completion**
   - [ ] Update README/CHANGELOG
   - [ ] Create feature documentation
   - [ ] Code review and approval
   - [ ] Deploy and verify
   - [ ] Update board to "Done"
```

### Micro-Task Implementation Pattern
```typescript
// Each micro-task should follow this pattern:
interface MicroTask {
  id: string;
  description: string;
  acceptance: string[];           // Clear completion criteria
  timeEstimate: number;          // Minutes
  dependencies: string[];        // Other micro-tasks
  verification: VerificationStep[]; // How to validate completion
}

interface VerificationStep {
  type: 'test' | 'cli' | 'manual' | 'review';
  command?: string;              // For CLI verification
  description: string;
  successCriteria: string;
}

// Example micro-task
const createApiEndpoint: MicroTask = {
  id: 'create-api-endpoint',
  description: 'Create POST /api/transactions/import endpoint',
  acceptance: [
    'Endpoint accepts CSV file upload',
    'Returns structured validation response',
    'Handles file size limits correctly',
    'Includes proper error responses'
  ],
  timeEstimate: 45,
  dependencies: [],
  verification: [
    {
      type: 'test',
      command: 'pnpm test src/api/transactions/import.test.ts',
      description: 'Unit tests pass for import endpoint',
      successCriteria: 'All tests pass with 100% coverage'
    },
    {
      type: 'cli',
      command: 'curl -X POST localhost:3000/api/transactions/import -F "file=@test.csv"',
      description: 'Manual API test with sample CSV',
      successCriteria: 'Returns 200 status with parsed transaction preview'
    }
  ]
};
```

## Real-Time Progress Tracking

### Progress Documentation Pattern
```markdown
<!-- Auto-updated by micro-task completion -->
## Progress Log: [Story Title]

### Started: [DATE TIME]
### Current Status: In Progress
### Completion: [X]% ([completed]/[total] micro-tasks)

#### Completed Tasks ✅
- [timestamp] Setup & Configuration
  - ✅ Feature branch created: `feature/transaction-import`
  - ✅ Board status updated to "In Progress"
  - ✅ Dependencies verified

- [timestamp] Backend API Structure
  - ✅ Endpoint created: POST /api/transactions/import
  - ✅ Input validation implemented
  - ✅ Unit tests added (12 passing)

#### In Progress 🔄
- [timestamp] Backend Business Logic
  - 🔄 CSV parsing implementation (75% complete)
  - ⏳ Transaction validation logic (pending)

#### Pending ⏳
- Frontend Implementation
- Integration Testing
- Documentation Updates

#### Decisions Made 📝
- Using Papaparse library for CSV parsing (performance + reliability)
- Implementing progressive CSV processing for large files
- Adding duplicate detection based on amount + date + description

#### Blockers & Issues 🚨
- None currently

#### Next Session Priority 🎯
- Complete CSV parsing validation logic
- Begin frontend component implementation
```

### Automated Progress Tracking
```bash
#!/bin/bash
# .claude/scripts/track-progress.sh
# Automated progress tracking for board integration

STORY_TITLE="$1"
PROGRESS_FILE="docs/progress/$(echo $STORY_TITLE | sed 's/ /-/g' | tr '[:upper:]' '[:lower:]').md"

# Update progress file with current status
update_progress() {
    local task_description="$1"
    local status="$2"  # completed, in-progress, blocked

    echo "- $(date '+%H:%M') $task_description - Status: $status" >> "$PROGRESS_FILE"

    # Calculate completion percentage
    local total_tasks=$(grep -c "- \[ \]" "$PROGRESS_FILE" || echo "0")
    local completed_tasks=$(grep -c "- \[x\]" "$PROGRESS_FILE" || echo "0")
    local percentage=$((completed_tasks * 100 / total_tasks))

    # Update board with progress percentage
    if [ $percentage -gt 0 ]; then
        # Update board item with progress notes
        local item_id=$(find_item_by_title "$STORY_TITLE")
        gh project item-edit --project-id PVT_kwHOADnPXc4BDdMt --id "$item_id" --field-id NOTES_FIELD --text "Progress: ${percentage}% complete (${completed_tasks}/${total_tasks} tasks)"
    fi
}

# Usage: ./track-progress.sh "Transaction Import Feature" "CSV parsing logic" "completed"
```

## Quality Gates Integration

### 🚨 MANDATORY GITHUB COPILOT REVIEW WORKFLOW

#### **CRITICAL RULE ENFORCEMENT**
```bash
# BLOCKED - Direct completion not allowed
./board-status.sh complete "Story Title"  # ❌ WILL FAIL

# REQUIRED - Mandatory review workflow
./board-status.sh review "Story Title"         # 1. Move to review
# [Request @copilot review on GitHub]          # 2. Get AI review
./board-status.sh confirm-review "Story Title" # 3. Confirm → Done
```

#### **Workflow Enforcement Mechanism**
```bash
validate_review_workflow() {
    # Ensures no bypass of review process
    # Validates status transitions
    # Blocks direct In Progress → Done
    # Requires In Review → GitHub Copilot → User Approval → Done
}
```

#### **Quality Gate Integration**
- **Gate 1**: Implementation ready → Move to "In Review"
- **Gate 2**: AI Review → GitHub Copilot comprehensive analysis
- **Gate 3**: Human Approval → User confirms review complete
- **Gate 4**: Completion → Automated transition to "Done"

#### **Review Requirements**
```
@copilot review all changes for [ITEM] including:
• Implementation completeness • Code quality patterns
• Test coverage             • Security considerations
• Performance implications  • Documentation accuracy
```

### Board-Integrated Definition of Done

#### ❌ WRONG - Incomplete DoD
```
- Code implemented locally ≠ Done
- Tests passing locally ≠ Done
- Working on main branch ≠ Done
- Board marked "Done" without full workflow ≠ Done
```

#### ✅ CORRECT - Complete DoD Checklist with MANDATORY REVIEW
```markdown
## Definition of Done Checklist with GitHub Copilot Review

### Development Phase
- [ ] 1. Feature branch created and used (never work on main)
- [ ] 2. Board status updated to "In Progress" BEFORE coding
- [ ] 3. Code implemented with atomic commits
- [ ] 4. Unit tests written and passing locally
- [ ] 5. Integration tests added (if applicable)

### Documentation Phase
- [ ] 6. README.md updated (if needed)
- [ ] 7. CHANGELOG.md entry added
- [ ] 8. API documentation updated (if applicable)
- [ ] 9. Feature documentation created

### Quality Assurance Phase
- [ ] 10. Feature branch pushed to remote
- [ ] 11. CI/CD pipeline GREEN on feature branch
- [ ] 12. Code review completed and approved
- [ ] 13. Security review passed (if applicable)

### 🚨 MANDATORY REVIEW PHASE (NEW)
- [ ] 14. Board status moved to "In Review" (.claude/scripts/board-status.sh review)
- [ ] 15. GitHub Copilot comprehensive review requested on GitHub
- [ ] 16. Copilot review feedback addressed and implemented
- [ ] 17. Review completion confirmed (.claude/scripts/board-status.sh confirm-review)

### Integration Phase
- [ ] 18. Pull request created and approved
- [ ] 19. Merged to main with --no-ff
- [ ] 20. CI/CD pipeline GREEN on main branch
- [ ] 21. Deployment successful (if auto-deploy enabled)

### Completion Phase
- [ ] 22. Feature branch deleted (local + remote)
- [ ] 23. Board status automatically updated to "Done" (via review workflow)
- [ ] 24. Stakeholder notification (if required)
```

### Automated DoD Validation
```typescript
// Automated Definition of Done validation
export class DefinitionOfDoneValidator {
  async validateDoD(storyId: string): Promise<DoDValidationReport> {
    const checks: DoDCheck[] = [];

    // Check 1-5: Development Phase
    checks.push(await this.validateFeatureBranch(storyId));
    checks.push(await this.validateBoardStatus(storyId));
    checks.push(await this.validateAtomicCommits(storyId));
    checks.push(await this.validateTests(storyId));

    // Check 6-9: Documentation Phase
    checks.push(await this.validateDocumentation(storyId));

    // Check 10-13: Quality Assurance Phase
    checks.push(await this.validateCIPipeline(storyId));
    checks.push(await this.validateCodeReview(storyId));

    // Check 14-17: Integration Phase
    checks.push(await this.validateIntegration(storyId));

    // Check 18-20: Completion Phase
    checks.push(await this.validateCleanup(storyId));

    const completedChecks = checks.filter(check => check.status === 'completed').length;
    const totalChecks = checks.length;
    const completionPercentage = (completedChecks / totalChecks) * 100;

    return {
      storyId,
      completionPercentage,
      readyForDone: completionPercentage === 100,
      checks,
      blockers: checks.filter(check => check.status === 'blocked'),
      nextActions: this.generateNextActions(checks)
    };
  }

  async blockBoardUpdate(storyId: string, reason: string): Promise<void> {
    // Prevent board update to "Done" if DoD not complete
    console.log(`🚨 BLOCKED: Cannot mark story ${storyId} as "Done"`);
    console.log(`Reason: ${reason}`);
    console.log(`Complete Definition of Done checklist before updating board status`);
  }
}
```

## Enforcement and Compliance

### Git Hooks Integration
```bash
#!/bin/bash
# .git/hooks/pre-push
# Enforce board-first workflow

# Check if we're pushing a feature branch
BRANCH=$(git branch --show-current)
if [[ $BRANCH == feature/* ]]; then
    echo "🔍 Validating board-first workflow compliance..."

    # Check if board status was updated
    STORY_TITLE=$(git log --oneline | grep "feat\|fix" | head -1 | sed 's/^[^ ]* //')

    # Validate that board was updated before commits
    # (Implementation would check git log timestamps vs board update timestamps)

    echo "✅ Board-first workflow compliance verified"
fi
```

### Development Environment Integration
```bash
#!/bin/bash
# .claude/scripts/enforce-board-first.sh
# Development environment enforcement

check_board_first_compliance() {
    local current_branch=$(git branch --show-current)

    if [ "$current_branch" = "main" ]; then
        echo "🚨 ERROR: Working on main branch violates board-first workflow"
        echo "1. Create feature branch: git checkout -b feature/[story-name]"
        echo "2. Update board status to 'In Progress'"
        echo "3. Begin development"
        exit 1
    fi

    # Check if there are uncommitted changes without board status update
    if [ -n "$(git status --porcelain)" ]; then
        echo "⚠️ WARNING: Uncommitted changes detected"
        echo "Ensure board status reflects current work progress"
    fi
}

# Run compliance check before any major operations
check_board_first_compliance
```

## Success Metrics & Monitoring

### Board-First Workflow Metrics
```typescript
interface BoardFirstMetrics {
  workflowCompliance: number;        // % of stories following board-first pattern
  traceabilityScore: number;         // % of commits linked to board items
  cycleTime: number;                 // Average time from "In Progress" to "Done"
  qualityGateCompliance: number;     // % of stories completing full DoD
  rollbackRate: number;              // % of "Done" items rolled back due to issues
}

export class BoardFirstMetricsTracker {
  async calculateWorkflowCompliance(): Promise<number> {
    const allStories = await this.getCompletedStories();
    const compliantStories = allStories.filter(story =>
      this.validateBoardFirstPattern(story)
    );

    return (compliantStories.length / allStories.length) * 100;
  }

  private validateBoardFirstPattern(story: Story): boolean {
    // Validate that board was updated BEFORE first commit
    const firstCommitTime = story.commits[0]?.timestamp;
    const boardUpdateTime = story.boardUpdates.find(u => u.status === 'In Progress')?.timestamp;

    return boardUpdateTime && firstCommitTime && (boardUpdateTime < firstCommitTime);
  }
}
```

## Benefits of Board-First Execution

### 1. **Real-Time Transparency** 🔍
- Stakeholders see live progress without asking for updates
- Team members understand current work allocation
- Management has accurate project status at all times

### 2. **Agile Methodology Consistency** 📊
- Practice what we preach in agile implementation
- Proper sprint planning and tracking
- Data-driven retrospectives and improvements

### 3. **Quality Assurance** ✅
- Forces proper planning before coding
- Ensures complete DoD compliance
- Reduces "almost done" syndrome

### 4. **Process Discipline** 🎯
- Creates accountability for proper workflow
- Reduces context switching and confusion
- Establishes predictable development rhythm

### 5. **Risk Mitigation** 🛡️
- Early detection of scope creep
- Visibility into blockers and dependencies
- Historical data for better estimation

## Migration Guide for Existing Projects

### Phase 1: Setup Board Integration
1. Configure GitHub CLI with appropriate permissions
2. Set up project board with proper fields and options
3. Create board management scripts
4. Train team on GitHub CLI commands

### Phase 2: Implement Workflow
1. Start with new features/stories only
2. Gradually adopt micro-task decomposition
3. Implement automated progress tracking
4. Add quality gates and DoD validation

### Phase 3: Full Enforcement
1. Add git hooks for workflow enforcement
2. Integrate with CI/CD pipelines
3. Implement metrics tracking and reporting
4. Conduct regular workflow retrospectives

This board-first execution pattern transforms development from reactive status reporting to proactive planning and transparent execution, ensuring that every line of code has clear business justification and complete traceability.