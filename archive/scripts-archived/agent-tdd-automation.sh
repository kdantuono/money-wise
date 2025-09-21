#!/bin/bash

# Agent TDD Automation System
# Integrates with tmux sessions to automate TDD cycles and micro-commits

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
TDD_LOG_DIR="$PROJECT_ROOT/.tdd-logs"
COMMIT_AUTOMATION_DIR="$PROJECT_ROOT/.commit-automation"

mkdir -p "$AGENT_STATE_DIR" "$TDD_LOG_DIR" "$COMMIT_AUTOMATION_DIR"

# Agent session mappings
declare -A AGENT_SESSIONS=(
    ["ai-intelligence-backend"]="moneywise-ai-intelligence:backend"
    ["ai-intelligence-frontend"]="moneywise-ai-intelligence:frontend"
    ["ai-intelligence-architect"]="moneywise-ai-intelligence:architect"
    ["streaming-core"]="moneywise-event-streaming:core"
    ["streaming-performance"]="moneywise-event-streaming:performance"
    ["streaming-qa"]="moneywise-event-streaming:tester"
    ["notification-backend"]="moneywise-notification-engine:backend"
    ["notification-mobile"]="moneywise-notification-engine:mobile"
    ["notification-frontend"]="moneywise-notification-engine:frontend"
)

# Feature mappings
declare -A AGENT_FEATURES=(
    ["ai-intelligence-backend"]="ai-financial-intelligence-ml-analysis"
    ["ai-intelligence-frontend"]="ai-financial-intelligence-frontend-ui"
    ["ai-intelligence-architect"]="ai-financial-intelligence-ml-architecture"
    ["streaming-core"]="real-time-streaming-websocket-core"
    ["streaming-performance"]="real-time-streaming-performance-optimization"
    ["streaming-qa"]="real-time-streaming-qa-testing"
    ["notification-backend"]="notification-engine-smart-alerts-backend"
    ["notification-mobile"]="notification-engine-mobile-alerts"
    ["notification-frontend"]="notification-engine-web-dashboard"
)

# Agent types
declare -A AGENT_TYPES=(
    ["ai-intelligence-backend"]="backend-dev"
    ["ai-intelligence-frontend"]="frontend-dev"
    ["ai-intelligence-architect"]="architect"
    ["streaming-core"]="backend-dev"
    ["streaming-performance"]="performance"
    ["streaming-qa"]="tester"
    ["notification-backend"]="backend-dev"
    ["notification-mobile"]="mobile-dev"
    ["notification-frontend"]="frontend-dev"
)

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
        "TDD")     echo -e "${BLUE}[TDD]${NC}     [$timestamp] $message" ;;
        "AGENT")   echo -e "${PURPLE}[AGENT]${NC}   [$timestamp] $message" ;;
        "AUTO")    echo -e "${CYAN}[AUTO]${NC}    [$timestamp] $message" ;;
    esac

    echo "[$timestamp] [$level] $message" >> "$TDD_LOG_DIR/automation.log"
}

