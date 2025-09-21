#!/bin/bash

# Migrate existing agent branches to future/ naming convention
# Implements the new CI/CD branch structure

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
MIGRATION_LOG="$PROJECT_ROOT/.workflow-state/branch-migration.log"

mkdir -p "$(dirname "$MIGRATION_LOG")"

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
        "MIGRATE") echo -e "${CYAN}[MIGRATE]${NC} [$timestamp] $message" ;;
    esac
}

# Parse existing branch name to extract components
parse_branch_name() {
    local branch_name="$1"

    # Extract feature name and agent role from existing convention
    if [[ "$branch_name" =~ feature/([^-]+)-([^-]+)-([^-]+)-(.*) ]]; then
        local feature_part1="${BASH_REMATCH[1]}"
        local feature_part2="${BASH_REMATCH[2]}"
        local feature_part3="${BASH_REMATCH[3]}"
        local remainder="${BASH_REMATCH[4]}"

        # Map old naming to new convention
        case "$feature_part1" in
            "ai")
                if [[ "$feature_part2" == "financial" && "$feature_part3" == "intelligence" ]]; then
                    echo "smart-budget-intelligence"
                    return 0
                fi
                ;;
            "notification")
                if [[ "$feature_part2" == "alert" && "$feature_part3" == "engine" ]]; then
                    echo "advanced-notification-system"
                    return 0
                fi
                ;;
            "real")
                if [[ "$feature_part2" == "time" && "$feature_part3" == "event" ]]; then
                    echo "realtime-financial-security"
                    return 0
                fi
                ;;
        esac
    fi

    # Fallback - extract from current strategic features
    if [[ "$branch_name" =~ feature/(.*) ]]; then
        echo "${BASH_REMATCH[1]}" | sed 's/-[a-f0-9]\{8\}$//' | head -c 30
    else
        echo "unknown-feature"
    fi
}

# Extract agent role from branch name
extract_agent_role() {
    local branch_name="$1"

    case "$branch_name" in
        *"architect"*) echo "architect" ;;
        *"backend"*) echo "backend" ;;
        *"frontend"*) echo "frontend" ;;
        *"mobile"*) echo "mobile" ;;
        *"security"*) echo "security" ;;
        *"performance"*) echo "performance" ;;
        *"tester"*) echo "tester" ;;
        *"qa"*) echo "tester" ;;
        *"devops"*) echo "devops" ;;
        *) echo "developer" ;;
    esac
}

# Migrate single branch to future/ convention
migrate_branch() {
    local old_branch="$1"
    local dry_run="${2:-false}"

    log "MIGRATE" "Processing branch: $old_branch"

    # Parse components
    local feature_name=$(parse_branch_name "$old_branch")
    local agent_role=$(extract_agent_role "$old_branch")
    local uuid=$(openssl rand -hex 4)

    # Generate new branch name
    local new_branch="future/${feature_name}-${agent_role}-${uuid}"

    log "INFO" "Mapping: $old_branch -> $new_branch"

    if [ "$dry_run" = "true" ]; then
        log "INFO" "[DRY RUN] Would migrate $old_branch to $new_branch"
        return 0
    fi

    # Check if old branch exists and is not current
    if ! git show-ref --verify --quiet refs/heads/"$old_branch"; then
        log "WARN" "Branch $old_branch does not exist locally"
        return 1
    fi

    # Get current branch to avoid conflicts
    local current_branch=$(git branch --show-current)
    if [ "$current_branch" = "$old_branch" ]; then
        git checkout develop
    fi

    # Create new branch from old one
    if git checkout -b "$new_branch" "$old_branch"; then
        log "SUCCESS" "Created new branch: $new_branch"
    else
        log "ERROR" "Failed to create branch: $new_branch"
        return 1
    fi

    # Update any worktrees pointing to the old branch
    local worktree_path=$(git worktree list | grep "$old_branch" | awk '{print $1}' || echo "")

    if [ -n "$worktree_path" ]; then
        log "INFO" "Updating worktree: $worktree_path"

        # Remove old worktree and create new one
        git worktree remove "$worktree_path" --force || true

        local new_worktree_path="${worktree_path%/*}/${agent_role}-${feature_name}-${uuid}"
        mkdir -p "$(dirname "$new_worktree_path")"

        if git worktree add "$new_worktree_path" "$new_branch"; then
            log "SUCCESS" "Created new worktree: $new_worktree_path"
        else
            log "WARN" "Failed to create worktree for: $new_branch"
        fi
    fi

    # Push new branch to remote
    if git push origin "$new_branch"; then
        log "SUCCESS" "Pushed new branch to remote: $new_branch"
    else
        log "WARN" "Could not push to remote (continuing)"
    fi

    # Log migration
    echo "$(date -Iseconds) | MIGRATED | $old_branch | $new_branch | $feature_name | $agent_role" >> "$MIGRATION_LOG"

    # Mark old branch for deletion (but don't delete yet)
    log "INFO" "Old branch $old_branch marked for cleanup (manual deletion required)"

    return 0
}

