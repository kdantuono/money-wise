#!/bin/bash

# 🗣️  MoneyWise Agent Communication Protocol
# Inter-agent and inter-cluster messaging system
# Enables coordination between distributed AI agents

set -e

# Configuration
COMM_DIR="/home/nemesi/dev/money-wise/logs/agents/communication"
PROJECT_ROOT="/home/nemesi/dev/money-wise"
ORCHESTRATOR_SESSION="moneywise-orchestrator"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

# Communication channels
declare -A CHANNELS=(
    ["global"]="$COMM_DIR/global.log"
    ["ai-intelligence"]="$COMM_DIR/ai-intelligence.log"
    ["notification-engine"]="$COMM_DIR/notification-engine.log"
    ["event-streaming"]="$COMM_DIR/event-streaming.log"
    ["core-features"]="$COMM_DIR/core-features.log"
    ["alerts"]="$COMM_DIR/alerts.log"
    ["quality"]="$COMM_DIR/quality-gates.log"
)

# Agent roles for addressing
declare -A AGENT_ADDRESSES=(
    ["architect"]="moneywise-ai-intelligence:architect"
    ["ai-backend"]="moneywise-ai-intelligence:backend"
    ["ai-frontend"]="moneywise-ai-intelligence:frontend"
    ["ai-security"]="moneywise-ai-intelligence:security"
    ["notif-backend"]="moneywise-notification-engine:backend"
    ["notif-frontend"]="moneywise-notification-engine:frontend"
    ["notif-mobile"]="moneywise-notification-engine:mobile"
    ["notif-tester"]="moneywise-notification-engine:tester"
    ["stream-core"]="moneywise-event-streaming:core"
    ["stream-alt"]="moneywise-event-streaming:alt-backend"
    ["stream-perf"]="moneywise-event-streaming:performance"
    ["stream-tester"]="moneywise-event-streaming:tester"
)

# Message types
declare -A MESSAGE_TYPES=(
    ["INFO"]="ℹ️"
    ["SUCCESS"]="✅"
    ["WARNING"]="⚠️"
    ["ERROR"]="❌"
    ["TASK"]="📋"
    ["SYNC"]="🔄"
    ["DEPLOY"]="🚀"
    ["TEST"]="🧪"
    ["QUALITY"]="🏆"
    ["ALERT"]="🚨"
)

print_status() {
    local status=$1
    local message=$2
    local timestamp=$(date '+%H:%M:%S')
    case "$status" in
        "SUCCESS") echo -e "${GREEN}✅ [$timestamp] $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  [$timestamp] $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  [$timestamp] $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ [$timestamp] $message${NC}" ;;
        "COMM") echo -e "${CYAN}💬 [$timestamp] $message${NC}" ;;
    esac
}

# Function to initialize communication system
init_communication() {
    print_status "INFO" "Initializing Agent Communication System..."
    
    # Create communication directories
    mkdir -p "$COMM_DIR"
    mkdir -p "$COMM_DIR/archives"
    
    # Initialize channel logs
    for channel in "${!CHANNELS[@]}"; do
        touch "${CHANNELS[$channel]}"
        echo "$(date): Communication channel '$channel' initialized" >> "${CHANNELS[$channel]}"
    done
    
    # Create message templates
    create_message_templates
    
    print_status "SUCCESS" "Communication system initialized"
}

# Function to create message templates
create_message_templates() {
    cat > "$COMM_DIR/templates.sh" << 'EOF'
#!/bin/bash

# Message Templates for Agent Communication

# Quality Gate Messages
quality_pass_template() {
    local agent=$1
    local module=$2
    echo "🏆 Quality gates passed for $module by $agent"
}

quality_fail_template() {
    local agent=$1
    local module=$2
    local errors=$3
    echo "❌ Quality gates failed for $module by $agent: $errors"
}

# Deployment Messages
deploy_ready_template() {
    local agent=$1
    local feature=$2
    echo "🚀 $agent reports $feature ready for deployment"
}

deploy_complete_template() {
    local agent=$1
    local feature=$2
    echo "✅ $agent completed deployment of $feature"
}

# Sync Messages
sync_request_template() {
    local agent=$1
    local branch=$2
    echo "🔄 $agent requesting sync with $branch"
}

sync_complete_template() {
    local agent=$1
    local branch=$2
    echo "✅ $agent completed sync with $branch"
}

# Alert Messages
alert_template() {
    local severity=$1
    local agent=$2
    local message=$3
    echo "🚨 [$severity] $agent: $message"
}
EOF
    chmod +x "$COMM_DIR/templates.sh"
}

