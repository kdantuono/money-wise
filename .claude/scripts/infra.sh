#!/bin/bash
# infra.sh — MoneyWise Infrastructure Service Manager
#
# Manages TimescaleDB (PostgreSQL) and Redis containers for local development.
# Automatically detects the container runtime: Docker, Podman, or Podman via
# distrobox-host-exec (for development inside distrobox on Steam Deck / immutable OS).
#
# Usage:
#   bash .claude/scripts/infra.sh <command>
#   pnpm infra:start | infra:stop | infra:logs | infra:status | infra:help
#
# Commands:
#   start    Start PostgreSQL (TimescaleDB) and Redis containers
#   stop     Stop and remove both containers
#   logs     Tail logs from both containers (Ctrl+C to stop)
#   status   Show detected runtime and container states
#   cleanup  Prune dangling images, unused volumes, and pnpm store
#   help     Show this help message
#
# Examples:
#   pnpm infra:start          # Start database + cache services
#   pnpm infra:stop           # Stop and remove services
#   pnpm infra:status         # Check what runtime is detected and container states
#   pnpm infra:logs           # Follow logs from both services
#   pnpm infra:cleanup        # Free disk space (dangling images + pnpm store)
#
#   bash .claude/scripts/infra.sh start    # Direct invocation
#   bash .claude/scripts/infra.sh status   # Check status directly
#
# Runtime Detection:
#   1. Inside distrobox → uses 'distrobox-host-exec podman' to manage host containers
#   2. Docker available → uses 'docker compose' with docker-compose.dev.yml
#   3. Podman available → uses 'podman run' with equivalent configuration
#
# Services:
#   postgres-dev   TimescaleDB (timescale/timescaledb:latest-pg15) on port 5432
#   redis-dev      Redis 7 Alpine (redis:7-alpine) on port 6379

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/container-runtime.sh"

show_help() {
    # Print everything between "# Usage:" and the first non-comment line
    sed -n '/^# Usage:/,/^[^#]/{ /^#/s/^# \?//p }' "$0"
}

case "${1:-help}" in
    start)
        echo "Starting infrastructure services (runtime: $RUNTIME_NAME)..."
        start_infra_services
        echo ""
        infra_status
        ;;
    stop)
        echo "Stopping infrastructure services..."
        stop_infra_services
        echo "Done."
        ;;
    logs)
        echo "Tailing logs (Ctrl+C to stop)..."
        infra_logs
        ;;
    status)
        infra_status
        ;;
    cleanup)
        infra_cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "Unknown command: $1" >&2
        echo "Run 'bash $0 help' or 'pnpm infra:help' for usage." >&2
        exit 1
        ;;
esac