# Migrate all matching branches
migrate_all_branches() {
    local pattern="${1:-feature/(ai-financial|notification|real-time)}"
    local dry_run="${2:-false}"

    log "INFO" "Starting batch migration with pattern: $pattern"

    local branches_to_migrate=$(git branch | grep -E "$pattern" | sed 's/^[+ *] //')

    if [ -z "$branches_to_migrate" ]; then
        log "WARN" "No branches found matching pattern: $pattern"
        return 0
    fi

    local total_branches=$(echo "$branches_to_migrate" | wc -l)
    local migrated_count=0
    local failed_count=0

    log "INFO" "Found $total_branches branches to migrate"

    while IFS= read -r branch; do
        if [ -n "$branch" ]; then
            if migrate_branch "$branch" "$dry_run"; then
                ((migrated_count++))
            else
                ((failed_count++))
            fi
        fi
    done <<< "$branches_to_migrate"

    log "SUCCESS" "Migration complete: $migrated_count successful, $failed_count failed"

    if [ "$dry_run" = "false" ]; then
        log "INFO" "Old branches still exist - use cleanup command to remove them"
    fi
}

# Clean up old branches after successful migration
cleanup_old_branches() {
    local confirm="${1:-false}"

    if [ "$confirm" != "true" ]; then
        log "WARN" "This will DELETE old feature branches. Use 'cleanup true' to confirm."
        return 1
    fi

    log "INFO" "Cleaning up old migrated branches..."

    # Get list of successfully migrated branches from log
    if [ ! -f "$MIGRATION_LOG" ]; then
        log "ERROR" "No migration log found"
        return 1
    fi

    local old_branches=$(grep "MIGRATED" "$MIGRATION_LOG" | awk -F' | ' '{print $3}' | sort -u)

    if [ -z "$old_branches" ]; then
        log "WARN" "No old branches found in migration log"
        return 0
    fi

    local deleted_count=0

    while IFS= read -r branch; do
        if [ -n "$branch" ]; then
            log "INFO" "Deleting old branch: $branch"

            # Delete local branch
            if git branch -d "$branch" 2>/dev/null; then
                log "SUCCESS" "Deleted local branch: $branch"
                ((deleted_count++))
            elif git branch -D "$branch" 2>/dev/null; then
                log "SUCCESS" "Force deleted local branch: $branch"
                ((deleted_count++))
            else
                log "WARN" "Could not delete local branch: $branch"
            fi

            # Delete remote branch
            if git push origin --delete "$branch" 2>/dev/null; then
                log "SUCCESS" "Deleted remote branch: $branch"
            else
                log "WARN" "Could not delete remote branch: $branch"
            fi
        fi
    done <<< "$old_branches"

    log "SUCCESS" "Cleanup complete: $deleted_count branches deleted"
}

