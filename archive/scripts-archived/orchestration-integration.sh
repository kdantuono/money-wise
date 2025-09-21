#!/bin/bash

# 🔗 MoneyWise Orchestration Integration
# Integrates multi-agent orchestration with existing CI/CD and quality gates
# Provides unified workflow for coordinated development

set -e

# Configuration
PROJECT_ROOT="/home/nemesi/dev/money-wise"
ORCHESTRATION_DIR="/home/nemesi/dev/money-wise/scripts"
LOGS_DIR="/home/nemesi/dev/money-wise/logs/agents"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

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
        "INTEGRATE") echo -e "${PURPLE}🔗 [$timestamp] $message${NC}" ;;
    esac
}

# Function to check prerequisites
check_prerequisites() {
    print_status "INFO" "Checking system prerequisites..."
    
    # Check tmux
    if ! command -v tmux &> /dev/null; then
        print_status "ERROR" "tmux is required but not installed"
        exit 1
    fi
    
    # Check required scripts
    local required_scripts=(
        "$ORCHESTRATION_DIR/tmux-agent-orchestrator.sh"
        "$ORCHESTRATION_DIR/agent-communication.sh"
        "$ORCHESTRATION_DIR/agent-monitoring.sh"
    )
    
    for script in "${required_scripts[@]}"; do
        if [[ ! -f "$script" ]]; then
            print_status "ERROR" "Required script not found: $script"
            exit 1
        fi
        if [[ ! -x "$script" ]]; then
            print_status "ERROR" "Script not executable: $script"
            exit 1
        fi
    done
    
    # Check cluster scripts
    local cluster_scripts=(
        "$ORCHESTRATION_DIR/clusters/ai-intelligence-cluster.sh"
        "$ORCHESTRATION_DIR/clusters/notification-engine-cluster.sh"
        "$ORCHESTRATION_DIR/clusters/event-streaming-cluster.sh"
    )
    
    for script in "${cluster_scripts[@]}"; do
        if [[ ! -f "$script" ]] || [[ ! -x "$script" ]]; then
            print_status "ERROR" "Cluster script missing or not executable: $script"
            exit 1
        fi
    done
    
    print_status "SUCCESS" "All prerequisites satisfied"
}

# Function to initialize complete orchestration system
init_complete_system() {
    print_header "INITIALIZING COMPLETE ORCHESTRATION SYSTEM"
    
    cd "$PROJECT_ROOT"
    
    # Initialize directories
    print_status "INFO" "Creating directory structure..."
    mkdir -p "$LOGS_DIR"/{communication,monitoring,quality,orchestration}
    mkdir -p "$LOGS_DIR"/communication/archives
    mkdir -p "$LOGS_DIR"/monitoring/{health,performance,logs}
    
    # Initialize communication system
    print_status "INFO" "Initializing agent communication..."
    "$ORCHESTRATION_DIR/agent-communication.sh" init
    
    # Initialize monitoring system
    print_status "INFO" "Initializing monitoring dashboard..."
    "$ORCHESTRATION_DIR/agent-monitoring.sh" init
    
    # Create orchestration log
    echo "$(date): Orchestration system initialized" > "$LOGS_DIR/orchestration/system.log"
    
    print_status "SUCCESS" "Complete orchestration system initialized"
}

# Function to start coordinated development workflow
start_coordinated_workflow() {
    local feature_name=${1:-"development"}
    
    print_header "STARTING COORDINATED DEVELOPMENT WORKFLOW"
    print_status "INFO" "Feature: $feature_name"
    
    # Start orchestrator
    print_status "INFO" "Starting main orchestrator..."
    "$ORCHESTRATION_DIR/tmux-agent-orchestrator.sh" start
    
    # Wait for orchestrator to initialize
    sleep 3
    
    # Start all clusters
    print_status "INFO" "Starting agent clusters..."
    "$ORCHESTRATION_DIR/tmux-agent-orchestrator.sh" start-cluster ai-intelligence
    sleep 2
    "$ORCHESTRATION_DIR/tmux-agent-orchestrator.sh" start-cluster notification-engine
    sleep 2
    "$ORCHESTRATION_DIR/tmux-agent-orchestrator.sh" start-cluster event-streaming
    sleep 2
    
    # Create monitoring dashboard
    print_status "INFO" "Creating monitoring dashboard..."
    "$ORCHESTRATION_DIR/agent-monitoring.sh" dashboard
    
    # Broadcast workflow start
    "$ORCHESTRATION_DIR/agent-communication.sh" broadcast INFO "Coordinated development workflow started for: $feature_name"
    
    # Show status
    print_status "INFO" "Checking system status..."
    "$ORCHESTRATION_DIR/agent-monitoring.sh" status
    
    print_status "SUCCESS" "Coordinated workflow active. Use 'tmux attach -t moneywise-orchestrator' to access"
}

