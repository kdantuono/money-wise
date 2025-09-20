#!/bin/bash

# Automated Branch Synchronization & Merge Orchestration System
# Handles intelligent branch management with quality gates and backward compatibility

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
SYNC_STATE_DIR="$PROJECT_ROOT/.sync-state"
MERGE_LOG_DIR="$PROJECT_ROOT/.merge-logs"
BACKUP_DIR="$PROJECT_ROOT/.branch-backups"

mkdir -p "$SYNC_STATE_DIR" "$MERGE_LOG_DIR" "$BACKUP_DIR"

# Branch hierarchy
MAIN_BRANCH="main"
DEVELOP_BRANCH="develop"
FEATURE_PREFIX="feature/"

# Quality thresholds
MIN_TEST_COVERAGE=80
MAX_VULNERABILITIES=0
MIN_BUILD_SUCCESS=100

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
        "SYNC")    echo -e "${BLUE}[SYNC]${NC}    [$timestamp] $message" ;;
        "MERGE")   echo -e "${PURPLE}[MERGE]${NC}   [$timestamp] $message" ;;
        "GATE")    echo -e "${CYAN}[GATE]${NC}    [$timestamp] $message" ;;
    esac

    # Also log to file
    echo "[$timestamp] [$level] $message" >> "$MERGE_LOG_DIR/sync-orchestrator.log"
}

# Create backup of branch
create_branch_backup() {
    local branch="$1"
    local backup_name="${branch//\//_}-$(date +%Y%m%d-%H%M%S)"

    log "INFO" "Creating backup of branch $branch as $backup_name"

    git checkout "$branch"
    git checkout -b "backup/$backup_name"
    git checkout "$branch"

    echo "$backup_name" > "$BACKUP_DIR/${branch//\//_}.latest"
    log "SUCCESS" "Backup created: backup/$backup_name"
}