# Monitor agent activity in tmux session
monitor_agent_activity() {
    local agent_id="$1"
    local session="${AGENT_SESSIONS[$agent_id]}"
    local feature="${AGENT_FEATURES[$agent_id]}"
    local agent_type="${AGENT_TYPES[$agent_id]}"

    log "AGENT" "Starting monitoring for $agent_id ($session)"

    local last_activity_hash=""
    local tdd_phase="UNKNOWN"
    local inactivity_count=0
    local work_session_start=$(date +%s)

    while true; do
        # Check if tmux session exists
        if ! tmux has-session -t "${session%%:*}" 2>/dev/null; then
            log "ERROR" "Tmux session ${session%%:*} not found for $agent_id"
            sleep 60
            continue
        fi

        # Capture current tmux pane content
        local current_activity=$(tmux capture-pane -t "$session" -p 2>/dev/null || echo "")
        local activity_hash=$(echo "$current_activity" | md5sum | cut -d' ' -f1)

        # Check for file system changes in the feature branch
        cd "$PROJECT_ROOT"
        local current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")
        local file_changes=$(git status --porcelain 2>/dev/null | wc -l || echo 0)

        # Detect TDD phase based on changes
        if [ "$file_changes" -gt 0 ]; then
            local test_changes=$(git status --porcelain 2>/dev/null | grep -c "\.spec\.ts\|\.test\.ts" || echo 0)
            local impl_changes=$(git status --porcelain 2>/dev/null | grep -c "\.ts\|\.tsx" | grep -v -c "\.spec\.ts\|\.test\.ts" || echo 0)

            if [ "$test_changes" -gt 0 ] && [ "$impl_changes" -eq 0 ]; then
                tdd_phase="RED"
            elif [ "$test_changes" -gt 0 ] && [ "$impl_changes" -gt 0 ]; then
                tdd_phase="GREEN"
            elif [ "$impl_changes" -gt 0 ] && [ "$test_changes" -eq 0 ]; then
                tdd_phase="REFACTOR"
            else
                tdd_phase="DEVELOPMENT"
            fi
        fi

        # Detect significant activity changes
        if [ "$activity_hash" != "$last_activity_hash" ] && [ "$file_changes" -gt 0 ]; then
            log "TDD" "Activity detected for $agent_id: Phase=$tdd_phase, Files=$file_changes"

            # Reset inactivity counter
            inactivity_count=0

            # Store current state
            echo "$tdd_phase" > "$AGENT_STATE_DIR/${agent_id}.tdd_phase"
            echo "$(date +%s)" > "$AGENT_STATE_DIR/${agent_id}.last_activity"
            echo "$file_changes" > "$AGENT_STATE_DIR/${agent_id}.file_changes"

            # Update TDD log
            echo "$(date '+%Y-%m-%d %H:%M:%S') | $agent_id | $tdd_phase | $file_changes files" >> "$TDD_LOG_DIR/${agent_id}.log"

            # Trigger micro-commit based on TDD phase and time
            local time_since_start=$(($(date +%s) - work_session_start))

            if should_trigger_commit "$agent_id" "$tdd_phase" "$time_since_start" "$file_changes"; then
                trigger_agent_commit "$agent_id" "$agent_type" "$feature" "$tdd_phase"
                work_session_start=$(date +%s)  # Reset work session timer
            fi

        elif [ "$file_changes" -eq 0 ] && [ "$activity_hash" = "$last_activity_hash" ]; then
            ((inactivity_count++))

            # If agent is inactive for too long, send guidance
            if [ "$inactivity_count" -ge 12 ]; then  # 12 * 30 seconds = 6 minutes
                send_agent_guidance "$agent_id" "$session" "$tdd_phase"
                inactivity_count=0
            fi
        fi

        last_activity_hash="$activity_hash"

        # Check if feature is complete
        check_feature_completion_status "$agent_id" "$feature"

        # Sleep for 30 seconds before next check
        sleep 30
    done
}

# Determine if commit should be triggered
should_trigger_commit() {
    local agent_id="$1"
    local tdd_phase="$2"
    local time_since_start="$3"
    local file_changes="$4"

    # Trigger conditions based on TDD phase
    case "$tdd_phase" in
        "RED")
            # Commit when tests are written (every 5 minutes or significant test files)
            local test_files=$(git status --porcelain | grep -c "\.spec\.ts\|\.test\.ts" || echo 0)
            if [ "$test_files" -ge 2 ] || [ "$time_since_start" -ge 300 ]; then
                return 0
            fi
            ;;
        "GREEN")
            # Commit when implementation makes tests pass (every 10 minutes or when substantial code)
            if [ "$file_changes" -ge 3 ] || [ "$time_since_start" -ge 600 ]; then
                return 0
            fi
            ;;
        "REFACTOR")
            # Commit after optimization is complete (every 15 minutes)
            if [ "$time_since_start" -ge 900 ]; then
                return 0
            fi
            ;;
        *)
            # General development commits every 20 minutes
            if [ "$time_since_start" -ge 1200 ]; then
                return 0
            fi
            ;;
    esac

    return 1
}

