#!/bin/bash

# Slack Notification Script for CI/CD Pipeline
# Sends formatted notifications to Slack channels based on pipeline status

set -euo pipefail

# Configuration
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
SLACK_CHANNEL="${SLACK_CHANNEL:-#moneywise-ci}"
PROJECT_NAME="MoneyWise"

# Pipeline information
PIPELINE_STATUS="${1:-unknown}"
COMMIT_SHA="${CI_COMMIT_SHA:-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')}"
BRANCH_NAME="${CI_COMMIT_REF_NAME:-$(git branch --show-current 2>/dev/null || echo 'unknown')}"
PIPELINE_URL="${CI_PIPELINE_URL:-}"
COMMIT_MESSAGE="${CI_COMMIT_MESSAGE:-$(git log -1 --pretty=%B 2>/dev/null || echo 'No commit message')}"
COMMIT_AUTHOR="${CI_COMMIT_AUTHOR:-$(git log -1 --pretty=%an 2>/dev/null || echo 'Unknown')}"

# Color and emoji based on status
case "$PIPELINE_STATUS" in
    "success"|"passed")
        COLOR="#36a64f"
        EMOJI="✅"
        STATUS_TEXT="PASSED"
        ;;
    "failed"|"failure")
        COLOR="#ff0000"
        EMOJI="❌"
        STATUS_TEXT="FAILED"
        ;;
    "warning"|"unstable")
        COLOR="#ffaa00"
        EMOJI="⚠️"
        STATUS_TEXT="WARNING"
        ;;
    "running"|"started")
        COLOR="#0099ff"
        EMOJI="🚀"
        STATUS_TEXT="STARTED"
        ;;
    *)
        COLOR="#cccccc"
        EMOJI="ℹ️"
        STATUS_TEXT="UNKNOWN"
        ;;
esac

# Function to send notification
send_notification() {
    local message="$1"
    local attachment="$2"

    if [ -z "$SLACK_WEBHOOK_URL" ]; then
        echo "⚠️ SLACK_WEBHOOK_URL not set, skipping notification"
        echo "Message would be: $message"
        return 0
    fi

    local payload=$(cat <<EOF
{
    "channel": "$SLACK_CHANNEL",
    "username": "MoneyWise CI/CD",
    "icon_emoji": ":robot_face:",
    "text": "$message",
    "attachments": [$attachment]
}
EOF
)

    echo "📤 Sending Slack notification..."

    local response=$(curl -s -X POST \
        -H 'Content-type: application/json' \
        --data "$payload" \
        "$SLACK_WEBHOOK_URL")

    if [ "$response" = "ok" ]; then
        echo "✅ Slack notification sent successfully"
    else
        echo "❌ Failed to send Slack notification: $response"
        return 1
    fi
}

# Function to get test results summary
get_test_summary() {
    local summary=""

    # Check if test report exists
    if [ -f "./test-reports/test-report.json" ]; then
        # Parse test results from JSON report
        if command -v jq >/dev/null 2>&1; then
            local frontend_coverage=$(jq -r '.coverage.frontend.lines // "N/A"' ./test-reports/test-report.json 2>/dev/null || echo "N/A")
            local backend_coverage=$(jq -r '.coverage.backend.lines // "N/A"' ./test-reports/test-report.json 2>/dev/null || echo "N/A")
            local test_status=$(jq -r '.overall.success' ./test-reports/test-report.json 2>/dev/null || echo "unknown")

            summary="Frontend Coverage: ${frontend_coverage}%\\nBackend Coverage: ${backend_coverage}%"
        else
            summary="Test report available but jq not installed"
        fi
    else
        summary="Test results not available"
    fi

    echo "$summary"
}

# Function to create detailed attachment
create_attachment() {
    local test_summary=$(get_test_summary)

    cat <<EOF
{
    "color": "$COLOR",
    "pretext": "$EMOJI $PROJECT_NAME Pipeline $STATUS_TEXT",
    "fields": [
        {
            "title": "Branch",
            "value": "$BRANCH_NAME",
            "short": true
        },
        {
            "title": "Commit",
            "value": "<https://gitlab.com/your-org/money-wise/-/commit/$COMMIT_SHA|$COMMIT_SHA>",
            "short": true
        },
        {
            "title": "Author",
            "value": "$COMMIT_AUTHOR",
            "short": true
        },
        {
            "title": "Status",
            "value": "$STATUS_TEXT",
            "short": true
        },
        {
            "title": "Test Summary",
            "value": "$test_summary",
            "short": false
        },
        {
            "title": "Commit Message",
            "value": "$(echo "$COMMIT_MESSAGE" | head -n 1 | cut -c1-100)",
            "short": false
        }
    ],
    "actions": [
        {
            "type": "button",
            "text": "View Pipeline",
            "url": "$PIPELINE_URL",
            "style": "primary"
        }
    ],
    "footer": "MoneyWise CI/CD Pipeline",
    "footer_icon": "https://gitlab.com/favicon.ico",
    "ts": $(date +%s)
}
EOF
}

# Function for deployment notifications
notify_deployment() {
    local environment="$1"
    local deploy_url="$2"

    local deploy_attachment=$(cat <<EOF
{
    "color": "#36a64f",
    "pretext": "🚀 MoneyWise Deployed to $environment",
    "fields": [
        {
            "title": "Environment",
            "value": "$environment",
            "short": true
        },
        {
            "title": "Version",
            "value": "$COMMIT_SHA",
            "short": true
        },
        {
            "title": "Branch",
            "value": "$BRANCH_NAME",
            "short": true
        },
        {
            "title": "Author",
            "value": "$COMMIT_AUTHOR",
            "short": true
        }
    ],
    "actions": [
        {
            "type": "button",
            "text": "View Application",
            "url": "$deploy_url",
            "style": "primary"
        },
        {
            "type": "button",
            "text": "View Pipeline",
            "url": "$PIPELINE_URL"
        }
    ],
    "footer": "MoneyWise Deployment",
    "ts": $(date +%s)
}
EOF
)

    send_notification "🚀 MoneyWise deployed to $environment" "$deploy_attachment"
}

# Function for rollback notifications
notify_rollback() {
    local environment="$1"
    local previous_version="$2"

    local rollback_attachment=$(cat <<EOF
{
    "color": "#ff9900",
    "pretext": "🔄 MoneyWise Rollback in $environment",
    "fields": [
        {
            "title": "Environment",
            "value": "$environment",
            "short": true
        },
        {
            "title": "Rolled back to",
            "value": "$previous_version",
            "short": true
        },
        {
            "title": "Triggered by",
            "value": "$COMMIT_AUTHOR",
            "short": true
        }
    ],
    "actions": [
        {
            "type": "button",
            "text": "View Pipeline",
            "url": "$PIPELINE_URL"
        }
    ],
    "footer": "MoneyWise Rollback",
    "ts": $(date +%s)
}
EOF
)

    send_notification "🔄 MoneyWise rollback executed in $environment" "$rollback_attachment"
}

# Main execution based on arguments
case "${1:-}" in
    "deployment")
        notify_deployment "${2:-staging}" "${3:-https://staging-money-wise.example.com}"
        ;;
    "rollback")
        notify_rollback "${2:-production}" "${3:-unknown}"
        ;;
    *)
        # Standard pipeline notification
        message="$EMOJI $PROJECT_NAME Pipeline $STATUS_TEXT on branch \`$BRANCH_NAME\`"
        attachment=$(create_attachment)
        send_notification "$message" "$attachment"
        ;;
esac

echo "📬 Notification process completed"