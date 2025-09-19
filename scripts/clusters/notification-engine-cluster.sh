#!/bin/bash

# 🔔 Notification Engine Cluster Manager
# Specialized orchestration for notification and alert system development
# Manages: Backend, Frontend, Mobile, and Testing agents

set -e

# Configuration
CLUSTER_NAME="notification-engine"
SESSION_NAME="moneywise-$CLUSTER_NAME"
PROJECT_ROOT="/home/nemesi/dev/money-wise"
WORKTREES_ROOT="/home/nemesi/dev/worktrees"
LOG_DIR="$PROJECT_ROOT/logs/agents/clusters"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Notification Engine agents
declare -A NOTIF_AGENTS=(
    ["backend"]="feat/ml-transaction-categorization"
    ["frontend"]="feat/ml-transaction-categorization"
    ["mobile"]="feat/ml-transaction-categorization"
    ["tester"]="feat/ml-transaction-categorization"
)

print_status() {
    local status=$1
    local message=$2
    case "$status" in
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
        "PROGRESS") echo -e "${PURPLE}🔄 $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "AGENT") echo -e "${CYAN}🤖 $message${NC}" ;;
    esac
}

# Function to start Notification Engine cluster
start_cluster() {
    print_status "PROGRESS" "Starting Notification Engine Cluster..."
    
    # Create main session
    tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"
    tmux rename-window -t "$SESSION_NAME:0" "notif-overview"
    
    # Create agent windows
    for role in "${!NOTIF_AGENTS[@]}"; do
        agent="${NOTIF_AGENTS[$role]}"
        agent_path="$WORKTREES_ROOT/$agent"
        
        # Create window for agent
        tmux new-window -t "$SESSION_NAME" -n "$role" -c "$agent_path"
        
        # Split into specialized panes
        tmux split-window -h -t "$SESSION_NAME:$role"
        tmux split-window -v -t "$SESSION_NAME:$role.0"
        tmux split-window -v -t "$SESSION_NAME:$role.1"
        
        # Setup panes for specific notification tasks
        case "$role" in
            "backend")
                setup_backend_notif_panes "$role" "$agent_path"
                ;;
            "frontend")
                setup_frontend_notif_panes "$role" "$agent_path"
                ;;
            "mobile")
                setup_mobile_notif_panes "$role" "$agent_path"
                ;;
            "tester")
                setup_tester_notif_panes "$role" "$agent_path"
                ;;
        esac
    done
    
    # Setup overview window
    setup_notif_overview_window
    
    print_status "SUCCESS" "Notification Engine Cluster started successfully"
}

# Function to setup backend notification panes
setup_backend_notif_panes() {
    local role=$1
    local path=$2
    
    # Pane 0: Notification API development
    tmux send-keys -t "$SESSION_NAME:$role.0" "clear && echo '📡 Notification API Development'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.0" "cd apps/backend/src/modules/notifications" C-m
    
    # Pane 1: Real-time services
    tmux send-keys -t "$SESSION_NAME:$role.1" "clear && echo '⚡ Real-time Services'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.1" "echo 'WebSocket and SSE implementation'" C-m
    
    # Pane 2: Alert engine
    tmux send-keys -t "$SESSION_NAME:$role.2" "clear && echo '🚨 Alert Engine'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.2" "cd apps/backend/src/modules/alerts" C-m
    
    # Pane 3: Service monitoring
    tmux send-keys -t "$SESSION_NAME:$role.3" "clear && echo '📊 Service Monitor'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.3" "watch -n 5 'ps aux | grep node | grep notification'" C-m
}

# Function to setup frontend notification panes
setup_frontend_notif_panes() {
    local role=$1
    local path=$2
    
    # Pane 0: Notification UI components
    tmux send-keys -t "$SESSION_NAME:$role.0" "clear && echo '🔔 Notification UI Development'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.0" "cd apps/web/src/components/notifications" C-m
    
    # Pane 1: Toast system
    tmux send-keys -t "$SESSION_NAME:$role.1" "clear && echo '🍞 Toast System'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.1" "echo 'Sonner integration and custom toasts'" C-m
    
    # Pane 2: Real-time UI
    tmux send-keys -t "$SESSION_NAME:$role.2" "clear && echo '⚡ Real-time UI'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.2" "cd apps/web/src/hooks/useNotifications.ts" C-m
    
    # Pane 3: UI testing
    tmux send-keys -t "$SESSION_NAME:$role.3" "clear && echo '🧪 UI Testing'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.3" "cd apps/web && npm run test:notifications" C-m
}

