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

# Function to validate review workflow
validate_review_workflow() {
    local title="$1"
    local current_status=$(get_item_status "$title")

    if [ "$current_status" != "In Review" ] && [ "$current_status" != "Done" ]; then
        print_status $RED "🚨 MANDATORY REVIEW WORKFLOW VIOLATION!"
        print_status $YELLOW "📋 Current status: ${current_status:-"null"}"
        print_status $YELLOW "🔄 Required workflow: In Progress → In Review → Copilot Review → Done"
        print_status $BLUE "💡 Use: $0 review \"$title\" to move to review first"
        return 1
    fi
    return 0
}

# Function to prompt for GitHub Copilot review
prompt_copilot_review() {
    local title="$1"

    print_status $BLUE "🤖 MANDATORY GITHUB COPILOT REVIEW REQUIRED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_status $YELLOW "📋 REVIEW CHECKLIST FOR: $title"
    echo "1. ✅ All code implemented and tested"
    echo "2. ✅ CI/CD pipelines passing"
    echo "3. 🔄 Request GitHub Copilot review (REQUIRED)"
    echo "4. ⏳ Wait for user feedback and approval"
    echo "5. ✅ Only after approval → use 'confirm-review' command"
    echo ""
    print_status $BLUE "📝 REQUEST COPILOT REVIEW WITH:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "@copilot review all changes for [$title] including:"
    echo "- Implementation completeness"
    echo "- Code quality and patterns"
    echo "- Test coverage"
    echo "- Security considerations"
    echo "- Performance implications"
    echo "- Documentation completeness"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_status $RED "⚠️  DO NOT use 'complete' until review is confirmed!"
}

# Function to check if review was completed
check_review_completion() {
    local title="$1"

    print_status $YELLOW "🔍 REVIEW COMPLETION CHECK FOR: $title"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_status $BLUE "❓ Has GitHub Copilot completed the review?"
    print_status $BLUE "❓ Have you addressed all feedback?"
    print_status $BLUE "❓ Are you ready to mark this as Done?"
    echo ""
    print_status $GREEN "✅ If YES to all: Review workflow complete"
    print_status $RED "❌ If NO to any: Return to GitHub for more review"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
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
            print_status $YELLOW "💡 Use: $0 confirm-review \"Story Title\" for reviewed items"
            exit 1
        fi
        title="$2"

        # ENFORCE MANDATORY REVIEW WORKFLOW
        if ! validate_review_workflow "$title"; then
            exit 1
        fi

        print_status $RED "🚨 DIRECT COMPLETION NOT ALLOWED!"
        print_status $YELLOW "🔄 Required workflow: In Progress → In Review → Copilot Review → Done"
        print_status $BLUE "💡 Use: $0 review \"$title\" then $0 confirm-review \"$title\""
        exit 1
        ;;
    "review")
        if [ -z "$2" ]; then
            print_status $RED "❌ Usage: $0 review \"Story Title\""
            exit 1
        fi
        title="$2"
        print_status $YELLOW "👀 Moving '$title' to In Review..."
        item_id=$(find_item_by_title "$title")
        if update_item_status "$item_id" "$STATUS_IN_REVIEW" "In Review"; then
            prompt_copilot_review "$title"
        fi
        ;;
    "confirm-review")
        if [ -z "$2" ]; then
            print_status $RED "❌ Usage: $0 confirm-review \"Story Title\""
            exit 1
        fi
        title="$2"
        current_status=$(get_item_status "$title")

        if [ "$current_status" != "In Review" ]; then
            print_status $RED "🚨 REVIEW WORKFLOW ERROR!"
            print_status $YELLOW "📋 Current status: ${current_status:-"null"}"
            print_status $YELLOW "🔄 Item must be 'In Review' status first"
            print_status $BLUE "💡 Use: $0 review \"$title\" first"
            exit 1
        fi

        check_review_completion "$title"
        read -p "🤖 Confirm GitHub Copilot review completed and approved? (yes/no): " confirmation

        if [[ "$confirmation" =~ ^[Yy][Ee][Ss]$ ]]; then
            print_status $YELLOW "🎯 Moving '$title' to Done..."
            item_id=$(find_item_by_title "$title")
            update_item_status "$item_id" "$STATUS_DONE" "Done"
            print_status $GREEN "🎉 Review workflow completed successfully!"
        else
            print_status $YELLOW "🔄 Review not confirmed. Item remains In Review."
            print_status $BLUE "💡 Return to GitHub, complete review, then try again"
        fi
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
        echo "Board Status Management Script with Mandatory Review Workflow"
        echo "============================================================="
        echo "Usage: $0 <command> [arguments]"
        echo ""
        print_status $BLUE "🚨 MANDATORY REVIEW WORKFLOW ENFORCED:"
        print_status $YELLOW "In Progress → In Review → Copilot Review → Done"
        echo ""
        echo "Commands:"
        echo "  list                      - List all items and their statuses"
        echo "  start \"Story Title\"       - Move item to In Progress"
        echo "  review \"Story Title\"      - Move to In Review + prompt Copilot review"
        echo "  confirm-review \"Story\"    - Confirm review complete, then move to Done"
        echo "  todo \"Story Title\"       - Move item to To Do"
        echo "  backlog \"Story Title\"    - Move item to Backlog"
        echo "  status \"Story Title\"     - Show current status of item"
        echo "  help                      - Show this help message"
        echo ""
        print_status $RED "⚠️  BLOCKED COMMAND:"
        echo "  complete \"Story Title\"   - BLOCKED! Use review workflow instead"
        echo ""
        print_status $GREEN "📋 REVIEW WORKFLOW EXAMPLES:"
        echo "  $0 review \"STORY-003\"                    # Move to review + get Copilot prompt"
        echo "  # [Go to GitHub, request @copilot review]"
        echo "  $0 confirm-review \"STORY-003\"            # Confirm review done → Move to Done"
        echo ""
        echo "Other Examples:"
        echo "  $0 list"
        echo "  $0 start \"STORY-003\""
        echo "  $0 status \"EPIC-003\""
        echo ""
        print_status $BLUE "🔒 QUALITY GATE: No item can be marked Done without Copilot review!"
        ;;
    *)
        print_status $RED "❌ Unknown command: $1"
        print_status $YELLOW "💡 Use '$0 help' for usage information"
        exit 1
        ;;
esac