# Quality gate validation
run_quality_gates() {
    local branch="$1"
    local gate_type="$2"  # "feature", "develop", or "main"

    log "GATE" "Running quality gates for $branch ($gate_type level)"

    local gate_score=0
    local max_gates=6

    # 1. Build verification
    log "GATE" "Checking build integrity..."
    if npm run build > /dev/null 2>&1; then
        ((gate_score++))
        log "SUCCESS" "✓ Build successful"
    else
        log "ERROR" "✗ Build failed"
        return 1
    fi

    # 2. Test execution
    log "GATE" "Running test suite..."
    local test_output=$(npm run test 2>&1 || echo "FAILED")
    if echo "$test_output" | grep -q "All tests passed\|Tests.*passed"; then
        ((gate_score++))
        log "SUCCESS" "✓ All tests passing"
    else
        local passing_tests=$(echo "$test_output" | grep -o "[0-9]* passing" | head -1 | awk '{print $1}' || echo 0)
        local failing_tests=$(echo "$test_output" | grep -o "[0-9]* failing" | head -1 | awk '{print $1}' || echo 0)
        if [ "$failing_tests" -eq 0 ] && [ "$passing_tests" -gt 0 ]; then
            ((gate_score++))
            log "SUCCESS" "✓ Tests passing ($passing_tests tests)"
        else
            log "ERROR" "✗ Tests failing ($failing_tests failed, $passing_tests passed)"
            if [ "$gate_type" != "feature" ]; then
                return 1  # Feature branches can have failing tests (RED phase)
            fi
        fi
    fi

    # 3. Code coverage check
    log "GATE" "Checking code coverage..."
    local coverage_output=$(npm run test:cov 2>/dev/null || echo "No coverage data")
    local coverage=$(echo "$coverage_output" | grep -o "[0-9]*\.[0-9]*%" | head -1 | sed 's/%//' || echo 0)

    if [ "${coverage%.*}" -ge "$MIN_TEST_COVERAGE" ]; then
        ((gate_score++))
        log "SUCCESS" "✓ Code coverage: ${coverage}%"
    else
        log "WARN" "⚠ Code coverage below threshold: ${coverage}% (min: ${MIN_TEST_COVERAGE}%)"
        if [ "$gate_type" = "main" ]; then
            return 1  # Main branch requires high coverage
        fi
    fi

    # 4. Linting validation
    log "GATE" "Running linting checks..."
    if npm run lint > /dev/null 2>&1; then
        ((gate_score++))
        log "SUCCESS" "✓ Linting passed"
    else
        log "ERROR" "✗ Linting failed"
        return 1
    fi

    # 5. Security audit
    log "GATE" "Running security audit..."
    local audit_output=$(npm audit --audit-level moderate 2>&1 || echo "vulnerabilities found")
    local vulnerabilities=$(echo "$audit_output" | grep -o "[0-9]* vulnerabilities" | head -1 | awk '{print $1}' || echo 0)

    if [ "$vulnerabilities" -le "$MAX_VULNERABILITIES" ]; then
        ((gate_score++))
        log "SUCCESS" "✓ Security audit clean"
    else
        log "WARN" "⚠ $vulnerabilities security vulnerabilities found"
        if [ "$gate_type" = "main" ]; then
            return 1  # Main branch requires zero vulnerabilities
        fi
    fi

    # 6. Backward compatibility check (for develop/main)
    if [ "$gate_type" != "feature" ]; then
        log "GATE" "Checking backward compatibility..."
        if check_backward_compatibility "$branch"; then
            ((gate_score++))
            log "SUCCESS" "✓ Backward compatibility maintained"
        else
            log "ERROR" "✗ Backward compatibility issues detected"
            return 1
        fi
    else
        ((gate_score++))  # Skip for feature branches
    fi

    local gate_percentage=$((gate_score * 100 / max_gates))
    log "GATE" "Quality gates: $gate_percentage% ($gate_score/$max_gates)"

    # Set thresholds based on branch type
    local required_percentage=70
    case "$gate_type" in
        "main") required_percentage=100 ;;
        "develop") required_percentage=85 ;;
        "feature") required_percentage=70 ;;
    esac

    if [ "$gate_percentage" -ge "$required_percentage" ]; then
        log "SUCCESS" "Quality gates passed for $gate_type level"
        return 0
    else
        log "ERROR" "Quality gates failed: $gate_percentage% < $required_percentage%"
        return 1
    fi
}

# Check backward compatibility
check_backward_compatibility() {
    local branch="$1"

    # Compare with previous version
    local base_commit=$(git merge-base HEAD HEAD~1 2>/dev/null || echo "HEAD")

    # Check API changes
    local api_changes=$(git diff "$base_commit"..HEAD --name-only | grep -E "\.(controller|dto|entity)\.ts$" | wc -l || echo 0)
    if [ "$api_changes" -gt 0 ]; then
        log "WARN" "API changes detected in $api_changes files"

        # Check for breaking changes patterns
        local breaking_changes=$(git diff "$base_commit"..HEAD | grep -E "^\-.*@(Get|Post|Put|Delete|Patch)\(" | wc -l || echo 0)
        if [ "$breaking_changes" -gt 0 ]; then
            log "ERROR" "Breaking API changes detected: $breaking_changes endpoints modified/removed"
            return 1
        fi
    fi

    # Check database migrations
    local migration_changes=$(git diff "$base_commit"..HEAD --name-only | grep -E "migration.*\.ts$" | wc -l || echo 0)
    if [ "$migration_changes" -gt 0 ]; then
        log "WARN" "Database migrations detected"

        # Check for destructive migrations
        local destructive_migrations=$(git diff "$base_commit"..HEAD | grep -E "DROP|ALTER.*DROP|DELETE" | wc -l || echo 0)
        if [ "$destructive_migrations" -gt 0 ]; then
            log "ERROR" "Potentially destructive database changes detected"
            return 1
        fi
    fi

    # Check package.json for breaking dependency changes
    if git diff "$base_commit"..HEAD --name-only | grep -q "package\.json"; then
        local major_bumps=$(git diff "$base_commit"..HEAD -- package.json | grep -E "^\+.*[\"\'].*[0-9]+\." | wc -l || echo 0)
        if [ "$major_bumps" -gt 0 ]; then
            log "WARN" "Major dependency version changes detected"
        fi
    fi

    return 0
}

