#!/bin/bash
# Phase 2: Automated Remediation System
# Automatically fixes Type-A (SYNTAX) and Type-R (RESOURCE) errors
# Reduces manual fix time for common issues

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$SCRIPT_DIR/validation-core.sh"

# ============================================================================
# SECTION 1: Type-A (SYNTAX) Auto-Fixes
# ============================================================================

# Fix 1: Add missing YAML required fields
fix_missing_workflow_fields() {
  local file=$1

  if ! grep -q "^name:" "$file"; then
    local workflow_name=$(basename "$file" .yml)
    sed -i "1i name: $workflow_name" "$file"
    echo "✅ Fixed: Added missing 'name' field to $file"
  fi

  if ! grep -q "^on:" "$file"; then
    sed -i "2a on: push" "$file"
    echo "✅ Fixed: Added missing 'on' trigger to $file"
  fi

  if ! grep -q "^jobs:" "$file"; then
    sed -i '$ a jobs: {}' "$file"
    echo "✅ Fixed: Added missing 'jobs' section to $file"
  fi
}

# Fix 2: Convert tabs to spaces
fix_yaml_tabs() {
  local file=$1

  if grep -P '\t' "$file" > /dev/null 2>&1; then
    # Convert tabs to 2 spaces
    sed -i 's/\t/  /g' "$file"
    echo "✅ Fixed: Converted tabs to spaces in $file"
  fi
}

# Fix 3: Remove duplicate job definitions
fix_duplicate_jobs() {
  local file=$1
  local duplicates=$(grep -E "^  [a-zA-Z0-9_-]+:" "$file" | sort | uniq -d)

  if [ -n "$duplicates" ]; then
    echo "⚠️  Note: Duplicate job definitions detected in $file"
    echo "    Duplicates: $(echo "$duplicates" | tr '\n' ' ')"
    echo "    Manual review recommended"
  fi
}

# ============================================================================
# SECTION 2: Type-R (RESOURCE) Auto-Fixes
# ============================================================================

# Fix: Add missing timeout-minutes
fix_missing_timeouts() {
  local file=$1
  local default_timeout=30

  # Find jobs without timeout-minutes
  local jobs=$(sed -n '/^jobs:/,/^[a-z]/p' "$file" | grep -E "^  [a-zA-Z0-9_-]+:" | sed 's/^  \([^:]*\):.*/\1/')

  local fixed=0

  while IFS= read -r job; do
    if [ -n "$job" ]; then
      if ! sed -n "/^  $job:/,/^  [a-z]/p" "$file" | grep -q "timeout-minutes:"; then
        # Add timeout-minutes after runs-on or after job name if no runs-on
        if sed -n "/^  $job:/,/^  [a-z]/p" "$file" | grep -q "runs-on:"; then
          # Add after runs-on
          sed -i "/^  $job:/,/^  [a-z]/{ /runs-on:/a\\    timeout-minutes: $default_timeout
          }" "$file"
        else
          # Add after job name
          sed -i "/^  $job:$/a\\    timeout-minutes: $default_timeout" "$file"
        fi
        echo "✅ Fixed: Added timeout-minutes: $default_timeout to job '$job'"
        ((fixed++))
      fi
    fi
  done <<< "$jobs"

  if [ $fixed -gt 0 ]; then
    echo "   → Fixed $fixed job(s) with missing timeouts"
  fi
}

# Fix: Adjust timeout values for slow jobs
fix_slow_job_timeouts() {
  local file=$1

  # Jobs that typically need more time
  local -A slow_jobs
  slow_jobs[e2e-tests]=60
  slow_jobs[integration-tests]=45
  slow_jobs[performance-tests]=40
  slow_jobs[build]=20

  for job in "${!slow_jobs[@]}"; do
    local timeout=${slow_jobs[$job]}

    if grep -q "^  $job:" "$file"; then
      # Check current timeout
      local current=$(sed -n "/^  $job:/,/^  [a-z]/p" "$file" | grep "timeout-minutes:" | sed 's/.*timeout-minutes: \([0-9]*\).*/\1/')

      if [ -n "$current" ] && [ "$current" -lt "$timeout" ]; then
        sed -i "/^  $job:/,/^  [a-z]/s/timeout-minutes: [0-9]*/timeout-minutes: $timeout/" "$file"
        echo "✅ Fixed: Updated timeout for '$job' from ${current}m to ${timeout}m"
      fi
    fi
  done
}

