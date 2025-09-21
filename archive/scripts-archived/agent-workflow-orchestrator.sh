#!/bin/bash

# MoneyWise Agent Workflow Orchestrator
# Implements complete agent orchestration workflow with TDD automation

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKFLOW_STATE_DIR="$PROJECT_ROOT/.workflow-state"
AGENT_SESSIONS_FILE="$WORKFLOW_STATE_DIR/agent-sessions.json"

mkdir -p "$WORKFLOW_STATE_DIR"

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case "$level" in
        "INFO")    echo -e "${GREEN}[INFO]${NC}    [$timestamp] $message" ;;
        "WARN")    echo -e "${YELLOW}[WARN]${NC}    [$timestamp] $message" ;;
        "ERROR")   echo -e "${RED}[ERROR]${NC}   [$timestamp] $message" ;;
        "SUCCESS") echo -e "${GREEN}[SUCCESS]${NC} [$timestamp] $message" ;;
        "BRAINSTORM") echo -e "${PURPLE}[BRAINSTORM]${NC} [$timestamp] $message" ;;
        "AGENT")   echo -e "${CYAN}[AGENT]${NC}   [$timestamp] $message" ;;
        "TDD")     echo -e "${BLUE}[TDD]${NC}     [$timestamp] $message" ;;
    esac
}

# Agent capability definitions
declare -A AGENT_CAPABILITIES=(
    ["architect"]="system design, technical architecture, API design, database schema"
    ["backend"]="NestJS development, API implementation, database integration, microservices"
    ["frontend"]="React/Next.js development, UI components, state management, user experience"
    ["mobile"]="React Native development, mobile UX, platform-specific features"
    ["security"]="authentication, authorization, encryption, security auditing, vulnerability assessment"
    ["performance"]="optimization, caching, database tuning, load testing, monitoring"
    ["tester"]="test automation, quality assurance, integration testing, E2E testing"
    ["devops"]="CI/CD, deployment, infrastructure, monitoring, containerization"
)

# Phase 1: Brainstorming & Planning
run_brainstorming_session() {
    local feature_name="$1"
    local feature_description="$2"
    local session_id="brainstorm-$(date +%s)"

    log "BRAINSTORM" "Starting brainstorming session for: $feature_name"

    # Create brainstorming session
    tmux new-session -d -s "$session_id" -x 120 -y 40

    # Create brainstorming workspace
    tmux send-keys -t "$session_id" "clear && echo '🧠 BRAINSTORMING SESSION: $feature_name'" Enter
    tmux send-keys -t "$session_id" "echo '================================'" Enter
    tmux send-keys -t "$session_id" "echo 'Description: $feature_description'" Enter
    tmux send-keys -t "$session_id" "echo ''" Enter

    # Phase 1.1: Feature Analysis
    log "BRAINSTORM" "Phase 1.1: Feature Analysis & Requirements Gathering"

    cat > "$WORKFLOW_STATE_DIR/brainstorm-template.md" << EOF
# Brainstorming Session: $feature_name

## Problem Statement
**Goal**: $feature_description

## Requirements Gathering
### Functional Requirements
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

### Non-Functional Requirements
- [ ] Performance:
- [ ] Security:
- [ ] Scalability:
- [ ] Usability:

## Technical Constraints
- [ ] Backward compatibility required
- [ ] Performance budget:
- [ ] Security requirements:
- [ ] Browser/device support:

## User Stories
### Primary User Story
As a [user type], I want [functionality] so that [benefit]

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Task Breakdown Structure
### Backend Tasks
- [ ] Task 1 (Agent: backend, Estimated: Xh)
- [ ] Task 2 (Agent: backend, Estimated: Xh)

### Frontend Tasks
- [ ] Task 1 (Agent: frontend, Estimated: Xh)
- [ ] Task 2 (Agent: frontend, Estimated: Xh)

### Security Tasks
- [ ] Task 1 (Agent: security, Estimated: Xh)
- [ ] Task 2 (Agent: security, Estimated: Xh)

### Testing Tasks
- [ ] Task 1 (Agent: tester, Estimated: Xh)
- [ ] Task 2 (Agent: tester, Estimated: Xh)

### Architecture Tasks
- [ ] Task 1 (Agent: architect, Estimated: Xh)
- [ ] Task 2 (Agent: architect, Estimated: Xh)

## Dependencies & Integration Points
- [ ] Dependency 1
- [ ] Dependency 2
- [ ] API Integration points
- [ ] Database schema changes

## Risk Assessment
### High Risk Items
- [ ] Risk 1: Description and mitigation
- [ ] Risk 2: Description and mitigation

### Medium Risk Items
- [ ] Risk 1: Description and mitigation

## Timeline Estimation
- Planning Phase: X hours
- Development Phase: X hours
- Testing Phase: X hours
- Integration Phase: X hours
- **Total Estimated Time**: X hours

## Success Metrics
- [ ] Metric 1: Target value
- [ ] Metric 2: Target value
- [ ] User satisfaction: Target score
- [ ] Performance impact: Target improvement

## Agent Assignment Strategy
Based on task complexity and agent capabilities:

$(for agent in "${!AGENT_CAPABILITIES[@]}"; do
    echo "- **$agent**: ${AGENT_CAPABILITIES[$agent]}"
done)

## Next Steps
1. [ ] Complete requirements review
2. [ ] Finalize task assignments
3. [ ] Create feature branches
4. [ ] Begin TDD development
5. [ ] Setup monitoring and validation
EOF

    tmux send-keys -t "$session_id" "echo 'Generated brainstorming template at: $WORKFLOW_STATE_DIR/brainstorm-template.md'" Enter
    tmux send-keys -t "$session_id" "echo 'Please complete the brainstorming template with all agent inputs'" Enter

    log "SUCCESS" "Brainstorming session created. Use: tmux attach -t $session_id"
    echo "$session_id" > "$WORKFLOW_STATE_DIR/current-brainstorm.session"

    return 0
}

