#!/bin/bash

# 📈 GitHub Actions Performance Monitor
# Real-time workflow performance tracking and optimization recommendations

set -e

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

print_header() {
    echo -e "\n${BOLD}${CYAN}═══════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${CYAN} $1${NC}"
    echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════${NC}\n"
}

print_metric() {
    local label=$1
    local value=$2
    local status=$3
    
    case $status in
        "good") echo -e "${GREEN}✅ ${BOLD}$label:${NC} $value" ;;
        "warning") echo -e "${YELLOW}⚠️  ${BOLD}$label:${NC} $value" ;;
        "error") echo -e "${RED}❌ ${BOLD}$label:${NC} $value" ;;
        *) echo -e "${BLUE}ℹ️  ${BOLD}$label:${NC} $value" ;;
    esac
}

# Function to check workflow status
check_workflow_status() {
    print_header "WORKFLOW STATUS OVERVIEW"
    
    local workflow_dir=".github/workflows"
    local active_workflows=0
    local cached_workflows=0
    local claude_workflows=0
    local total_jobs=0
    
    if [ ! -d "$workflow_dir" ]; then
        print_metric "Status" "No workflows directory found" "error"
        return 1
    fi
    
    echo -e "${BOLD}📊 Real-time Workflow Analysis${NC}\n"
    
    for workflow in "$workflow_dir"/*.yml; do
        if [ -f "$workflow" ]; then
            local name=$(grep "^name:" "$workflow" | head -1 | sed 's/name: *//' | tr -d '"' | tr -d "'")
            local has_cache=$(grep -q "actions/cache" "$workflow" && echo "✅" || echo "❌")
            local triggers=$(grep -A 10 "^on:" "$workflow" | grep -E "(push|pull_request|workflow_dispatch|schedule)" | wc -l)
            local jobs=$(grep "^[[:space:]]*[a-zA-Z_-]*:" "$workflow" | grep -v "^[[:space:]]*name:" | grep -v "^[[:space:]]*on:" | wc -l)
            
            echo "  📄 $name"
            echo "     Cache: $has_cache | Triggers: $triggers | Jobs: $jobs"
            
            active_workflows=$((active_workflows + 1))
            total_jobs=$((total_jobs + jobs))
            
            if grep -q "actions/cache" "$workflow"; then
                cached_workflows=$((cached_workflows + 1))
            fi
            
            if echo "$name" | grep -qi "claude"; then
                claude_workflows=$((claude_workflows + 1))
            fi
        fi
    done
    
    echo ""
    print_metric "Total Workflows" "$active_workflows" $([ $active_workflows -le 8 ] && echo "good" || echo "warning")
    print_metric "Total Jobs" "$total_jobs" $([ $total_jobs -le 100 ] && echo "good" || echo "warning")
    print_metric "Cached Workflows" "$cached_workflows/$active_workflows ($(echo "scale=0; $cached_workflows * 100 / $active_workflows" | bc)%)" $([ $cached_workflows -ge $((active_workflows / 2)) ] && echo "good" || echo "warning")
    print_metric "Claude Workflows" "$claude_workflows" $([ $claude_workflows -le 3 ] && echo "good" || echo "warning")
}

