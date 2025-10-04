#!/bin/bash
# PR Metadata Validation & Copilot Review Monitor
# Usage: ./pr-metadata-validator.sh <PR_NUMBER> [--monitor]

set -e

PR_NUM="${1:-}"
MONITOR_MODE="false"

if [ -z "$PR_NUM" ]; then
    echo "❌ Error: PR number is required"
    echo "Usage: $0 <PR_NUMBER> [--monitor]"
    exit 1
fi

if [ "$2" = "--monitor" ]; then
    MONITOR_MODE="true"
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Expected metadata values
EXPECTED_ASSIGNEE="kdantuono"
EXPECTED_REVIEWER="copilot"
EXPECTED_LABELS=("review" "enhancement" "task")
EXPECTED_PROJECT="money-wise"

echo -e "${BLUE}🔍 Validating PR #${PR_NUM} metadata...${NC}"
echo ""

# Get PR metadata
PR_DATA=$(gh pr view "$PR_NUM" --json number,title,assignees,reviewRequests,labels,projectItems,milestone 2>/dev/null || {
    echo -e "${RED}❌ Failed to fetch PR #${PR_NUM}. Check if PR exists and you have access.${NC}"
    exit 1
})

# Parse metadata
ASSIGNEES=$(echo "$PR_DATA" | jq -r '[.assignees[].login] | join(", ")')
REVIEWERS=$(echo "$PR_DATA" | jq -r '[.reviewRequests[].requestedReviewer.login] | join(", ")')
LABELS=$(echo "$PR_DATA" | jq -r '[.labels[].name] | join(", ")')
PROJECTS=$(echo "$PR_DATA" | jq -r '[.projectItems[].project.title] | join(", ")')
MILESTONE=$(echo "$PR_DATA" | jq -r '.milestone.title // "none"')

echo -e "${BLUE}📋 Current PR Metadata:${NC}"
echo "  Title: $(echo "$PR_DATA" | jq -r '.title')"
echo "  Assignees: $ASSIGNEES"
echo "  Reviewers: $REVIEWERS"
echo "  Labels: $LABELS"
echo "  Projects: $PROJECTS"
echo "  Milestone: $MILESTONE"
echo ""

# Validation flags
VALIDATION_PASSED=true

# Validate assignee
if [[ "$ASSIGNEES" == *"$EXPECTED_ASSIGNEE"* ]]; then
    echo -e "${GREEN}✅ Assignee validation passed${NC}"
else
    echo -e "${RED}❌ Assignee validation failed. Expected: $EXPECTED_ASSIGNEE, Got: $ASSIGNEES${NC}"
    VALIDATION_PASSED=false
fi

# Validate reviewer
if [[ "$REVIEWERS" == *"$EXPECTED_REVIEWER"* ]]; then
    echo -e "${GREEN}✅ Reviewer validation passed${NC}"
else
    echo -e "${RED}❌ Reviewer validation failed. Expected: $EXPECTED_REVIEWER, Got: $REVIEWERS${NC}"
    VALIDATION_PASSED=false
fi

# Validate labels
MISSING_LABELS=()
for label in "${EXPECTED_LABELS[@]}"; do
    if [[ "$LABELS" == *"$label"* ]]; then
        echo -e "${GREEN}✅ Label '$label' found${NC}"
    else
        echo -e "${RED}❌ Missing required label: $label${NC}"
        MISSING_LABELS+=("$label")
        VALIDATION_PASSED=false
    fi
done

# Validate project
if [[ "$PROJECTS" == *"$EXPECTED_PROJECT"* ]]; then
    echo -e "${GREEN}✅ Project validation passed${NC}"
else
    echo -e "${RED}❌ Project validation failed. Expected: $EXPECTED_PROJECT, Got: $PROJECTS${NC}"
    VALIDATION_PASSED=false
fi

echo ""

if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "${GREEN}🎉 All metadata validation passed!${NC}"
else
    echo -e "${RED}💥 Metadata validation failed. Please fix the issues above.${NC}"

    # Provide fix commands
    echo ""
    echo -e "${YELLOW}🔧 Quick fix commands:${NC}"

    if [[ "$ASSIGNEES" != *"$EXPECTED_ASSIGNEE"* ]]; then
        echo "gh pr edit $PR_NUM --add-assignee $EXPECTED_ASSIGNEE"
    fi

    if [[ "$REVIEWERS" != *"$EXPECTED_REVIEWER"* ]]; then
        echo "gh pr edit $PR_NUM --add-reviewer $EXPECTED_REVIEWER"
    fi

    if [ ${#MISSING_LABELS[@]} -gt 0 ]; then
        echo "gh pr edit $PR_NUM --add-label $(IFS=,; echo "${MISSING_LABELS[*]}")"
    fi

    echo ""
fi

# Monitor mode
if [ "$MONITOR_MODE" = true ]; then
    echo -e "${BLUE}👀 Monitoring Copilot review status...${NC}"
    echo "Press Ctrl+C to stop monitoring"
    echo ""

    REVIEW_FOUND=false
    ITERATIONS=0
    MAX_ITERATIONS=30  # 30 * 60s = 30 minutes max

    while [ "$REVIEW_FOUND" = false ] && [ $ITERATIONS -lt $MAX_ITERATIONS ]; do
        ITERATIONS=$((ITERATIONS + 1))

        # Check for Copilot review
        COPILOT_REVIEW=$(gh pr view "$PR_NUM" --json reviews,comments 2>/dev/null | \
                        jq -r '.reviews[] | select(.author.login == "github-copilot") | .state' 2>/dev/null || echo "")

        COPILOT_COMMENTS=$(gh pr view "$PR_NUM" --json reviews,comments 2>/dev/null | \
                          jq -r '[.reviews[], .comments[]] | map(select(.author.login == "github-copilot")) | length' 2>/dev/null || echo "0")

        if [ -n "$COPILOT_REVIEW" ] || [ "$COPILOT_COMMENTS" -gt 0 ]; then
            echo -e "${GREEN}🤖 Copilot review detected!${NC}"

            if [ -n "$COPILOT_REVIEW" ]; then
                echo "Review State: $COPILOT_REVIEW"
            fi

            if [ "$COPILOT_COMMENTS" -gt 0 ]; then
                echo "Comments/Suggestions: $COPILOT_COMMENTS"
            fi

            echo ""
            echo -e "${BLUE}📝 View full review:${NC}"
            echo "gh pr view $PR_NUM"
            echo ""
            echo "or visit: https://github.com/kdantuono/money-wise/pull/$PR_NUM"

            REVIEW_FOUND=true
        else
            printf "\r${YELLOW}⏳ Waiting for Copilot review... (${ITERATIONS}/30)${NC}"
            sleep 60
        fi
    done

    if [ "$REVIEW_FOUND" = false ]; then
        echo ""
        echo -e "${RED}⏰ Timeout: No Copilot review detected after 30 minutes${NC}"
        echo -e "${YELLOW}💡 Make sure you clicked the 'Request' button in the GitHub UI!${NC}"
    fi
fi

echo ""
echo -e "${BLUE}🔗 PR URL: https://github.com/kdantuono/money-wise/pull/$PR_NUM${NC}"