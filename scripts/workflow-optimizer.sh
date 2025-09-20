#!/bin/bash

# 📊 GitHub Actions Workflow Management Script
# Helps manage, monitor, and optimize the CI/CD pipeline

set -e

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

print_header() {
    local title=$1
    echo -e "\n${BOLD}${BLUE}================================================${NC}"
    echo -e "${BOLD}${BLUE} $title${NC}"
    echo -e "${BOLD}${BLUE}================================================${NC}\n"
}

print_status() {
    local level=$1
    local message=$2
    
    case $level in
        "SUCCESS") echo -e "${GREEN}✅ $message${NC}" ;;
        "INFO") echo -e "${BLUE}ℹ️  $message${NC}" ;;
        "WARNING") echo -e "${YELLOW}⚠️  $message${NC}" ;;
        "ERROR") echo -e "${RED}❌ $message${NC}" ;;
        *) echo "$message" ;;
    esac
}

# Function to audit current workflows
audit_workflows() {
    print_header "WORKFLOW AUDIT"
    
    local workflow_dir=".github/workflows"
    
    if [ ! -d "$workflow_dir" ]; then
        print_status "ERROR" "Workflows directory not found: $workflow_dir"
        return 1
    fi
    
    print_status "INFO" "Analyzing GitHub Actions workflows..."
    
    local total_workflows=$(find "$workflow_dir" -name "*.yml" -o -name "*.yaml" | wc -l)
    print_status "INFO" "Total workflows found: $total_workflows"
    
    echo -e "\n📋 Workflow List:"
    find "$workflow_dir" -name "*.yml" -o -name "*.yaml" | while read -r file; do
        local name=$(grep "^name:" "$file" | head -1 | sed 's/name: *//' | tr -d '"')
        local triggers=$(grep -A 5 "^on:" "$file" | grep -E "(push|pull_request|workflow_dispatch|schedule)" | wc -l)
        local jobs=$(grep "^[[:space:]]*[a-zA-Z_-]*:" "$file" | grep -v "^[[:space:]]*name:" | grep -v "^[[:space:]]*on:" | wc -l)
        
        echo "  📄 $(basename "$file")"
        echo "     Name: $name"
        echo "     Triggers: $triggers event types"
        echo "     Jobs: $jobs"
        echo ""
    done
}

