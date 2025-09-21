#!/bin/bash

# 🤖 MoneyWise Multi-Agent tmux Orchestrator
# Advanced orchestration system for managing multiple AI agents across different feature branches
# Author: AI Agent Orchestrator
# Version: 1.0.0

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
ORCHESTRATOR_SESSION="moneywise-orchestrator"
PROJECT_ROOT="/home/nemesi/dev/money-wise"
WORKTREES_ROOT="/home/nemesi/dev/worktrees"
LOG_DIR="$PROJECT_ROOT/logs/agents"

# Agent clusters configuration
declare -A CLUSTERS=(
    ["ai-intelligence"]="architect-ai-financial-intelligence-e6bad5e7:backend-dev-ai-financial-intelligence-4ff64573:frontend-dev-ai-financial-intelligence-d0955f96:security-ai-financial-intelligence-1824e9a3"
    ["notification-engine"]="backend-dev-notification-alert-engine-e7be4eb4:frontend-dev-notification-alert-engine-bb4f0c9e:mobile-dev-notification-alert-engine-92114a9e:tester-notification-alert-engine-11e4e7bc"
    ["event-streaming"]="backend-dev-real-time-event-streaming-0fa17aeb:backend-dev-real-time-event-streaming-848c3547:performance-real-time-event-streaming-0da1bfbb:tester-real-time-event-streaming-7e45879c"
    ["core-features"]="feat/financial-goal-system:feat/multi-currency-support:feat/plaid-banking-integration:feat/receipt-scanning-ocr:feat/ui-dashboard-enhancement:feat/ux-money-centric-redesign"
)

# Agent roles mapping
declare -A AGENT_ROLES=(
    ["architect-ai-financial-intelligence-e6bad5e7"]="🏗️  AI Architect"
    ["backend-dev-ai-financial-intelligence-4ff64573"]="⚙️  Backend Dev"
    ["frontend-dev-ai-financial-intelligence-d0955f96"]="🎨 Frontend Dev"
    ["security-ai-financial-intelligence-1824e9a3"]="🔒 Security Expert"
    ["backend-dev-notification-alert-engine-e7be4eb4"]="📡 Backend Notif"
    ["frontend-dev-notification-alert-engine-bb4f0c9e"]="🔔 Frontend Notif"
    ["mobile-dev-notification-alert-engine-92114a9e"]="📱 Mobile Dev"
    ["tester-notification-alert-engine-11e4e7bc"]="🧪 QA Tester"
    ["backend-dev-real-time-event-streaming-0fa17aeb"]="⚡ Stream Core"
    ["backend-dev-real-time-event-streaming-848c3547"]="⚡ Stream Alt"
    ["performance-real-time-event-streaming-0da1bfbb"]="🚀 Performance"
    ["tester-real-time-event-streaming-7e45879c"]="🔍 Stream QA"
)

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    
    case "$status" in
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
        "PROGRESS") echo -e "${PURPLE}🔄 $message${NC}" ;;
        "AGENT") echo -e "${CYAN}🤖 $message${NC}" ;;
        *) echo -e "${NC}$message" ;;
    esac
}

# Function to check dependencies
check_dependencies() {
    print_status "INFO" "Checking dependencies..."
    
    if ! command -v tmux &> /dev/null; then
        print_status "ERROR" "tmux is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        print_status "ERROR" "git is not installed."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_status "ERROR" "npm is not installed."
        exit 1
    fi
    
    print_status "SUCCESS" "All dependencies are available"
}

# Function to setup logging
setup_logging() {
    print_status "INFO" "Setting up logging system..."
    
    mkdir -p "$LOG_DIR"
    mkdir -p "$LOG_DIR/clusters"
    mkdir -p "$LOG_DIR/agents"
    
    # Create master log file
    echo "$(date): MoneyWise Agent Orchestrator Started" > "$LOG_DIR/orchestrator.log"
    
    print_status "SUCCESS" "Logging system initialized"
}

