#!/bin/bash
# Setup environment files for a new git worktree
# Usage: ./setup-worktree-env.sh /path/to/worktree

set -e

MAIN_WORKTREE="/home/nemesi/dev/money-wise"
TARGET_WORKTREE="${1:-}"

if [ -z "$TARGET_WORKTREE" ]; then
    echo "Usage: $0 /path/to/worktree"
    echo ""
    echo "Example: $0 /home/nemesi/dev/money-wise-dashboard"
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

# Verify SaltEdge credentials
echo ""
echo "Verifying SaltEdge credentials..."
if grep -q "SALTEDGE_APP_ID=wuQhPpSwSDYfa4WceLhSt0FJ2q1Qd_4tO1DPRROOXNQ" "$TARGET_WORKTREE/apps/backend/.env" 2>/dev/null; then
    echo "✅ SaltEdge APP_ID verified"
else
    echo "⚠️  Warning: SaltEdge APP_ID may not be properly configured"
fi

# Verify private key path
if grep -q "SALTEDGE_PRIVATE_KEY_PATH=/home/nemesi/saltedge_private.pem" "$TARGET_WORKTREE/apps/backend/.env" 2>/dev/null; then
    echo "✅ SaltEdge private key path verified"
else
    echo "⚠️  Warning: SALTEDGE_PRIVATE_KEY_PATH may not be configured"
fi

# Verify private key file exists
if [ -f "/home/nemesi/saltedge_private.pem" ]; then
    echo "✅ RSA private key file exists"
else
    echo "⚠️  Warning: RSA private key file not found at /home/nemesi/saltedge_private.pem"
fi

echo ""
echo "=================================================="
echo "Environment setup complete!"
echo ""
echo "Next steps:"
echo "  1. cd $TARGET_WORKTREE"
echo "  2. pnpm install"
echo "  3. pnpm --filter @money-wise/backend dev"
