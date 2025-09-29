#!/bin/bash
# .claude/scripts/agile-validator.sh
# Universal Agile Item Validation Framework
# Supports epics, stories, tasks with active monitoring and review progress tracking

set -euo pipefail

# Version and metadata
VERSION="1.0.0"
SCRIPT_NAME="agile-validator"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/.claude/config/agile-validator.json"
REPORTS_DIR="$PROJECT_ROOT/.claude/reports"
BOARD_SCRIPT="$PROJECT_ROOT/.claude/scripts/board-status.sh"

# Logging functions
log_header() {
    echo -e "${PURPLE}🎯 [AGILE-VALIDATOR] $1${NC}"
}

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_progress() {
    echo -e "${CYAN}🔄 $1${NC}"
}

# Initialize configuration
init_config() {
    mkdir -p "$(dirname "$CONFIG_FILE")" "$REPORTS_DIR"

    if [[ ! -f "$CONFIG_FILE" ]]; then
        cat > "$CONFIG_FILE" << 'EOF'
{
  "validation_rules": {
    "epic": {
      "required_fields": ["title", "scope", "stories", "definition_of_done"],
      "validation_steps": ["scope_validation", "story_breakdown", "dependency_check", "acceptance_criteria"],
      "quality_gates": ["architecture_review", "technical_feasibility", "resource_allocation"],
      "completion_criteria": ["all_stories_complete", "integration_validated", "documentation_updated"]
    },
    "story": {
      "required_fields": ["title", "description", "acceptance_criteria", "story_points"],
      "validation_steps": ["invest_check", "acceptance_criteria", "task_breakdown", "dependency_validation"],
      "quality_gates": ["code_review", "testing_complete", "security_check", "performance_validated"],
      "completion_criteria": ["all_tasks_complete", "tests_passing", "code_merged", "documentation_updated"]
    },
    "task": {
      "required_fields": ["title", "description", "assignee", "estimated_hours"],
      "validation_steps": ["scope_definition", "dependency_check", "implementation_plan"],
      "quality_gates": ["code_review", "unit_tests", "integration_tests"],
      "completion_criteria": ["implementation_complete", "tests_passing", "code_reviewed"]
    }
  },
  "monitoring": {
    "check_interval": 30,
    "max_monitoring_time": 7200,
    "alert_thresholds": {
      "stale_time": 3600,
      "review_timeout": 1800
    }
  },
  "integrations": {
    "github_issues": true,
    "project_board": true,
    "ci_cd_pipelines": true,
    "review_systems": ["copilot", "human"]
  }
}
EOF
        log_success "Initialized agile validator configuration"
    fi
}

# Parse configuration
load_config() {
    if [[ ! -f "$CONFIG_FILE" ]]; then
        init_config
    fi

    # Load config values (simplified for bash - in production would use jq more extensively)
    CHECK_INTERVAL=$(jq -r '.monitoring.check_interval // 30' "$CONFIG_FILE")
    MAX_MONITORING_TIME=$(jq -r '.monitoring.max_monitoring_time // 7200' "$CONFIG_FILE")
    REVIEW_TIMEOUT=$(jq -r '.monitoring.alert_thresholds.review_timeout // 1800' "$CONFIG_FILE")
}

# Detect agile item type and extract metadata
detect_item_type() {
    local item_id="$1"

    # Pattern matching for different item types
    if [[ "$item_id" =~ ^EPIC-[0-9]+ ]]; then
        echo "epic"
    elif [[ "$item_id" =~ ^(M[0-9]+-)?STORY-[0-9]+ ]]; then
        echo "story"
    elif [[ "$item_id" =~ ^TASK-[0-9]+ ]]; then
        echo "task"
    elif [[ "$item_id" =~ ^[0-9]+$ ]]; then
        # GitHub issue number - determine type from labels/title
        local issue_info
        issue_info=$(gh issue view "$item_id" --json title,labels 2>/dev/null || echo '{}')

        local title
        title=$(echo "$issue_info" | jq -r '.title // ""')

        local labels
        labels=$(echo "$issue_info" | jq -r '.labels[]?.name // ""' | tr '\n' ' ')

        if [[ "$title" =~ EPIC || "$labels" =~ epic ]]; then
            echo "epic"
        elif [[ "$title" =~ STORY || "$labels" =~ story ]]; then
            echo "story"
        elif [[ "$title" =~ TASK || "$labels" =~ task ]]; then
            echo "task"
        else
            echo "unknown"
        fi
    else
        echo "unknown"
    fi
}

