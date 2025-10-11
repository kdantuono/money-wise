#!/bin/bash
#
# Clean Build Script
# Ensures NODE_ENV is unset before building to prevent Next.js 15+ issues
#
# Usage:
#   ./scripts/build-clean.sh [turbo build args...]
#
# Examples:
#   ./scripts/build-clean.sh                          # Build all
#   ./scripts/build-clean.sh --filter=@money-wise/web # Build web only
#
# Problem:
#   Next.js 15.2.4+ fails with "non-standard NODE_ENV" error if NODE_ENV
#   is set in .env files or shell environment during production builds.
#
# Solution:
#   This script explicitly unsets NODE_ENV before running turbo build,
#   allowing Next.js/NestJS to manage NODE_ENV automatically.
#
# References:
#   - https://nextjs.org/docs/messages/non-standard-node-env
#   - apps/web/.env.build-fix-note.md

set -e  # Exit on error

# Unset NODE_ENV to let frameworks manage it
unset NODE_ENV

# Run turbo build with all passed arguments
exec env -u NODE_ENV pnpm turbo run build "$@"