# Function to send message to specific agent
send_to_agent() {
    local agent=$1
    local message_type=$2
    local message=$3
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    if [[ -z "${AGENT_ADDRESSES[$agent]}" ]]; then
        print_status "ERROR" "Unknown agent: $agent"
        return 1
    fi
    
    local session_window="${AGENT_ADDRESSES[$agent]}"
    local session=$(echo "$session_window" | cut -d':' -f1)
    local window=$(echo "$session_window" | cut -d':' -f2)
    
    local icon="${MESSAGE_TYPES[$message_type]:-💬}"
    local formatted_message="[$timestamp] $icon $message"
    
    # Send to agent's tmux session
    if tmux has-session -t "$session" 2>/dev/null; then
        tmux display-message -t "$session:$window" "$formatted_message"
        print_status "COMM" "Sent to $agent: $message"
        
        # Log the message
        echo "$formatted_message - TO: $agent" >> "${CHANNELS[global]}"
    else
        print_status "WARNING" "Agent $agent session not found"
    fi
}

# Function to send message to cluster
send_to_cluster() {
    local cluster=$1
    local message_type=$2
    local message=$3
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    local session="moneywise-$cluster"
    local icon="${MESSAGE_TYPES[$message_type]:-💬}"
    local formatted_message="[$timestamp] $icon $message"
    
    # Send to cluster session
    if tmux has-session -t "$session" 2>/dev/null; then
        tmux display-message -t "$session" "$formatted_message"
        print_status "COMM" "Sent to cluster $cluster: $message"
        
        # Log the message
        echo "$formatted_message - TO CLUSTER: $cluster" >> "${CHANNELS[$cluster]}"
        echo "$formatted_message - TO CLUSTER: $cluster" >> "${CHANNELS[global]}"
    else
        print_status "WARNING" "Cluster $cluster session not found"
    fi
}

# Function to broadcast to all agents
broadcast_to_all() {
    local message_type=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    local icon="${MESSAGE_TYPES[$message_type]:-💬}"
    local formatted_message="[$timestamp] $icon BROADCAST: $message"
    
    print_status "COMM" "Broadcasting: $message"
    
    # Send to all clusters
    for cluster in ai-intelligence notification-engine event-streaming core-features; do
        local session="moneywise-$cluster"
        if tmux has-session -t "$session" 2>/dev/null; then
            tmux display-message -t "$session" "$formatted_message"
        fi
    done
    
    # Send to orchestrator
    if tmux has-session -t "$ORCHESTRATOR_SESSION" 2>/dev/null; then
        tmux display-message -t "$ORCHESTRATOR_SESSION" "$formatted_message"
    fi
    
    # Log the broadcast
    echo "$formatted_message" >> "${CHANNELS[global]}"
}

# Function to send quality gate results
send_quality_result() {
    local agent=$1
    local module=$2
    local result=$3
    local details=$4
    
    if [[ "$result" == "PASS" ]]; then
        send_to_agent "$agent" "QUALITY" "Quality gates passed for $module"
        broadcast_to_all "SUCCESS" "✅ $agent: Quality gates passed for $module"
    else
        send_to_agent "$agent" "ERROR" "Quality gates failed for $module: $details"
        broadcast_to_all "ERROR" "❌ $agent: Quality gates failed for $module"
    fi
    
    # Log to quality channel
    echo "$(date): $agent - $module - $result - $details" >> "${CHANNELS[quality]}"
}

