#!/bin/bash
# Documentation Governance Root Cleanup Script
# Identifies and moves violation files from repository root to appropriate locations
# Supports: --check (dry-run), --fix (apply), --report (stats)
#
# Usage:
#   ./.claude/scripts/cleanup-root.sh --check   # Show violations without action
#   ./.claude/scripts/cleanup-root.sh --fix     # Move violations (with confirmation)
#   ./.claude/scripts/cleanup-root.sh --report  # Statistics and categorization

set -e

RULES_FILE=".claude/rules/markdown.rules"
MODE="${1:---check}"
MOVED_FILES=()
VIOLATIONS=()
STATS_BY_TYPE=()

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Whitelisted files (allowed in root)
WHITELIST=(
    "README.md"
    "FRONTEND_HANDOFF.md"
    "CHANGELOG.md"
    "CONTRIBUTING.md"
    "LICENSE.md"
    "CLAUDE.md"
)

# Pattern mappings for file types
declare -A MARKDOWN_PATTERNS=(
    ["ANALYSIS"]="docs/archive/"
    ["SUMMARY"]="docs/archive/"
    ["PROGRESS"]="docs/archive/"
    ["EXECUTIVE"]="docs/archive/"
    ["TEMPORARY"]="docs/archive/"
    ["WIP"]="docs/archive/"
    ["MILESTONE"]="docs/archive/"
    ["SWAGGER"]="docs/archive/"
    ["STATUS"]="docs/archive/"
    ["RECOVERY"]=".claude/sessions/"
    ["IMPLEMENTATION"]="docs/archive/"
    ["SESSION"]=".claude/sessions/"
)

declare -A TEXT_PATTERNS=(
    ["SUMMARY"]="docs/archive/"
    ["ANALYSIS"]="docs/archive/"
    ["EXECUTIVE"]="docs/archive/"
    ["BATCH"]="docs/archive/"
    ["PROGRESS"]="docs/archive/"
    ["TEMPORARY"]="docs/archive/"
    ["QUICK_REFERENCE"]="docs/archive/"
)

declare -A LOG_PATTERNS=(
    ["DEBUG"]="docs/archive/"
    ["ERROR"]="docs/archive/"
)

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  📋 DOCUMENTATION ROOT CLEANUP (Mode: ${YELLOW}${MODE}${BLUE})${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Helper function to check if file is whitelisted
is_whitelisted() {
    local filename="$1"
    for allowed in "${WHITELIST[@]}"; do
        if [ "$filename" = "$allowed" ]; then
            return 0
        fi
    done
    return 1
}

# Helper function to find destination for file
find_destination() {
    local filename="$1"
    local ext="${filename##*.}"
    local name="${filename%.*}"

    # Check markdown patterns
    if [ "$ext" = "md" ]; then
        for pattern in "${!MARKDOWN_PATTERNS[@]}"; do
            if [[ "$filename" =~ $pattern ]]; then
                echo "${MARKDOWN_PATTERNS[$pattern]}"
                return
            fi
        done
        # Default for .md without pattern
        echo "docs/archive/"
        return
    fi

    # Check text patterns
    if [ "$ext" = "txt" ]; then
        for pattern in "${!TEXT_PATTERNS[@]}"; do
            if [[ "$filename" =~ $pattern ]]; then
                echo "${TEXT_PATTERNS[$pattern]}"
                return
            fi
        done
        # Default for .txt without pattern
        echo "docs/archive/"
        return
    fi

    # Check log patterns
    if [ "$ext" = "log" ]; then
        for pattern in "${!LOG_PATTERNS[@]}"; do
            if [[ "$filename" =~ $pattern ]]; then
                echo "${LOG_PATTERNS[$pattern]}"
                return
            fi
        done
        # Default for .log without pattern
        echo "docs/archive/"
        return
    fi

    # Default fallback
    echo "docs/archive/"
}

# Scan root for violations
echo -e "${YELLOW}🔍 Scanning repository root for violations...${NC}"
echo ""

VIOLATION_COUNT=0
for file in $(find . -maxdepth 1 -type f \( -name "*.md" -o -name "*.txt" -o -name "*.log" \) | sort); do
    filename=$(basename "$file")

    # Skip hidden files
    if [[ "$filename" =~ ^\. ]]; then
        continue
    fi

    # Check if whitelisted
    if is_whitelisted "$filename"; then
        echo -e "${GREEN}✅${NC} ${filename} (whitelisted)"
    else
        VIOLATION_COUNT=$((VIOLATION_COUNT + 1))
        ext="${filename##*.}"
        destination=$(find_destination "$filename")

        VIOLATIONS+=("$filename:$destination")
        STATS_BY_TYPE+=("$ext")

        case "$ext" in
            md)
                ICON="📄"
                TYPE="Markdown"
                ;;
            txt)
                ICON="📝"
                TYPE="Text"
                ;;
            log)
                ICON="📋"
                TYPE="Log"
                ;;
            *)
                ICON="📦"
                TYPE="Unknown"
                ;;
        esac

        echo -e "${RED}❌${NC} ${ICON} ${filename} (${TYPE}) → ${YELLOW}${destination}${filename}${NC}"
    fi