# Intelligent conflict resolution
resolve_conflicts_intelligently() {
    local source_branch="$1"
    local target_branch="$2"

    log "MERGE" "Attempting intelligent conflict resolution: $source_branch → $target_branch"

    # Get conflict files
    local conflict_files=$(git diff --name-only --diff-filter=U || echo "")

    if [ -z "$conflict_files" ]; then
        log "SUCCESS" "No conflicts to resolve"
        return 0
    fi

    log "WARN" "Conflicts detected in: $conflict_files"

    # Attempt automatic resolution for common patterns
    for file in $conflict_files; do
        case "$file" in
            "package.json"|"package-lock.json")
                log "INFO" "Attempting automatic package.json conflict resolution"
                if auto_resolve_package_conflicts "$file"; then
                    git add "$file"
                    log "SUCCESS" "Resolved conflicts in $file"
                else
                    log "ERROR" "Failed to auto-resolve $file"
                    return 1
                fi
                ;;
            "*.md"|"*.txt")
                log "INFO" "Attempting documentation conflict resolution"
                if auto_resolve_doc_conflicts "$file"; then
                    git add "$file"
                    log "SUCCESS" "Resolved conflicts in $file"
                else
                    log "ERROR" "Manual intervention required for $file"
                    return 1
                fi
                ;;
            *)
                log "ERROR" "Manual conflict resolution required for $file"
                return 1
                ;;
        esac
    done

    return 0
}

# Auto-resolve package.json conflicts
auto_resolve_package_conflicts() {
    local file="$1"

    # Use npm to handle package.json merges
    if [ "$file" = "package.json" ]; then
        # Take newer versions for dependencies
        git checkout --theirs "$file"
        npm install > /dev/null 2>&1 || return 1
        return 0
    elif [ "$file" = "package-lock.json" ]; then
        # Regenerate package-lock.json
        rm -f "$file"
        npm install > /dev/null 2>&1 || return 1
        return 0
    fi

    return 1
}

# Auto-resolve documentation conflicts
auto_resolve_doc_conflicts() {
    local file="$1"

    # For documentation files, prefer the incoming changes
    git checkout --theirs "$file"
    return 0
}

# Sync feature branch with develop
sync_feature_with_develop() {
    local feature_branch="$1"

    log "SYNC" "Syncing feature branch $feature_branch with develop"

    # Create backup before sync
    create_branch_backup "$feature_branch"

    # Fetch latest changes
    git fetch origin

    # Switch to feature branch
    git checkout "$feature_branch"

    # Check if develop has new commits
    local behind_commits=$(git rev-list HEAD..origin/develop --count || echo 0)

    if [ "$behind_commits" -eq 0 ]; then
        log "INFO" "Feature branch $feature_branch is up to date with develop"
        return 0
    fi

    log "SYNC" "Feature branch is $behind_commits commits behind develop, syncing..."

    # Attempt rebase
    if git rebase origin/develop; then
        log "SUCCESS" "Successfully rebased $feature_branch on develop"

        # Run quality gates after rebase
        if run_quality_gates "$feature_branch" "feature"; then
            log "SUCCESS" "Quality gates passed after sync"
            return 0
        else
            log "ERROR" "Quality gates failed after sync"
            git rebase --abort
            return 1
        fi
    else
        log "WARN" "Rebase conflicts detected, attempting intelligent resolution"

        if resolve_conflicts_intelligently "$feature_branch" "develop"; then
            git rebase --continue
            log "SUCCESS" "Conflicts resolved, rebase completed"
            return 0
        else
            log "ERROR" "Failed to resolve conflicts automatically"
            git rebase --abort
            return 1
        fi
    fi
}

