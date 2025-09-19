#!/bin/bash

# 🧠 AI Intelligence Cluster Manager
# Specialized orchestration for AI and ML feature development
# Manages: Architecture, Backend, Frontend, and Security agents

set -e

# Configuration
CLUSTER_NAME="ai-intelligence"
SESSION_NAME="moneywise-$CLUSTER_NAME"
PROJECT_ROOT="/home/nemesi/dev/money-wise"
WORKTREES_ROOT="/home/nemesi/dev/worktrees"
LOG_DIR="$PROJECT_ROOT/logs/agents/clusters"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# AI Intelligence agents
declare -A AI_AGENTS=(
    ["architect"]="feat/ml-transaction-categorization"
    ["backend"]="feat/ml-transaction-categorization"
    ["frontend"]="feat/ml-transaction-categorization"
    ["security"]="feat/ml-transaction-categorization"
)

# Agent tasks and responsibilities
declare -A AGENT_TASKS=(
    ["architect"]="System design,ML model architecture,Feature specifications,Technical documentation"
    ["backend"]="API development,ML service integration,Database models,Business logic"
    ["frontend"]="UI components,ML data visualization,User experience,Frontend integration"
    ["security"]="Security audit,Vulnerability assessment,Data protection,Authentication"
)

print_status() {
    local status=$1
    local message=$2
    case "$status" in
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
        "PROGRESS") echo -e "${PURPLE}🔄 $message${NC}" ;;
        "AGENT") echo -e "${CYAN}🤖 $message${NC}" ;;
    esac
}

# Function to start AI Intelligence cluster
start_cluster() {
    print_status "PROGRESS" "Starting AI Intelligence Cluster..."
    
    # Create main session
    tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"
    tmux rename-window -t "$SESSION_NAME:0" "ai-overview"
    
    # Create agent windows
    for role in "${!AI_AGENTS[@]}"; do
        agent="${AI_AGENTS[$role]}"
        agent_path="$WORKTREES_ROOT/$agent"
        
        # Create window for agent
        tmux new-window -t "$SESSION_NAME" -n "$role" -c "$agent_path"
        
        # Split into specialized panes
        tmux split-window -h -t "$SESSION_NAME:$role"
        tmux split-window -v -t "$SESSION_NAME:$role.0"
        tmux split-window -v -t "$SESSION_NAME:$role.1"
        
        # Setup panes for specific AI tasks
        case "$role" in
            "architect")
                setup_architect_panes "$role" "$agent_path"
                ;;
            "backend")
                setup_backend_panes "$role" "$agent_path"
                ;;
            "frontend")
                setup_frontend_panes "$role" "$agent_path"
                ;;
            "security")
                setup_security_panes "$role" "$agent_path"
                ;;
        esac
    done
    
    # Setup overview window
    setup_overview_window
    
    print_status "SUCCESS" "AI Intelligence Cluster started successfully"
}

# Function to setup architect panes
setup_architect_panes() {
    local role=$1
    local path=$2
    
    # Pane 0: Main development
    tmux send-keys -t "$SESSION_NAME:$role.0" "clear && echo '🏗️  AI Architect - System Design'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.0" "echo 'Working on: ML model architecture and system design'" C-m
    
    # Pane 1: Documentation
    tmux send-keys -t "$SESSION_NAME:$role.1" "clear && echo '📚 Documentation Hub'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.1" "cd docs && ls -la" C-m
    
    # Pane 2: Model testing
    tmux send-keys -t "$SESSION_NAME:$role.2" "clear && echo '🧪 Model Testing'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.2" "cd apps/backend/src/modules/ml-categorization" C-m
    
    # Pane 3: Quality monitoring
    tmux send-keys -t "$SESSION_NAME:$role.3" "clear && echo '📊 Quality Monitor'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.3" "watch -n 10 'npm run quality:gates | tail -20'" C-m
}

# Function to setup backend panes
setup_backend_panes() {
    local role=$1
    local path=$2
    
    # Pane 0: Development server
    tmux send-keys -t "$SESSION_NAME:$role.0" "clear && echo '⚙️  Backend Development'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.0" "cd apps/backend" C-m
    
    # Pane 1: Testing
    tmux send-keys -t "$SESSION_NAME:$role.1" "clear && echo '🧪 Backend Testing'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.1" "cd apps/backend && npm run test:watch" C-m
    
    # Pane 2: ML service development
    tmux send-keys -t "$SESSION_NAME:$role.2" "clear && echo '🧠 ML Service Dev'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.2" "cd apps/backend/src/modules/ml-categorization" C-m
    
    # Pane 3: API monitoring
    tmux send-keys -t "$SESSION_NAME:$role.3" "clear && echo '📡 API Monitor'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.3" "watch -n 5 'curl -s http://localhost:3002/health || echo \"API not responding\"'" C-m
}