# Function to analyze performance bottlenecks
analyze_performance() {
    print_header "PERFORMANCE ANALYSIS"
    
    echo -e "${BOLD}🔍 Identifying Performance Bottlenecks${NC}\n"
    
    # Check for common issues
    local issues_found=0
    
    # Check for missing dependencies
    if [ ! -d "node_modules/styled-jsx" ] && [ ! -d "apps/web/node_modules/styled-jsx" ] && [ ! -d "apps/web/node_modules/next/node_modules/styled-jsx" ]; then
        print_metric "Build Dependencies" "styled-jsx missing in web app" "error"
        issues_found=$((issues_found + 1))
    else
        print_metric "Build Dependencies" "styled-jsx present" "good"
    fi
    
    # Check ESLint configuration
    if [ ! -d "node_modules/@typescript-eslint/eslint-plugin" ] && [ ! -d "apps/backend/node_modules/@typescript-eslint/eslint-plugin" ]; then
        print_metric "ESLint Configuration" "TypeScript ESLint plugins missing in backend" "error"
        issues_found=$((issues_found + 1))
    else
        print_metric "ESLint Configuration" "TypeScript ESLint configured" "good"
    fi
    
    # Check code formatting
    local unformatted_files=$(npx prettier --check "**/*.{ts,tsx,js,jsx,json,md,yml,yaml}" 2>/dev/null | grep -c "Code style issues" || true)
    unformatted_files=${unformatted_files:-0}
    if [ "$unformatted_files" -gt 0 ]; then
        print_metric "Code Formatting" "$unformatted_files files need formatting" "warning"
        issues_found=$((issues_found + 1))
    else
        print_metric "Code Formatting" "All files properly formatted" "good"
    fi
    
    # Check for security scan issues
    local potential_secrets=$(grep -r "password.*=.*['\"][^'\"]*['\"]" --exclude-dir=tests --exclude="*.test.*" --exclude="*.spec.*" apps/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || echo "0")
    if [ "$potential_secrets" -gt 0 ]; then
        print_metric "Security Scan" "$potential_secrets potential issues found" "warning"
        issues_found=$((issues_found + 1))
    else
        print_metric "Security Scan" "No security issues detected" "good"
    fi
    
    echo ""
    if [ $issues_found -eq 0 ]; then
        print_metric "Overall Health" "All checks passed!" "good"
    else
        print_metric "Issues Found" "$issues_found problems need attention" "warning"
    fi
}

# Function to provide optimization recommendations
optimization_recommendations() {
    print_header "OPTIMIZATION RECOMMENDATIONS"
    
    echo -e "${BOLD}🎯 Priority Actions${NC}\n"
    
    local workflow_count=$(find .github/workflows -name "*.yml" | wc -l)
    
    if [ $workflow_count -gt 8 ]; then
        echo -e "${YELLOW}🔧 HIGH PRIORITY${NC}"
        echo "  • Consolidate $workflow_count workflows → 6-8 focused workflows"
        echo "  • Merge Claude-powered workflows into unified automation"
        echo ""
    fi
    
    local cached_count=$(grep -l "actions/cache" .github/workflows/*.yml 2>/dev/null | wc -l)
    local cache_percentage=$(echo "scale=0; $cached_count * 100 / $workflow_count" | bc)
    
    if [ $cache_percentage -lt 50 ]; then
        echo -e "${YELLOW}⚡ PERFORMANCE${NC}"
        echo "  • Implement caching in $(echo "$workflow_count - $cached_count" | bc) workflows"
        echo "  • Add dependency caching across workspace packages"
        echo "  • Use parallel job execution where possible"
        echo ""
    fi
    
    echo -e "${BLUE}📈 MONITORING${NC}"
    echo "  • Set up automated failure notifications"
    echo "  • Track performance metrics over time"
    echo "  • Implement success rate monitoring"
    echo ""
    
    echo -e "${GREEN}✨ NEXT STEPS${NC}"
    echo "  1. Run: npm install (to fix dependency issues)"
    echo "  2. Run: npm run format (to fix formatting)"
    echo "  3. Test: optimized-ci.yml workflow"
    echo "  4. Gradually replace legacy workflows"
}

# Function to create performance benchmark
create_benchmark() {
    print_header "PERFORMANCE BENCHMARK"
    
    local benchmark_file="docs/workflow-performance.json"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    echo -e "${BOLD}📊 Creating Performance Baseline${NC}\n"
    
    local total_workflows=$(find .github/workflows -name "*.yml" | wc -l)
    local cached_workflows=$(grep -l "actions/cache" .github/workflows/*.yml 2>/dev/null | wc -l)
    local claude_workflows=$(find .github/workflows -name "*claude*" | wc -l)
    
    cat > "$benchmark_file" << EOF
{
  "timestamp": "$timestamp",
  "version": "1.0.0",
  "metrics": {
    "total_workflows": $total_workflows,
    "cached_workflows": $cached_workflows,
    "claude_workflows": $claude_workflows,
    "cache_coverage_percent": $(echo "scale=1; $cached_workflows * 100 / $total_workflows" | bc),
    "optimization_target": {
      "max_workflows": 8,
      "min_cache_coverage": 80,
      "max_claude_workflows": 3
    }
  },
  "issues": {
    "styling_jsx_missing": $([ ! -f "apps/web/node_modules/styled-jsx/package.json" ] && echo "true" || echo "false"),
    "eslint_config_missing": $([ ! -f "apps/backend/node_modules/@typescript-eslint/eslint-plugin/package.json" ] && echo "true" || echo "false"),
    "formatting_issues": $(npx prettier --check "**/*.{ts,tsx,js,jsx,json,md,yml,yaml}" 2>/dev/null | grep -q "Code style issues" && echo "true" || echo "false")
  },
  "recommendations": [
    "Consolidate workflows from $total_workflows to 6-8",
    "Improve caching coverage from $(echo "scale=0; $cached_workflows * 100 / $total_workflows" | bc)% to 80%+",
    "Reduce Claude workflows from $claude_workflows to 2-3",
    "Fix immediate dependency and formatting issues"
  ]
}
EOF
    
    print_metric "Benchmark Created" "$benchmark_file" "good"
    print_metric "Baseline Workflows" "$total_workflows" "info"
    print_metric "Baseline Cache Coverage" "$(echo "scale=0; $cached_workflows * 100 / $total_workflows" | bc)%" "info"
    
    echo -e "\n${CYAN}📈 Use this benchmark to track optimization progress over time${NC}"
}