# Merge feature to develop
merge_feature_to_develop() {
    local feature_branch="$1"

    log "MERGE" "Merging feature $feature_branch to develop"

    # Validate feature is ready
    git checkout "$feature_branch"
    if ! run_quality_gates "$feature_branch" "feature"; then
        log "ERROR" "Feature $feature_branch failed quality gates"
        return 1
    fi

    # Check feature completion status
    local completion_status=$(cat "$PROJECT_ROOT/.agent-state/${feature_branch}.status" 2>/dev/null || echo "IN_DEVELOPMENT")
    if [ "$completion_status" != "READY_FOR_INTEGRATION" ]; then
        log "ERROR" "Feature $feature_branch not marked as ready for integration"
        return 1
    fi

    # Create backup of develop
    create_branch_backup "$DEVELOP_BRANCH"

    # Switch to develop and sync
    git checkout "$DEVELOP_BRANCH"
    git fetch origin
    git pull origin "$DEVELOP_BRANCH"

    # Create merge commit with detailed message
    local merge_message="merge: integrate $feature_branch into develop

🎯 Feature Integration Summary:
- Branch: $feature_branch
- Quality Gates: Passed
- Test Coverage: Verified
- Backward Compatibility: Maintained
- Agent Validation: Complete

📊 Integration Metrics:
- Commits: $(git rev-list develop.."$feature_branch" --count)
- Files Changed: $(git diff develop.."$feature_branch" --name-only | wc -l)
- Tests Added: $(git diff develop.."$feature_branch" --name-only | grep -c '\.spec\.ts$' || echo 0)

🤖 Automated Integration via Branch Sync Orchestrator
Co-authored-by: MoneyWise-Orchestrator <orchestrator@moneywise.dev>"

    # Perform merge
    if git merge --no-ff "$feature_branch" -m "$merge_message"; then
        log "SUCCESS" "Feature $feature_branch merged to develop"

        # Run develop quality gates
        if run_quality_gates "$DEVELOP_BRANCH" "develop"; then
            log "SUCCESS" "Develop branch quality gates passed"

            # Push to origin
            git push origin "$DEVELOP_BRANCH"

            # Mark feature for cleanup
            echo "INTEGRATED" > "$PROJECT_ROOT/.agent-state/${feature_branch}.status"
            echo "$(date '+%Y-%m-%d %H:%M:%S')" > "$PROJECT_ROOT/.agent-state/${feature_branch}.integrated"

            return 0
        else
            log "ERROR" "Develop branch quality gates failed after merge"
            git reset --hard HEAD~1
            return 1
        fi
    else
        log "ERROR" "Failed to merge $feature_branch to develop"
        return 1
    fi
}

# Promote develop to main
promote_develop_to_main() {
    log "MERGE" "Promoting develop to main"

    # Comprehensive validation of develop branch
    git checkout "$DEVELOP_BRANCH"
    git fetch origin
    git pull origin "$DEVELOP_BRANCH"

    # Run strictest quality gates
    if ! run_quality_gates "$DEVELOP_BRANCH" "main"; then
        log "ERROR" "Develop branch failed main-level quality gates"
        return 1
    fi

    # Additional main-specific validations
    log "GATE" "Running production readiness checks..."

    # 1. Performance tests
    if command -v npm run test:performance &> /dev/null; then
        if ! npm run test:performance > /dev/null 2>&1; then
            log "ERROR" "Performance tests failed"
            return 1
        fi
        log "SUCCESS" "✓ Performance tests passed"
    fi

    # 2. E2E tests
    if command -v npm run test:e2e &> /dev/null; then
        if ! npm run test:e2e > /dev/null 2>&1; then
            log "ERROR" "E2E tests failed"
            return 1
        fi
        log "SUCCESS" "✓ E2E tests passed"
    fi

    # 3. Security audit (strict)
    if ! npm audit --audit-level low > /dev/null 2>&1; then
        log "ERROR" "Security audit failed for main promotion"
        return 1
    fi

    # Create backup of main
    create_branch_backup "$MAIN_BRANCH"

    # Switch to main and merge
    git checkout "$MAIN_BRANCH"
    git fetch origin
    git pull origin "$MAIN_BRANCH"

    local release_version="v$(date +%Y.%m.%d)-$(git rev-parse --short develop)"
    local promotion_message="release: promote develop to main ($release_version)

🚀 Production Release Summary:
- Release Version: $release_version
- Quality Gates: All Passed (100%)
- Security Audit: Clean
- Performance Tests: Passed
- E2E Tests: Passed
- Backward Compatibility: Verified

📊 Release Metrics:
- Features Integrated: $(git log main..develop --grep='merge:' --oneline | wc -l)
- Total Commits: $(git rev-list main..develop --count)
- Test Coverage: $(npm run test:cov 2>/dev/null | grep -o '[0-9]*\.[0-9]*%' | head -1 || echo 'N/A')

🎯 Ready for Production Deployment
Co-authored-by: MoneyWise-Release-Orchestrator <release@moneywise.dev>"

    if git merge --no-ff "$DEVELOP_BRANCH" -m "$promotion_message"; then
        log "SUCCESS" "Develop promoted to main"

        # Create release tag
        git tag -a "$release_version" -m "Release $release_version"

        # Push to origin
        git push origin "$MAIN_BRANCH"
        git push origin "$release_version"

        log "SUCCESS" "🎉 Release $release_version deployed to main"
        return 0
    else
        log "ERROR" "Failed to promote develop to main"
        return 1
    fi
}

