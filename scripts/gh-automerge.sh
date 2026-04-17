#!/bin/bash
# gh-automerge.sh — enable auto-merge (squash) on a PR and tail CI until resolution.
#
# Usage: scripts/gh-automerge.sh <PR_NUMBER>
#
# Preconditions:
#   - gh CLI authenticated with repo admin OR maintain on kdantuono/money-wise
#   - Branch protection on the target branch allows auto-merge
#   - PR must not carry the `wip` or `needs-review` labels (auto-merge workflow
#     disables itself in those cases; this helper just flips the GH bit).

set -euo pipefail

PR="${1:?PR number required (usage: scripts/gh-automerge.sh <PR_NUMBER>)}"

echo "🔄 Enabling auto-merge (squash) for PR #$PR..."
gh pr merge "$PR" --auto --squash --delete-branch

echo "⏳ Tailing CI checks (--fail-fast)..."
gh pr checks "$PR" --watch --fail-fast
