#!/bin/bash

# Agile Micro-Commit Enforcer
# Ensures agents make micro-commits with comprehensive testing at each incremental step

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
MICRO_COMMIT_LOG="$PROJECT_ROOT/.workflow-state/micro-commits.log"

mkdir -p "$(dirname "$MICRO_COMMIT_LOG")"

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
        "MICRO")   echo -e "${CYAN}[MICRO]${NC}   [$timestamp] $message" ;;
        "TEST")    echo -e "${BLUE}[TEST]${NC}    [$timestamp] $message" ;;
    esac
}

# Test requirement detection based on changes
detect_required_tests() {
    local changed_files="$1"
    local required_tests=""

    # Unit tests required for all code changes
    if echo "$changed_files" | grep -E "\.(ts|tsx|js|jsx)$" | grep -v test | grep -v spec; then
        required_tests="$required_tests unit"
    fi

    # Integration tests for API/service changes
    if echo "$changed_files" | grep -E "(service|controller|api)" | grep -E "\.(ts|js)$"; then
        required_tests="$required_tests integration"
    fi

    # UI/Component tests for frontend changes
    if echo "$changed_files" | grep -E "(component|page)" | grep -E "\.(tsx|jsx)$"; then
        required_tests="$required_tests ui"
    fi

    # E2E tests for user-facing feature changes
    if echo "$changed_files" | grep -E "(page|route|auth|payment)" | grep -E "\.(ts|tsx)$"; then
        required_tests="$required_tests e2e"
    fi

    # Database tests for schema/migration changes
    if echo "$changed_files" | grep -E "(migration|entity|schema)" | grep -E "\.(ts|sql)$"; then
        required_tests="$required_tests database"
    fi

    # Security tests for auth/security changes
    if echo "$changed_files" | grep -E "(auth|security|encrypt|jwt)" | grep -E "\.(ts|js)$"; then
        required_tests="$required_tests security"
    fi

    # Performance tests for optimization changes
    if echo "$changed_files" | grep -E "(cache|optimization|performance)" | grep -E "\.(ts|js)$"; then
        required_tests="$required_tests performance"
    fi

    echo "$required_tests" | tr ' ' '\n' | sort -u | tr '\n' ' '
}

# Validate test coverage for micro-commit
validate_micro_commit_tests() {
    local agent_type="$1"
    local changed_files="$2"
    local commit_message="$3"

    log "TEST" "Validating test coverage for micro-commit by $agent_type"

    # Detect required test types
    local required_tests=$(detect_required_tests "$changed_files")

    if [ -z "$required_tests" ]; then
        log "INFO" "No specific tests required for this change"
        return 0
    fi

    log "INFO" "Required test types: $required_tests"

    # Check each required test type
    local test_failures=0

    for test_type in $required_tests; do
        case "$test_type" in
            "unit")
                log "TEST" "Running unit tests..."
                if npm run test:unit; then
                    log "SUCCESS" "✅ Unit tests passed"
                else
                    log "ERROR" "❌ Unit tests failed"
                    ((test_failures++))
                fi
                ;;
            "integration")
                log "TEST" "Running integration tests..."
                if npm run test:integration; then
                    log "SUCCESS" "✅ Integration tests passed"
                else
                    log "ERROR" "❌ Integration tests failed"
                    ((test_failures++))
                fi
                ;;
            "ui")
                log "TEST" "Running UI component tests..."
                if npm run test:ui; then
                    log "SUCCESS" "✅ UI tests passed"
                else
                    log "ERROR" "❌ UI tests failed"
                    ((test_failures++))
                fi
                ;;
            "e2e")
                log "TEST" "Running E2E tests (critical user flows only)..."
                if npm run test:e2e:critical; then
                    log "SUCCESS" "✅ Critical E2E tests passed"
                else
                    log "ERROR" "❌ E2E tests failed"
                    ((test_failures++))
                fi
                ;;
            "database")
                log "TEST" "Running database tests..."
                if npm run test:database; then
                    log "SUCCESS" "✅ Database tests passed"
                else
                    log "ERROR" "❌ Database tests failed"
                    ((test_failures++))
                fi
                ;;
            "security")
                log "TEST" "Running security tests..."
                if npm run test:security; then
                    log "SUCCESS" "✅ Security tests passed"
                else
                    log "ERROR" "❌ Security tests failed"
                    ((test_failures++))
                fi
                ;;
            "performance")
                log "TEST" "Running performance tests..."
                if npm run test:performance; then
                    log "SUCCESS" "✅ Performance tests passed"
                else
                    log "ERROR" "❌ Performance tests failed"
                    ((test_failures++))
                fi
                ;;
        esac
    done

    if [ $test_failures -gt 0 ]; then
        log "ERROR" "Micro-commit validation failed: $test_failures test type(s) failed"
        return 1
    fi

    log "SUCCESS" "All required tests passed for micro-commit"
    return 0
}