# Function to kill existing sessions
cleanup_existing_sessions() {
    print_status "INFO" "Cleaning up existing sessions..."
    
    # Kill orchestrator session if exists
    tmux has-session -t "$ORCHESTRATOR_SESSION" 2>/dev/null && {
        tmux kill-session -t "$ORCHESTRATOR_SESSION"
        print_status "INFO" "Killed existing orchestrator session"
    }
    
    # Kill cluster sessions
    for cluster in "${!CLUSTERS[@]}"; do
        session_name="moneywise-$cluster"
        tmux has-session -t "$session_name" 2>/dev/null && {
            tmux kill-session -t "$session_name"
            print_status "INFO" "Killed existing cluster session: $cluster"
        }
    done
    
    print_status "SUCCESS" "Cleanup completed"
}

# Function to create orchestrator session
create_orchestrator_session() {
    print_status "INFO" "Creating orchestrator session..."
    
    # Create main orchestrator session
    tmux new-session -d -s "$ORCHESTRATOR_SESSION" -c "$PROJECT_ROOT"
    
    # Rename first window to dashboard
    tmux rename-window -t "$ORCHESTRATOR_SESSION:0" "dashboard"
    
    # Create additional windows
    tmux new-window -t "$ORCHESTRATOR_SESSION" -n "logs" -c "$LOG_DIR"
    tmux new-window -t "$ORCHESTRATOR_SESSION" -n "monitoring" -c "$PROJECT_ROOT"
    tmux new-window -t "$ORCHESTRATOR_SESSION" -n "control" -c "$PROJECT_ROOT"
    
    # Split dashboard window into panes
    tmux split-window -h -t "$ORCHESTRATOR_SESSION:dashboard"
    tmux split-window -v -t "$ORCHESTRATOR_SESSION:dashboard.1"
    
    # Setup dashboard panes
    tmux send-keys -t "$ORCHESTRATOR_SESSION:dashboard.0" "clear && echo '🎛️  MoneyWise Agent Orchestrator Dashboard' && echo '=========================================='" C-m
    tmux send-keys -t "$ORCHESTRATOR_SESSION:dashboard.1" "clear && echo '📊 Cluster Status Monitor' && echo '========================'" C-m
    tmux send-keys -t "$ORCHESTRATOR_SESSION:dashboard.2" "clear && echo '🤖 Active Agents' && echo '==============='" C-m
    
    print_status "SUCCESS" "Orchestrator session created"
}