done

echo ""

# If no violations, exit early
if [ ${#VIOLATIONS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ No violations found. Root is clean!${NC}"
    echo ""
    exit 0
fi

# Report mode
if [ "$MODE" = "--report" ]; then
    echo -e "${YELLOW}📊 VIOLATION STATISTICS:${NC}"
    echo ""

    # Count by type
    declare -A type_count
    for type in "${STATS_BY_TYPE[@]}"; do
        type_count[$type]=$((${type_count[$type]:-0} + 1))
    done

    for type in "${!type_count[@]}"; do
        case "$type" in
            md) echo -e "  📄 Markdown files (.md): ${type_count[$type]}" ;;
            txt) echo -e "  📝 Text files (.txt): ${type_count[$type]}" ;;
            log) echo -e "  📋 Log files (.log): ${type_count[$type]}" ;;
            *) echo -e "  📦 Other files (.${type}): ${type_count[$type]}" ;;
        esac
    done

    echo ""
    echo -e "${YELLOW}📋 VIOLATIONS TO FIX:${NC}"
    for violation in "${VIOLATIONS[@]}"; do
        file="${violation%%:*}"
        dest="${violation##*:}"
        echo -e "  • ${file} → ${dest}"
    done

    echo ""
    echo -e "${BLUE}Run with ${YELLOW}--fix${BLUE} to move these files${NC}"
    echo ""
    exit 0
fi

# Check mode (dry-run)
if [ "$MODE" = "--check" ]; then
    echo -e "${YELLOW}🔍 DRY-RUN: ${VIOLATION_COUNT} violations found${NC}"
    echo ""
    echo -e "${BLUE}Violations that would be moved:${NC}"
    for violation in "${VIOLATIONS[@]}"; do
        file="${violation%%:*}"
        dest="${violation##*:}"
        echo -e "  ${YELLOW}→${NC} ${file} would move to ${dest}"
    done

    echo ""
    echo -e "${BLUE}Run with ${YELLOW}--fix${BLUE} to apply these changes${NC}"
    echo ""
    exit 0
fi

# Fix mode (apply changes)
if [ "$MODE" = "--fix" ]; then
    echo -e "${YELLOW}⚠️  FIX MODE: About to move ${VIOLATION_COUNT} violations${NC}"
    echo ""

    # Show what will be moved
    for violation in "${VIOLATIONS[@]}"; do
        file="${violation%%:*}"
        dest="${violation##*:}"
        echo -e "  ${YELLOW}→${NC} ${file} → ${dest}${file}"
    done

    echo ""
    echo -e "${YELLOW}Continue with cleanup? (yes/no)${NC}"
    read -r confirm

    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}❌ Cleanup cancelled${NC}"
        echo ""
        exit 1
    fi

    echo ""
    echo -e "${BLUE}🔄 Moving files...${NC}"
    echo ""

    for violation in "${VIOLATIONS[@]}"; do
        file="${violation%%:*}"
        dest="${violation##*:}"

        # Create destination directory if needed
        mkdir -p "$dest"

        # Move file using git mv (preserves history)
        if git mv "./$file" "${dest}${file}" 2>/dev/null; then
            MOVED_FILES+=("${dest}${file}")
            echo -e "${GREEN}✅${NC} Moved: ${file} → ${dest}${file}"
        else
            # Fallback to manual move if git mv fails
            mv "./$file" "${dest}${file}"
            git add "${dest}${file}"
            git rm --cached "./$file" 2>/dev/null || true
            MOVED_FILES+=("${dest}${file}")
            echo -e "${GREEN}✅${NC} Moved: ${file} → ${dest}${file} (fallback)"
        fi
    done

    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}📦 CLEANUP COMPLETE${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}${#MOVED_FILES[@]} files moved:${NC}"
    for moved in "${MOVED_FILES[@]}"; do
        echo -e "  ✓ ${moved}"
    done

    echo ""
    echo -e "${BLUE}Changes staged for commit. Next steps:${NC}"
    echo -e "  1. Review changes: ${YELLOW}git status${NC}"
    echo -e "  2. Commit: ${YELLOW}git commit -m 'chore(docs): Clean up root directory violations'${NC}"
    echo -e "  3. Push: ${YELLOW}git push origin [branch]${NC}"
    echo ""
fi