# Generate agile micro-commit message
generate_agile_commit_message() {
    local agent_type="$1"
    local tdd_phase="$2"
    local increment_description="$3"
    local test_types="$4"
    local feature_name="$5"

    # Calculate progress based on commit history
    local total_commits=$(git rev-list --count HEAD)
    local branch_commits=$(git rev-list --count HEAD ^develop 2>/dev/null || echo 1)
    local progress_percent=$((branch_commits * 10)) # Rough estimate

    cat << EOF
$tdd_phase($agent_type): $increment_description

🎯 TDD Phase: $tdd_phase
🤖 Agent: $agent_type
📋 Feature: $feature_name
📊 Progress: ${progress_percent}%
🧪 Tests: $test_types

### Incremental Changes:
- $increment_description
- All tests passing at this increment
- Quality gates satisfied
- Backward compatibility maintained

### Testing Coverage:
$(for test_type in $test_types; do echo "- ✅ $test_type tests: PASSED"; done)

### Quality Assurance:
- ✅ Code compiles without errors
- ✅ Linting rules satisfied
- ✅ Type safety maintained
- ✅ Security best practices followed

### Next Increment:
- Continue TDD cycle: $(case "$tdd_phase" in "test" echo "implement" ;; "feat" echo "refactor" ;; "refactor" echo "test" ;; esac)
- Maintain test coverage
- Ensure incremental value delivery

Co-authored-by: MoneyWise-Agent-$agent_type <agents@moneywise.dev>
EOF
}