# Trigger automated commit for agent
trigger_agent_commit() {
    local agent_id="$1"
    local agent_type="$2"
    local feature="$3"
    local tdd_phase="$4"

    log "AUTO" "Triggering automated commit for $agent_id ($tdd_phase phase)"

    # Generate contextual change summary
    local change_summary=$(generate_change_summary "$agent_id" "$tdd_phase")

    # Switch to the feature branch directory
    cd "$PROJECT_ROOT"

    # Ensure we're on the correct feature branch
    local expected_branch="feature/$feature"
    local current_branch=$(git branch --show-current)

    if [ "$current_branch" != "$expected_branch" ]; then
        log "WARN" "Agent $agent_id not on expected branch $expected_branch (on $current_branch)"
        # Try to switch to correct branch
        if git checkout "$expected_branch" 2>/dev/null; then
            log "SUCCESS" "Switched $agent_id to correct branch $expected_branch"
        else
            log "ERROR" "Failed to switch $agent_id to branch $expected_branch"
            return 1
        fi
    fi

    # Execute micro-commit
    if "$SCRIPT_DIR/agent-micro-commit.sh" commit "$agent_type" "$feature" "$change_summary"; then
        log "SUCCESS" "Automated commit successful for $agent_id"

        # Update commit automation log
        echo "$(date '+%Y-%m-%d %H:%M:%S') | $agent_id | $tdd_phase | SUCCESS | $change_summary" >> "$COMMIT_AUTOMATION_DIR/commits.log"

        # Send success notification to agent
        send_commit_notification "$agent_id" "$tdd_phase" "SUCCESS" "$change_summary"

        return 0
    else
        log "ERROR" "Automated commit failed for $agent_id"

        # Log failure
        echo "$(date '+%Y-%m-%d %H:%M:%S') | $agent_id | $tdd_phase | FAILED | $change_summary" >> "$COMMIT_AUTOMATION_DIR/commits.log"

        # Send failure notification to agent
        send_commit_notification "$agent_id" "$tdd_phase" "FAILED" "$change_summary"

        return 1
    fi
}

# Generate contextual change summary
generate_change_summary() {
    local agent_id="$1"
    local tdd_phase="$2"

    # Analyze modified files to generate meaningful summary
    local modified_files=$(git status --porcelain | head -5 | awk '{print $2}' | tr '\n' ' ')
    local test_files=$(git status --porcelain | grep -c "\.spec\.ts\|\.test\.ts" || echo 0)
    local impl_files=$(git status --porcelain | grep -c "\.ts\|\.tsx" | grep -v -c "\.spec\.ts\|\.test\.ts" || echo 0)

    case "$tdd_phase" in
        "RED")
            echo "add failing tests for core functionality ($test_files test files)"
            ;;
        "GREEN")
            echo "implement features to satisfy tests ($impl_files implementation files)"
            ;;
        "REFACTOR")
            echo "optimize and refactor implementation ($impl_files files improved)"
            ;;
        *)
            echo "incremental development progress ($((test_files + impl_files)) files modified)"
            ;;
    esac
}

# Send commit notification to agent
send_commit_notification() {
    local agent_id="$1"
    local tdd_phase="$2"
    local status="$3"
    local change_summary="$4"
    local session="${AGENT_SESSIONS[$agent_id]}"

    local notification=""
    case "$status" in
        "SUCCESS")
            notification="✅ AUTO-COMMIT: $tdd_phase phase commit successful - $change_summary"
            ;;
        "FAILED")
            notification="❌ AUTO-COMMIT: $tdd_phase phase commit failed - please review changes"
            ;;
    esac

    # Send notification to agent tmux session
    tmux send-keys -t "$session" "echo '$notification'" Enter

    log "AGENT" "Sent notification to $agent_id: $status"
}

# Send guidance to inactive agent
send_agent_guidance() {
    local agent_id="$1"
    local session="$2"
    local current_phase="$3"

    local guidance=""
    case "$current_phase" in
        "RED")
            guidance="🔴 TDD GUIDANCE: Write more failing tests to define expected behavior"
            ;;
        "GREEN")
            guidance="🟢 TDD GUIDANCE: Implement code to make the failing tests pass"
            ;;
        "REFACTOR")
            guidance="🟡 TDD GUIDANCE: Optimize and refactor while keeping tests green"
            ;;
        *)
            guidance="📋 TDD GUIDANCE: Start by writing failing tests (RED phase)"
            ;;
    esac

    tmux send-keys -t "$session" "echo '$guidance'" Enter

    log "AGENT" "Sent TDD guidance to $agent_id: $current_phase phase"
}

