#!/bin/bash
# Setup environment files for a new git worktree
# Usage: ./setup-worktree-env.sh /path/to/worktree [main_worktree_path]

set -euo pipefail

# Dynamically detect main worktree, or use provided path
MAIN_WORKTREE="${2:-$(git rev-parse --show-toplevel 2>/dev/null || echo "")}"
TARGET_WORKTREE="${1:-}"

if [ -z "$TARGET_WORKTREE" ]; then
    echo "Usage: $0 /path/to/worktree [main_worktree_path]"
    echo ""
    echo "Example: $0 ~/dev/money-wise-dashboard"
    echo "         $0 ~/dev/money-wise-dashboard ~/dev/money-wise"
    exit 1
fi

if [ -z "$MAIN_WORKTREE" ]; then
    echo "Error: Could not detect main worktree. Please provide it as second argument."
    exit 1
fi

if [ ! -d "$TARGET_WORKTREE" ]; then
    echo "Error: Directory does not exist: $TARGET_WORKTREE"
    exit 1
fi

echo "Setting up environment for worktree: $TARGET_WORKTREE"
echo "=================================================="

# Copy backend .env
if [ -f "$MAIN_WORKTREE/apps/backend/.env" ]; then
    mkdir -p "$TARGET_WORKTREE/apps/backend"
    cp "$MAIN_WORKTREE/apps/backend/.env" "$TARGET_WORKTREE/apps/backend/.env"
    echo "✅ Copied apps/backend/.env"
else
    echo "⚠️  Warning: $MAIN_WORKTREE/apps/backend/.env not found"
fi

# Copy web .env.local (if exists)
if [ -f "$MAIN_WORKTREE/apps/web/.env.local" ]; then
    mkdir -p "$TARGET_WORKTREE/apps/web"
    cp "$MAIN_WORKTREE/apps/web/.env.local" "$TARGET_WORKTREE/apps/web/.env.local"
    echo "✅ Copied apps/web/.env.local"
else
    echo "ℹ️  Note: apps/web/.env.local not found (optional)"
fi

# Copy root .env (if exists)
if [ -f "$MAIN_WORKTREE/.env" ]; then
    cp "$MAIN_WORKTREE/.env" "$TARGET_WORKTREE/.env"
    echo "✅ Copied root .env"
else
    echo "ℹ️  Note: root .env not found (optional)"
fi

# Verify SaltEdge credentials (check existence without exposing values)
echo ""
echo "Verifying SaltEdge configuration..."
if grep -q "^SALTEDGE_APP_ID=" "$TARGET_WORKTREE/apps/backend/.env" 2>/dev/null; then
    echo "✅ SALTEDGE_APP_ID is configured"
else
    echo "⚠️  Warning: SALTEDGE_APP_ID is not set in apps/backend/.env"
fi

# Verify private key path is set and file exists
PRIVATE_KEY_PATH=$(grep "^SALTEDGE_PRIVATE_KEY_PATH=" "$TARGET_WORKTREE/apps/backend/.env" 2>/dev/null | cut -d'=' -f2-)
if [ -n "$PRIVATE_KEY_PATH" ]; then
    echo "✅ SALTEDGE_PRIVATE_KEY_PATH is configured"
    if [ -f "$PRIVATE_KEY_PATH" ]; then
        echo "✅ RSA private key file exists at configured path"
    else
        echo "⚠️  Warning: RSA private key file not found at: $PRIVATE_KEY_PATH"
    fi
else
    echo "⚠️  Warning: SALTEDGE_PRIVATE_KEY_PATH is not set in apps/backend/.env"
fi

echo ""
echo "=================================================="
echo "Environment setup complete!"
echo ""
echo "Next steps:"
echo "  1. cd $TARGET_WORKTREE"
echo "  2. pnpm install"
echo "  3. pnpm --filter @money-wise/backend dev"
