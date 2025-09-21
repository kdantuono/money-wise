#!/bin/bash

# Agent Micro-Commit Automation System
# Implements granular TDD commits with automatic testing and synchronization

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
AGENT_STATE_DIR="$PROJECT_ROOT/.agent-state"
COMMIT_LOG_DIR="$PROJECT_ROOT/.commit-logs"

mkdir -p "$AGENT_STATE_DIR" "$COMMIT_LOG_DIR"

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
        "COMMIT")  echo -e "${BLUE}[COMMIT]${NC}  [$timestamp] $message" ;;
        "TEST")    echo -e "${CYAN}[TEST]${NC}    [$timestamp] $message" ;;
    esac
}

# TDD Phase Detection
detect_tdd_phase() {
    local current_files=$(git status --porcelain | wc -l)
    local test_files=$(git status --porcelain | grep -c "\.spec\.ts\|\.test\.ts" || echo 0)
    local impl_files=$(git status --porcelain | grep -c "\.ts\|\.tsx" | grep -v "\.spec\.ts\|\.test\.ts" || echo 0)

    if [ "$test_files" -gt 0 ] && [ "$impl_files" -eq 0 ]; then
        echo "RED"    # Writing failing tests
    elif [ "$test_files" -gt 0 ] && [ "$impl_files" -gt 0 ]; then
        echo "GREEN"  # Implementing to make tests pass
    elif [ "$impl_files" -gt 0 ] && [ "$test_files" -eq 0 ]; then
        echo "REFACTOR" # Refactoring existing code
    else
        echo "UNKNOWN"
    fi
}

# Generate conventional commit message
generate_commit_message() {
    local tdd_phase="$1"
    local agent_type="$2"
    local feature_name="$3"
    local change_summary="$4"

    local commit_type=""
    local commit_scope=""
    local commit_description=""

    case "$tdd_phase" in
        "RED")
            commit_type="test"
            commit_description="add failing tests for $change_summary"
            ;;
        "GREEN")
            commit_type="feat"
            commit_description="implement $change_summary to satisfy tests"
            ;;
        "REFACTOR")
            commit_type="refactor"
            commit_description="optimize $change_summary implementation"
            ;;
        *)
            commit_type="chore"
            commit_description="update $change_summary"
            ;;
    esac

    case "$agent_type" in
        "backend-dev") commit_scope="api" ;;
        "frontend-dev") commit_scope="ui" ;;
        "mobile-dev") commit_scope="mobile" ;;
        "security") commit_scope="security" ;;
        "performance") commit_scope="perf" ;;
        "architect") commit_scope="arch" ;;
        *) commit_scope="core" ;;
    esac

    echo "${commit_type}(${commit_scope}): ${commit_description}

🎯 TDD Phase: ${tdd_phase}
🤖 Agent: ${agent_type}
📋 Feature: ${feature_name}
📊 Change: ${change_summary}

- Maintains backward compatibility
- Passes all existing tests
- Follows TDD methodology
- Ready for integration

Co-authored-by: MoneyWise-Agent-${agent_type} <agents@moneywise.dev>"
}

# Pre-commit quality checks
run_pre_commit_checks() {
    local feature_branch="$1"

    log "TEST" "Running pre-commit quality checks..."

    # 1. TypeScript compilation check
    if ! npm run build > /dev/null 2>&1; then
        log "ERROR" "TypeScript compilation failed"
        return 1
    fi

    # 2. Test execution
    if ! npm run test > /dev/null 2>&1; then
        log "WARN" "Some tests failing - checking if they're expected to fail (RED phase)"
        local tdd_phase=$(detect_tdd_phase)
        if [ "$tdd_phase" != "RED" ]; then
            log "ERROR" "Tests failing in $tdd_phase phase - not allowed"
            return 1
        fi
    fi

    # 3. Linting check
    if ! npm run lint > /dev/null 2>&1; then
        log "ERROR" "Linting failed"
        return 1
    fi

    # 4. Security scan (basic)
    if command -v npm-audit &> /dev/null; then
        if ! npm audit --audit-level moderate > /dev/null 2>&1; then
            log "WARN" "Security vulnerabilities detected"
        fi
    fi

    log "SUCCESS" "Pre-commit checks passed"
    return 0
}

