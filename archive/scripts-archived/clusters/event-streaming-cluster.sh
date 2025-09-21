#!/bin/bash

# ⚡ Event Streaming Cluster Manager
# Specialized orchestration for real-time event streaming system
# Manages: Core streaming, Alternative backend, Performance, and Testing agents

set -e

# Configuration
CLUSTER_NAME="event-streaming"
SESSION_NAME="moneywise-$CLUSTER_NAME"
PROJECT_ROOT="/home/nemesi/dev/money-wise"
WORKTREES_ROOT="/home/nemesi/dev/worktrees"
LOG_DIR="$PROJECT_ROOT/logs/agents/clusters"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

# Event Streaming agents
declare -A STREAM_AGENTS=(
    ["core"]="feat/ml-transaction-categorization"
    ["alt-backend"]="feat/ml-transaction-categorization"
    ["performance"]="feat/ml-transaction-categorization"
    ["tester"]="feat/ml-transaction-categorization"
)

print_status() {
    local status=$1
    local message=$2
    case "$status" in
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
        "PROGRESS") echo -e "${PURPLE}🔄 $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
        "AGENT") echo -e "${CYAN}🤖 $message${NC}" ;;
    esac
}

# Function to start Event Streaming cluster
start_cluster() {
    print_status "PROGRESS" "Starting Event Streaming Cluster..."
    
    # Create main session
    tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"
    tmux rename-window -t "$SESSION_NAME:0" "stream-overview"
    
    # Create agent windows
    for role in "${!STREAM_AGENTS[@]}"; do
        agent="${STREAM_AGENTS[$role]}"
        agent_path="$WORKTREES_ROOT/$agent"
        
        # Create window for agent
        tmux new-window -t "$SESSION_NAME" -n "$role" -c "$agent_path"
        
        # Split into specialized panes
        tmux split-window -h -t "$SESSION_NAME:$role"
        tmux split-window -v -t "$SESSION_NAME:$role.0"
        tmux split-window -v -t "$SESSION_NAME:$role.1"
        
        # Setup panes for specific streaming tasks
        case "$role" in
            "core")
                setup_core_stream_panes "$role" "$agent_path"
                ;;
            "alt-backend")
                setup_alt_backend_panes "$role" "$agent_path"
                ;;
            "performance")
                setup_performance_panes "$role" "$agent_path"
                ;;
            "tester")
                setup_stream_tester_panes "$role" "$agent_path"
                ;;
        esac
    done
    
    # Setup overview window
    setup_stream_overview_window
    
    print_status "SUCCESS" "Event Streaming Cluster started successfully"
}

# Function to setup core streaming panes
setup_core_stream_panes() {
    local role=$1
    local path=$2
    
    # Pane 0: Main streaming service
    tmux send-keys -t "$SESSION_NAME:$role.0" "clear && echo '⚡ Core Event Streaming'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.0" "cd apps/backend/src/modules/events" C-m
    
    # Pane 1: WebSocket server
    tmux send-keys -t "$SESSION_NAME:$role.1" "clear && echo '🔌 WebSocket Server'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.1" "echo 'Real-time WebSocket connections'" C-m
    
    # Pane 2: Event processing
    tmux send-keys -t "$SESSION_NAME:$role.2" "clear && echo '🔄 Event Processing'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.2" "cd apps/backend/src/modules/events/processors" C-m
    
    # Pane 3: Stream monitoring
    tmux send-keys -t "$SESSION_NAME:$role.3" "clear && echo '📊 Stream Monitor'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.3" "watch -n 2 'netstat -an | grep :8080 | wc -l; echo \"Active connections\"'" C-m
}

# Function to setup alternative backend panes
setup_alt_backend_panes() {
    local role=$1
    local path=$2
    
    # Pane 0: Alternative implementation
    tmux send-keys -t "$SESSION_NAME:$role.0" "clear && echo '⚡ Alternative Backend'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.0" "echo 'Alternative streaming implementation'" C-m
    
    # Pane 1: Event queue management
    tmux send-keys -t "$SESSION_NAME:$role.1" "clear && echo '📬 Event Queue'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.1" "cd apps/backend/src/modules/queue" C-m
    
    # Pane 2: Backup systems
    tmux send-keys -t "$SESSION_NAME:$role.2" "clear && echo '💾 Backup Systems'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.2" "echo 'Failover and backup event handling'" C-m
    
    # Pane 3: Load balancing
    tmux send-keys -t "$SESSION_NAME:$role.3" "clear && echo '⚖️  Load Balancer'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.3" "watch -n 5 'docker stats --no-stream'" C-m
}

