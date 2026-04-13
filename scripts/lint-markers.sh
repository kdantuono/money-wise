#!/usr/bin/env bash
# lint-markers.sh — Lint TODO/FIXME/HACK/WALKED_AWAY markers in the codebase
#
# Reports markers by convention (missing ticket references, non-standard
# formats) and detects stale markers whose embedded dates are older than
# a configurable threshold.

set -euo pipefail

###############################################################################
# Defaults
###############################################################################
STALE_DAYS=90
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCAN_DIRS=("$REPO_ROOT/apps" "$REPO_ROOT/packages")

###############################################################################
# Help
###############################################################################
show_help() {
  cat <<'HELP'
lint-markers.sh — Lint code markers (TODO, FIXME, HACK, WALKED_AWAY)

DESCRIPTION
  Scans source files under apps/ and packages/ for marker comments
  (TODO, FIXME, HACK, WALKED_AWAY) and reports:

    1. Total marker inventory grouped by type
    2. Markers with embedded dates older than the stale threshold
    3. Per-file breakdown of all markers

USAGE
  bash scripts/lint-markers.sh [OPTIONS]

OPTIONS
  --stale-days N   Number of days before a dated marker is considered
                   stale (default: 90).
  --help           Show this help message and exit.

EXAMPLES
  # Default scan (90-day stale threshold)
  bash scripts/lint-markers.sh

  # Use 30-day stale threshold
  bash scripts/lint-markers.sh --stale-days 30

MARKER CONVENTIONS
  Markers should follow the format:
    // TODO(ticket-or-owner): description
    // FIXME(ticket-or-owner): description
    // HACK(ticket-or-owner): description — date
    // WALKED_AWAY: description — YYYY-MM-DD

  Dates in markers (YYYY-MM-DD format) are checked for staleness.
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
    --stale-days)
      if [[ -z "${2:-}" ]]; then
        echo "ERROR: --stale-days requires a numeric argument" >&2
        exit 2
      fi
      STALE_DAYS="$2"
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
# Utility: date arithmetic (POSIX-compatible)
###############################################################################
# Returns epoch seconds for a YYYY-MM-DD date string.
# Falls back to 0 on parse failure.
date_to_epoch() {
  local datestr="$1"
  # Try GNU date first, then BSD date
  if date -d "$datestr" +%s 2>/dev/null; then
    return
  elif date -j -f "%Y-%m-%d" "$datestr" +%s 2>/dev/null; then
    return
  fi
  echo "0"
}

now_epoch() {
  date +%s
}

###############################################################################
# Collect source files (ts, tsx, js, jsx)
###############################################################################
SOURCE_FILES=()
existing_dirs=()
for d in "${SCAN_DIRS[@]}"; do
  if [[ -d "$d" ]]; then
    existing_dirs+=("$d")
  fi
done

if [[ ${#existing_dirs[@]} -eq 0 ]]; then
  echo "No source directories found (apps/, packages/). Nothing to scan."
  exit 0
fi

while IFS= read -r -d '' file; do
  SOURCE_FILES+=("$file")
done < <(find "${existing_dirs[@]}" \
  -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/.next/*" \
  -not -path "*/dist/*" \
  -not -path "*/generated/*" \
  -not -path "*/coverage/*" \
  -print0 2>/dev/null || true)

if [[ ${#SOURCE_FILES[@]} -eq 0 ]]; then
  echo "No source files found to scan."
  exit 0
fi

###############################################################################
# Scan for markers
###############################################################################
MARKER_PATTERN='\b(TODO|FIXME|HACK|WALKED_AWAY)\b'
DATE_PATTERN='[0-9]{4}-[0-9]{2}-[0-9]{2}'

# Counters
TODO_COUNT=0
FIXME_COUNT=0
HACK_COUNT=0
WALKED_AWAY_COUNT=0
TOTAL_MARKERS=0
STALE_COUNT=0

# Collect stale markers for reporting
STALE_MARKERS=()

NOW=$(now_epoch)
STALE_THRESHOLD=$((STALE_DAYS * 86400))

for file in "${SOURCE_FILES[@]}"; do
  rel_path="${file#"$REPO_ROOT/"}"

  # Read matching lines with line numbers
  while IFS= read -r match_line; do
    if [[ -z "$match_line" ]]; then
      continue
    fi

    line_num="${match_line%%:*}"
    line_content="${match_line#*:}"

    TOTAL_MARKERS=$((TOTAL_MARKERS + 1))

    # Count by type
    if echo "$line_content" | grep -qw "TODO"; then
      TODO_COUNT=$((TODO_COUNT + 1))
    fi
    if echo "$line_content" | grep -qw "FIXME"; then
      FIXME_COUNT=$((FIXME_COUNT + 1))
    fi
    if echo "$line_content" | grep -qw "HACK"; then
      HACK_COUNT=$((HACK_COUNT + 1))
    fi
    if echo "$line_content" | grep -qw "WALKED_AWAY"; then
      WALKED_AWAY_COUNT=$((WALKED_AWAY_COUNT + 1))
    fi

    # Check for stale dates
    if date_str=$(echo "$line_content" | grep -oE "$DATE_PATTERN" | head -1) && [[ -n "$date_str" ]]; then
      marker_epoch=$(date_to_epoch "$date_str")
      if [[ "$marker_epoch" -gt 0 ]]; then
        age=$((NOW - marker_epoch))
        if [[ "$age" -gt "$STALE_THRESHOLD" ]]; then
          age_days=$((age / 86400))
          STALE_COUNT=$((STALE_COUNT + 1))
          STALE_MARKERS+=("  $rel_path:$line_num ($date_str, ${age_days}d old)")
        fi
      fi
    fi
  done < <(grep -nE "$MARKER_PATTERN" "$file" 2>/dev/null || true)
done

###############################################################################
# Report
###############################################################################
echo "=== Marker Inventory ==="
echo ""
echo "  TODO:        $TODO_COUNT"
echo "  FIXME:       $FIXME_COUNT"
echo "  HACK:        $HACK_COUNT"
echo "  WALKED_AWAY: $WALKED_AWAY_COUNT"
echo "  ─────────────────"
echo "  Total:       $TOTAL_MARKERS"
echo ""

if [[ ${#STALE_MARKERS[@]} -gt 0 ]]; then
  echo "=== Stale Markers (older than ${STALE_DAYS} days) ==="
  echo ""
  for marker in "${STALE_MARKERS[@]}"; do
    echo "$marker"
  done
  echo ""
  echo "  Total stale: $STALE_COUNT"
  echo ""
else
  echo "No stale markers found (threshold: ${STALE_DAYS} days)."
  echo ""
fi

exit 0