# Extract item metadata
get_item_metadata() {
    local item_id="$1"
    local item_type="$2"

    local metadata="{}"

    # Try GitHub issue first
    if [[ "$item_id" =~ ^[0-9]+$ ]]; then
        local issue_info
        issue_info=$(gh issue view "$item_id" --json title,body,state,labels,assignees,milestone 2>/dev/null || echo '{}')

        if [[ "$issue_info" != "{}" ]]; then
            metadata=$(echo "$issue_info" | jq '{
                title: .title,
                description: .body,
                state: .state,
                labels: [.labels[]?.name],
                assignees: [.assignees[]?.login],
                milestone: .milestone?.title
            }')
        fi
    fi

    # Try board status
    if command -v "$BOARD_SCRIPT" &> /dev/null; then
        local board_status
        board_status=$("$BOARD_SCRIPT" status "$item_id" 2>/dev/null || echo "")

        if [[ -n "$board_status" ]]; then
            metadata=$(echo "$metadata" | jq --arg status "$board_status" '. + {board_status: $status}')
        fi
    fi

    echo "$metadata"
}

# Validate INVEST criteria for stories
validate_invest_criteria() {
    local item_metadata="$1"
    local issues=()

    local title
    title=$(echo "$item_metadata" | jq -r '.title // ""')

    local description
    description=$(echo "$item_metadata" | jq -r '.description // ""')

    # Independent
    if [[ "$description" =~ "depends on" || "$description" =~ "blocked by" ]]; then
        issues+=("INVEST-Independent: Story has explicit dependencies")
    fi

    # Negotiable
    if [[ ! "$description" =~ "acceptance criteria" && ! "$description" =~ "Given.*When.*Then" ]]; then
        issues+=("INVEST-Negotiable: Missing clear acceptance criteria")
    fi

    # Valuable
    if [[ ! "$description" =~ "As a.*I want.*So that" ]]; then
        issues+=("INVEST-Valuable: Missing user story format")
    fi

    # Estimable
    local labels
    labels=$(echo "$item_metadata" | jq -r '.labels[]? // ""')
    if [[ ! "$labels" =~ "story-points" && ! "$labels" =~ "points-" ]]; then
        issues+=("INVEST-Estimable: Missing story point estimation")
    fi

    # Small
    if [[ "$title" =~ "implement.*and.*and" ]]; then
        issues+=("INVEST-Small: Story may be too large (multiple 'and' in title)")
    fi

    # Testable
    if [[ ! "$description" =~ "Definition of Done" && ! "$description" =~ "acceptance criteria" ]]; then
        issues+=("INVEST-Testable: Missing testable acceptance criteria")
    fi

    if [[ ${#issues[@]} -eq 0 ]]; then
        log_success "INVEST criteria validation passed"
        return 0
    else
        log_warning "INVEST criteria issues found:"
        for issue in "${issues[@]}"; do
            log_warning "  - $issue"
        done
        return 1
    fi
}

# Validate Definition of Done
validate_definition_of_done() {
    local item_type="$1"
    local item_metadata="$2"

    log_info "Validating Definition of Done for $item_type"

    local description
    description=$(echo "$item_metadata" | jq -r '.description // ""')

    # Get DoD criteria from config
    local dod_criteria
    dod_criteria=$(jq -r ".validation_rules.${item_type}.completion_criteria[]?" "$CONFIG_FILE" 2>/dev/null || echo "")

    if [[ -z "$dod_criteria" ]]; then
        log_warning "No DoD criteria defined for $item_type"
        return 0
    fi

    local passed=0
    local total=0

    while IFS= read -r criterion; do
        ((total++))

        # Simple text-based validation (can be enhanced)
        case "$criterion" in
            "all_stories_complete"|"all_tasks_complete")
                if [[ "$description" =~ "✅.*complete" || "$description" =~ "\[x\]" ]]; then
                    ((passed++))
                    log_success "DoD: $criterion ✓"
                else
                    log_warning "DoD: $criterion ⚠️"
                fi
                ;;
            "tests_passing"|"integration_validated")
                if [[ "$description" =~ "test.*pass" || "$description" =~ "validation.*complete" ]]; then
                    ((passed++))
                    log_success "DoD: $criterion ✓"
                else
                    log_warning "DoD: $criterion ⚠️"
                fi
                ;;
            "code_merged"|"code_reviewed")
                if [[ "$description" =~ "merged" || "$description" =~ "reviewed" ]]; then
                    ((passed++))
                    log_success "DoD: $criterion ✓"
                else
                    log_warning "DoD: $criterion ⚠️"
                fi
                ;;
            *)
                # Default validation
                if [[ "$description" =~ "$criterion" ]]; then
                    ((passed++))
                    log_success "DoD: $criterion ✓"
                else
                    log_warning "DoD: $criterion ⚠️"
                fi
                ;;
        esac
    done <<< "$dod_criteria"

    local percentage=$((total > 0 ? passed * 100 / total : 100))

    if [[ $percentage -ge 80 ]]; then
        log_success "Definition of Done: $passed/$total criteria met ($percentage%)"
        return 0
    else
        log_error "Definition of Done: Only $passed/$total criteria met ($percentage%)"
        return 1
    fi
}

