#!/bin/bash
# Board Status Management Script
# Automated board status management for MoneyWise project

PROJECT_NUMBER="3"
OWNER="kdantuono"
PROJECT_ID="PVT_kwHOADnPXc4BDdMt"

# Status Field ID and Options (extracted from gh project field-list)
STATUS_FIELD_ID="PVTSSF_lAHOADnPXc4BDdMtzg1Xr-o"
STATUS_BACKLOG="dbb2d05c"
STATUS_TODO="f75ad846"
STATUS_IN_PROGRESS="47fc9ee4"
STATUS_IN_REVIEW="ff61bc01"
STATUS_DONE="98236657"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to get field IDs (for reference)
get_field_ids() {
    gh project field-list $PROJECT_NUMBER --owner $OWNER --format json | jq -r '
        .fields[] | select(.name=="Status") | .id
    '
}

# Function to get status option IDs (for reference)
get_status_options() {
    gh project field-list $PROJECT_NUMBER --owner $OWNER --format json | jq -r '
        .fields[] | select(.name=="Status") | .options[] | "\(.name):\(.id)"
    '
}

# Function to find item by title
find_item_by_title() {
    local title="$1"
    gh project item-list $PROJECT_NUMBER --owner $OWNER --format json | jq -r "
        .items[] | select(.title | contains(\"$title\")) | .id
    "
}

# Function to get item current status
get_item_status() {
    local title="$1"
    gh project item-list $PROJECT_NUMBER --owner $OWNER --format json | jq -r "
        .items[] | select(.title | contains(\"$title\")) | .status
    "
}

# Function to update item status
update_item_status() {
    local item_id="$1"
    local status_option_id="$2"
    local status_name="$3"

    if [ -z "$item_id" ]; then
        print_status $RED "❌ Error: Item not found"
        return 1
    fi

    local result=$(gh project item-edit --project-id "$PROJECT_ID" --id "$item_id" --field-id "$STATUS_FIELD_ID" --single-select-option-id "$status_option_id" 2>&1)

    if [ $? -eq 0 ]; then
        print_status $GREEN "✅ Successfully updated to: $status_name"
        return 0
    else
        print_status $RED "❌ Failed to update status: $result"
        return 1
    fi
}

# Function to list all items and their statuses
list_all_items() {
    print_status $BLUE "📋 Current Board Status:"
    echo "================================"
    gh project item-list $PROJECT_NUMBER --owner $OWNER --format json | jq -r '
        .items[] | "\(.title) | Status: \(.status // "null")"
    ' | sort
}

# Main command handler
case "$1" in
    "list")
        list_all_items
        ;;
    "start")
        if [ -z "$2" ]; then
            print_status $RED "❌ Usage: $0 start \"Story Title\""
            exit 1
        fi
        title="$2"
        print_status $YELLOW "🔄 Moving '$title' to In Progress..."
        item_id=$(find_item_by_title "$title")
        update_item_status "$item_id" "$STATUS_IN_PROGRESS" "In Progress"
        ;;
    "complete")
        if [ -z "$2" ]; then
            print_status $RED "❌ Usage: $0 complete \"Story Title\""
            exit 1
        fi
        title="$2"
        print_status $YELLOW "🎯 Moving '$title' to Done..."
        item_id=$(find_item_by_title "$title")
        update_item_status "$item_id" "$STATUS_DONE" "Done"
        ;;
    "todo")
        if [ -z "$2" ]; then
            print_status $RED "❌ Usage: $0 todo \"Story Title\""
            exit 1
        fi
        title="$2"
        print_status $YELLOW "📝 Moving '$title' to To Do..."
        item_id=$(find_item_by_title "$title")
        update_item_status "$item_id" "$STATUS_TODO" "To Do"
        ;;
    "review")
        if [ -z "$2" ]; then
            print_status $RED "❌ Usage: $0 review \"Story Title\""
            exit 1
        fi
        title="$2"
        print_status $YELLOW "👀 Moving '$title' to In Review..."
        item_id=$(find_item_by_title "$title")
        update_item_status "$item_id" "$STATUS_IN_REVIEW" "In Review"
        ;;
    "backlog")
        if [ -z "$2" ]; then
            print_status $RED "❌ Usage: $0 backlog \"Story Title\""
            exit 1
        fi
        title="$2"
        print_status $YELLOW "📚 Moving '$title' to Backlog..."
        item_id=$(find_item_by_title "$title")
        update_item_status "$item_id" "$STATUS_BACKLOG" "Backlog"
        ;;
    "status")
        if [ -z "$2" ]; then
            print_status $RED "❌ Usage: $0 status \"Story Title\""
            exit 1
        fi
        title="$2"
        current_status=$(get_item_status "$title")
        print_status $BLUE "📊 Current status of '$title': ${current_status:-"null"}"
        ;;
    "help"|"-h"|"--help")
        echo "Board Status Management Script"
        echo "================================"
        echo "Usage: $0 <command> [arguments]"
        echo ""
        echo "Commands:"
        echo "  list                    - List all items and their statuses"
        echo "  start \"Story Title\"     - Move item to In Progress"
        echo "  complete \"Story Title\" - Move item to Done"
        echo "  todo \"Story Title\"     - Move item to To Do"
        echo "  review \"Story Title\"   - Move item to In Review"
        echo "  backlog \"Story Title\"  - Move item to Backlog"
        echo "  status \"Story Title\"   - Show current status of item"
        echo "  help                    - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 list"
        echo "  $0 start \"STORY-003\""
        echo "  $0 complete \"JWT Authentication\""
        echo "  $0 status \"EPIC-003\""
        ;;
    *)
        print_status $RED "❌ Unknown command: $1"
        print_status $YELLOW "💡 Use '$0 help' for usage information"
        exit 1
        ;;
esac