# Phase 2: Agent Assignment & Branch Creation
assign_agents_and_create_branches() {
    local feature_name="$1"
    local brainstorm_file="$2"

    log "INFO" "Creating agent assignments and branches for: $feature_name"

    # Parse brainstorm file for agent assignments
    local agents_needed=$(grep -E "Agent: (backend|frontend|mobile|security|performance|tester|architect)" "$brainstorm_file" | \
                         awk -F'Agent: ' '{print $2}' | awk '{print $1}' | sort -u)

    if [ -z "$agents_needed" ]; then
        log "ERROR" "No agent assignments found in brainstorm file"
        return 1
    fi

    log "INFO" "Agents needed: $agents_needed"

    # Create future/ branches for each agent
    local base_branch="develop"
    git checkout "$base_branch"
    git pull origin "$base_branch" || true

    declare -A agent_branches

    for agent in $agents_needed; do
        local uuid=$(openssl rand -hex 4)
        local branch_name="future/${feature_name}-${agent}-${uuid}"

        log "INFO" "Creating branch: $branch_name"
        git checkout -b "$branch_name" "$base_branch"

        agent_branches["$agent"]="$branch_name"

        # Create agent worktree
        local worktree_path="$PROJECT_ROOT/../worktrees/${agent}-${feature_name}-${uuid}"
        git worktree add "$worktree_path" "$branch_name"

        log "SUCCESS" "Created branch $branch_name with worktree at $worktree_path"
    done

    # Save agent assignments
    cat > "$WORKFLOW_STATE_DIR/${feature_name}-agents.json" << EOF
{
    "feature": "$feature_name",
    "created": "$(date -Iseconds)",
    "base_branch": "$base_branch",
    "agents": {
$(for agent in "${!agent_branches[@]}"; do
    echo "        \"$agent\": {"
    echo "            \"branch\": \"${agent_branches[$agent]}\","
    echo "            \"worktree\": \"$PROJECT_ROOT/../worktrees/${agent}-${feature_name}-$(openssl rand -hex 4)\","
    echo "            \"status\": \"assigned\","
    echo "            \"capabilities\": \"${AGENT_CAPABILITIES[$agent]}\""
    echo "        }$([ "$agent" != "$(echo "${!agent_branches[@]}" | tr ' ' '\n' | tail -1)" ] && echo ",")"
done)
    }
}
EOF

    log "SUCCESS" "Agent assignments saved to: $WORKFLOW_STATE_DIR/${feature_name}-agents.json"

    return 0
}