# Function to create cluster session
create_cluster_session() {
    local cluster_name=$1
    local agents_string=$2
    local session_name="moneywise-$cluster_name"
    
    print_status "PROGRESS" "Creating cluster session: $cluster_name"
    
    # Create cluster session
    tmux new-session -d -s "$session_name" -c "$PROJECT_ROOT"
    tmux rename-window -t "$session_name:0" "overview"
    
    # Convert agents string to array
    IFS=':' read -ra agents <<< "$agents_string"
    
    local window_index=1
    for agent in "${agents[@]}"; do
        # Determine agent path
        local agent_path
        if [[ $agent == feat/* ]]; then
            agent_path="$PROJECT_ROOT"
        else
            agent_path="$WORKTREES_ROOT/$agent"
        fi
        
        # Get agent role
        local role="${AGENT_ROLES[$agent]:-🤖 Agent}"
        
        # Create window for agent
        local window_name=$(echo "$agent" | cut -d'-' -f1-3)
        tmux new-window -t "$session_name" -n "$window_name" -c "$agent_path"
        
        # Split window into panes for different tasks
        tmux split-window -h -t "$session_name:$window_name"
        tmux split-window -v -t "$session_name:$window_name.1"
        
        # Setup agent panes
        tmux send-keys -t "$session_name:$window_name.0" "clear && echo '$role - $agent' && echo 'Working Directory: $agent_path'" C-m
        tmux send-keys -t "$session_name:$window_name.1" "clear && echo '📊 Status Monitor'" C-m
        tmux send-keys -t "$session_name:$window_name.2" "clear && echo '🧪 Quality Gates'" C-m
        
        # Start monitoring in second pane
        tmux send-keys -t "$session_name:$window_name.1" "watch -n 5 'git status --porcelain | wc -l; echo \"Files changed: \$(git status --porcelain | wc -l)\"'" C-m
        
        # Setup quality gates in third pane
        tmux send-keys -t "$session_name:$window_name.2" "echo 'Ready for quality checks...'" C-m
        
        ((window_index++))
    done
    
    # Setup overview window
    tmux send-keys -t "$session_name:overview" "clear && echo '🏗️  $cluster_name Cluster Overview' && echo '================================'" C-m
    tmux send-keys -t "$session_name:overview" "echo 'Agents in this cluster:'" C-m
    for agent in "${agents[@]}"; do
        local role="${AGENT_ROLES[$agent]:-🤖 Agent}"
        tmux send-keys -t "$session_name:overview" "echo '  - $role: $agent'" C-m
    done
    
    # Create cluster log
    echo "$(date): Cluster $cluster_name started with agents: ${agents[*]}" >> "$LOG_DIR/clusters/$cluster_name.log"
    
    print_status "SUCCESS" "Cluster '$cluster_name' created with ${#agents[@]} agents"
}

# Function to create all clusters
create_all_clusters() {
    print_status "INFO" "Creating all agent clusters..."
    
    for cluster in "${!CLUSTERS[@]}"; do
        create_cluster_session "$cluster" "${CLUSTERS[$cluster]}"
        sleep 1  # Small delay to prevent overwhelming the system
    done
    
    print_status "SUCCESS" "All clusters created successfully"
}

# Function to setup inter-cluster communication
setup_communication() {
    print_status "INFO" "Setting up inter-cluster communication..."
    
    # Create communication script in control window
    tmux send-keys -t "$ORCHESTRATOR_SESSION:control" "cat > agent-comm.sh << 'EOF'
#!/bin/bash
# Agent Communication Helper
send_to_cluster() {
    local cluster=\$1
    local message=\$2
    echo \"\$(date): [\$cluster] \$message\" >> $LOG_DIR/communication.log
    tmux display-message -t \"moneywise-\$cluster\" \"\$message\"
}

broadcast_to_all() {
    local message=\$1
    for cluster in ai-intelligence notification-engine event-streaming core-features; do
        send_to_cluster \$cluster \"\$message\"
    done
}

# Usage examples:
# send_to_cluster \"ai-intelligence\" \"Quality gates passed for ML module\"
# broadcast_to_all \"System-wide update: New dependencies available\"
EOF" C-m
    
    tmux send-keys -t "$ORCHESTRATOR_SESSION:control" "chmod +x agent-comm.sh" C-m
    
    print_status "SUCCESS" "Communication system setup complete"
}

# Function to setup monitoring
setup_monitoring() {
    print_status "INFO" "Setting up monitoring dashboard..."
    
    # Create monitoring script
    tmux send-keys -t "$ORCHESTRATOR_SESSION:monitoring" "cat > monitor.sh << 'EOF'
#!/bin/bash
while true; do
    clear
    echo \"🎛️  MoneyWise Agent Orchestrator Monitor\"
    echo \"======================================\"
    echo \"Time: \$(date)\"
    echo \"\"
    
    echo \"📊 Cluster Status:\"
    for cluster in ai-intelligence notification-engine event-streaming core-features; do
        if tmux has-session -t \"moneywise-\$cluster\" 2>/dev/null; then
            echo \"  ✅ \$cluster: ACTIVE\"
        else
            echo \"  ❌ \$cluster: INACTIVE\"
        fi
    done
    
    echo \"\"
    echo \"🔄 Recent Activity:\"
    tail -n 5 $LOG_DIR/orchestrator.log 2>/dev/null || echo \"  No logs yet\"
    
    echo \"\"
    echo \"💾 System Resources:\"
    echo \"  Memory: \$(free -h | grep Mem | awk '{print \$3\"/\"\$2}')\"
    echo \"  CPU Load: \$(uptime | awk '{print \$10\$11\$12}')\"
    
    sleep 10
done
EOF" C-m
    
    tmux send-keys -t "$ORCHESTRATOR_SESSION:monitoring" "chmod +x monitor.sh && ./monitor.sh" C-m
    
    print_status "SUCCESS" "Monitoring system activated"
}

# Function to display usage instructions
show_usage() {
    cat << EOF

🎛️  MoneyWise Agent Orchestrator
===============================

Usage: $0 [COMMAND]

Commands:
  start     - Start the complete orchestration system
  stop      - Stop all agent sessions
  restart   - Stop and start the system
  status    - Show current system status
  attach    - Attach to orchestrator session
  help      - Show this help message

Cluster Sessions:
  - moneywise-ai-intelligence     (AI & ML features)
  - moneywise-notification-engine (Alerts & notifications)
  - moneywise-event-streaming     (Real-time events)
  - moneywise-core-features       (Core application features)

Quick Access:
  tmux attach -t $ORCHESTRATOR_SESSION              # Main dashboard
  tmux attach -t moneywise-ai-intelligence         # AI cluster
  tmux attach -t moneywise-notification-engine     # Notification cluster
  tmux attach -t moneywise-event-streaming         # Streaming cluster
  tmux attach -t moneywise-core-features           # Core features cluster

Logs Location: $LOG_DIR

EOF
}

# Function to start the complete system
start_system() {
    print_status "PROGRESS" "Starting MoneyWise Agent Orchestration System..."
    
    check_dependencies
    setup_logging
    cleanup_existing_sessions
    
    create_orchestrator_session
    create_all_clusters
    setup_communication
    setup_monitoring
    
    # Log the startup
    echo "$(date): MoneyWise Agent Orchestration System started successfully" >> "$LOG_DIR/orchestrator.log"
    
    print_status "SUCCESS" "🎉 MoneyWise Agent Orchestration System is now running!"
    echo ""
    print_status "INFO" "To access the main dashboard: tmux attach -t $ORCHESTRATOR_SESSION"
    print_status "INFO" "To see all available commands: $0 help"
    echo ""
    
    # Show status
    show_status
}

# Function to stop the system
stop_system() {
    print_status "INFO" "Stopping MoneyWise Agent Orchestration System..."
    
    cleanup_existing_sessions
    
    echo "$(date): MoneyWise Agent Orchestration System stopped" >> "$LOG_DIR/orchestrator.log" 2>/dev/null || true
    
    print_status "SUCCESS" "System stopped successfully"
}

# Function to show system status
show_status() {
    print_status "INFO" "MoneyWise Agent Orchestration System Status"
    echo "=============================================="
    
    # Check orchestrator
    if tmux has-session -t "$ORCHESTRATOR_SESSION" 2>/dev/null; then
        print_status "SUCCESS" "Orchestrator: RUNNING"
    else
        print_status "ERROR" "Orchestrator: NOT RUNNING"
    fi
    
    # Check clusters
    for cluster in "${!CLUSTERS[@]}"; do
        session_name="moneywise-$cluster"
        if tmux has-session -t "$session_name" 2>/dev/null; then
            print_status "SUCCESS" "Cluster '$cluster': RUNNING"
        else
            print_status "ERROR" "Cluster '$cluster': NOT RUNNING"
        fi
    done
    
    # Show active sessions
    echo ""
    print_status "INFO" "Active tmux sessions:"
    tmux list-sessions 2>/dev/null | grep moneywise || echo "  No MoneyWise sessions found"
}

# Main execution logic
case "${1:-start}" in
    "start")
        start_system
        ;;
    "stop")
        stop_system
        ;;
    "restart")
        stop_system
        sleep 2
        start_system
        ;;
    "status")
        show_status
        ;;
    "attach")
        if tmux has-session -t "$ORCHESTRATOR_SESSION" 2>/dev/null; then
            tmux attach -t "$ORCHESTRATOR_SESSION"
        else
            print_status "ERROR" "Orchestrator session is not running. Start it first with: $0 start"
        fi
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    *)
        print_status "ERROR" "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac