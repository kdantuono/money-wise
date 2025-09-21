#!/bin/bash

# 📊 MoneyWise Agent Monitoring Dashboard
# Real-time monitoring and health checks for all agent clusters
# Provides comprehensive system status and performance metrics

set -e

# Configuration
PROJECT_ROOT="/home/nemesi/dev/money-wise"
MONITOR_DIR="/home/nemesi/dev/money-wise/logs/agents/monitoring"
ORCHESTRATOR_SESSION="moneywise-orchestrator"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

# Cluster configurations
declare -A CLUSTERS=(
    ["ai-intelligence"]="moneywise-ai-intelligence"
    ["notification-engine"]="moneywise-notification-engine"
    ["event-streaming"]="moneywise-event-streaming"
    ["core-features"]="moneywise-core-features"
)

# Agent configurations per cluster
declare -A AI_AGENTS=( ["architect"]="0" ["backend"]="1" ["frontend"]="2" ["security"]="3" )
declare -A NOTIF_AGENTS=( ["backend"]="0" ["frontend"]="1" ["mobile"]="2" ["tester"]="3" )
declare -A STREAM_AGENTS=( ["core"]="0" ["alt-backend"]="1" ["performance"]="2" ["tester"]="3" )

print_header() {
    local title=$1
    echo -e "\n${BOLD}${CYAN}================================================${NC}"
    echo -e "${BOLD}${CYAN} $title${NC}"
    echo -e "${BOLD}${CYAN}================================================${NC}\n"
}

print_status() {
    local status=$1
    local message=$2
    local timestamp=$(date '+%H:%M:%S')
    case "$status" in
        "SUCCESS") echo -e "${GREEN}✅ [$timestamp] $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  [$timestamp] $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  [$timestamp] $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ [$timestamp] $message${NC}" ;;
        "MONITOR") echo -e "${PURPLE}📊 [$timestamp] $message${NC}" ;;
    esac
}

# Function to initialize monitoring system
init_monitoring() {
    print_status "INFO" "Initializing Agent Monitoring Dashboard..."
    
    # Create monitoring directories
    mkdir -p "$MONITOR_DIR"
    mkdir -p "$MONITOR_DIR/health"
    mkdir -p "$MONITOR_DIR/performance"
    mkdir -p "$MONITOR_DIR/logs"
    
    # Initialize monitoring files
    echo "$(date): Monitoring system initialized" > "$MONITOR_DIR/monitor.log"
    
    print_status "SUCCESS" "Monitoring system initialized"
}

# Function to check cluster health
check_cluster_health() {
    local cluster_name=$1
    local session_name="${CLUSTERS[$cluster_name]}"
    
    if tmux has-session -t "$session_name" 2>/dev/null; then
        local window_count=$(tmux list-windows -t "$session_name" 2>/dev/null | wc -l)
        local pane_count=$(tmux list-panes -a -t "$session_name" 2>/dev/null | wc -l)
        
        echo -e "${GREEN}✅ $cluster_name: Active ($window_count windows, $pane_count panes)${NC}"
        return 0
    else
        echo -e "${RED}❌ $cluster_name: Inactive${NC}"
        return 1
    fi
}

# Function to check individual agent health
check_agent_health() {
    local cluster_name=$1
    local agent_name=$2
    local pane_id=$3
    local session_name="${CLUSTERS[$cluster_name]}"
    
    if tmux has-session -t "$session_name" 2>/dev/null; then
        # Check if specific pane exists and is responsive
        if tmux list-panes -t "$session_name:$agent_name" 2>/dev/null | grep -q "^$pane_id:"; then
            echo -e "${GREEN}  ✅ $agent_name: Active${NC}"
            return 0
        else
            echo -e "${YELLOW}  ⚠️  $agent_name: Pane not found${NC}"
            return 1
        fi
    else
        echo -e "${RED}  ❌ $agent_name: Session not running${NC}"
        return 1
    fi
}