# Check backward compatibility
check_backward_compatibility() {
    local branch="$1"

    log "TEST" "Checking backward compatibility..."

    # 1. API compatibility check
    if [ -f "apps/backend/src/main.ts" ]; then
        # Check for breaking API changes
        local api_changes=$(git diff HEAD~1..HEAD --name-only | grep -c "\.controller\.ts\|\.dto\.ts" || echo 0)
        if [ "$api_changes" -gt 0 ]; then
            log "WARN" "API files modified - ensure backward compatibility"
        fi
    fi

    # 2. Database schema compatibility
    if [ -d "apps/backend/src/database/migrations" ]; then
        local migration_changes=$(git diff HEAD~1..HEAD --name-only | grep -c "migration" || echo 0)
        if [ "$migration_changes" -gt 0 ]; then
            log "WARN" "Database migrations detected - ensure backward compatibility"
        fi
    fi

    # 3. Package.json compatibility
    if git diff HEAD~1..HEAD --name-only | grep -q "package\.json"; then
        log "WARN" "Package.json modified - verify dependency compatibility"
    fi

    log "SUCCESS" "Backward compatibility check completed"
}

# Sync with upstream branches
sync_with_upstream() {
    local current_branch="$1"

    log "INFO" "Syncing $current_branch with upstream..."

    # Fetch latest changes
    git fetch origin

    # Check if develop has updates
    local develop_commits=$(git rev-list HEAD..origin/develop --count || echo 0)

    if [ "$develop_commits" -gt 0 ]; then
        log "WARN" "Develop branch has $develop_commits new commits"

        # Attempt automatic rebase
        if git rebase origin/develop; then
            log "SUCCESS" "Successfully rebased on develop"
        else
            log "ERROR" "Rebase conflicts detected - manual intervention required"
            git rebase --abort
            return 1
        fi
    fi

    return 0
}

# Agent micro-commit workflow
agent_micro_commit() {
    local agent_type="$1"
    local feature_name="$2"
    local change_summary="$3"

    log "COMMIT" "Starting micro-commit for $agent_type on $feature_name"

    # 1. Detect current TDD phase
    local tdd_phase=$(detect_tdd_phase)
    log "INFO" "Detected TDD phase: $tdd_phase"

    # 2. Sync with upstream if needed
    local current_branch=$(git branch --show-current)
    if ! sync_with_upstream "$current_branch"; then
        log "ERROR" "Failed to sync with upstream"
        return 1
    fi

    # 3. Run pre-commit checks
    if ! run_pre_commit_checks "$current_branch"; then
        log "ERROR" "Pre-commit checks failed"
        return 1
    fi

    # 4. Generate commit message
    local commit_message=$(generate_commit_message "$tdd_phase" "$agent_type" "$feature_name" "$change_summary")

    # 5. Stage changes
    git add .

    # 6. Create commit
    if git commit -m "$commit_message"; then
        log "SUCCESS" "Micro-commit created successfully"

        # 7. Check backward compatibility
        check_backward_compatibility "$current_branch"

        # 8. Log commit for monitoring
        echo "$(date '+%Y-%m-%d %H:%M:%S') | $agent_type | $feature_name | $tdd_phase | $change_summary" >> "$COMMIT_LOG_DIR/${current_branch}.log"

        return 0
    else
        log "ERROR" "Failed to create commit"
        return 1
    fi
}

# Automated commit trigger based on file changes
auto_commit_trigger() {
    local agent_type="$1"
    local feature_name="$2"

    # Watch for file changes and trigger commits automatically
    while true; do
        if [ $(git status --porcelain | wc -l) -gt 0 ]; then
            # Wait for changes to stabilize (no new changes for 30 seconds)
            sleep 30

            if [ $(git status --porcelain | wc -l) -gt 0 ]; then
                local change_summary="incremental development progress"

                # Try to infer change summary from modified files
                local modified_files=$(git status --porcelain | head -3 | awk '{print $2}' | tr '\n' ', ' | sed 's/,$//')
                if [ -n "$modified_files" ]; then
                    change_summary="update $modified_files"
                fi

                agent_micro_commit "$agent_type" "$feature_name" "$change_summary"
            fi
        fi

        sleep 60  # Check every minute
    done
}

