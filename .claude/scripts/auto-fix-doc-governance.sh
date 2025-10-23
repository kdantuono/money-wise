#!/bin/bash
# Auto-fix documentation governance violations
# This hook automatically moves markdown files to correct locations
# without blocking the commit

set -e

RULES_FILE=".claude/rules/markdown.rules"
CHANGES_MADE=false
MOVED_FILES=()

# Whitelisted files (allowed in root)
WHITELIST=(
    "README.md"
    "FRONTEND_HANDOFF.md"
    "CHANGELOG.md"
    "CONTRIBUTING.md"
    "LICENSE.md"
)

# Pattern mappings (pattern -> destination)
declare -A PATTERN_MAP=(
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

echo "📋 Checking documentation governance..."

# Get staged files that are .md
STAGED_MD=$(git diff --cached --name-only 2>/dev/null | grep "\.md$" || true)

if [ -z "$STAGED_MD" ]; then
    exit 0
fi

# Process each markdown file
while IFS= read -r file; do
    if [ -z "$file" ]; then
        continue
    fi

    # Get filename without path
    filename=$(basename "$file")

    # Check if in root level (contains no /)
    if [[ ! "$file" =~ / ]]; then
        # File is in root - check if whitelisted
        is_whitelisted=false

        for allowed in "${WHITELIST[@]}"; do
            if [ "$filename" = "$allowed" ]; then
                is_whitelisted=true
                break
            fi
        done

        if [ "$is_whitelisted" = true ]; then
            continue
        fi

        # Not whitelisted - determine destination
        destination="docs/archive/"

        for pattern in "${!PATTERN_MAP[@]}"; do
            if [[ "$filename" =~ $pattern ]]; then
                destination="${PATTERN_MAP[$pattern]}"
                break
            fi
        done

        # Create destination directory if needed
        mkdir -p "$destination"

        # Move file using git
        git mv "$file" "$destination$filename" 2>/dev/null || {
            # Fallback if git mv fails
            mv "$file" "$destination$filename"
            git add "$destination$filename"
            git rm --cached "$file" 2>/dev/null || true
        }

        MOVED_FILES+=("$destination$filename")
        CHANGES_MADE=true
    fi
done <<< "$STAGED_MD"

# Report changes if any were made
if [ "$CHANGES_MADE" = true ]; then
    echo ""
    echo "📦 Documentation governance auto-fix applied:"
    for moved in "${MOVED_FILES[@]}"; do
        echo "   ✓ Moved: $moved"
    done
    echo ""
    echo "💡 Files auto-moved to comply with governance rules"
    echo "   Rules: .claude/rules/markdown.rules"
    echo ""
fi

exit 0