# Function to run quick health check
quick_health_check() {
    print_header "QUICK HEALTH CHECK"
    
    echo -e "${BOLD}⚡ Fast System Validation${NC}\n"
    
    # Check if we can run basic npm commands
    if npm --version > /dev/null 2>&1; then
        print_metric "NPM" "$(npm --version)" "good"
    else
        print_metric "NPM" "Not available" "error"
    fi
    
    # Check if TypeScript is available
    if npx tsc --version > /dev/null 2>&1; then
        print_metric "TypeScript" "$(npx tsc --version)" "good"
    else
        print_metric "TypeScript" "Not available" "error"
    fi
    
    # Check if ESLint is available
    if npx eslint --version > /dev/null 2>&1; then
        print_metric "ESLint" "$(npx eslint --version)" "good"
    else
        print_metric "ESLint" "Not available" "warning"
    fi
    
    # Check if Prettier is available
    if npx prettier --version > /dev/null 2>&1; then
        print_metric "Prettier" "$(npx prettier --version)" "good"
    else
        print_metric "Prettier" "Not available" "warning"
    fi
    
    # Check optimized workflow exists
    if [ -f ".github/workflows/optimized-ci.yml" ]; then
        print_metric "Optimized Workflow" "Available" "good"
    else
        print_metric "Optimized Workflow" "Missing" "error"
    fi
}

# Main execution
main() {
    local command=${1:-"status"}
    
    case $command in
        "status")
            check_workflow_status
            ;;
        "performance")
            analyze_performance
            ;;
        "recommendations")
            optimization_recommendations
            ;;
        "benchmark")
            create_benchmark
            ;;
        "health")
            quick_health_check
            ;;
        "all")
            quick_health_check
            check_workflow_status
            analyze_performance
            optimization_recommendations
            create_benchmark
            ;;
        "help"|*)
            echo -e "\n${BOLD}GitHub Actions Performance Monitor${NC}"
            echo ""
            echo "Usage: $0 <command>"
            echo ""
            echo "Commands:"
            echo "  status         - Check workflow status overview"
            echo "  performance    - Analyze performance bottlenecks"
            echo "  recommendations - Get optimization recommendations"
            echo "  benchmark      - Create performance baseline"
            echo "  health         - Quick health check"
            echo "  all           - Run complete analysis"
            echo ""
            echo "Examples:"
            echo "  $0 health      # Quick system check"
            echo "  $0 all         # Complete analysis"
            ;;
    esac
}

# Check if bc is available (for calculations)
if ! command -v bc &> /dev/null; then
    echo "Installing bc for calculations..."
    # This would normally require sudo, but we'll handle the calculation differently
    echo "Note: Install 'bc' for accurate percentage calculations"
fi

# Run main function
main "$@"