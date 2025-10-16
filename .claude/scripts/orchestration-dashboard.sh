#!/bin/bash
# .claude/scripts/orchestration-dashboard.sh
# Real-time orchestration monitoring dashboard
# Provides consolidated view of all active processes and progress

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
COPILOT_PR="88"
STORY_ISSUE="71"
EPIC_BRANCH="epic/milestone-1-foundation"
PROJECT_ROOT="/home/nemesi/dev/money-wise"

clear_screen() {
    clear
    echo -e "${BOLD}${PURPLE}╔══════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${PURPLE}║                    STORY-006 ORCHESTRATION DASHBOARD                        ║${NC}"
    echo -e "${BOLD}${PURPLE}╚══════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

show_copilot_status() {
    echo -e "${BOLD}${CYAN}🤖 COPILOT REVIEW STATUS${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"

    local pr_info
    pr_info=$(gh pr view "$COPILOT_PR" --json state,isDraft,title,updatedAt,additions,deletions,changedFiles 2>/dev/null || echo '{}')

    local state
    state=$(echo "$pr_info" | jq -r '.state // "unknown"')

    local is_draft
    is_draft=$(echo "$pr_info" | jq -r '.isDraft // true')

    local title
    title=$(echo "$pr_info" | jq -r '.title // "Unknown"')

    local updated_at
    updated_at=$(echo "$pr_info" | jq -r '.updatedAt // ""')

    local additions
    additions=$(echo "$pr_info" | jq -r '.additions // 0')

    local deletions
    deletions=$(echo "$pr_info" | jq -r '.deletions // 0')

    local changed_files
    changed_files=$(echo "$pr_info" | jq -r '.changedFiles // 0')

    if [[ "$is_draft" == "false" ]]; then
        echo -e "📋 Status: ${GREEN}✅ REVIEW COMPLETED${NC}"
    else
        echo -e "📋 Status: ${YELLOW}🔄 IN PROGRESS${NC}"
    fi

    echo -e "🎯 PR: #$COPILOT_PR ($state)"
    echo -e "📝 Title: $title"
    echo -e "⏰ Last Update: $updated_at"
    echo -e "📊 Changes: ${GREEN}+$additions${NC} ${RED}-$deletions${NC} (${changed_files} files)"
    echo ""
}

show_orchestrator_status() {
    echo -e "${BOLD}${PURPLE}🤖 ORCHESTRATOR STATUS${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════${NC}"

    # Check if orchestrator is running
    if pgrep -f "copilot-orchestrator.sh" > /dev/null; then
        echo -e "🔄 Process: ${GREEN}RUNNING${NC}"

        # Extract progress from logs (simplified)
        local runtime_minutes
        runtime_minutes=$(( ($(date +%s) - $(stat -c %Y /tmp/orchestrator-start 2>/dev/null || echo $(date +%s))) / 60 ))

        echo -e "⏱️  Runtime: ${runtime_minutes} minutes"
        echo -e "📈 Progress: Monitoring active"
        echo -e "🎯 Mode: Intelligent monitoring (30s intervals)"
    else
        echo -e "🔄 Process: ${RED}NOT RUNNING${NC}"
    fi
    echo ""
}

show_validation_framework() {
    echo -e "${BOLD}${BLUE}🎯 VALIDATION FRAMEWORK${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"

    # Check script availability
    local scripts=(
        "agile-validator.sh"
        "story-006-validation.sh"
        "post-copilot-integration.sh"
        "board-status.sh"
    )

    for script in "${scripts[@]}"; do
        if [[ -x "$PROJECT_ROOT/.claude/scripts/$script" ]]; then
            echo -e "✅ $script"
        else
            echo -e "❌ $script"
        fi
    done
    echo ""
}

show_repository_status() {
    echo -e "${BOLD}${GREEN}📂 REPOSITORY STATUS${NC}"
    echo -e "${GREEN}═══════════════════════════════════════${NC}"

    cd "$PROJECT_ROOT"

    local current_branch
    current_branch=$(git branch --show-current)
    echo -e "🌿 Branch: $current_branch"

    local uncommitted
    uncommitted=$(git status --porcelain | wc -l)
    if [[ $uncommitted -eq 0 ]]; then
        echo -e "📁 Working Directory: ${GREEN}CLEAN${NC}"
    else
        echo -e "📁 Working Directory: ${YELLOW}$uncommitted uncommitted changes${NC}"
    fi

    # CI/CD status
    local latest_run
    latest_run=$(gh run list --limit 1 --json conclusion,status,workflowName 2>/dev/null | jq -r '.[0] | "\(.workflowName): \(.conclusion // .status)"' 2>/dev/null || echo "Unknown")
    echo -e "🔧 Latest CI/CD: $latest_run"
    echo ""
}

show_board_status() {
    echo -e "${BOLD}${YELLOW}📋 AGILE BOARD STATUS${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════${NC}"

    if [[ -x "$PROJECT_ROOT/.claude/scripts/board-status.sh" ]]; then
        local story_status
        story_status=$("$PROJECT_ROOT/.claude/scripts/board-status.sh" status "M1-STORY-002" 2>/dev/null || echo "Unknown")
        echo -e "📊 STORY-006 Status: $story_status"
    else
        echo -e "📊 Board integration: Not available"
    fi
    echo ""
}

show_next_actions() {
    echo -e "${BOLD}${CYAN}🚀 NEXT AUTOMATED ACTIONS${NC}"
    echo -e "${CYAN}═══════════════════════════════════════${NC}"

    # Check Copilot status and show next steps
    local pr_info
    pr_info=$(gh pr view "$COPILOT_PR" --json isDraft 2>/dev/null || echo '{}')

    local is_draft
    is_draft=$(echo "$pr_info" | jq -r '.isDraft // true')

    if [[ "$is_draft" == "false" ]]; then
        echo -e "1. ${GREEN}▶️  Execute integration workflow${NC}"
        echo -e "2. ${GREEN}▶️  Run comprehensive validation${NC}"
        echo -e "3. ${GREEN}▶️  Update board status to Done${NC}"
        echo -e "4. ${GREEN}▶️  Generate completion report${NC}"
    else
        echo -e "1. ${YELLOW}⏳ Continue monitoring Copilot review${NC}"
        echo -e "2. ${BLUE}⏳ Wait for draft status to change${NC}"
        echo -e "3. ${BLUE}⏳ Prepare for automatic integration${NC}"
        echo -e "4. ${BLUE}⏳ Validation suite ready${NC}"
    fi
    echo ""
}

show_system_health() {
    echo -e "${BOLD}${GREEN}💚 SYSTEM HEALTH${NC}"
    echo -e "${GREEN}═══════════════════════════════════════${NC}"

    # Check system resources
    local load_avg
    load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | tr -d ',')
    echo -e "⚡ System Load: $load_avg"

    # Check available disk space
    local disk_usage
    disk_usage=$(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $5}' | tr -d '%')
    echo -e "💾 Disk Usage: ${disk_usage}%"

    # Check network connectivity
    if ping -c 1 github.com > /dev/null 2>&1; then
        echo -e "🌐 Network: ${GREEN}CONNECTED${NC}"
    else
        echo -e "🌐 Network: ${RED}ISSUES${NC}"
    fi
    echo ""
}

main() {
    local mode="${1:-watch}"

    case "$mode" in
        "watch")
            while true; do
                clear_screen
                show_copilot_status
                show_orchestrator_status
                show_validation_framework
                show_repository_status
                show_board_status
                show_next_actions
                show_system_health

                echo -e "${BOLD}${BLUE}Press Ctrl+C to exit | Auto-refresh every 30 seconds${NC}"

                sleep 30
            done
            ;;
        "status")
            clear_screen
            show_copilot_status
            show_orchestrator_status
            show_next_actions
            ;;
        "health")
            clear_screen
            show_system_health
            show_repository_status
            ;;
        *)
            echo "Usage: $0 {watch|status|health}"
            echo ""
            echo "Commands:"
            echo "  watch   - Real-time dashboard (auto-refresh)"
            echo "  status  - One-time status check"
            echo "  health  - System health check"
            exit 1
            ;;
    esac
}

# Create orchestrator start time file if not exists
if [[ ! -f /tmp/orchestrator-start ]] && pgrep -f "copilot-orchestrator.sh" > /dev/null; then
    touch /tmp/orchestrator-start
fi

main "$@"