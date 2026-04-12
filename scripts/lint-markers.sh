#!/bin/bash
# Marker Convention Lint Script
# Scans apps/ and packages/ for TODO/FIXME/HACK markers and reports compliance.
#
# Usage: bash scripts/lint-markers.sh
#
# Exit codes:
#   0 - walked-away count is at or below baseline
#   1 - walked-away count exceeds baseline
#
# See: docs/MARKER_CONVENTION.md for the marker convention

set -uo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

BASELINE_FILE=".claude/quality/marker-baseline.txt"
SCAN_DIRS="apps/ packages/"
INCLUDE="--include=*.ts --include=*.tsx --include=*.js --include=*.jsx"
EXCLUDE="--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=coverage --exclude-dir=.next --exclude-dir=out --exclude-dir=build --exclude-dir=generated"

echo "=========================================="
echo "    Marker Convention Lint"
echo "=========================================="
echo ""

# Compliant pattern: TODO(<owner>, <date> ...)  or FIXME(<owner>, <date> ...) etc.
# Must have at minimum owner and date-like content inside parens
COMPLIANT_PATTERN='\b(TODO|FIXME|HACK)\([^)]*,[^)]*\)'

# All markers pattern: any TODO, FIXME, or HACK
ALL_PATTERN='\b(TODO|FIXME|HACK)\b'

# Count total markers
total=$(grep -rn $INCLUDE $EXCLUDE -E "$ALL_PATTERN" $SCAN_DIRS 2>/dev/null | wc -l)
total=$((total + 0))

# Count compliant markers
compliant=$(grep -rn $INCLUDE $EXCLUDE -E "$COMPLIANT_PATTERN" $SCAN_DIRS 2>/dev/null | wc -l)
compliant=$((compliant + 0))

# Walked-away = total - compliant
walked_away=$((total - compliant))

echo -e "${CYAN}Total markers:${NC}      $total"
echo -e "${GREEN}Compliant:${NC}          $compliant"
echo -e "${YELLOW}Walked-away:${NC}        $walked_away"
echo ""

# Report stale markers (compliant markers older than 90 days)
stale_cutoff=$(date -d '90 days ago' '+%Y-%m-%d' 2>/dev/null || date -v-90d '+%Y-%m-%d' 2>/dev/null || echo "")
if [ -n "$stale_cutoff" ]; then
    stale_count=0
    while IFS= read -r line; do
        # Extract date from marker: TODO(owner, 2026-01-15, ...)
        marker_date=$(echo "$line" | grep -oP '\d{4}-\d{2}-\d{2}' | head -1 || true)
        if [ -n "$marker_date" ] && [[ "$marker_date" < "$stale_cutoff" ]]; then
            stale_count=$((stale_count + 1))
        fi
    done < <(grep -rn $INCLUDE $EXCLUDE -E "$COMPLIANT_PATTERN" $SCAN_DIRS 2>/dev/null || true)
    echo -e "${YELLOW}Stale (>90 days):${NC}   $stale_count"
    echo ""
fi

# Check against baseline
if [ -f "$BASELINE_FILE" ]; then
    baseline=$(head -1 "$BASELINE_FILE" | tr -d '[:space:]')
    echo -e "Baseline:             $baseline"
    echo ""

    if [ "$walked_away" -le "$baseline" ]; then
        echo -e "${GREEN}PASS${NC} — walked-away ($walked_away) is at or below baseline ($baseline)"
        exit 0
    else
        echo -e "${RED}FAIL${NC} — walked-away ($walked_away) exceeds baseline ($baseline)"
        echo ""
        echo "New walked-away markers detected. Either:"
        echo "  1. Convert them to compliant format: TODO(<owner>, <date>, <issue>): description"
        echo "  2. If intentional, update the baseline: echo $walked_away > $BASELINE_FILE"
        exit 1
    fi
else
    echo -e "${YELLOW}No baseline file found at $BASELINE_FILE${NC}"
    echo "Creating baseline with current walked-away count: $walked_away"
    echo "$walked_away" > "$BASELINE_FILE"
    echo ""
    echo -e "${GREEN}PASS${NC} — baseline established"
    exit 0
fi