# ============================================================================
# SECTION 3: Type-L (LOGIC) Remediation (Manual)
# ============================================================================

# Suggest fixes for LOGIC errors (requires manual verification)
suggest_logic_fixes() {
  local file=$1

  echo "⚠️  LOGIC errors require manual verification:"
  echo ""

  # Check for invalid path filters
  if grep -q "paths:" "$file"; then
    echo "📋 Path Filters in $file:"
    grep -A5 "paths:" "$file" | grep -E "^\s+-" | while read path; do
      local path_clean=$(echo "$path" | sed 's/.*- //' | sed "s/'//g" | sed 's/"//g')
      if [ ! -e "$path_clean" ]; then
        echo "   ⚠️  Consider removing or updating invalid path: $path_clean"
      fi
    done
  fi

  # Check for job dependencies
  if grep -q "needs:" "$file"; then
    echo ""
    echo "📋 Job Dependencies in $file:"
    local jobs=$(sed -n '/^jobs:/,/^[a-z]/p' "$file" | grep -E "^  [a-zA-Z0-9_-]+:" | sed 's/^  \([^:]*\):.*/\1/')
    while IFS= read -r job; do
      if [ -n "$job" ]; then
        local needs=$(sed -n "/^  $job:/,/^  [a-z]/p" "$file" | grep "needs:" | sed 's/.*needs: //')
        if [ -n "$needs" ]; then
          echo "   • $job needs: $needs"
        fi
      fi
    done <<< "$jobs"
  fi
}

# ============================================================================
# SECTION 4: Dry-Run Mode
# ============================================================================

# Preview fixes without applying them
dry_run_fixes() {
  local file=$1

  echo "🔍 Dry-run: Preview of fixes for $file"
  echo "═══════════════════════════════════════"
  echo ""

  # Type-A checks
  if ! grep -q "^name:" "$file"; then
    echo "[WOULD FIX] Add missing 'name' field"
  fi

  if ! grep -q "^on:" "$file"; then
    echo "[WOULD FIX] Add missing 'on' trigger"
  fi

  if ! grep -q "^jobs:" "$file"; then
    echo "[WOULD FIX] Add missing 'jobs' section"
  fi

  if grep -P '\t' "$file" > /dev/null 2>&1; then
    echo "[WOULD FIX] Convert tabs to spaces"
  fi

  # Type-R checks
  local jobs=$(sed -n '/^jobs:/,/^[a-z]/p' "$file" | grep -E "^  [a-zA-Z0-9_-]+:" | sed 's/^  \([^:]*\):.*/\1/')
  while IFS= read -r job; do
    if [ -n "$job" ]; then
      if ! sed -n "/^  $job:/,/^  [a-z]/p" "$file" | grep -q "timeout-minutes:"; then
        echo "[WOULD FIX] Add timeout-minutes: 30 to job '$job'"
      fi
    fi
  done <<< "$jobs"

  echo ""
}

# ============================================================================
# SECTION 5: Main Execution
# ============================================================================

main() {
  local action=${1:-preview}
  local file=${2:-.github/workflows/ci-cd.yml}

  echo "╔════════════════════════════════════════╗"
  echo "║  Phase 2: Automated Remediation       ║"
  echo "║     (Type-A SYNTAX + Type-R RESOURCE) ║"
  echo "╚════════════════════════════════════════╝"
  echo ""

  if [ ! -f "$file" ]; then
    echo "❌ Error: File not found: $file"
    exit 1
  fi

  case "$action" in
    preview|dry-run)
      dry_run_fixes "$file"
      ;;
    apply)
      echo "🔧 Applying fixes to $file..."
      echo ""

      fix_missing_workflow_fields "$file"
      fix_yaml_tabs "$file"
      fix_duplicate_jobs "$file"
      fix_missing_timeouts "$file"
      fix_slow_job_timeouts "$file"

      echo ""
      echo "✅ Remediation complete!"
      echo ""
      suggest_logic_fixes "$file"
      ;;
    *)
      echo "Usage: $0 [preview|apply] [file]"
      exit 1
      ;;
  esac
}

main "$@"