# Monitor review progress
monitor_review_progress() {
    local item_id="$1"
    local pr_number="$2"
    local timeout="${3:-$REVIEW_TIMEOUT}"

    log_header "Monitoring review progress for $item_id (PR: $pr_number)"

    local start_time
    start_time=$(date +%s)
    local check_count=0

    while true; do
        ((check_count++))
        local current_time
        current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        if [[ $elapsed -gt $timeout ]]; then
            log_error "Review monitoring timeout after $((timeout / 60)) minutes"
            return 1
        fi

        # Check PR status
        local pr_info
        pr_info=$(gh pr view "$pr_number" --json state,isDraft,statusCheckRollup 2>/dev/null || echo '{}')

        local state
        state=$(echo "$pr_info" | jq -r '.state // "unknown"')

        local is_draft
        is_draft=$(echo "$pr_info" | jq -r '.isDraft // true')

        local checks_count
        checks_count=$(echo "$pr_info" | jq '.statusCheckRollup | length')

        log_progress "Check $check_count: State=$state, Draft=$is_draft, Checks=$checks_count, Elapsed=${elapsed}s"

        # Check completion conditions
        if [[ "$state" == "OPEN" && "$is_draft" == "false" ]]; then
            log_success "Review completed! PR is no longer in draft"
            return 0
        elif [[ "$state" == "MERGED" ]]; then
            log_success "PR was merged"
            return 0
        elif [[ "$state" == "CLOSED" ]]; then
            log_warning "PR was closed without merging"
            return 2
        fi

        sleep "$CHECK_INTERVAL"
    done
}

# Run comprehensive validation suite
run_validation_suite() {
    local item_type="$1"
    local item_metadata="$2"

    log_header "Running validation suite for $item_type"

    local validation_passed=true

    # Get validation steps from config
    local validation_steps
    validation_steps=$(jq -r ".validation_rules.${item_type}.validation_steps[]?" "$CONFIG_FILE" 2>/dev/null)

    while IFS= read -r step; do
        log_info "Running validation step: $step"

        case "$step" in
            "invest_check")
                if ! validate_invest_criteria "$item_metadata"; then
                    validation_passed=false
                fi
                ;;
            "acceptance_criteria"|"scope_validation")
                local description
                description=$(echo "$item_metadata" | jq -r '.description // ""')
                if [[ "$description" =~ "Given.*When.*Then" || "$description" =~ "acceptance criteria" ]]; then
                    log_success "$step validation passed"
                else
                    log_warning "$step validation failed"
                    validation_passed=false
                fi
                ;;
            "dependency_check"|"dependency_validation")
                # Check for unresolved dependencies
                if [[ "$item_metadata" =~ "blocked" || "$item_metadata" =~ "waiting" ]]; then
                    log_warning "$step: Unresolved dependencies found"
                    validation_passed=false
                else
                    log_success "$step validation passed"
                fi
                ;;
            *)
                log_info "$step: Using default validation"
                ;;
        esac
    done <<< "$validation_steps"

    # Run Definition of Done validation
    if ! validate_definition_of_done "$item_type" "$item_metadata"; then
        validation_passed=false
    fi

    if [[ "$validation_passed" == "true" ]]; then
        log_success "All validation steps passed"
        return 0
    else
        log_error "Validation suite failed"
        return 1
    fi
}