# Function to show cluster status
show_cluster_status() {
    print_header "CLUSTER STATUS OVERVIEW"
    
    local total_clusters=0
    local active_clusters=0
    
    for cluster in "${!CLUSTERS[@]}"; do
        total_clusters=$((total_clusters + 1))
        if check_cluster_health "$cluster"; then
            active_clusters=$((active_clusters + 1))
        fi
    done
    
    echo -e "\n${BOLD}Summary: $active_clusters/$total_clusters clusters active${NC}\n"
}

# Function to show detailed agent status
show_agent_status() {
    print_header "DETAILED AGENT STATUS"
    
    # AI Intelligence Cluster
    echo -e "${CYAN}🧠 AI Intelligence Cluster:${NC}"
    for agent in "${!AI_AGENTS[@]}"; do
        check_agent_health "ai-intelligence" "$agent" "${AI_AGENTS[$agent]}"
    done
    
    # Notification Engine Cluster
    echo -e "\n${CYAN}🔔 Notification Engine Cluster:${NC}"
    for agent in "${!NOTIF_AGENTS[@]}"; do
        check_agent_health "notification-engine" "$agent" "${NOTIF_AGENTS[$agent]}"
    done
    
    # Event Streaming Cluster
    echo -e "\n${CYAN}📡 Event Streaming Cluster:${NC}"
    for agent in "${!STREAM_AGENTS[@]}"; do
        check_agent_health "event-streaming" "$agent" "${STREAM_AGENTS[$agent]}"
    done
}

# Function to get system performance metrics
get_system_metrics() {
    print_header "SYSTEM PERFORMANCE METRICS"
    
    # CPU Usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    echo -e "${BLUE}💻 CPU Usage: ${cpu_usage}%${NC}"
    
    # Memory Usage
    local mem_info=$(free -h | grep "Mem:")
    local mem_used=$(echo "$mem_info" | awk '{print $3}')
    local mem_total=$(echo "$mem_info" | awk '{print $2}')
    echo -e "${BLUE}🧠 Memory Usage: $mem_used / $mem_total${NC}"
    
    # Disk Usage
    local disk_usage=$(df -h "$PROJECT_ROOT" | tail -1 | awk '{print $5}')
    echo -e "${BLUE}💾 Disk Usage: $disk_usage${NC}"
    
    # Load Average
    local load_avg=$(uptime | awk -F'load average:' '{print $2}')
    echo -e "${BLUE}⚖️  Load Average:$load_avg${NC}"
    
    # Tmux Sessions
    local tmux_sessions=$(tmux list-sessions 2>/dev/null | wc -l || echo "0")
    echo -e "${BLUE}🖥️  Active Tmux Sessions: $tmux_sessions${NC}"
}

# Function to check git status across agents
check_git_status() {
    print_header "GIT STATUS OVERVIEW"
    
    cd "$PROJECT_ROOT"
    
    # Current branch
    local current_branch=$(git branch --show-current)
    echo -e "${BLUE}📋 Current Branch: $current_branch${NC}"
    
    # Uncommitted changes
    local changes=$(git status --porcelain | wc -l)
    if [[ $changes -gt 0 ]]; then
        echo -e "${YELLOW}⚠️  Uncommitted Changes: $changes files${NC}"
    else
        echo -e "${GREEN}✅ Working Directory Clean${NC}"
    fi
    
    # Remote status
    git fetch --quiet
    local ahead=$(git rev-list --count @{upstream}..HEAD 2>/dev/null || echo "0")
    local behind=$(git rev-list --count HEAD..@{upstream} 2>/dev/null || echo "0")
    
    if [[ $ahead -gt 0 ]]; then
        echo -e "${BLUE}↑ Ahead: $ahead commits${NC}"
    fi
    if [[ $behind -gt 0 ]]; then
        echo -e "${YELLOW}↓ Behind: $behind commits${NC}"
    fi
    if [[ $ahead -eq 0 && $behind -eq 0 ]]; then
        echo -e "${GREEN}✅ In Sync with Remote${NC}"
    fi
}