# Phase 3: TDD Development Orchestration
start_tdd_development() {
    local feature_name="$1"
    local agents_file="$WORKFLOW_STATE_DIR/${feature_name}-agents.json"

    if [ ! -f "$agents_file" ]; then
        log "ERROR" "Agent assignments file not found: $agents_file"
        return 1
    fi

    log "INFO" "Starting TDD development for: $feature_name"

    # Create development session
    local dev_session="dev-${feature_name}"
    tmux new-session -d -s "$dev_session" -c "$PROJECT_ROOT"

    # Parse agents and create tmux windows
    local agents=$(jq -r '.agents | keys[]' "$agents_file")
    local window_count=0

    for agent in $agents; do
        local branch=$(jq -r ".agents.${agent}.branch" "$agents_file")
        local worktree=$(jq -r ".agents.${agent}.worktree" "$agents_file")

        # Create agent window
        if [ $window_count -eq 0 ]; then
            tmux rename-window -t "$dev_session:0" "$agent"
        else
            tmux new-window -t "$dev_session" -n "$agent"
        fi

        # Setup agent environment
        tmux send-keys -t "$dev_session:$agent" "cd $worktree" Enter
        tmux send-keys -t "$dev_session:$agent" "git checkout $branch" Enter
        tmux send-keys -t "$dev_session:$agent" "clear" Enter

        # Create agent development template
        cat > "$worktree/AGENT_TASKS.md" << EOF
# Agent Tasks: $agent
## Feature: $feature_name
## Branch: $branch

### Assigned Capabilities
${AGENT_CAPABILITIES[$agent]}

### TDD Development Process
1. **RED Phase**: Write failing tests first
2. **GREEN Phase**: Implement minimal code to pass tests
3. **REFACTOR Phase**: Improve code quality while maintaining tests

### Tasks from Brainstorming Session
(Copy tasks from brainstorming document)

### Development Checklist
- [ ] Setup development environment
- [ ] Write failing tests (RED)
- [ ] Implement minimal functionality (GREEN)
- [ ] Refactor and optimize (REFACTOR)
- [ ] Update documentation
- [ ] Commit with micro-commit strategy

### Quality Gates
- [ ] Code coverage ≥ 80%
- [ ] TypeScript compilation: 0 errors
- [ ] ESLint: All rules passing
- [ ] Security scan: No high/critical issues
- [ ] Performance: Meet budget requirements

### Micro-Commit Format
\`\`\`
<type>(<scope>): <description>

🎯 TDD Phase: [RED|GREEN|REFACTOR]
🤖 Agent: $agent
📋 Feature: $feature_name
📊 Progress: X%

- Specific change 1
- Specific change 2
- Backward compatibility maintained

Co-authored-by: MoneyWise-Agent-$agent <agents@moneywise.dev>
\`\`\`
EOF

        tmux send-keys -t "$dev_session:$agent" "echo '🤖 Agent $agent workspace ready for TDD development'" Enter
        tmux send-keys -t "$dev_session:$agent" "echo 'Tasks: cat AGENT_TASKS.md'" Enter

        ((window_count++))
    done

    # Create coordination window
    tmux new-window -t "$dev_session" -n "coordination"
    tmux send-keys -t "$dev_session:coordination" "cd $PROJECT_ROOT" Enter
    tmux send-keys -t "$dev_session:coordination" "echo '🎯 Development Coordination Center'" Enter
    tmux send-keys -t "$dev_session:coordination" "echo 'Monitor: ./scripts/orchestra-monitor.sh watch'" Enter
    tmux send-keys -t "$dev_session:coordination" "echo 'Micro-commits: ./scripts/agent-micro-commit.sh commit'" Enter

    log "SUCCESS" "TDD development session started: tmux attach -t $dev_session"
    echo "$dev_session" > "$WORKFLOW_STATE_DIR/current-dev.session"

    # Start automated monitoring
    ./scripts/agent-tdd-automation.sh start &

    return 0
}

# Phase 4: Post-Completion Validation
run_post_completion_validation() {
    local feature_name="$1"
    local agents_file="$WORKFLOW_STATE_DIR/${feature_name}-agents.json"

    log "INFO" "Starting post-completion validation for: $feature_name"

    # Create validation session
    local validation_session="validation-${feature_name}"
    tmux new-session -d -s "$validation_session" -c "$PROJECT_ROOT"

    # Comprehensive validation checks
    tmux send-keys -t "$validation_session" "echo '🔍 POST-COMPLETION VALIDATION: $feature_name'" Enter
    tmux send-keys -t "$validation_session" "echo '=========================================='" Enter

    # Technical validation
    log "INFO" "Running technical validation..."

    cat > "$WORKFLOW_STATE_DIR/validation-checklist.md" << EOF
# Post-Completion Validation: $feature_name

## Technical Validation
### Code Quality
- [ ] All tests passing (100% green)
- [ ] Code coverage ≥ 80%
- [ ] No TypeScript errors
- [ ] ESLint rules satisfied
- [ ] Security scan passed

### Integration Testing
- [ ] API endpoints tested
- [ ] Database migrations work
- [ ] Frontend components render
- [ ] Mobile app builds successfully (if applicable)

### Performance & Compatibility
- [ ] Performance budgets met
- [ ] Backward compatibility maintained
- [ ] No breaking changes
- [ ] Documentation updated

## Cross-Agent Review
### Code Review Sessions
- [ ] Backend code reviewed by architect
- [ ] Frontend code reviewed by UX specialist
- [ ] Security implementation reviewed by security agent
- [ ] Performance optimizations reviewed

### Integration Points
- [ ] API contracts validated
- [ ] Database schema changes reviewed
- [ ] Component interfaces verified
- [ ] Error handling consistent

## Conflict Resolution
### Identified Conflicts
- [ ] Merge conflicts resolved
- [ ] API naming conflicts resolved
- [ ] Database migration conflicts resolved
- [ ] Styling conflicts resolved

### Resolution Strategies
- [ ] Conflicts documented
- [ ] Resolution approach agreed upon
- [ ] Testing of resolutions completed

## Value Addition Verification
### Business Impact
- [ ] User stories satisfied
- [ ] Acceptance criteria met
- [ ] Business value quantified

### Technical Impact
- [ ] No technical debt introduced
- [ ] Maintainability improved/maintained
- [ ] Scalability considerations addressed

## Final Approval
### Agent Sign-offs
- [ ] Backend agent approval
- [ ] Frontend agent approval
- [ ] Security agent approval
- [ ] Architect approval
- [ ] Tester approval

### Integration Readiness
- [ ] Ready for develop branch merge
- [ ] CI/CD pipeline will pass
- [ ] No blocking issues identified

## Post-Merge Plan
- [ ] Monitor performance metrics
- [ ] Watch for error reports
- [ ] User feedback collection plan
- [ ] Rollback plan if needed
EOF

    tmux send-keys -t "$validation_session" "echo 'Validation checklist created: $WORKFLOW_STATE_DIR/validation-checklist.md'" Enter
    tmux send-keys -t "$validation_session" "echo 'Please complete all validation steps before merging to develop'" Enter

    log "SUCCESS" "Validation session created: tmux attach -t $validation_session"
    echo "$validation_session" > "$WORKFLOW_STATE_DIR/current-validation.session"

    return 0
}

# Phase 5: Integration to Develop Branch
integrate_to_develop() {
    local feature_name="$1"
    local agents_file="$WORKFLOW_STATE_DIR/${feature_name}-agents.json"

    log "INFO" "Starting integration to develop branch for: $feature_name"

    # Verify validation completed
    local validation_file="$WORKFLOW_STATE_DIR/validation-checklist.md"
    if [ ! -f "$validation_file" ]; then
        log "ERROR" "Validation checklist not found. Run validation first."
        return 1
    fi

    # Check if all validations are complete
    local incomplete_items=$(grep -c "- \[ \]" "$validation_file" || echo 0)
    if [ "$incomplete_items" -gt 0 ]; then
        log "WARN" "$incomplete_items validation items still incomplete"
        read -p "Continue with integration? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "INFO" "Integration cancelled by user"
            return 1
        fi
    fi

    # Create integration branch
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local integration_branch="integrate/${feature_name}-${timestamp}"

    git checkout develop
    git pull origin develop
    git checkout -b "$integration_branch"

    # Merge all agent branches
    local agents=$(jq -r '.agents | keys[]' "$agents_file")

    for agent in $agents; do
        local branch=$(jq -r ".agents.${agent}.branch" "$agents_file")

        log "INFO" "Merging $agent branch: $branch"

        if git merge "$branch" --no-ff -m "feat($agent): integrate $feature_name $agent implementation

🎯 Feature: $feature_name
🤖 Agent: $agent
📋 Integration: All validation gates passed
🛡️ Backward compatibility: Maintained

Co-authored-by: MoneyWise-Agent-$agent <agents@moneywise.dev>"; then
            log "SUCCESS" "Successfully merged $branch"
        else
            log "ERROR" "Merge conflict in $branch - manual resolution required"
            return 1
        fi
    done

    # Run integration tests
    log "INFO" "Running comprehensive integration tests..."

    if npm run test:all && npm run test:integration && npm run lint && npm run type-check; then
        log "SUCCESS" "All integration tests passed"
    else
        log "ERROR" "Integration tests failed - check logs"
        return 1
    fi

    # Merge to develop
    git checkout develop
    git merge "$integration_branch" --no-ff -m "feat: integrate $feature_name

🎯 Feature: $feature_name complete
📊 All agents: $(echo $agents | tr '\n' ', ')
🛡️ Quality gates: All passed
📋 Ready for production pipeline

Integrated from: $integration_branch"

    # Push to remote
    git push origin develop

    log "SUCCESS" "Feature $feature_name successfully integrated to develop branch"

    # Cleanup agent branches
    for agent in $agents; do
        local branch=$(jq -r ".agents.${agent}.branch" "$agents_file")
        local worktree=$(jq -r ".agents.${agent}.worktree" "$agents_file")

        git branch -d "$branch"
        git push origin --delete "$branch" || true

        if [ -d "$worktree" ]; then
            git worktree remove "$worktree"
        fi

        log "INFO" "Cleaned up $agent branch: $branch"
    done

    # Archive workflow state
    mkdir -p "$WORKFLOW_STATE_DIR/completed"
    mv "$agents_file" "$WORKFLOW_STATE_DIR/completed/"
    mv "$validation_file" "$WORKFLOW_STATE_DIR/completed/"

    log "SUCCESS" "Workflow completed and archived for: $feature_name"

    return 0
}

# Main execution logic
main() {
    local command="${1:-help}"
    local feature_name="${2:-}"
    local feature_description="${3:-}"

    case "$command" in
        "brainstorm")
            if [ -z "$feature_name" ] || [ -z "$feature_description" ]; then
                log "ERROR" "Usage: $0 brainstorm <feature_name> \"<feature_description>\""
                exit 1
            fi
            run_brainstorming_session "$feature_name" "$feature_description"
            ;;
        "assign")
            if [ -z "$feature_name" ]; then
                log "ERROR" "Usage: $0 assign <feature_name> [brainstorm_file]"
                exit 1
            fi
            local brainstorm_file="${3:-$WORKFLOW_STATE_DIR/brainstorm-template.md}"
            assign_agents_and_create_branches "$feature_name" "$brainstorm_file"
            ;;
        "develop")
            if [ -z "$feature_name" ]; then
                log "ERROR" "Usage: $0 develop <feature_name>"
                exit 1
            fi
            start_tdd_development "$feature_name"
            ;;
        "validate")
            if [ -z "$feature_name" ]; then
                log "ERROR" "Usage: $0 validate <feature_name>"
                exit 1
            fi
            run_post_completion_validation "$feature_name"
            ;;
        "integrate")
            if [ -z "$feature_name" ]; then
                log "ERROR" "Usage: $0 integrate <feature_name>"
                exit 1
            fi
            integrate_to_develop "$feature_name"
            ;;
        "full-workflow")
            if [ -z "$feature_name" ] || [ -z "$feature_description" ]; then
                log "ERROR" "Usage: $0 full-workflow <feature_name> \"<feature_description>\""
                exit 1
            fi
            log "INFO" "Starting complete workflow for: $feature_name"
            run_brainstorming_session "$feature_name" "$feature_description"
            echo "Complete brainstorming template and run: $0 assign $feature_name"
            ;;
        *)
            echo "MoneyWise Agent Workflow Orchestrator"
            echo "Usage: $0 <command> [options]"
            echo ""
            echo "Commands:"
            echo "  brainstorm <feature_name> \"<description>\"  - Start brainstorming session"
            echo "  assign <feature_name> [brainstorm_file]     - Assign agents and create branches"
            echo "  develop <feature_name>                      - Start TDD development"
            echo "  validate <feature_name>                     - Run post-completion validation"
            echo "  integrate <feature_name>                    - Integrate to develop branch"
            echo "  full-workflow <feature_name> \"<description>\" - Complete end-to-end workflow"
            echo ""
            echo "Workflow Phases:"
            echo "  1. Brainstorming & Planning"
            echo "  2. Agent Assignment & Branch Creation"
            echo "  3. TDD Development"
            echo "  4. Post-Completion Validation"
            echo "  5. Integration to Develop Branch"
            ;;
    esac
}

main "$@"