# Function to coordinate deployment
coordinate_deployment() {
    local feature=$1
    local agents=("$@")
    agents=("${agents[@]:1}")  # Remove first element (feature name)
    
    print_status "INFO" "Coordinating deployment of $feature"
    
    # Notify all involved agents
    for agent in "${agents[@]}"; do
        send_to_agent "$agent" "DEPLOY" "Prepare for deployment of $feature"
    done
    
    # Broadcast deployment coordination
    broadcast_to_all "DEPLOY" "Coordinating deployment of $feature with agents: ${agents[*]}"
    
    # Log deployment coordination
    echo "$(date): DEPLOYMENT COORDINATION - Feature: $feature, Agents: ${agents[*]}" >> "${CHANNELS[global]}"
}

# Function to sync request
request_sync() {
    local requesting_agent=$1
    local target_branch=$2
    local affected_agents=("$@")
    affected_agents=("${affected_agents[@]:2}")  # Remove first two elements
    
    print_status "INFO" "Sync request from $requesting_agent for $target_branch"
    
    # Notify affected agents
    for agent in "${affected_agents[@]}"; do
        send_to_agent "$agent" "SYNC" "Sync requested for $target_branch by $requesting_agent"
    done
    
    # Broadcast sync request
    broadcast_to_all "SYNC" "$requesting_agent requesting sync with $target_branch"
    
    # Log sync request
    echo "$(date): SYNC REQUEST - From: $requesting_agent, Branch: $target_branch, Affected: ${affected_agents[*]}" >> "${CHANNELS[global]}"
}

# Function to send alert
send_alert() {
    local severity=$1
    local source_agent=$2
    local alert_message=$3
    
    print_status "WARNING" "Alert from $source_agent: $alert_message"
    
    # Send to alerts channel
    echo "$(date): [$severity] $source_agent: $alert_message" >> "${CHANNELS[alerts]}"
    
    # Broadcast based on severity
    if [[ "$severity" == "CRITICAL" ]]; then
        broadcast_to_all "ALERT" "🚨 CRITICAL: $source_agent - $alert_message"
        
        # Send to orchestrator immediately
        if tmux has-session -t "$ORCHESTRATOR_SESSION" 2>/dev/null; then
            tmux display-message -t "$ORCHESTRATOR_SESSION" "🚨 CRITICAL ALERT: $source_agent - $alert_message"
        fi
    elif [[ "$severity" == "HIGH" ]]; then
        broadcast_to_all "WARNING" "⚠️ HIGH: $source_agent - $alert_message"
    else
        send_to_cluster "$(get_agent_cluster "$source_agent")" "WARNING" "$source_agent - $alert_message"
    fi
}

# Function to get agent cluster
get_agent_cluster() {
    local agent=$1
    
    case "$agent" in
        architect|ai-*) echo "ai-intelligence" ;;
        notif-*) echo "notification-engine" ;;
        stream-*) echo "event-streaming" ;;
        *) echo "core-features" ;;
    esac
}

# Function to show communication logs
show_logs() {
    local channel=${1:-"global"}
    local lines=${2:-20}
    
    if [[ -f "${CHANNELS[$channel]}" ]]; then
        print_status "INFO" "Recent messages from $channel channel:"
        tail -n "$lines" "${CHANNELS[$channel]}"
    else
        print_status "ERROR" "Channel $channel not found"
    fi
}

# Function to show active communication
monitor_communication() {
    print_status "INFO" "Starting communication monitor..."
    
    # Create monitoring window in orchestrator
    if tmux has-session -t "$ORCHESTRATOR_SESSION" 2>/dev/null; then
        tmux new-window -t "$ORCHESTRATOR_SESSION" -n "communication" -c "$COMM_DIR"
        tmux send-keys -t "$ORCHESTRATOR_SESSION:communication" "tail -f global.log" C-m
    fi
    
    # Watch global communication log
    tail -f "${CHANNELS[global]}"
}