# Function to check service health
check_service_health() {
    print_header "SERVICE HEALTH CHECKS"
    
    cd "$PROJECT_ROOT"
    
    # Docker services
    if command -v docker-compose &> /dev/null; then
        echo -e "${BLUE}🐳 Docker Services:${NC}"
        if docker-compose -f docker-compose.dev.yml ps --services --filter "status=running" &>/dev/null; then
            local running_services=$(docker-compose -f docker-compose.dev.yml ps --services --filter "status=running" | wc -l)
            echo -e "${GREEN}  ✅ Running Services: $running_services${NC}"
        else
            echo -e "${YELLOW}  ⚠️  Docker Compose not running${NC}"
        fi
    fi
    
    # Backend health (if running)
    if curl -s http://localhost:3002/health &>/dev/null; then
        echo -e "${GREEN}✅ Backend API: Healthy${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend API: Not responding${NC}"
    fi
    
    # Frontend health (if running)
    if curl -s http://localhost:3000 &>/dev/null; then
        echo -e "${GREEN}✅ Frontend: Healthy${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend: Not responding${NC}"
    fi
    
    # Database connectivity
    if pg_isready -h localhost -p 5432 &>/dev/null; then
        echo -e "${GREEN}✅ PostgreSQL: Connected${NC}"
    else
        echo -e "${YELLOW}⚠️  PostgreSQL: Not connected${NC}"
    fi
    
    # Redis connectivity
    if redis-cli -h localhost -p 6379 ping &>/dev/null; then
        echo -e "${GREEN}✅ Redis: Connected${NC}"
    else
        echo -e "${YELLOW}⚠️  Redis: Not connected${NC}"
    fi
}

# Function to show recent activity logs
show_recent_activity() {
    print_header "RECENT AGENT ACTIVITY"
    
    local comm_log="/home/nemesi/dev/money-wise/logs/agents/communication/global.log"
    
    if [[ -f "$comm_log" ]]; then
        echo -e "${BLUE}📝 Last 10 communications:${NC}"
        tail -n 10 "$comm_log" | while read -r line; do
            echo "  $line"
        done
    else
        echo -e "${YELLOW}⚠️  No communication logs found${NC}"
    fi
    
    # Show quality gate results
    local quality_log="/home/nemesi/dev/money-wise/logs/agents/communication/quality.log"
    if [[ -f "$quality_log" ]]; then
        echo -e "\n${BLUE}🏆 Recent Quality Gates:${NC}"
        tail -n 5 "$quality_log" | while read -r line; do
            echo "  $line"
        done
    fi
}

# Function to create monitoring dashboard
create_dashboard() {
    print_status "INFO" "Creating monitoring dashboard..."
    
    # Check if orchestrator session exists
    if ! tmux has-session -t "$ORCHESTRATOR_SESSION" 2>/dev/null; then
        print_status "ERROR" "Orchestrator session not found. Please run tmux-agent-orchestrator.sh first"
        return 1
    fi
    
    # Create monitoring window
    tmux new-window -t "$ORCHESTRATOR_SESSION" -n "monitor-dashboard" -c "$PROJECT_ROOT"
    
    # Split into monitoring panes
    tmux split-window -h -t "$ORCHESTRATOR_SESSION:monitor-dashboard"
    tmux split-window -v -t "$ORCHESTRATOR_SESSION:monitor-dashboard.1"
    tmux split-window -v -t "$ORCHESTRATOR_SESSION:monitor-dashboard.0"
    
    # Setup monitoring panes
    tmux send-keys -t "$ORCHESTRATOR_SESSION:monitor-dashboard.0" "watch -n 30 '$0 status'" C-m
    tmux send-keys -t "$ORCHESTRATOR_SESSION:monitor-dashboard.1" "watch -n 10 '$0 metrics'" C-m
    tmux send-keys -t "$ORCHESTRATOR_SESSION:monitor-dashboard.2" "tail -f $MONITOR_DIR/monitor.log" C-m
    tmux send-keys -t "$ORCHESTRATOR_SESSION:monitor-dashboard.3" "$0 activity-watch" C-m
    
    # Select first pane
    tmux select-pane -t "$ORCHESTRATOR_SESSION:monitor-dashboard.0"
    
    print_status "SUCCESS" "Monitoring dashboard created in orchestrator session"
}