# Update tmux sessions to use new branch names
update_tmux_sessions() {
    log "INFO" "Updating tmux sessions for new branch structure..."

    # Get active tmux sessions
    local sessions=$(tmux list-sessions -F "#{session_name}" 2>/dev/null | grep moneywise || echo "")

    if [ -z "$sessions" ]; then
        log "WARN" "No MoneyWise tmux sessions found"
        return 0
    fi

    while IFS= read -r session; do
        if [ -n "$session" ]; then
            log "INFO" "Updating session: $session"

            # Get windows in session
            local windows=$(tmux list-windows -t "$session" -F "#{window_name}" 2>/dev/null || echo "")

            while IFS= read -r window; do
                if [ -n "$window" ]; then
                    # Map window to new branch structure
                    local new_branch=""
                    case "$window" in
                        "architect") new_branch="future/smart-budget-intelligence-architect-$(openssl rand -hex 4)" ;;
                        "backend") new_branch="future/smart-budget-intelligence-backend-$(openssl rand -hex 4)" ;;
                        "frontend") new_branch="future/smart-budget-intelligence-frontend-$(openssl rand -hex 4)" ;;
                        "security") new_branch="future/smart-budget-intelligence-security-$(openssl rand -hex 4)" ;;
                        "tester") new_branch="future/smart-budget-intelligence-tester-$(openssl rand -hex 4)" ;;
                        "core") new_branch="future/realtime-financial-security-backend-$(openssl rand -hex 4)" ;;
                        "performance") new_branch="future/realtime-financial-security-performance-$(openssl rand -hex 4)" ;;
                        "mobile") new_branch="future/advanced-notification-system-mobile-$(openssl rand -hex 4)" ;;
                    esac

                    if [ -n "$new_branch" ] && git show-ref --verify --quiet refs/heads/"$new_branch"; then
                        tmux send-keys -t "$session:$window" "git checkout $new_branch" Enter
                        log "SUCCESS" "Updated $session:$window to $new_branch"
                    fi
                fi
            done <<< "$windows"
        fi
    done <<< "$sessions"
}

# Show migration status
show_migration_status() {
    echo "🔄 Branch Migration Status"
    echo "=========================="

    if [ -f "$MIGRATION_LOG" ]; then
        echo "Total migrations: $(grep -c MIGRATED "$MIGRATION_LOG")"
        echo ""
        echo "Migration Summary:"
        awk -F' | ' '{
            if ($2 == "MIGRATED") {
                print "✅ " $3 " -> " $4
            }
        }' "$MIGRATION_LOG"
    else
        echo "No migrations performed yet"
    fi

    echo ""
    echo "Current future/ branches:"
    git branch | grep "future/" | sed 's/^[+ *] /  /'

    echo ""
    echo "Remaining old branches:"
    git branch | grep -E "feature/(ai-financial|notification|real-time)" | sed 's/^[+ *] /  /' || echo "  None"
}

# Main execution logic
main() {
    local command="${1:-help}"
    local arg1="${2:-}"
    local arg2="${3:-}"

    case "$command" in
        "migrate")
            if [ -n "$arg1" ]; then
                migrate_branch "$arg1" "${arg2:-false}"
            else
                log "ERROR" "Usage: $0 migrate <branch_name> [dry_run]"
                exit 1
            fi
            ;;
        "migrate-all")
            migrate_all_branches "feature/(ai-financial|notification|real-time)" "${arg1:-false}"
            ;;
        "dry-run")
            migrate_all_branches "feature/(ai-financial|notification|real-time)" "true"
            ;;
        "cleanup")
            cleanup_old_branches "$arg1"
            ;;
        "update-tmux")
            update_tmux_sessions
            ;;
        "status")
            show_migration_status
            ;;
        *)
            echo "Branch Migration Tool"
            echo "Usage: $0 <command> [options]"
            echo ""
            echo "Commands:"
            echo "  migrate <branch>     - Migrate single branch to future/ convention"
            echo "  migrate-all          - Migrate all agent branches"
            echo "  dry-run              - Show what would be migrated (no changes)"
            echo "  cleanup [true]       - Delete old branches after migration"
            echo "  update-tmux          - Update tmux sessions for new branches"
            echo "  status               - Show migration status"
            echo ""
            echo "Examples:"
            echo "  $0 dry-run                                          # Preview migration"
            echo "  $0 migrate-all                                      # Migrate all branches"
            echo "  $0 migrate feature/ai-financial-intelligence-backend-abc123"
            echo "  $0 cleanup true                                     # Delete old branches"
            echo ""
            echo "New branch format: future/<feature-name>-<agent-role>-<uuid>"
            ;;
    esac
}

main "$@"