# Check feature completion status
check_feature_completion_status() {
    local agent_id="$1"
    local feature="$2"

    # Run feature completion check
    local completion_result=$("$SCRIPT_DIR/agent-micro-commit.sh" check "$feature" 2>/dev/null || echo "IN_DEVELOPMENT")

    # Update agent feature status
    echo "$completion_result" > "$AGENT_STATE_DIR/${agent_id}.feature_status"

    # If feature is complete, trigger integration workflow
    if [ "$completion_result" = "READY_FOR_INTEGRATION" ]; then
        log "SUCCESS" "🎉 Feature $feature completed by $agent_id - triggering integration"

        # Trigger branch synchronization
        "$SCRIPT_DIR/branch-sync-orchestrator.sh" merge-feature "feature/$feature" &

        # Mark agent as completed
        echo "FEATURE_COMPLETED" > "$AGENT_STATE_DIR/${agent_id}.status"
        echo "$(date '+%Y-%m-%d %H:%M:%S')" > "$AGENT_STATE_DIR/${agent_id}.completed"
    fi
}

# Coordinate multiple agents working on related features
coordinate_agent_teams() {
    log "INFO" "Starting agent team coordination"

    # Group agents by feature family
    local ai_team=("ai-intelligence-backend" "ai-intelligence-frontend" "ai-intelligence-architect")
    local streaming_team=("streaming-core" "streaming-performance" "streaming-qa")
    local notification_team=("notification-backend" "notification-mobile" "notification-frontend")

    # Monitor team coordination
    while true; do
        # Check AI Intelligence team coordination
        check_team_coordination "AI Intelligence" "${ai_team[@]}"

        # Check Streaming team coordination
        check_team_coordination "Real-Time Streaming" "${streaming_team[@]}"

        # Check Notification team coordination
        check_team_coordination "Notification Engine" "${notification_team[@]}"

        # Sleep for 2 minutes between coordination checks
        sleep 120
    done
}