# Function to setup performance panes
setup_performance_panes() {
    local role=$1
    local path=$2
    
    # Pane 0: Performance optimization
    tmux send-keys -t "$SESSION_NAME:$role.0" "clear && echo '🚀 Performance Optimization'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.0" "echo 'Stream performance tuning'" C-m
    
    # Pane 1: Metrics collection
    tmux send-keys -t "$SESSION_NAME:$role.1" "clear && echo '📈 Metrics Collection'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.1" "echo 'Real-time performance metrics'" C-m
    
    # Pane 2: Bottleneck analysis
    tmux send-keys -t "$SESSION_NAME:$role.2" "clear && echo '🔍 Bottleneck Analysis'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.2" "echo 'Performance bottleneck identification'" C-m
    
    # Pane 3: System resources
    tmux send-keys -t "$SESSION_NAME:$role.3" "clear && echo '💻 System Resources'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.3" "htop" C-m
}

# Function to setup stream tester panes
setup_stream_tester_panes() {
    local role=$1
    local path=$2
    
    # Pane 0: Load testing
    tmux send-keys -t "$SESSION_NAME:$role.0" "clear && echo '🔥 Load Testing'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.0" "echo 'Event streaming load tests'" C-m
    
    # Pane 1: Stress testing
    tmux send-keys -t "$SESSION_NAME:$role.1" "clear && echo '💪 Stress Testing'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.1" "echo 'System stress testing'" C-m
    
    # Pane 2: Connection testing
    tmux send-keys -t "$SESSION_NAME:$role.2" "clear && echo '🔌 Connection Testing'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.2" "echo 'WebSocket connection tests'" C-m
    
    # Pane 3: Test results
    tmux send-keys -t "$SESSION_NAME:$role.3" "clear && echo '📊 Test Results'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.3" "watch -n 10 'tail -20 $LOG_DIR/stream-tests.log'" C-m
}

# Function to setup overview window
setup_stream_overview_window() {
    tmux send-keys -t "$SESSION_NAME:stream-overview" "clear" C-m
    tmux send-keys -t "$SESSION_NAME:stream-overview" "cat << 'EOF'
⚡ Event Streaming Cluster Dashboard
===================================

Active Agents:
⚡ Core:        Main event streaming implementation
⚡ Alt-Backend: Alternative backend and failover systems
🚀 Performance: Performance optimization and tuning
🔍 Tester:     Load testing and quality assurance

Current Focus: Real-time Financial Events
- Transaction streaming
- Budget alert events
- Real-time notifications
- Performance monitoring

Event Types:
💰 Transaction events
📊 Budget threshold events
🔔 Alert trigger events
📈 Analytics update events
🔄 Sync completion events

Performance Targets:
- Latency: <100ms
- Throughput: 10k events/sec
- Availability: 99.9%
- Connection limit: 50k concurrent

Quick Actions:
- Switch to core:        tmux select-window -t core
- Switch to alt-backend: tmux select-window -t alt-backend
- Switch to performance: tmux select-window -t performance
- Switch to tester:      tmux select-window -t tester

Type 'stream-help' for more commands
EOF" C-m

    # Create helper script
    tmux send-keys -t "$SESSION_NAME:stream-overview" "cat > stream-help << 'EOF'
#!/bin/bash
echo \"⚡ Event Streaming Commands\"
echo \"==========================\"
echo \"stream-status     - Show streaming system status\"
echo \"stream-load       - Run load tests\"
echo \"stream-monitor    - Monitor real-time metrics\"
echo \"stream-restart    - Restart streaming services\"
echo \"stream-scale      - Scale streaming capacity\"
echo \"stream-logs       - Show streaming logs\"
EOF" C-m
    
    tmux send-keys -t "$SESSION_NAME:stream-overview" "chmod +x stream-help" C-m
}

# Function to stop the cluster
stop_cluster() {
    print_status "INFO" "Stopping Event Streaming Cluster..."
    
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        tmux kill-session -t "$SESSION_NAME"
        print_status "SUCCESS" "Event Streaming Cluster stopped"
    else
        print_status "INFO" "Event Streaming Cluster was not running"
    fi
}

# Function to show cluster status
show_status() {
    print_status "INFO" "Event Streaming Cluster Status"
    
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        print_status "SUCCESS" "Cluster is RUNNING"
        echo ""
        echo "Active Windows:"
        tmux list-windows -t "$SESSION_NAME" 2>/dev/null
    else
        print_status "INFO" "Cluster is NOT RUNNING"
    fi
}

# Main execution
case "${1:-start}" in
    "start")
        start_cluster
        ;;
    "stop")
        stop_cluster
        ;;
    "restart")
        stop_cluster
        sleep 1
        start_cluster
        ;;
    "status")
        show_status
        ;;
    "attach")
        if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
            tmux attach -t "$SESSION_NAME"
        else
            print_status "INFO" "Cluster not running. Starting it first..."
            start_cluster
            tmux attach -t "$SESSION_NAME"
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|attach}"
        exit 1
        ;;
esac