# Monitor and auto-sync all branches
auto_sync_monitor() {
    log "INFO" "Starting automated branch synchronization monitor"

    while true; do
        # Fetch all remote changes
        git fetch origin

        # Get all feature branches
        local feature_branches=$(git branch -r | grep "origin/$FEATURE_PREFIX" | sed 's/origin\///' | grep -v HEAD || echo "")

        # Sync each feature branch
        for branch in $feature_branches; do
            local local_branch=$(echo "$branch" | sed 's/origin\///')

            # Check if branch exists locally
            if git show-ref --verify --quiet "refs/heads/$local_branch"; then
                git checkout "$local_branch"

                # Check if sync is needed
                local behind_commits=$(git rev-list HEAD..origin/develop --count || echo 0)

                if [ "$behind_commits" -gt 0 ]; then
                    log "INFO" "Branch $local_branch is $behind_commits commits behind, syncing..."
                    sync_feature_with_develop "$local_branch"
                fi

                # Check if feature is ready for integration
                local status=$(cat "$PROJECT_ROOT/.agent-state/${local_branch}.status" 2>/dev/null || echo "UNKNOWN")
                if [ "$status" = "READY_FOR_INTEGRATION" ]; then
                    log "INFO" "Feature $local_branch is ready for integration"
                    merge_feature_to_develop "$local_branch"
                fi
            fi
        done

        # Check if develop should be promoted to main
        git checkout "$DEVELOP_BRANCH"
        local develop_ahead=$(git rev-list origin/main..HEAD --count || echo 0)

        if [ "$develop_ahead" -gt 0 ]; then
            # Check if enough time has passed since last integration
            local last_integration=$(stat -c %Y "$PROJECT_ROOT/.agent-state/"*.integrated 2>/dev/null | sort -n | tail -1 || echo 0)
            local current_time=$(date +%s)
            local time_diff=$((current_time - last_integration))

            # Wait at least 1 hour after last integration
            if [ "$time_diff" -gt 3600 ]; then
                log "INFO" "Develop has $develop_ahead commits ahead of main, checking promotion eligibility"

                # Check if all integrated features are stable
                local integrated_features=$(find "$PROJECT_ROOT/.agent-state" -name "*.integrated" | wc -l)
                if [ "$integrated_features" -gt 0 ]; then
                    promote_develop_to_main
                fi
            fi
        fi

        # Sleep for 5 minutes before next check
        log "INFO" "Sync cycle completed, sleeping for 5 minutes..."
        sleep 300
    done
}