# Function to archive old logs
archive_logs() {
    local days_old=${1:-7}
    
    print_status "INFO" "Archiving logs older than $days_old days..."
    
    for channel in "${!CHANNELS[@]}"; do
        local log_file="${CHANNELS[$channel]}"
        if [[ -f "$log_file" ]]; then
            local archive_name="$COMM_DIR/archives/${channel}_$(date +%Y%m%d_%H%M%S).log"
            cp "$log_file" "$archive_name"
            
            # Keep only recent entries
            tail -n 1000 "$log_file" > "${log_file}.tmp"
            mv "${log_file}.tmp" "$log_file"
        fi
    done
    
    print_status "SUCCESS" "Log archiving completed"
}

# Function to show usage
show_usage() {
    cat << EOF

🗣️  MoneyWise Agent Communication Protocol
=========================================

Usage: $0 <command> [arguments]

Commands:
  init                          - Initialize communication system
  send-agent <agent> <type> <message>   - Send message to specific agent
  send-cluster <cluster> <type> <message> - Send message to cluster
  broadcast <type> <message>    - Broadcast to all agents
  quality <agent> <module> <result> [details] - Send quality gate result
  deploy <feature> <agent1> [agent2...] - Coordinate deployment
  sync <agent> <branch> <agent1> [agent2...] - Request sync
  alert <severity> <agent> <message> - Send alert
  logs [channel] [lines]        - Show communication logs
  monitor                       - Monitor live communication
  archive [days]                - Archive old logs

Agent Names:
  architect, ai-backend, ai-frontend, ai-security
  notif-backend, notif-frontend, notif-mobile, notif-tester
  stream-core, stream-alt, stream-perf, stream-tester

Message Types:
  INFO, SUCCESS, WARNING, ERROR, TASK, SYNC, DEPLOY, TEST, QUALITY, ALERT

Examples:
  $0 send-agent architect INFO "System design review completed"
  $0 broadcast SUCCESS "All quality gates passed"
  $0 quality ai-backend ml-categorization PASS
  $0 deploy financial-goals ai-backend ai-frontend notif-backend
  $0 alert CRITICAL stream-core "Memory usage at 95%"

EOF
}

# Main execution logic
case "${1}" in
    "init")
        init_communication
        ;;
    "send-agent")
        if [[ $# -lt 4 ]]; then
            echo "Usage: $0 send-agent <agent> <type> <message>"
            exit 1
        fi
        send_to_agent "$2" "$3" "$4"
        ;;
    "send-cluster")
        if [[ $# -lt 4 ]]; then
            echo "Usage: $0 send-cluster <cluster> <type> <message>"
            exit 1
        fi
        send_to_cluster "$2" "$3" "$4"
        ;;
    "broadcast")
        if [[ $# -lt 3 ]]; then
            echo "Usage: $0 broadcast <type> <message>"
            exit 1
        fi
        broadcast_to_all "$2" "$3"
        ;;
    "quality")
        if [[ $# -lt 4 ]]; then
            echo "Usage: $0 quality <agent> <module> <result> [details]"
            exit 1
        fi
        send_quality_result "$2" "$3" "$4" "${5:-}"
        ;;
    "deploy")
        if [[ $# -lt 3 ]]; then
            echo "Usage: $0 deploy <feature> <agent1> [agent2...]"
            exit 1
        fi
        coordinate_deployment "${@:2}"
        ;;
    "sync")
        if [[ $# -lt 4 ]]; then
            echo "Usage: $0 sync <requesting_agent> <branch> <agent1> [agent2...]"
            exit 1
        fi
        request_sync "$2" "$3" "${@:4}"
        ;;
    "alert")
        if [[ $# -lt 4 ]]; then
            echo "Usage: $0 alert <severity> <agent> <message>"
            exit 1
        fi
        send_alert "$2" "$3" "$4"
        ;;
    "logs")
        show_logs "$2" "$3"
        ;;
    "monitor")
        monitor_communication
        ;;
    "archive")
        archive_logs "$2"
        ;;
    "help"|"-h"|"--help"|"")
        show_usage
        ;;
    *)
        print_status "ERROR" "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac