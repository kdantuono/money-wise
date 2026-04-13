#!/usr/bin/env bash
# count-test-skips.sh — Count skipped tests across the monorepo
#
# Walks all test files under apps/ and packages/ and reports every
# occurrence of skip patterns (describe.skip, it.skip, test.skip,
# xit, xdescribe, xtest).  Exits non-zero when the total exceeds
# an optional threshold.

set -euo pipefail

###############################################################################
# Defaults
###############################################################################
THRESHOLD=""
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

###############################################################################
# Help
###############################################################################
show_help() {
  cat <<'HELP'
count-test-skips.sh — Inventory of skipped tests in the monorepo

DESCRIPTION
  Scans test files (*.test.ts, *.test.tsx, *.spec.ts, *.spec.tsx)
  under apps/ and packages/ for skip patterns and prints a per-file
  breakdown plus a grand total.

USAGE
  bash scripts/testing/count-test-skips.sh [OPTIONS]

OPTIONS
  --threshold N   Exit with code 1 if the total skip count exceeds N.
  --help          Show this help message and exit.

EXAMPLES
  # Informational report (always exits 0)
  bash scripts/testing/count-test-skips.sh

  # Fail if more than 20 skips
  bash scripts/testing/count-test-skips.sh --threshold 20

SKIP PATTERNS DETECTED
  describe.skip   it.skip   test.skip
  xdescribe(      xit(      xtest(
HELP
}

###############################################################################
# Parse arguments
###############################################################################
while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      show_help
      exit 0
      ;;
    --threshold)
      if [[ -z "${2:-}" ]]; then
        echo "ERROR: --threshold requires a numeric argument" >&2
        exit 2
      fi
      THRESHOLD="$2"
      shift 2
      ;;
    *)
      echo "ERROR: Unknown option: $1" >&2
      show_help
      exit 2
      ;;
  esac
done

###############################################################################
# Collect test files
###############################################################################
TEST_FILES=()
while IFS= read -r -d '' file; do
  TEST_FILES+=("$file")
done < <(find "$REPO_ROOT/apps" "$REPO_ROOT/packages" \
  -type f \( -name "*.test.ts" -o -name "*.test.tsx" \
             -o -name "*.spec.ts" -o -name "*.spec.tsx" \) \
  -not -path "*/node_modules/*" \
  -print0 2>/dev/null || true)

if [[ ${#TEST_FILES[@]} -eq 0 ]]; then
  echo "No test files found under apps/ or packages/."
  echo "Total skipped tests: 0"
  exit 0
fi

###############################################################################
# Scan for skip patterns
###############################################################################
# Patterns: describe.skip, it.skip, test.skip, xit(, xdescribe(, xtest(
SKIP_PATTERN='(describe\.skip|it\.skip|test\.skip|xit\(|xdescribe\(|xtest\()'

TOTAL=0
FOUND_ANY=false

for file in "${TEST_FILES[@]}"; do
  # Count matches in this file
  count=$(grep -cE "$SKIP_PATTERN" "$file" 2>/dev/null || true)
  if [[ "$count" -gt 0 ]]; then
    rel_path="${file#"$REPO_ROOT/"}"
    echo "  $rel_path: $count skip(s)"
    TOTAL=$((TOTAL + count))
    FOUND_ANY=true
  fi
done

###############################################################################
# Summary
###############################################################################
echo ""
if [[ "$FOUND_ANY" == "true" ]]; then
  echo "Total skipped tests: $TOTAL"
else
  echo "Total skipped tests: 0"
  echo "No skipped tests found."
fi

###############################################################################
# Threshold check
###############################################################################
if [[ -n "$THRESHOLD" ]]; then
  if [[ "$TOTAL" -gt "$THRESHOLD" ]]; then
    echo ""
    echo "FAIL: Skip count ($TOTAL) exceeds threshold ($THRESHOLD)"
    exit 1
  else
    echo "OK: Skip count ($TOTAL) is within threshold ($THRESHOLD)"
  fi
fi

exit 0