# Function to run quality gates with agent coordination
run_coordinated_quality_gates() {
    print_header "RUNNING COORDINATED QUALITY GATES"
    
    cd "$PROJECT_ROOT"
    
    # Notify agents about quality gate start
    "$ORCHESTRATION_DIR/agent-communication.sh" broadcast INFO "Starting quality gate validation..."
    
    # Run quality gates
    print_status "INFO" "Running KISS principle validation..."
    if npm run quality:kiss &>/dev/null; then
        "$ORCHESTRATION_DIR/agent-communication.sh" broadcast SUCCESS "KISS principle validation passed"
    else
        "$ORCHESTRATION_DIR/agent-communication.sh" broadcast ERROR "KISS principle validation failed"
    fi
    
    print_status "INFO" "Running SRP validation..."
    if npm run quality:srp &>/dev/null; then
        "$ORCHESTRATION_DIR/agent-communication.sh" broadcast SUCCESS "SRP validation passed"
    else
        "$ORCHESTRATION_DIR/agent-communication.sh" broadcast ERROR "SRP validation failed"
    fi
    
    print_status "INFO" "Running TDD validation..."
    if npm run quality:tdd &>/dev/null; then
        "$ORCHESTRATION_DIR/agent-communication.sh" broadcast SUCCESS "TDD validation passed"
    else
        "$ORCHESTRATION_DIR/agent-communication.sh" broadcast ERROR "TDD validation failed"
    fi
    
    # Run comprehensive quality gates
    print_status "INFO" "Running comprehensive quality validation..."
    if npm run quality:gates; then
        "$ORCHESTRATION_DIR/agent-communication.sh" broadcast SUCCESS "All quality gates passed - Ready for deployment"
        print_status "SUCCESS" "Quality gates validation completed successfully"
    else
        "$ORCHESTRATION_DIR/agent-communication.sh" broadcast ERROR "Quality gates failed - Review required"
        print_status "ERROR" "Quality gates validation failed"
        return 1
    fi
}

# Function to coordinate deployment across agents
coordinate_deployment() {
    local deployment_type=${1:-"development"}
    
    print_header "COORDINATING DEPLOYMENT"
    print_status "INFO" "Deployment type: $deployment_type"
    
    # Pre-deployment health check
    print_status "INFO" "Running pre-deployment health check..."
    "$ORCHESTRATION_DIR/agent-monitoring.sh" services
    
    # Notify agents about deployment
    "$ORCHESTRATION_DIR/agent-communication.sh" broadcast DEPLOY "Preparing for $deployment_type deployment"
    
    # Run quality gates
    if ! run_coordinated_quality_gates; then
        print_status "ERROR" "Deployment aborted due to quality gate failures"
        return 1
    fi
    
    # Coordinate deployment based on type
    case "$deployment_type" in
        "development")
            print_status "INFO" "Starting development deployment..."
            "$ORCHESTRATION_DIR/agent-communication.sh" deploy "dev-environment" "ai-backend" "ai-frontend" "notif-backend" "stream-core"
            
            # Start development services
            if docker-compose -f docker-compose.dev.yml up -d; then
                "$ORCHESTRATION_DIR/agent-communication.sh" broadcast SUCCESS "Development environment deployed successfully"
                print_status "SUCCESS" "Development deployment completed"
            else
                "$ORCHESTRATION_DIR/agent-communication.sh" broadcast ERROR "Development deployment failed"
                print_status "ERROR" "Development deployment failed"
                return 1
            fi
            ;;
        "staging")
            print_status "INFO" "Starting staging deployment..."
            "$ORCHESTRATION_DIR/agent-communication.sh" deploy "staging-environment" "ai-backend" "ai-frontend" "notif-backend" "notif-frontend" "stream-core"
            
            # Run staging deployment (placeholder)
            print_status "INFO" "Staging deployment process would run here"
            "$ORCHESTRATION_DIR/agent-communication.sh" broadcast INFO "Staging deployment process initiated"
            ;;
        "production")
            print_status "WARNING" "Production deployment requires additional validation"
            "$ORCHESTRATION_DIR/agent-communication.sh" alert HIGH "system" "Production deployment requested - requires manual approval"
            ;;
    esac
    
    # Post-deployment monitoring
    print_status "INFO" "Starting post-deployment monitoring..."
    "$ORCHESTRATION_DIR/agent-monitoring.sh" health-report
}