# Generate validation report
generate_validation_report() {
    local item_id="$1"
    local item_type="$2"
    local item_metadata="$3"
    local validation_result="$4"

    local report_file="$REPORTS_DIR/agile-validation-${item_id}-$(date +%Y%m%d-%H%M%S).md"

    local title
    title=$(echo "$item_metadata" | jq -r '.title // "Unknown"')

    cat > "$report_file" << EOF
# Agile Item Validation Report

**Item ID**: $item_id
**Type**: $item_type
**Title**: $title
**Generated**: $(date)
**Validator Version**: $VERSION

## Item Metadata

\`\`\`json
$item_metadata
\`\`\`

## Validation Results

**Overall Status**: $([ "$validation_result" -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")

### Validation Steps Executed

$(jq -r ".validation_rules.${item_type}.validation_steps[]?" "$CONFIG_FILE" 2>/dev/null | sed 's/^/- /')

### Quality Gates

$(jq -r ".validation_rules.${item_type}.quality_gates[]?" "$CONFIG_FILE" 2>/dev/null | sed 's/^/- /')

### Completion Criteria

$(jq -r ".validation_rules.${item_type}.completion_criteria[]?" "$CONFIG_FILE" 2>/dev/null | sed 's/^/- /')

## Recommendations

$(if [ "$validation_result" -eq 0 ]; then
    echo "✅ All validation criteria met. Item is ready for progression."
else
    echo "⚠️  Validation issues found. Review and address before proceeding."
fi)

## Next Steps

1. $([ "$validation_result" -eq 0 ] && echo "Update board status" || echo "Address validation issues")
2. $([ "$validation_result" -eq 0 ] && echo "Proceed with implementation" || echo "Re-run validation after fixes")
3. Continue monitoring progress through agile workflow

---
*Generated by Agile Validator $VERSION*
EOF

    log_success "Validation report generated: $report_file"
    echo "$report_file"
}

# Update board status
update_board_status() {
    local item_id="$1"
    local new_status="$2"

    if [[ -x "$BOARD_SCRIPT" ]]; then
        log_info "Updating board status for $item_id to $new_status"
        if "$BOARD_SCRIPT" "$new_status" "$item_id"; then
            log_success "Board status updated successfully"
        else
            log_warning "Board status update failed"
        fi
    else
        log_warning "Board script not available for status update"
    fi
}

# Main validation workflow
validate_agile_item() {
    local item_id="$1"
    local pr_number="${2:-}"
    local monitor_review="${3:-false}"

    log_header "Starting validation for agile item: $item_id"

    # Initialize and load configuration
    load_config

    # Detect item type
    local item_type
    item_type=$(detect_item_type "$item_id")

    if [[ "$item_type" == "unknown" ]]; then
        log_error "Could not determine item type for: $item_id"
        return 1
    fi

    log_info "Detected item type: $item_type"

    # Get item metadata
    local item_metadata
    item_metadata=$(get_item_metadata "$item_id" "$item_type")

    log_info "Retrieved item metadata"

    # Run validation suite
    local validation_result=0
    if ! run_validation_suite "$item_type" "$item_metadata"; then
        validation_result=1
    fi

    # Monitor review if requested and PR provided
    if [[ "$monitor_review" == "true" && -n "$pr_number" ]]; then
        if ! monitor_review_progress "$item_id" "$pr_number"; then
            log_warning "Review monitoring completed with issues"
        fi
    fi

    # Generate report
    local report_file
    report_file=$(generate_validation_report "$item_id" "$item_type" "$item_metadata" "$validation_result")

    # Update board status if validation passed
    if [[ $validation_result -eq 0 ]]; then
        update_board_status "$item_id" "review"
    fi

    log_header "Validation completed for $item_id (exit code: $validation_result)"
    return $validation_result
}

# Main CLI interface
main() {
    local command="${1:-help}"

    case "$command" in
        "validate")
            local item_id="${2:-}"
            local pr_number="${3:-}"
            local monitor_review="${4:-false}"

            if [[ -z "$item_id" ]]; then
                log_error "Usage: $0 validate <item_id> [pr_number] [monitor_review]"
                exit 1
            fi

            validate_agile_item "$item_id" "$pr_number" "$monitor_review"
            ;;
        "monitor")
            local item_id="${2:-}"
            local pr_number="${3:-}"

            if [[ -z "$item_id" || -z "$pr_number" ]]; then
                log_error "Usage: $0 monitor <item_id> <pr_number>"
                exit 1
            fi

            monitor_review_progress "$item_id" "$pr_number"
            ;;
        "init")
            init_config
            log_success "Agile validator initialized"
            ;;
        "config")
            if [[ -f "$CONFIG_FILE" ]]; then
                cat "$CONFIG_FILE"
            else
                log_error "Configuration file not found. Run '$0 init' first."
                exit 1
            fi
            ;;
        "help"|*)
            cat << EOF
Agile Validator - Universal validation framework for epics, stories, and tasks

Usage: $0 <command> [arguments]

Commands:
  validate <item_id> [pr_number] [monitor_review]  - Validate agile item
  monitor <item_id> <pr_number>                    - Monitor review progress
  init                                             - Initialize configuration
  config                                           - Show current configuration
  help                                             - Show this help

Examples:
  $0 validate STORY-006                            - Validate story
  $0 validate 71 88 true                          - Validate GitHub issue with PR monitoring
  $0 monitor EPIC-003 87                          - Monitor epic review progress
  $0 init                                          - Setup configuration

Supported Item Types:
  - EPIC-### (Epics)
  - STORY-### or M#-STORY-### (Stories)
  - TASK-### (Tasks)
  - GitHub issue numbers (auto-detected type)

Version: $VERSION
EOF
            ;;
    esac
}

main "$@"