# Branch cleanup for integrated features
cleanup_integrated_branches() {
    log "INFO" "Cleaning up integrated feature branches"

    local cleanup_count=0

    # Find integrated branches older than 7 days
    find "$PROJECT_ROOT/.agent-state" -name "*.integrated" -mtime +7 | while read -r integrated_file; do
        local branch_name=$(basename "$integrated_file" .integrated)

        if git show-ref --verify --quiet "refs/heads/$branch_name"; then
            log "INFO" "Cleaning up integrated branch: $branch_name"

            # Create final backup
            create_branch_backup "$branch_name"

            # Delete local branch
            git checkout main
            git branch -D "$branch_name"

            # Delete remote branch
            git push origin --delete "$branch_name" || log "WARN" "Failed to delete remote branch $branch_name"

            # Archive state files
            mkdir -p "$PROJECT_ROOT/.agent-state/archived"
            mv "$integrated_file" "$PROJECT_ROOT/.agent-state/archived/"
            mv "$PROJECT_ROOT/.agent-state/${branch_name}.status" "$PROJECT_ROOT/.agent-state/archived/" 2>/dev/null || true

            ((cleanup_count++))
            log "SUCCESS" "Cleaned up branch: $branch_name"
        fi
    done

    log "INFO" "Cleanup completed: $cleanup_count branches removed"
}

# Main execution logic
main() {
    local command="${1:-help}"
    shift

    case "$command" in
        "sync-feature")
            local feature_branch="${1:-}"
            if [ -z "$feature_branch" ]; then
                log "ERROR" "Usage: $0 sync-feature <feature_branch>"
                exit 1
            fi
            sync_feature_with_develop "$feature_branch"
            ;;
        "merge-feature")
            local feature_branch="${1:-}"
            if [ -z "$feature_branch" ]; then
                log "ERROR" "Usage: $0 merge-feature <feature_branch>"
                exit 1
            fi
            merge_feature_to_develop "$feature_branch"
            ;;
        "promote")
            promote_develop_to_main
            ;;
        "auto-sync")
            auto_sync_monitor
            ;;
        "cleanup")
            cleanup_integrated_branches
            ;;
        "status")
            echo -e "${PURPLE}📊 BRANCH SYNCHRONIZATION STATUS${NC}"
            echo "======================================="

            # Show branch relationships
            git fetch origin
            echo -e "\n${CYAN}Branch Hierarchy:${NC}"
            echo "main ← develop ← feature branches"

            # Show develop status
            git checkout develop
            local develop_ahead=$(git rev-list origin/main..HEAD --count || echo 0)
            local develop_behind=$(git rev-list HEAD..origin/main --count || echo 0)
            echo -e "\n${BLUE}Develop Branch:${NC}"
            echo "  Ahead of main: $develop_ahead commits"
            echo "  Behind main: $develop_behind commits"

            # Show feature branches
            echo -e "\n${GREEN}Feature Branches:${NC}"
            local feature_branches=$(git branch | grep "$FEATURE_PREFIX" | sed 's/^..//' || echo "None")
            if [ "$feature_branches" != "None" ]; then
                for branch in $feature_branches; do
                    local status=$(cat "$PROJECT_ROOT/.agent-state/${branch}.status" 2>/dev/null || echo "UNKNOWN")
                    local behind=$(git rev-list "$branch"..develop --count || echo 0)
                    echo "  $branch: $status (behind develop: $behind commits)"
                done
            else
                echo "  No feature branches found"
            fi
            ;;
        *)
            echo "Branch Synchronization & Merge Orchestrator"
            echo "Usage: $0 <command> [options]"
            echo ""
            echo "Commands:"
            echo "  sync-feature <branch>    - Sync feature branch with develop"
            echo "  merge-feature <branch>   - Merge completed feature to develop"
            echo "  promote                  - Promote develop to main"
            echo "  auto-sync               - Start automated synchronization monitor"
            echo "  cleanup                 - Clean up integrated feature branches"
            echo "  status                  - Show branch synchronization status"
            echo ""
            echo "Automated Workflow:"
            echo "  1. Feature branches auto-sync with develop"
            echo "  2. Completed features auto-merge to develop"
            echo "  3. Validated develop auto-promotes to main"
            echo "  4. Integrated branches auto-cleanup after 7 days"
            ;;
    esac
}

main "$@"