# Function to run coordinated testing
run_coordinated_testing() {
    local test_type=${1:-"all"}
    
    print_header "RUNNING COORDINATED TESTING"
    print_status "INFO" "Test type: $test_type"
    
    cd "$PROJECT_ROOT"
    
    # Notify agents about testing start
    "$ORCHESTRATION_DIR/agent-communication.sh" broadcast TEST "Starting coordinated testing: $test_type"
    
    case "$test_type" in
        "backend"|"all")
            print_status "INFO" "Running backend tests..."
            "$ORCHESTRATION_DIR/agent-communication.sh" send-agent "ai-backend" "TEST" "Running backend test suite"
            
            if npm run test:backend; then
                "$ORCHESTRATION_DIR/agent-communication.sh" quality "ai-backend" "backend-tests" "PASS"
            else
                "$ORCHESTRATION_DIR/agent-communication.sh" quality "ai-backend" "backend-tests" "FAIL" "Test failures detected"
            fi
            ;;
    esac
    
    case "$test_type" in
        "web"|"all")
            print_status "INFO" "Running web tests..."
            "$ORCHESTRATION_DIR/agent-communication.sh" send-agent "ai-frontend" "TEST" "Running web test suite"
            
            if npm run test:web; then
                "$ORCHESTRATION_DIR/agent-communication.sh" quality "ai-frontend" "web-tests" "PASS"
            else
                "$ORCHESTRATION_DIR/agent-communication.sh" quality "ai-frontend" "web-tests" "FAIL" "Test failures detected"
            fi
            ;;
    esac
    
    case "$test_type" in
        "e2e"|"all")
            print_status "INFO" "Running E2E tests..."
            "$ORCHESTRATION_DIR/agent-communication.sh" send-cluster "notification-engine" "TEST" "Running E2E test suite"
            
            if npm run test:e2e; then
                "$ORCHESTRATION_DIR/agent-communication.sh" quality "notif-tester" "e2e-tests" "PASS"
            else
                "$ORCHESTRATION_DIR/agent-communication.sh" quality "notif-tester" "e2e-tests" "FAIL" "E2E test failures detected"
            fi
            ;;
    esac
    
    "$ORCHESTRATION_DIR/agent-communication.sh" broadcast SUCCESS "Coordinated testing completed"
}

# Function to sync all agents with latest changes
sync_all_agents() {
    local target_branch=${1:-"main"}
    
    print_header "SYNCING ALL AGENTS"
    print_status "INFO" "Target branch: $target_branch"
    
    cd "$PROJECT_ROOT"
    
    # Check current git status
    local current_branch=$(git branch --show-current)
    print_status "INFO" "Current branch: $current_branch"
    
    # Notify agents about sync
    "$ORCHESTRATION_DIR/agent-communication.sh" sync "system" "$target_branch" "architect" "ai-backend" "ai-frontend" "notif-backend" "stream-core"
    
    # Perform git operations
    if git fetch origin "$target_branch"; then
        "$ORCHESTRATION_DIR/agent-communication.sh" broadcast SUCCESS "Successfully fetched latest changes from $target_branch"
        
        if [[ "$current_branch" == "$target_branch" ]]; then
            if git pull origin "$target_branch"; then
                "$ORCHESTRATION_DIR/agent-communication.sh" broadcast SUCCESS "Successfully pulled latest changes"
                print_status "SUCCESS" "Sync completed successfully"
            else
                "$ORCHESTRATION_DIR/agent-communication.sh" broadcast ERROR "Failed to pull latest changes"
                print_status "ERROR" "Sync failed during pull"
                return 1
            fi
        else
            print_status "INFO" "On different branch ($current_branch), fetch completed"
            "$ORCHESTRATION_DIR/agent-communication.sh" broadcast INFO "Fetched $target_branch changes, currently on $current_branch"
        fi
    else
        "$ORCHESTRATION_DIR/agent-communication.sh" broadcast ERROR "Failed to fetch from $target_branch"
        print_status "ERROR" "Sync failed during fetch"
        return 1
    fi
}

