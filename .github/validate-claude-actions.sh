#!/bin/bash

# Claude Code GitHub Actions Validation Script
# This script validates the syntax and configuration of Claude Code actions

echo "🤖 Validating Claude Code GitHub Actions..."
echo "================================================"

WORKFLOWS_DIR=".github/workflows"
ERRORS=0

# Function to validate YAML syntax
validate_yaml() {
    local file=$1
    echo "📄 Validating $file..."

    # Check if file exists
    if [[ ! -f "$file" ]]; then
        echo "❌ File not found: $file"
        ((ERRORS++))
        return 1
    fi

    # Basic YAML syntax check using python if available
    if command -v python3 &> /dev/null; then
        python3 -c "
import yaml
import sys
try:
    with open('$file', 'r') as f:
        yaml.safe_load(f)
    print('✅ YAML syntax valid')
except yaml.YAMLError as e:
    print(f'❌ YAML syntax error: {e}')
    sys.exit(1)
except Exception as e:
    print(f'❌ Error reading file: {e}')
    sys.exit(1)
" || ((ERRORS++))
    else
        echo "⚠️  Python not available for YAML validation"
    fi
}

# Function to check required elements
check_workflow_elements() {
    local file=$1
    echo "🔍 Checking workflow elements in $file..."

    # Check for required GitHub Actions elements
    if grep -q "anthropics/claude-code-action@v1" "$file"; then
        echo "✅ Claude Code action reference found"
    else
        echo "❌ Claude Code action reference missing"
        ((ERRORS++))
    fi

    if grep -q "anthropic_api_key:" "$file"; then
        echo "✅ Anthropic API key configuration found"
    else
        echo "❌ Anthropic API key configuration missing"
        ((ERRORS++))
    fi

    if grep -q "permissions:" "$file"; then
        echo "✅ Permissions configuration found"
    else
        echo "❌ Permissions configuration missing"
        ((ERRORS++))
    fi
}

echo "1. Validating Claude Code action workflows..."
echo "============================================="

# List of Claude Code workflows to validate
CLAUDE_WORKFLOWS=(
    "$WORKFLOWS_DIR/claude-code.yml"
    "$WORKFLOWS_DIR/claude-ci-auto-fix.yml"
    "$WORKFLOWS_DIR/claude-pr-review-comprehensive.yml"
    "$WORKFLOWS_DIR/claude-pr-review-security.yml"
    "$WORKFLOWS_DIR/claude-pr-review-frontend.yml"
    "$WORKFLOWS_DIR/claude-issue-triage.yml"
    "$WORKFLOWS_DIR/claude-issue-deduplication.yml"
    "$WORKFLOWS_DIR/claude-manual-analysis.yml"
)

for workflow in "${CLAUDE_WORKFLOWS[@]}"; do
    echo ""
    echo "📋 Processing: $(basename "$workflow")"
    echo "----------------------------------------"
    validate_yaml "$workflow"
    check_workflow_elements "$workflow"
done

echo ""
echo "2. Checking for conflicts with existing workflows..."
echo "=================================================="

# Check for potential trigger conflicts
echo "🔍 Analyzing workflow triggers..."

PR_TRIGGERS=$(grep -l "pull_request:" "$WORKFLOWS_DIR"/*.yml | wc -l)
ISSUE_TRIGGERS=$(grep -l "issues:" "$WORKFLOWS_DIR"/*.yml | wc -l)

echo "📊 Workflow trigger summary:"
echo "  - Pull request triggers: $PR_TRIGGERS workflows"
echo "  - Issue triggers: $ISSUE_TRIGGERS workflows"

if [[ $PR_TRIGGERS -gt 3 ]]; then
    echo "⚠️  Multiple PR workflows detected - monitor for performance impact"
fi

echo ""
echo "3. Checking GitHub repository requirements..."
echo "============================================"

# Check if this is a git repository
if [[ ! -d ".git" ]]; then
    echo "❌ Not a git repository"
    ((ERRORS++))
else
    echo "✅ Git repository detected"
fi

# Check if remote is set up
if git remote -v &> /dev/null; then
    echo "✅ Git remote configured"

    # Check if it's a GitHub repository
    REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
    if [[ $REMOTE_URL == *"github.com"* ]]; then
        echo "✅ GitHub repository detected"
    else
        echo "⚠️  Repository remote is not GitHub - actions may not work"
    fi
else
    echo "❌ No git remote configured"
    ((ERRORS++))
fi

echo ""
echo "4. Setup checklist..."
echo "===================="

echo "📋 Required setup steps:"
echo "  [ ] Add ANTHROPIC_API_KEY to GitHub repository secrets"
echo "  [ ] Ensure GitHub Actions are enabled in repository settings"
echo "  [ ] Verify repository permissions allow Actions to write to PRs/issues"
echo "  [ ] Test workflows with @claude mention in a test issue"

echo ""
echo "5. Summary..."
echo "============"

if [[ $ERRORS -eq 0 ]]; then
    echo "🎉 All Claude Code GitHub Actions validated successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Add your Anthropic API key to GitHub secrets"
    echo "2. Create a test issue with '@claude hello' to verify setup"
    echo "3. Monitor Actions tab for workflow execution"
    echo ""
    echo "📚 Read the setup guide: .github/CLAUDE_ACTIONS_SETUP.md"
else
    echo "❌ Found $ERRORS error(s) during validation"
    echo "Please fix the errors above before using the workflows"
    exit 1
fi