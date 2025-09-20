#!/bin/bash

# MoneyWise User-Accessible Agent System
# Provides direct access to enhanced agent orchestration

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Source the enhanced orchestrator
source "$PROJECT_ROOT/scripts/enhanced-agent-orchestrator.sh"

print_user_help() {
    echo "🎭 MoneyWise Enhanced Agent System - User Interface"
    echo "================================================="
    echo ""
    echo "Available Commands:"
    echo "  agents list                    - List all available agents"
    echo "  agents create <type> <task>    - Create specialized agent for task"
    echo "  agents ultrathink <agent>      - Start ultrathinking process"
    echo "  agents review <agent>          - Request review agent validation"
    echo "  agents collaborate <agents>    - Enable inter-agent collaboration"
    echo "  agents status                  - Show all agents status"
    echo "  agents monitor                 - Open monitoring dashboard"
    echo "  agents quality                 - Run quality validation"
    echo "  agents docs <topic>            - Query documentation requirements"
    echo ""
    echo "Agent Types:"
    for agent_type in "${!ENHANCED_AGENT_TYPES[@]}"; do
        echo "  $agent_type: ${ENHANCED_AGENT_TYPES[$agent_type]}"
    done
    echo ""
    echo "Examples:"
    echo "  ./agent-cli.sh agents create backend-dev user-authentication"
    echo "  ./agent-cli.sh agents ultrathink backend-dev"
    echo "  ./agent-cli.sh agents review backend-dev"
    echo "  ./agent-cli.sh agents collaborate backend-dev,frontend-dev,tester"
}

case "${1:-help}" in
    "agents")
        case "${2:-help}" in
            "list")
                echo "Available Enhanced Agents:"
                for agent in "${!ENHANCED_AGENT_TYPES[@]}"; do
                    echo "  - $agent: ${ENHANCED_AGENT_TYPES[$agent]}"
                done
                ;;
            "create")
                if [[ -n "$3" && -n "$4" ]]; then
                    create_enhanced_agent "$3" "$4"
                else
                    echo "Usage: agents create <agent-type> <task>"
                fi
                ;;
            "ultrathink")
                if [[ -n "$3" ]]; then
                    ultrathink "$3" "user-requested" "interactive"
                else
                    echo "Usage: agents ultrathink <agent>"
                fi
                ;;
            "review")
                if [[ -n "$3" ]]; then
                    review_agent_validate "$3" "user-work" "user-requirements"
                else
                    echo "Usage: agents review <agent>"
                fi
                ;;
            *) print_user_help ;;
        esac
        ;;
    *) print_user_help ;;
esac