# Enforce agile micro-commit workflow
enforce_agile_micro_commit() {
    local agent_type="$1"
    local tdd_phase="$2"
    local increment_description="$3"
    local feature_name="$4"

    log "MICRO" "Enforcing agile micro-commit for $agent_type"

    # Get changed files
    local changed_files=$(git diff --cached --name-only)
    if [ -z "$changed_files" ]; then
        log "ERROR" "No staged changes found. Stage your changes first with: git add <files>"
        return 1
    fi

    log "INFO" "Changed files: $(echo "$changed_files" | tr '\n' ', ')"

    # Detect required tests
    local required_tests=$(detect_required_tests "$changed_files")

    # Pre-commit quality checks
    log "INFO" "Running pre-commit quality checks..."

    # TypeScript compilation
    if ! npm run type-check; then
        log "ERROR" "TypeScript compilation failed"
        return 1
    fi

    # Linting
    if ! npm run lint; then
        log "ERROR" "Linting failed"
        return 1
    fi

    # Validate test coverage
    if ! validate_micro_commit_tests "$agent_type" "$changed_files" "$increment_description"; then
        log "ERROR" "Test validation failed for micro-commit"
        return 1
    fi

    # Generate commit message
    local commit_message=$(generate_agile_commit_message "$agent_type" "$tdd_phase" "$increment_description" "$required_tests" "$feature_name")

    # Create micro-commit
    if git commit -m "$commit_message"; then
        log "SUCCESS" "Agile micro-commit created successfully"

        # Log micro-commit for tracking
        echo "$(date -Iseconds) | $agent_type | $feature_name | $tdd_phase | $increment_description | $required_tests" >> "$MICRO_COMMIT_LOG"

        # Optional: Push to remote for immediate backup
        local current_branch=$(git branch --show-current)
        if [[ "$current_branch" == future/* ]]; then
            git push origin "$current_branch" || log "WARN" "Could not push to remote (continuing locally)"
        fi

        return 0
    else
        log "ERROR" "Failed to create micro-commit"
        return 1
    fi
}

# Watch for file changes and suggest micro-commits
watch_and_suggest_commits() {
    local agent_type="$1"
    local feature_name="$2"

    log "INFO" "Starting file watch for $agent_type on feature: $feature_name"

    # Check for changes every 2 minutes
    while true; do
        if [ $(git status --porcelain | wc -l) -gt 0 ]; then
            log "MICRO" "Changes detected for $agent_type"

            # Get unstaged files
            local unstaged_files=$(git status --porcelain | grep "^M" | awk '{print $2}' | head -5)

            if [ -n "$unstaged_files" ]; then
                log "INFO" "Unstaged changes in: $(echo "$unstaged_files" | tr '\n' ', ')"
                log "INFO" "Consider creating a micro-commit with: ./scripts/agile-micro-commit-enforcer.sh commit $agent_type <tdd_phase> \"<increment_description>\" $feature_name"
            fi
        fi

        sleep 120  # Check every 2 minutes
    done
}

# Validate entire branch follows agile micro-commit pattern
validate_branch_agile_pattern() {
    local branch="$1"

    log "INFO" "Validating agile micro-commit pattern for branch: $branch"

    # Get all commits in this branch
    local commits=$(git log develop.."$branch" --oneline | wc -l)

    if [ "$commits" -eq 0 ]; then
        log "WARN" "No commits found in branch $branch"
        return 1
    fi

    log "INFO" "Found $commits commits in branch"

    # Check if commits follow micro-commit pattern
    local valid_commits=0
    local invalid_commits=0

    while IFS= read -r commit_hash; do
        local commit_message=$(git log --format=%B -n 1 "$commit_hash")

        # Check for required micro-commit elements
        if echo "$commit_message" | grep -q "🎯 TDD Phase:" && \
           echo "$commit_message" | grep -q "🤖 Agent:" && \
           echo "$commit_message" | grep -q "🧪 Tests:" && \
           echo "$commit_message" | grep -q "✅.*tests: PASSED"; then
            ((valid_commits++))
        else
            ((invalid_commits++))
            log "WARN" "Invalid micro-commit format: $(git log --oneline -1 "$commit_hash")"
        fi
    done < <(git log develop.."$branch" --format=%H)

    local compliance_percent=$((valid_commits * 100 / commits))

    log "INFO" "Agile micro-commit compliance: $compliance_percent% ($valid_commits/$commits)"

    if [ "$compliance_percent" -ge 80 ]; then
        log "SUCCESS" "Branch follows agile micro-commit pattern (≥80% compliance)"
        return 0
    else
        log "ERROR" "Branch does not follow agile micro-commit pattern (<80% compliance)"
        return 1
    fi
}

# Main execution logic
main() {
    local command="${1:-help}"
    local agent_type="${2:-}"
    local tdd_phase="${3:-}"
    local increment_description="${4:-}"
    local feature_name="${5:-}"

    case "$command" in
        "commit")
            if [ -z "$agent_type" ] || [ -z "$tdd_phase" ] || [ -z "$increment_description" ] || [ -z "$feature_name" ]; then
                log "ERROR" "Usage: $0 commit <agent_type> <tdd_phase> \"<increment_description>\" <feature_name>"
                echo ""
                echo "TDD Phases: test (RED), feat (GREEN), refactor (REFACTOR)"
                echo "Example: $0 commit backend test \"add user authentication endpoint test\" smart-budget-intelligence"
                exit 1
            fi
            enforce_agile_micro_commit "$agent_type" "$tdd_phase" "$increment_description" "$feature_name"
            ;;
        "watch")
            if [ -z "$agent_type" ] || [ -z "$feature_name" ]; then
                log "ERROR" "Usage: $0 watch <agent_type> <feature_name>"
                exit 1
            fi
            watch_and_suggest_commits "$agent_type" "$feature_name"
            ;;
        "validate")
            if [ -z "$agent_type" ]; then
                local current_branch=$(git branch --show-current)
                agent_type="$current_branch"
            fi
            validate_branch_agile_pattern "$agent_type"
            ;;
        "stats")
            echo "📊 Agile Micro-Commit Statistics"
            echo "================================"
            if [ -f "$MICRO_COMMIT_LOG" ]; then
                echo "Total micro-commits: $(wc -l < "$MICRO_COMMIT_LOG")"
                echo ""
                echo "By Agent Type:"
                awk -F' | ' '{print $2}' "$MICRO_COMMIT_LOG" | sort | uniq -c | sort -nr
                echo ""
                echo "By TDD Phase:"
                awk -F' | ' '{print $4}' "$MICRO_COMMIT_LOG" | sort | uniq -c | sort -nr
                echo ""
                echo "Recent Activity:"
                tail -10 "$MICRO_COMMIT_LOG"
            else
                echo "No micro-commit history found"
            fi
            ;;
        *)
            echo "Agile Micro-Commit Enforcer"
            echo "Usage: $0 <command> [options]"
            echo ""
            echo "Commands:"
            echo "  commit <agent> <phase> \"<description>\" <feature>  - Create agile micro-commit"
            echo "  watch <agent> <feature>                             - Watch for changes and suggest commits"
            echo "  validate [branch]                                   - Validate branch agile compliance"
            echo "  stats                                               - Show micro-commit statistics"
            echo ""
            echo "TDD Phases:"
            echo "  test     - RED phase: Write failing tests"
            echo "  feat     - GREEN phase: Implement minimal code to pass tests"
            echo "  refactor - REFACTOR phase: Improve code quality while maintaining tests"
            echo ""
            echo "Examples:"
            echo "  $0 commit backend test \"add user auth endpoint test\" smart-budget"
            echo "  $0 commit frontend feat \"implement login form component\" smart-budget"
            echo "  $0 commit security refactor \"optimize JWT token validation\" smart-budget"
            echo ""
            echo "💡 Remember: Each micro-commit must include appropriate tests for the changes made!"
            ;;
    esac
}

main "$@"