# Function to watch activity in real-time
watch_activity() {
    print_status "INFO" "Starting activity monitor... (Press Ctrl+C to exit)"
    
    local comm_log="/home/nemesi/dev/money-wise/logs/agents/communication/global.log"
    
    if [[ -f "$comm_log" ]]; then
        tail -f "$comm_log"
    else
        print_status "WARNING" "Communication log not found. Watching for file creation..."
        while [[ ! -f "$comm_log" ]]; do
            sleep 1
        done
        tail -f "$comm_log"
    fi
}

# Function to generate health report
generate_health_report() {
    local report_file="$MONITOR_DIR/health_report_$(date +%Y%m%d_%H%M%S).txt"
    
    print_status "INFO" "Generating health report..."
    
    {
        echo "MoneyWise Agent Health Report"
        echo "Generated: $(date)"
        echo "================================================"
        echo ""
        
        echo "CLUSTER STATUS:"
        for cluster in "${!CLUSTERS[@]}"; do
            if tmux has-session -t "${CLUSTERS[$cluster]}" 2>/dev/null; then
                echo "✅ $cluster: Active"
            else
                echo "❌ $cluster: Inactive"
            fi
        done
        
        echo ""
        echo "SYSTEM METRICS:"
        echo "CPU Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
        echo "Memory: $(free -h | grep "Mem:" | awk '{print $3 " / " $2}')"
        echo "Load Average: $(uptime | awk -F'load average:' '{print $2}')"
        
        echo ""
        echo "GIT STATUS:"
        cd "$PROJECT_ROOT"
        echo "Branch: $(git branch --show-current)"
        echo "Changes: $(git status --porcelain | wc -l) files"
        
    } > "$report_file"
    
    print_status "SUCCESS" "Health report saved to: $report_file"
}

# Function to show usage
show_usage() {
    cat << EOF

📊 MoneyWise Agent Monitoring Dashboard
=====================================

Usage: $0 <command>

Commands:
  init                    - Initialize monitoring system
  status                  - Show cluster status overview
  agents                  - Show detailed agent status
  metrics                 - Show system performance metrics
  git                     - Check git status across agents
  services                - Check service health
  activity                - Show recent agent activity
  dashboard               - Create tmux monitoring dashboard
  activity-watch          - Watch activity in real-time
  health-report           - Generate comprehensive health report
  full                    - Show complete status (all checks)

Examples:
  $0 status               # Quick cluster overview
  $0 full                 # Complete system status
  $0 dashboard            # Create live monitoring dashboard
  $0 activity-watch       # Monitor real-time activity

Dashboard Features:
  - Real-time cluster status
  - System performance metrics
  - Live activity monitoring
  - Communication logs

Health Monitoring:
  - Cluster and agent status
  - System resource usage
  - Service connectivity
  - Git repository status
  - Quality gate results

EOF
}

# Main execution logic
case "${1}" in
    "init")
        init_monitoring
        ;;
    "status")
        show_cluster_status
        ;;
    "agents")
        show_agent_status
        ;;
    "metrics")
        get_system_metrics
        ;;
    "git")
        check_git_status
        ;;
    "services")
        check_service_health
        ;;
    "activity")
        show_recent_activity
        ;;
    "dashboard")
        create_dashboard
        ;;
    "activity-watch")
        watch_activity
        ;;
    "health-report")
        generate_health_report
        ;;
    "full")
        show_cluster_status
        show_agent_status
        get_system_metrics
        check_git_status
        check_service_health
        show_recent_activity
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