# Function to stop all orchestration
stop_orchestration() {
    print_header "STOPPING ORCHESTRATION SYSTEM"
    
    # Notify agents about shutdown
    "$ORCHESTRATION_DIR/agent-communication.sh" broadcast WARNING "Orchestration system shutting down..."
    
    # Stop orchestrator (this will stop all clusters)
    print_status "INFO" "Stopping orchestrator and all clusters..."
    "$ORCHESTRATION_DIR/tmux-agent-orchestrator.sh" stop
    
    # Archive logs
    print_status "INFO" "Archiving communication logs..."
    "$ORCHESTRATION_DIR/agent-communication.sh" archive
    
    print_status "SUCCESS" "Orchestration system stopped"
}

# Function to show system status
show_system_status() {
    print_header "ORCHESTRATION SYSTEM STATUS"
    
    # Show cluster status
    "$ORCHESTRATION_DIR/agent-monitoring.sh" status
    
    # Show recent activity
    "$ORCHESTRATION_DIR/agent-monitoring.sh" activity
    
    # Show git status
    "$ORCHESTRATION_DIR/agent-monitoring.sh" git
}

# Function to show usage
show_usage() {
    cat << EOF

🔗 MoneyWise Orchestration Integration
====================================

Usage: $0 <command> [arguments]

Commands:
  init                      - Initialize complete orchestration system
  start [feature-name]      - Start coordinated development workflow
  stop                      - Stop all orchestration
  status                    - Show system status
  quality                   - Run coordinated quality gates
  deploy <type>             - Coordinate deployment (development/staging/production)
  test [type]               - Run coordinated testing (backend/web/e2e/all)
  sync [branch]             - Sync all agents with latest changes
  monitor                   - Open monitoring dashboard

Workflow Examples:
  $0 init                   # First-time setup
  $0 start financial-goals  # Start working on financial goals feature
  $0 test backend          # Run backend tests across agents
  $0 quality               # Validate code quality
  $0 deploy development    # Deploy to development environment
  $0 sync main             # Sync all agents with main branch
  $0 stop                  # Stop all orchestration

Integration Features:
  - Coordinates with existing CI/CD pipeline
  - Integrates quality gates validation
  - Manages multi-agent communication
  - Provides real-time monitoring
  - Handles deployment coordination
  - Synchronizes development workflows

Agent Clusters:
  🧠 AI Intelligence: Architecture, ML, Backend, Frontend, Security
  🔔 Notification Engine: Backend, Frontend, Mobile, Testing
  📡 Event Streaming: Core, Alternative Backend, Performance, Testing

Quality Integration:
  - KISS principle validation
  - Single Responsibility Principle (SRP)
  - Test-Driven Development (TDD)
  - 80% test coverage enforcement
  - Automated code quality checks

EOF
}

# Main execution logic
case "${1}" in
    "init")
        check_prerequisites
        init_complete_system
        ;;
    "start")
        check_prerequisites
        start_coordinated_workflow "$2"
        ;;
    "stop")
        stop_orchestration
        ;;
    "status")
        show_system_status
        ;;
    "quality")
        run_coordinated_quality_gates
        ;;
    "deploy")
        coordinate_deployment "$2"
        ;;
    "test")
        run_coordinated_testing "$2"
        ;;
    "sync")
        sync_all_agents "$2"
        ;;
    "monitor")
        "$ORCHESTRATION_DIR/agent-monitoring.sh" dashboard
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