# Function to setup mobile notification panes
setup_mobile_notif_panes() {
    local role=$1
    local path=$2
    
    # Pane 0: Push notifications
    tmux send-keys -t "$SESSION_NAME:$role.0" "clear && echo '📱 Push Notifications'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.0" "cd apps/mobile/src/notifications" C-m
    
    # Pane 1: Local notifications
    tmux send-keys -t "$SESSION_NAME:$role.1" "clear && echo '📳 Local Notifications'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.1" "echo 'Local notification scheduling'" C-m
    
    # Pane 2: Background sync
    tmux send-keys -t "$SESSION_NAME:$role.2" "clear && echo '🔄 Background Sync'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.2" "echo 'Background task handling'" C-m
    
    # Pane 3: Mobile testing
    tmux send-keys -t "$SESSION_NAME:$role.3" "clear && echo '📱 Mobile Testing'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.3" "cd apps/mobile && expo start" C-m
}

# Function to setup tester notification panes
setup_tester_notif_panes() {
    local role=$1
    local path=$2
    
    # Pane 0: Automated testing
    tmux send-keys -t "$SESSION_NAME:$role.0" "clear && echo '🧪 Automated Testing'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.0" "echo 'E2E notification testing'" C-m
    
    # Pane 1: Performance testing
    tmux send-keys -t "$SESSION_NAME:$role.1" "clear && echo '⚡ Performance Testing'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.1" "echo 'Load testing notification system'" C-m
    
    # Pane 2: Cross-platform testing
    tmux send-keys -t "$SESSION_NAME:$role.2" "clear && echo '🌐 Cross-platform Testing'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.2" "echo 'Testing across web, mobile, email'" C-m
    
    # Pane 3: Test monitoring
    tmux send-keys -t "$SESSION_NAME:$role.3" "clear && echo '📊 Test Monitor'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.3" "watch -n 10 'npm run test:notifications:status'" C-m
}

# Function to setup overview window
setup_notif_overview_window() {
    tmux send-keys -t "$SESSION_NAME:notif-overview" "clear" C-m
    tmux send-keys -t "$SESSION_NAME:notif-overview" "cat << 'EOF'
🔔 Notification Engine Cluster Dashboard
========================================

Active Agents:
📡 Backend:   Notification APIs and real-time services
🔔 Frontend:  UI components and toast system
📱 Mobile:    Push notifications and mobile alerts
🧪 Tester:    Automated testing and quality assurance

Current Focus: Smart Notification System
- Building intelligent alert algorithms
- Real-time notification delivery
- Cross-platform notification sync
- Performance optimization

Notification Types:
- 💰 Budget alerts and spending warnings
- 📊 Financial goal notifications  
- 🔔 Transaction alerts
- 📱 Mobile push notifications
- 📧 Email summaries

Quick Actions:
- Switch to backend:  tmux select-window -t backend
- Switch to frontend: tmux select-window -t frontend
- Switch to mobile:   tmux select-window -t mobile
- Switch to tester:   tmux select-window -t tester

Type 'notif-help' for more commands
EOF" C-m

    # Create helper script
    tmux send-keys -t "$SESSION_NAME:notif-overview" "cat > notif-help << 'EOF'
#!/bin/bash
echo \"🔔 Notification Engine Commands\"
echo \"===============================\"
echo \"notif-status     - Show all agent status\"
echo \"notif-test       - Run notification tests\"
echo \"notif-send       - Send test notification\"
echo \"notif-monitor    - Monitor notification delivery\"
echo \"notif-performance - Check system performance\"
echo \"notif-logs       - Show recent logs\"
EOF" C-m
    
    tmux send-keys -t "$SESSION_NAME:notif-overview" "chmod +x notif-help" C-m
}

# Function to stop the cluster
stop_cluster() {
    print_status "INFO" "Stopping Notification Engine Cluster..."
    
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        tmux kill-session -t "$SESSION_NAME"
        print_status "SUCCESS" "Notification Engine Cluster stopped"
    else
        print_status "INFO" "Notification Engine Cluster was not running"
    fi
}

# Function to show cluster status
show_status() {
    print_status "INFO" "Notification Engine Cluster Status"
    
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