# Check coordination between team members
check_team_coordination() {
    local team_name="$1"
    shift
    local team_agents=("$@")

    local completed_agents=0
    local total_agents=${#team_agents[@]}
    local team_status=""

    for agent in "${team_agents[@]}"; do
        local agent_status=$(cat "$AGENT_STATE_DIR/${agent}.status" 2>/dev/null || echo "IN_DEVELOPMENT")

        if [ "$agent_status" = "FEATURE_COMPLETED" ]; then
            ((completed_agents++))
        fi
    done

    local completion_percentage=$((completed_agents * 100 / total_agents))

    if [ "$completion_percentage" -eq 100 ]; then
        team_status="🎉 TEAM COMPLETE"
        log "SUCCESS" "$team_name team: All agents completed ($completed_agents/$total_agents)"

        # Trigger team integration
        trigger_team_integration "$team_name" "${team_agents[@]}"

    elif [ "$completion_percentage" -ge 50 ]; then
        team_status="🔄 MAJORITY PROGRESS"
        log "INFO" "$team_name team: $completion_percentage% complete ($completed_agents/$total_agents)"

        # Send coordination messages to remaining agents
        for agent in "${team_agents[@]}"; do
            local agent_status=$(cat "$AGENT_STATE_DIR/${agent}.status" 2>/dev/null || echo "IN_DEVELOPMENT")
            if [ "$agent_status" != "FEATURE_COMPLETED" ]; then
                local session="${AGENT_SESSIONS[$agent]}"
                tmux send-keys -t "$session" "echo '🚀 TEAM UPDATE: $completion_percentage% of $team_name team completed - keep up the momentum!'" Enter
            fi
        done
    else
        team_status="📊 IN PROGRESS"
        log "INFO" "$team_name team: $completion_percentage% complete ($completed_agents/$total_agents)"
    fi

    # Update team coordination log
    echo "$(date '+%Y-%m-%d %H:%M:%S') | $team_name | $completion_percentage% | $team_status" >> "$TDD_LOG_DIR/team-coordination.log"
}

# Trigger team integration when all members complete
trigger_team_integration() {
    local team_name="$1"
    shift
    local team_agents=("$@")

    log "SUCCESS" "🎉 $team_name team completed - triggering comprehensive integration"

    # Get all feature branches for this team
    local feature_branches=()
    for agent in "${team_agents[@]}"; do
        local feature="${AGENT_FEATURES[$agent]}"
        feature_branches+=("feature/$feature")
    done

    # Trigger coordinated integration
    for branch in "${feature_branches[@]}"; do
        "$SCRIPT_DIR/branch-sync-orchestrator.sh" merge-feature "$branch" &
    done

    # Create team completion milestone
    echo "$(date '+%Y-%m-%d %H:%M:%S')" > "$AGENT_STATE_DIR/team-${team_name// /-}-completed"

    log "SUCCESS" "$team_name team integration triggered for ${#feature_branches[@]} feature branches"
}

# Start monitoring all agents
start_all_agent_monitoring() {
    log "INFO" "Starting comprehensive agent TDD automation monitoring"

    # Start individual agent monitors
    for agent_id in "${!AGENT_SESSIONS[@]}"; do
        log "INFO" "Starting monitor for agent: $agent_id"
        monitor_agent_activity "$agent_id" &
    done

    # Start team coordination
    coordinate_agent_teams &

    # Start branch synchronization monitor
    "$SCRIPT_DIR/branch-sync-orchestrator.sh" auto-sync &

    log "SUCCESS" "All agent monitoring systems started"

    # Keep main process alive
    wait
}

# Show agent automation status
show_automation_status() {
    echo -e "${PURPLE}🤖 AGENT TDD AUTOMATION STATUS${NC}"
    echo "======================================"

    echo -e "\n${CYAN}Individual Agent Status:${NC}"
    for agent_id in "${!AGENT_SESSIONS[@]}"; do
        local session="${AGENT_SESSIONS[$agent_id]}"
        local feature="${AGENT_FEATURES[$agent_id]}"
        local tdd_phase=$(cat "$AGENT_STATE_DIR/${agent_id}.tdd_phase" 2>/dev/null || echo "UNKNOWN")
        local status=$(cat "$AGENT_STATE_DIR/${agent_id}.status" 2>/dev/null || echo "IN_DEVELOPMENT")
        local last_activity=$(cat "$AGENT_STATE_DIR/${agent_id}.last_activity" 2>/dev/null || echo 0)
        local time_diff=$(($(date +%s) - last_activity))

        echo "  $agent_id:"
        echo "    TDD Phase: $tdd_phase"
        echo "    Status: $status"
        echo "    Feature: $feature"
        echo "    Last Activity: ${time_diff}s ago"
        echo "    Session: $session"
        echo ""
    done

    echo -e "\n${BLUE}Team Coordination Status:${NC}"

    # Show team completion percentages
    local ai_completed=$(ls "$AGENT_STATE_DIR" | grep -c "ai-intelligence.*completed" || echo 0)
    local streaming_completed=$(ls "$AGENT_STATE_DIR" | grep -c "streaming.*completed" || echo 0)
    local notification_completed=$(ls "$AGENT_STATE_DIR" | grep -c "notification.*completed" || echo 0)

    echo "  AI Intelligence Team: $ai_completed/3 completed"
    echo "  Real-Time Streaming Team: $streaming_completed/3 completed"
    echo "  Notification Engine Team: $notification_completed/3 completed"

    echo -e "\n${GREEN}Recent Automation Activity:${NC}"
    if [ -f "$COMMIT_AUTOMATION_DIR/commits.log" ]; then
        tail -10 "$COMMIT_AUTOMATION_DIR/commits.log" | while IFS='|' read -r timestamp agent phase status summary; do
            echo "  $timestamp | $agent | $phase | $status"
        done
    else
        echo "  No automation activity recorded yet"
    fi
}

# Main execution logic
main() {
    local command="${1:-help}"

    case "$command" in
        "start")
            start_all_agent_monitoring
            ;;
        "monitor")
            local agent_id="${2:-}"
            if [ -z "$agent_id" ]; then
                log "ERROR" "Usage: $0 monitor <agent_id>"
                exit 1
            fi
            monitor_agent_activity "$agent_id"
            ;;
        "coordinate")
            coordinate_agent_teams
            ;;
        "status")
            show_automation_status
            ;;
        *)
            echo "Agent TDD Automation System"
            echo "Usage: $0 <command> [options]"
            echo ""
            echo "Commands:"
            echo "  start                    - Start monitoring all agents"
            echo "  monitor <agent_id>       - Monitor specific agent"
            echo "  coordinate               - Start team coordination only"
            echo "  status                   - Show automation status"
            echo ""
            echo "Available Agents:"
            for agent_id in "${!AGENT_SESSIONS[@]}"; do
                echo "  $agent_id (${AGENT_FEATURES[$agent_id]})"
            done
            ;;
    esac
}

main "$@"