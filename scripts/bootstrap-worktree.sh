#!/bin/bash
# bootstrap-worktree.sh — create an isolated worktree for a concurrent session.
#
# Usage:
#   scripts/bootstrap-worktree.sh <branch-name> [parent-dir]
#
# Example:
#   scripts/bootstrap-worktree.sh feat/new-thing           # → ~/dev/money-wise-feat-new-thing
#   scripts/bootstrap-worktree.sh fix/bug /tmp             # → /tmp/money-wise-fix-bug
#
# One session = one worktree. See CLAUDE.md "Session & CI Discipline".

set -euo pipefail

BRANCH="${1:?branch required (usage: scripts/bootstrap-worktree.sh <branch-name> [parent-dir])}"
PARENT="${2:-$HOME/dev}"

if [ ! -d "$PARENT" ]; then
  echo "❌ Parent directory does not exist: $PARENT"
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

NAME="money-wise-$(echo "$BRANCH" | tr '/' '-')"
WT="$PARENT/$NAME"

if [ -e "$WT" ]; then
  echo "❌ Worktree path already exists: $WT"
  exit 1
fi

echo "📁 Creating worktree at $WT on branch $BRANCH..."
if git rev-parse --verify "refs/heads/$BRANCH" >/dev/null 2>&1; then
  git worktree add "$WT" "$BRANCH"
else
  git worktree add "$WT" -b "$BRANCH"
fi

echo "🔐 Copying env files (if present)..."
for f in .env apps/web/.env.local; do
  if [ -f "$REPO_ROOT/$f" ]; then
    mkdir -p "$WT/$(dirname "$f")"
    cp "$REPO_ROOT/$f" "$WT/$f"
    echo "    ✅ $f"
  else
    echo "    ⏭️  $f (not present in main worktree)"
  fi
done

echo "📦 Installing deps with pnpm..."
(cd "$WT" && pnpm install --frozen-lockfile)

cat <<EOF

✅ Worktree ready: $WT
   Branch:         $BRANCH

Next:
   cd $WT
   claude  # start your session here
EOF