# Function to setup frontend panes
setup_frontend_panes() {
    local role=$1
    local path=$2
    
    # Pane 0: Development server
    tmux send-keys -t "$SESSION_NAME:$role.0" "clear && echo '🎨 Frontend Development'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.0" "cd apps/web" C-m
    
    # Pane 1: Component testing
    tmux send-keys -t "$SESSION_NAME:$role.1" "clear && echo '🧪 Component Testing'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.1" "cd apps/web && npm run test:watch" C-m
    
    # Pane 2: ML UI development
    tmux send-keys -t "$SESSION_NAME:$role.2" "clear && echo '🧠 ML UI Components'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.2" "cd apps/web/src/components/dashboard" C-m
    
    # Pane 3: Browser testing
    tmux send-keys -t "$SESSION_NAME:$role.3" "clear && echo '🌐 Browser Testing'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.3" "cd apps/web && npm run test:e2e:dev" C-m
}

# Function to setup security panes
setup_security_panes() {
    local role=$1
    local path=$2
    
    # Pane 0: Security audit
    tmux send-keys -t "$SESSION_NAME:$role.0" "clear && echo '🔒 Security Audit'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.0" "echo 'Security scanning and vulnerability assessment'" C-m
    
    # Pane 1: Dependency scanning
    tmux send-keys -t "$SESSION_NAME:$role.1" "clear && echo '📦 Dependency Scan'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.1" "npm audit --audit-level=moderate" C-m
    
    # Pane 2: Code analysis
    tmux send-keys -t "$SESSION_NAME:$role.2" "clear && echo '🔍 Code Analysis'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.2" "cd apps/backend && npm run lint:security" C-m
    
    # Pane 3: Security monitoring
    tmux send-keys -t "$SESSION_NAME:$role.3" "clear && echo '🛡️  Security Monitor'" C-m
    tmux send-keys -t "$SESSION_NAME:$role.3" "tail -f $LOG_DIR/security.log" C-m
}

# Function to setup overview window
setup_overview_window() {
    tmux send-keys -t "$SESSION_NAME:ai-overview" "clear" C-m
    tmux send-keys -t "$SESSION_NAME:ai-overview" "cat << 'EOF'
🧠 AI Intelligence Cluster Dashboard
====================================

Active Agents:
🏗️  Architect: System design and ML architecture
⚙️  Backend:   ML services and API development  
🎨 Frontend:  ML UI components and visualization
🔒 Security:  AI security and data protection

Current Focus: ML Transaction Categorization
- Building intelligent categorization models
- Developing prediction APIs
- Creating user interfaces for ML insights
- Ensuring secure data handling

Quick Actions:
- Switch to architect: tmux select-window -t architect
- Switch to backend:   tmux select-window -t backend  
- Switch to frontend:  tmux select-window -t frontend
- Switch to security:  tmux select-window -t security

Type 'ai-help' for more commands
EOF" C-m

    # Create helper script
    tmux send-keys -t "$SESSION_NAME:ai-overview" "cat > ai-help << 'EOF'
#!/bin/bash
echo \"🧠 AI Intelligence Cluster Commands\"
echo \"===================================\"
echo \"ai-status     - Show all agent status\"
echo \"ai-sync       - Sync all agents with main branch\"
echo \"ai-test       - Run tests across all agents\"
echo \"ai-quality    - Run quality gates on all agents\"
echo \"ai-deploy     - Deploy ML services\"
echo \"ai-logs       - Show recent logs\"
EOF" C-m
    
    tmux send-keys -t "$SESSION_NAME:ai-overview" "chmod +x ai-help" C-m
}

# Function to stop the cluster
stop_cluster() {
    print_status "INFO" "Stopping AI Intelligence Cluster..."
    
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        tmux kill-session -t "$SESSION_NAME"
        print_status "SUCCESS" "AI Intelligence Cluster stopped"
    else
        print_status "INFO" "AI Intelligence Cluster was not running"
    fi
}

# Function to show cluster status
show_status() {
    print_status "INFO" "AI Intelligence Cluster Status"
    
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