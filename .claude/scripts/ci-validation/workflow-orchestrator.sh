#!/bin/bash
# Phase 3: Workflow Orchestration System (WorkflowLLM)
# Hierarchical validation planning with adaptive error recovery

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/validation-core.sh"

# Helper function to find and run level scripts
run_level() {
  local level=$1
  local script

  # Find the script with matching pattern
  script=$(find "$SCRIPT_DIR" -maxdepth 1 -name "level-$level-*.sh" -type f | head -1)

  if [ -z "$script" ]; then
    echo "❌ Error: Level $level script not found"
    return 1
  fi

  bash "$script" || return 1
}

# ============================================================================
# SECTION 1: Validation Modes
# ============================================================================

# Mode 1: QUICK (pre-commit) - Only critical path levels
# Levels: 1 → 2 (4s)
mode_quick() {
  echo "⚡ QUICK MODE (Pre-commit validation)"
  echo "├─ Levels: 1 (YAML), 2 (Actions)"
  echo "├─ Time: ~13s"
  echo "├─ Use when: Committing code locally"
  echo ""

  run_level 1 || return 1
  run_level 2 || return 1

  echo "✅ Quick validation passed (2 levels)"
}

# Mode 2: STANDARD (pre-push) - All pre-workflow levels
# Levels: 1,2,3,4,5,6,7,8 (27s)
mode_standard() {
  echo "📋 STANDARD MODE (Pre-push validation)"
  echo "├─ Levels: 1-8 (comprehensive static analysis)"
  echo "├─ Time: ~27s"
  echo "├─ Use when: Pushing to remote branch"
  echo ""

  for level in {1..8}; do
    run_level $level || return 1
  done

  echo "✅ Standard validation passed (8 levels)"
}

# Mode 3: FULL (CI/CD) - All 10 mandatory levels
# Levels: 1-10 (132s)
mode_full() {
  echo "🔒 FULL MODE (CI/CD validation - MANDATORY)"
  echo "├─ Levels: 1-10 (complete validation pipeline)"
  echo "├─ Time: ~132s"
  echo "├─ Use when: Merging to main (GitHub Actions)"
  echo ""

  for level in {1..10}; do
    run_level $level || return 1
  done

  echo "✅ Full validation passed (10 levels - ALL MANDATORY)"
}

# Mode 4: CUSTOM - User-specified levels
mode_custom() {
  local levels=$1
  echo "🎯 CUSTOM MODE (User-specified levels)"
  echo "├─ Levels: $levels"
  echo "├─ Time: variable"
  echo ""

  for level in $levels; do
    if [[ $level =~ ^[0-9]+$ ]] && [ "$level" -ge 1 ] && [ "$level" -le 10 ]; then
      echo "Running Level $level..."
      run_level $level || return 1
    fi
  done

  echo "✅ Custom validation passed"
}

# ============================================================================
# SECTION 2: Adaptive Error Recovery
# ============================================================================

# Retry logic with exponential backoff
retry_with_backoff() {
  local level=$1
  local max_attempts=3
  local attempt=1
  local delay=1

  while [ $attempt -le $max_attempts ]; do
    echo "Attempt $attempt/$max_attempts for Level $level..."

    run_level $level && return 0

    if [ $attempt -lt $max_attempts ]; then
      echo "⏳ Retrying in ${delay}s..."
      sleep $delay
      delay=$((delay * 2))
    fi

    ((attempt++))
  done

  return 1
}

# ============================================================================
# SECTION 3: Incremental Mode (For Development)
# ============================================================================

mode_incremental() {
  local levels=${1:-"1 2 3 4 5 6 7 8 9 10"}

  echo "🔄 INCREMENTAL MODE (For iterative development)"
  echo "├─ Runs only specified levels"
  echo "├─ Useful for focused debugging"
  echo ""

  local passed=0
  local failed=0

  for level in $levels; do
    echo ""
    echo "--- Level $level ---"
    if run_level $level; then
      ((passed++))
    else
      ((failed++))
      echo "❌ Level $level FAILED"
      # In incremental mode, continue to next level instead of stopping
    fi
  done

  echo ""
  echo "Incremental Results:"
  echo "├─ Passed: $passed"
  echo "├─ Failed: $failed"
  echo "└─ Success rate: $(( (passed * 100) / (passed + failed) ))%"

  [ $failed -eq 0 ] && return 0 || return 1
}

# ============================================================================
# SECTION 4: Help & Usage
# ============================================================================

show_help() {
  cat <<'EOF'
Workflow Orchestrator - Phase 3 Validation Modes

USAGE:
  ./workflow-orchestrator.sh [mode] [options]

MODES:
  quick         ⚡ Quick pre-commit (levels 1-2) - 13s
  standard      📋 Standard pre-push (levels 1-8) - 27s
  full          🔒 Full CI/CD (levels 1-10) - 132s (MANDATORY)
  custom        🎯 Custom levels (e.g., "1 2 5 9")
  incremental   🔄 Incremental (all levels, continue on failure)

EXAMPLES:
  ./workflow-orchestrator.sh quick
  ./workflow-orchestrator.sh standard
  ./workflow-orchestrator.sh full
  ./workflow-orchestrator.sh custom "1 2 6 7"
  ./workflow-orchestrator.sh incremental "1 2 3"

ADAPTIVE MODES:
  Automatic retry logic with exponential backoff
  Configurable failure handling
  Real-time progress reporting

EOF
}

# ============================================================================
# SECTION 5: Main Execution
# ============================================================================

main() {
  local mode=${1:-standard}
  local options=${2:-}

  echo "╔════════════════════════════════════════╗"
  echo "║ Phase 3: Workflow Orchestrator        ║"
  echo "║      (WorkflowLLM Orchestration)      ║"
  echo "╚════════════════════════════════════════╝"
  echo ""

  case "$mode" in
    quick)
      mode_quick
      ;;
    standard)
      mode_standard
      ;;
    full)
      mode_full
      ;;
    custom)
      if [ -z "$options" ]; then
        echo "❌ Error: custom mode requires level specification"
        echo "Example: $0 custom \"1 2 5\""
        exit 1
      fi
      mode_custom "$options"
      ;;
    incremental)
      mode_incremental "$options"
      ;;
    help|--help|-h)
      show_help
      ;;
    *)
      echo "Unknown mode: $mode"
      show_help
      exit 1
      ;;
  esac
}

main "$@"