# Function to identify optimization opportunities
analyze_optimization() {
    print_header "OPTIMIZATION ANALYSIS"
    
    local workflow_dir=".github/workflows"
    
    print_status "INFO" "Analyzing workflows for optimization opportunities..."
    
    # Check for redundant workflows
    print_status "INFO" "Checking for potential redundancies..."
    
    local claude_workflows=$(find "$workflow_dir" -name "*claude*" | wc -l)
    if [ "$claude_workflows" -gt 3 ]; then
        print_status "WARNING" "Found $claude_workflows Claude-related workflows - consider consolidation"
    fi
    
    # Check for missing caching
    print_status "INFO" "Checking caching strategies..."
    
    local workflows_with_cache=$(grep -l "actions/cache" "$workflow_dir"/*.yml 2>/dev/null | wc -l)
    local total_workflows=$(find "$workflow_dir" -name "*.yml" | wc -l)
    
    if [ "$workflows_with_cache" -lt $((total_workflows / 2)) ]; then
        print_status "WARNING" "Only $workflows_with_cache/$total_workflows workflows use caching"
    else
        print_status "SUCCESS" "$workflows_with_cache/$total_workflows workflows use caching"
    fi
    
    # Check for parallel job opportunities
    print_status "INFO" "Checking job dependencies..."
    
    local workflows_with_needs=$(grep -l "needs:" "$workflow_dir"/*.yml 2>/dev/null | wc -l)
    print_status "INFO" "$workflows_with_needs workflows use job dependencies"
}

# Function to generate workflow performance report
performance_report() {
    print_header "PERFORMANCE RECOMMENDATIONS"
    
    print_status "INFO" "Generating optimization recommendations..."
    
    echo -e "\n🎯 ${BOLD}Recommended Optimizations:${NC}"
    echo ""
    echo "1. 📦 ${BOLD}Workflow Consolidation${NC}"
    echo "   - Merge Claude-powered workflows (code review, issue management)"
    echo "   - Combine similar validation jobs into parallel execution"
    echo "   - Reduce from 13+ workflows to 6-8 focused workflows"
    echo ""
    echo "2. ⚡ ${BOLD}Performance Improvements${NC}"
    echo "   - Implement advanced npm caching strategies"
    echo "   - Use parallel job execution where possible"
    echo "   - Add dependency caching across workspace packages"
    echo ""
    echo "3. 🔍 ${BOLD}Monitoring & Alerting${NC}"
    echo "   - Set up workflow failure notifications"
    echo "   - Track performance metrics over time"
    echo "   - Implement automatic issue creation for consistent failures"
    echo ""
    echo "4. 🛠️ ${BOLD}Progressive Enhancement${NC}"
    echo "   - Make non-critical checks non-blocking"
    echo "   - Implement graceful degradation for missing dependencies"
    echo "   - Add retry mechanisms for flaky tests"
    echo ""
}

# Function to create workflow monitoring dashboard
create_dashboard() {
    print_header "CREATING MONITORING DASHBOARD"
    
    local dashboard_file="docs/workflow-dashboard.md"
    
    print_status "INFO" "Creating workflow monitoring dashboard..."
    
    cat > "$dashboard_file" << 'EOF'
# 📊 GitHub Actions Workflow Dashboard

## Workflow Status Overview

| Workflow | Status | Last Run | Success Rate | Avg Duration |
|----------|--------|----------|--------------|--------------|
| Optimized CI/CD | ![Status](https://github.com/kdantuono/money-wise/workflows/Optimized%20CI/CD/badge.svg) | - | - | - |
| Main CI/CD Pipeline | ![Status](https://github.com/kdantuono/money-wise/workflows/MoneyWise%20CI/CD%20Pipeline/badge.svg) | - | - | - |
| Feature Integration | ![Status](https://github.com/kdantuono/money-wise/workflows/🎭%20MoneyWise%20Feature%20Integration%20Pipeline/badge.svg) | - | - | - |
| Master Protection | ![Status](https://github.com/kdantuono/money-wise/workflows/🛡️%20Master%20Branch%20Protection%20&%20Production%20Deploy/badge.svg) | - | - | - |

## Performance Metrics

### Current Issues
- [ ] ~70% failure rate across workflows
- [ ] ESLint configuration issues
- [ ] Missing build dependencies
- [ ] Code formatting violations

### Optimization Goals
- [ ] Reduce failure rate to <15%
- [ ] Improve average execution time by 40%
- [ ] Consolidate 13 workflows to 6-8
- [ ] Implement comprehensive monitoring

## Quick Actions

- [View All Workflow Runs](https://github.com/kdantuono/money-wise/actions)
- [Workflow Settings](https://github.com/kdantuono/money-wise/settings/actions)
- [Repository Settings](https://github.com/kdantuono/money-wise/settings)

## Recent Changes

### Optimizations Implemented
- ✅ Added optimized CI/CD workflow with parallel jobs
- ✅ Enhanced caching strategies
- ✅ Improved security scanning patterns
- ✅ Added workflow performance tracking

### Next Steps
- [ ] Disable redundant workflows
- [ ] Implement notification system
- [ ] Add performance trend tracking
- [ ] Create automated issue creation for failures

---

*Last updated: $(date)*
EOF

    print_status "SUCCESS" "Dashboard created at $dashboard_file"
}

# Function to suggest workflow consolidation
suggest_consolidation() {
    print_header "WORKFLOW CONSOLIDATION PLAN"
    
    print_status "INFO" "Analyzing workflows for consolidation opportunities..."
    
    echo -e "\n🔄 ${BOLD}Consolidation Recommendations:${NC}"
    echo ""
    echo "1. 📝 ${BOLD}Claude Code Workflows → Single Smart Assistant${NC}"
    echo "   - Merge: claude-code-review.yml, claude-pr-review-*.yml"
    echo "   - Benefits: Unified review process, reduced redundancy"
    echo ""
    echo "2. 🎯 ${BOLD}Issue Management → Automated Triage${NC}"
    echo "   - Merge: claude-issue-triage.yml, claude-issue-deduplication.yml"
    echo "   - Benefits: Streamlined issue handling"
    echo ""
    echo "3. 🔧 ${BOLD}CI/CD Optimization → Primary Pipeline${NC}"
    echo "   - Replace: ci-cd-pipeline.yml with optimized-ci.yml"
    echo "   - Benefits: Better caching, parallel execution, monitoring"
    echo ""
    echo "4. 🛡️ ${BOLD}Security & Analysis → Integrated Security${NC}"
    echo "   - Merge: claude-manual-analysis.yml with security scanning"
    echo "   - Benefits: Comprehensive security validation"
    echo ""
}

# Function to create notification setup
setup_notifications() {
    print_header "NOTIFICATION SETUP"
    
    print_status "INFO" "Setting up workflow failure notifications..."
    
    # Create notification workflow
    cat > ".github/workflows/notifications.yml" << 'EOF'
name: 📢 Workflow Notifications

on:
  workflow_run:
    workflows: ["Optimized CI/CD", "MoneyWise CI/CD Pipeline"]
    types: [completed]

jobs:
  notify-failure:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'failure' }}
    
    steps:
      - name: 🚨 Create failure issue
        uses: actions/github-script@v6
        with:
          script: |
            const title = `🚨 Workflow Failure: ${context.payload.workflow_run.name}`;
            const body = `
            ## Workflow Failure Report
            
            **Workflow**: ${context.payload.workflow_run.name}
            **Branch**: ${context.payload.workflow_run.head_branch}
            **Commit**: ${context.payload.workflow_run.head_sha}
            **Run URL**: ${context.payload.workflow_run.html_url}
            
            Please investigate and fix the issues causing this workflow to fail.
            `;
            
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: title,
              body: body,
              labels: ['bug', 'ci/cd', 'workflow-failure']
            });
EOF
    
    print_status "SUCCESS" "Notification workflow created"
}

# Main execution
main() {
    local command=${1:-"help"}
    
    case $command in
        "audit")
            audit_workflows
            ;;
        "analyze")
            analyze_optimization
            ;;
        "report")
            performance_report
            ;;
        "dashboard")
            create_dashboard
            ;;
        "consolidate")
            suggest_consolidation
            ;;
        "notifications")
            setup_notifications
            ;;
        "all")
            audit_workflows
            analyze_optimization
            performance_report
            create_dashboard
            suggest_consolidation
            ;;
        "help"|*)
            echo -e "\n${BOLD}GitHub Actions Workflow Management${NC}"
            echo ""
            echo "Usage: $0 <command>"
            echo ""
            echo "Commands:"
            echo "  audit         - Audit current workflows"
            echo "  analyze       - Analyze optimization opportunities"
            echo "  report        - Generate performance recommendations"
            echo "  dashboard     - Create monitoring dashboard"
            echo "  consolidate   - Suggest workflow consolidation"
            echo "  notifications - Set up failure notifications"
            echo "  all          - Run all analysis commands"
            echo ""
            echo "Examples:"
            echo "  $0 audit      # Audit current workflows"
            echo "  $0 all        # Complete analysis"
            ;;
    esac
}

# Run main function with all arguments
main "$@"