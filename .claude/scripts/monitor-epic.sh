#!/bin/bash
# Epic Execution Monitor - Real-time dashboard

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

EPIC_NAME="${1:-}"
REFRESH_INTERVAL="${2:-5}"  # Seconds between updates

if [ -z "$EPIC_NAME" ]; then
    echo -e "${RED}Error: Epic name required${NC}"
    echo "Usage: $0 <epic-name> [refresh-interval]"
    echo "Example: $0 authentication 5"
    exit 1
fi

EPIC_DIR=".claude/orchestration/state/epics/$EPIC_NAME"
WORK_DIR=".claude/work/$EPIC_NAME"

if [ ! -d "$EPIC_DIR" ]; then
    echo -e "${RED}Error: Epic '$EPIC_NAME' not found${NC}"
    exit 1
fi

# Function to get task status
get_task_status() {
    local task_id=$1
    local branch="task/$EPIC_NAME-$task_id"
    
    # Check if branch exists
    if git show-ref --verify --quiet "refs/heads/$branch"; then
        # Check if merged
        if git branch --merged | grep -q "$branch"; then
            echo "✅ Complete"
        else
            # Check if work in progress
            if [ -d "$WORK_DIR/$task_id" ]; then
                echo "🔄 Running"
            else
                echo "⏸️ Paused"
            fi
        fi
    else
        echo "⏳ Pending"
    fi
}

# Function to calculate progress
calculate_progress() {
    local completed=0
    local total=0
    
    # Count tasks
    for story_dir in "$WORK_DIR"/story_*; do
        if [ -d "$story_dir" ]; then
            for task_dir in "$story_dir"/task_*; do
                if [ -d "$task_dir" ]; then
                    ((total++))
                    local task_name=$(basename "$task_dir")
                    local status=$(get_task_status "$task_name")
                    if [[ "$status" == *"Complete"* ]]; then
                        ((completed++))
                    fi
                fi
            done
        fi
    done
    
    if [ $total -eq 0 ]; then
        echo 0
    else
        echo $((completed * 100 / total))
    fi
}

# Function to show progress bar
show_progress_bar() {
    local percent=$1
    local width=40
    local filled=$((percent * width / 100))
    local empty=$((width - filled))
    
    printf "["
    printf "%${filled}s" | tr ' ' '█'
    printf "%${empty}s" | tr ' ' '░'
    printf "] %d%%\n" $percent
}

# Function to count active agents
count_active_agents() {
    ps aux | grep -c "\[agent-" 2>/dev/null || echo 0
}

# Function to get recent activity
get_recent_activity() {
    if [ -f "$EPIC_DIR/activity.log" ]; then
        tail -5 "$EPIC_DIR/activity.log" | while IFS= read -r line; do
            echo "  │ $line"
        done
    else
        echo "  │ No recent activity"
    fi
}

# Function to check for blocked tasks
check_blocked_tasks() {
    local blocked_count=0
    if [ -f "$EPIC_DIR/blocked.json" ]; then
        blocked_count=$(jq -r '.tasks | length' "$EPIC_DIR/blocked.json" 2>/dev/null || echo 0)
    fi
    
    if [ $blocked_count -gt 0 ]; then
        echo -e "${RED}⚠️ $blocked_count tasks blocked${NC}"
        if [ -f "$EPIC_DIR/blocked.json" ]; then
            jq -r '.tasks[] | "  └─ \(.id): \(.reason)"' "$EPIC_DIR/blocked.json" 2>/dev/null
        fi
    fi
}

# Main monitoring loop
monitor_epic() {
    while true; do
        clear
        
        # Header
        echo -e "${BOLD}${CYAN}════════════════════════════════════════════════════════${NC}"
        echo -e "${BOLD}  Epic Monitor: ${EPIC_NAME^^}${NC}"
        echo -e "  $(date '+%Y-%m-%d %H:%M:%S')"
        echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
        echo
        
        # Progress
        PROGRESS=$(calculate_progress)
        echo -e "${BOLD}Progress:${NC}"
        echo -n "  "
        show_progress_bar $PROGRESS
        echo
        
        # Stories and Tasks
        echo -e "${BOLD}Stories & Tasks:${NC}"
        for story_dir in "$WORK_DIR"/story_*; do
            if [ -d "$story_dir" ]; then
                story_name=$(basename "$story_dir")
                echo -e "  ${BLUE}📘 $story_name${NC}"
                
                for task_dir in "$story_dir"/task_*; do
                    if [ -d "$task_dir" ]; then
                        task_name=$(basename "$task_dir")
                        status=$(get_task_status "$task_name")
                        
                        # Get agent assignment if available
                        agent=""
                        if [ -f "$EPIC_DIR/assignments.json" ]; then
                            agent=$(jq -r ".tasks.\"$task_name\".agent // \"unassigned\"" "$EPIC_DIR/assignments.json" 2>/dev/null)
                        fi
                        
                        # Color based on status
                        case "$status" in
                            *"Complete"*) color="${GREEN}" ;;
                            *"Running"*) color="${YELLOW}" ;;
                            *"Pending"*) color="${NC}" ;;
                            *) color="${RED}" ;;
                        esac
                        
                        echo -e "    ${color}└─ $task_name ($agent): $status${NC}"
                    fi
                done
            fi
        done
        echo
        
        # Agent Pool Status
        ACTIVE_AGENTS=$(count_active_agents)
        MAX_AGENTS=10
        echo -e "${BOLD}Agent Pool:${NC} $ACTIVE_AGENTS/$MAX_AGENTS active"
        
        # Recent Activity
        echo -e "${BOLD}Recent Activity:${NC}"
        get_recent_activity
        echo
        
        # Blocked Tasks
        check_blocked_tasks
        
        # Performance Metrics
        if [ -f "$EPIC_DIR/metrics.json" ]; then
            echo -e "${BOLD}Metrics:${NC}"
            jq -r '"  Avg Task Duration: \(.avg_duration // "N/A")\n  Success Rate: \(.success_rate // "N/A")%"' "$EPIC_DIR/metrics.json" 2>/dev/null
            echo
        fi
        
        # Git Status
        echo -e "${BOLD}Git Status:${NC}"
        echo "  Current: $(git branch --show-current)"
        echo "  Uncommitted: $(git status --porcelain | wc -l) files"
        echo "  Worktrees: $(git worktree list | grep -c "$EPIC_NAME")"
        echo
        
        # Footer
        echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
        echo -e "${YELLOW}Refreshing every $REFRESH_INTERVAL seconds. Press Ctrl+C to exit.${NC}"
        
        sleep $REFRESH_INTERVAL
    done
}

# Handle cleanup on exit
trap 'echo -e "\n${GREEN}Monitor stopped.${NC}"; exit 0' INT TERM

# Start monitoring
monitor_epic