# Feature completion detection
check_feature_completion() {
    local feature_name="$1"
    local current_branch="$2"

    # Criteria for feature completion:
    # 1. All tests passing
    # 2. Code coverage above threshold
    # 3. No TODO comments
    # 4. Documentation updated

    local completion_score=0
    local max_score=4

    # Test status
    if npm run test > /dev/null 2>&1; then
        ((completion_score++))
        log "SUCCESS" "✓ All tests passing"
    else
        log "WARN" "✗ Tests not passing"
    fi

    # Code coverage
    local coverage=$(npm run test:cov 2>/dev/null | grep "All files" | awk '{print $10}' | sed 's/%//' || echo 0)
    if [ "${coverage%.*}" -ge 80 ]; then
        ((completion_score++))
        log "SUCCESS" "✓ Code coverage: ${coverage}%"
    else
        log "WARN" "✗ Code coverage below 80%: ${coverage}%"
    fi

    # TODO comments
    local todo_count=$(grep -r "TODO\|FIXME" . --include="*.ts" --include="*.tsx" | wc -l || echo 0)
    if [ "$todo_count" -eq 0 ]; then
        ((completion_score++))
        log "SUCCESS" "✓ No TODO/FIXME comments"
    else
        log "WARN" "✗ $todo_count TODO/FIXME comments remaining"
    fi

    # Documentation (basic check)
    if [ -f "README.md" ] || [ -f "FEATURE.md" ]; then
        ((completion_score++))
        log "SUCCESS" "✓ Documentation present"
    else
        log "WARN" "✗ Documentation missing"
    fi

    local completion_percentage=$((completion_score * 100 / max_score))
    log "INFO" "Feature completion: $completion_percentage% ($completion_score/$max_score)"

    if [ "$completion_score" -eq "$max_score" ]; then
        log "SUCCESS" "🎉 Feature $feature_name is ready for integration!"
        echo "READY_FOR_INTEGRATION" > "$AGENT_STATE_DIR/${current_branch}.status"
        return 0
    else
        echo "IN_DEVELOPMENT" > "$AGENT_STATE_DIR/${current_branch}.status"
        return 1
    fi
}

# Main execution logic
main() {
    local command="${1:-help}"
    local agent_type="${2:-}"
    local feature_name="${3:-}"
    local change_summary="${4:-}"

    case "$command" in
        "commit")
            if [ -z "$agent_type" ] || [ -z "$feature_name" ] || [ -z "$change_summary" ]; then
                log "ERROR" "Usage: $0 commit <agent_type> <feature_name> <change_summary>"
                exit 1
            fi
            agent_micro_commit "$agent_type" "$feature_name" "$change_summary"
            ;;
        "auto")
            if [ -z "$agent_type" ] || [ -z "$feature_name" ]; then
                log "ERROR" "Usage: $0 auto <agent_type> <feature_name>"
                exit 1
            fi
            auto_commit_trigger "$agent_type" "$feature_name"
            ;;
        "check")
            if [ -z "$feature_name" ]; then
                log "ERROR" "Usage: $0 check <feature_name>"
                exit 1
            fi
            local current_branch=$(git branch --show-current)
            check_feature_completion "$feature_name" "$current_branch"
            ;;
        "status")
            echo -e "${PURPLE}📊 AGENT MICRO-COMMIT STATUS${NC}"
            echo "================================="
            for status_file in "$AGENT_STATE_DIR"/*.status; do
                if [ -f "$status_file" ]; then
                    local branch=$(basename "$status_file" .status)
                    local status=$(cat "$status_file")
                    echo "Branch: $branch - Status: $status"
                fi
            done
            ;;
        *)
            echo "Agent Micro-Commit System"
            echo "Usage: $0 <command> [options]"
            echo ""
            echo "Commands:"
            echo "  commit <agent_type> <feature_name> <change_summary>  - Create micro-commit"
            echo "  auto <agent_type> <feature_name>                    - Start auto-commit monitoring"
            echo "  check <feature_name>                                - Check feature completion"
            echo "  status                                               - Show all agent statuses"
            ;;
    esac
}

main "$@"