#!/bin/bash
# container-runtime.sh — Runtime detection helper for MoneyWise infrastructure
#
# This file is meant to be SOURCED, not executed directly.
# It detects whether we're running inside distrobox (with host podman),
# a standard Docker environment, or bare podman, then exports variables
# and functions for managing infrastructure containers.
#
# Usage:
#   source "$(dirname "${BASH_SOURCE[0]}")/container-runtime.sh"
#
# Exports:
#   CONTAINER_CMD      — "docker" | "podman" | "distrobox-host-exec podman"
#   COMPOSE_AVAILABLE  — "true" | "false"
#   RUNTIME_NAME       — human-readable name ("distrobox+podman" | "docker" | "podman")
#   PROJECT_ROOT       — absolute path to the monorepo root
#
# Functions:
#   container_ps_check <name>       — returns 0 if container is running
#   container_exec <name> <cmd...>  — exec into a running container
#   start_infra_services            — starts postgres-dev + redis-dev
#   stop_infra_services             — stops and removes both containers
#   infra_logs                      — tails logs from both containers
#   infra_status                    — prints runtime info + container states

# Resolve PROJECT_ROOT relative to this script's location
_CR_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$_CR_SCRIPT_DIR/../.." && pwd)}"

# ── Runtime Detection ────────────────────────────────────────────────────────

detect_runtime() {
    if [[ -f /run/.containerenv ]] && distrobox-host-exec podman --version &>/dev/null; then
        CONTAINER_CMD="distrobox-host-exec podman"
        COMPOSE_AVAILABLE="false"
        RUNTIME_NAME="distrobox+podman"
    elif command -v docker &>/dev/null; then
        CONTAINER_CMD="docker"
        if docker compose version &>/dev/null; then
            COMPOSE_AVAILABLE="true"
        else
            echo "WARN: Docker found but compose plugin missing. Install with: sudo apt-get install docker-compose-plugin" >&2
            COMPOSE_AVAILABLE="false"
        fi
        RUNTIME_NAME="docker"
    elif command -v podman &>/dev/null; then
        CONTAINER_CMD="podman"
        COMPOSE_AVAILABLE="false"
        RUNTIME_NAME="podman"
    else
        echo "ERROR: No container runtime found (docker, podman, or distrobox-host-exec podman)." >&2
        return 1
    fi

    export CONTAINER_CMD COMPOSE_AVAILABLE RUNTIME_NAME PROJECT_ROOT
}

# Run detection immediately on source
detect_runtime || return 1 2>/dev/null || exit 1

# ── Helper Functions ─────────────────────────────────────────────────────────

# Check if a container is running by name
container_ps_check() {
    local name="$1"
    $CONTAINER_CMD ps --filter "name=^${name}$" --format "{{.Names}}" 2>/dev/null | grep -q "^${name}$"
}

# Exec a command inside a running container
container_exec() {
    local name="$1"
    shift
    $CONTAINER_CMD exec "$name" "$@"
}

# ── Infrastructure Service Management ────────────────────────────────────────

# Service configuration (mirrors docker-compose.dev.yml)
_PG_IMAGE="timescale/timescaledb:latest-pg15"
_PG_NAME="postgres-dev"
_PG_PORT="5432:5432"

_REDIS_IMAGE="redis:7-alpine"
_REDIS_NAME="redis-dev"
_REDIS_PORT="6379:6379"

_NETWORK_NAME="app-network"

start_infra_services() {
    if [[ "$COMPOSE_AVAILABLE" == "true" ]]; then
        $CONTAINER_CMD compose -f "$PROJECT_ROOT/docker-compose.dev.yml" up -d
        return $?
    fi

    # Non-compose path: create resources and run containers directly

    # Create network if missing (use inspect for Docker+Podman compat)
    $CONTAINER_CMD network inspect "$_NETWORK_NAME" >/dev/null 2>&1 \
        || $CONTAINER_CMD network create "$_NETWORK_NAME" >/dev/null 2>&1 \
        || true  # ignore if already exists (race or different error)

    # Create volumes if missing (use inspect for Docker+Podman compat)
    $CONTAINER_CMD volume inspect postgres_data >/dev/null 2>&1 \
        || $CONTAINER_CMD volume create postgres_data >/dev/null 2>&1 || true
    $CONTAINER_CMD volume inspect redis_data >/dev/null 2>&1 \
        || $CONTAINER_CMD volume create redis_data >/dev/null 2>&1 || true

    # Start PostgreSQL (TimescaleDB)
    if ! container_ps_check "$_PG_NAME"; then
        # Remove exited container if it exists
        $CONTAINER_CMD rm -f "$_PG_NAME" 2>/dev/null || true

        $CONTAINER_CMD run -d \
            --name "$_PG_NAME" \
            --network "$_NETWORK_NAME" \
            -e POSTGRES_DB=moneywise \
            -e POSTGRES_USER=postgres \
            -e POSTGRES_PASSWORD=password \
            -e POSTGRES_INITDB_ARGS="--auth-host=md5 --auth-local=trust" \
            -p "$_PG_PORT" \
            -v postgres_data:/var/lib/postgresql/data \
            -v "${PROJECT_ROOT}/infrastructure/docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql:ro" \
            --health-cmd='pg_isready -U postgres -d moneywise' \
            --health-interval=30s \
            --health-timeout=10s \
            --health-retries=5 \
            "$_PG_IMAGE"
    fi

    # Start Redis
    if ! container_ps_check "$_REDIS_NAME"; then
        $CONTAINER_CMD rm -f "$_REDIS_NAME" 2>/dev/null || true

        $CONTAINER_CMD run -d \
            --name "$_REDIS_NAME" \
            --network "$_NETWORK_NAME" \
            -p "$_REDIS_PORT" \
            -v redis_data:/data \
            --health-cmd='redis-cli ping' \
            --health-interval=30s \
            --health-timeout=10s \
            --health-retries=5 \
            "$_REDIS_IMAGE"
    fi
}

stop_infra_services() {
    if [[ "$COMPOSE_AVAILABLE" == "true" ]]; then
        $CONTAINER_CMD compose -f "$PROJECT_ROOT/docker-compose.dev.yml" down
        return $?
    fi

    $CONTAINER_CMD stop "$_PG_NAME" "$_REDIS_NAME" 2>/dev/null || true
    $CONTAINER_CMD rm "$_PG_NAME" "$_REDIS_NAME" 2>/dev/null || true
}

infra_logs() {
    if [[ "$COMPOSE_AVAILABLE" == "true" ]]; then
        $CONTAINER_CMD compose -f "$PROJECT_ROOT/docker-compose.dev.yml" logs -f
        return $?
    fi

    # Tail both containers in parallel; clean up on interrupt
    trap 'kill $(jobs -p) 2>/dev/null' INT TERM EXIT
    $CONTAINER_CMD logs -f "$_PG_NAME" 2>&1 | sed "s/^/[postgres] /" &
    $CONTAINER_CMD logs -f "$_REDIS_NAME" 2>&1 | sed "s/^/[redis]    /" &
    wait
    trap - INT TERM EXIT
}

infra_status() {
    echo "Runtime:  $RUNTIME_NAME ($CONTAINER_CMD)"
    echo "Compose:  $COMPOSE_AVAILABLE"
    echo ""

    if container_ps_check "$_PG_NAME"; then
        echo "postgres-dev:  running"
    else
        # Check if container exists but stopped
        if $CONTAINER_CMD ps -a --filter "name=^${_PG_NAME}$" --format "{{.Names}}" 2>/dev/null | grep -q "^${_PG_NAME}$"; then
            echo "postgres-dev:  stopped (container exists)"
        else
            echo "postgres-dev:  not created"
        fi
    fi

    if container_ps_check "$_REDIS_NAME"; then
        echo "redis-dev:     running"
    else
        if $CONTAINER_CMD ps -a --filter "name=^${_REDIS_NAME}$" --format "{{.Names}}" 2>/dev/null | grep -q "^${_REDIS_NAME}$"; then
            echo "redis-dev:     stopped (container exists)"
        else
            echo "redis-dev:     not created"
        fi
    fi
}

infra_cleanup() {
    echo "Pruning dangling container images..."
    $CONTAINER_CMD image prune -f
    echo ""

    echo "Pruning unused volumes (excluding postgres_data, redis_data)..."
    # List dangling volumes and remove only those that aren't our data volumes
    local volumes
    volumes=$($CONTAINER_CMD volume ls --filter "dangling=true" --format "{{.Name}}" 2>/dev/null || true)
    for vol in $volumes; do
        if [[ "$vol" != "postgres_data" && "$vol" != "redis_data" ]]; then
            $CONTAINER_CMD volume rm "$vol" 2>/dev/null && echo "  Removed volume: $vol" || true
        fi
    done

    echo ""
    echo "Pruning pnpm store..."
    if command -v pnpm &>/dev/null; then
        (cd "$PROJECT_ROOT" && pnpm store prune)
    fi

    echo ""
    echo "Cleanup complete."
}
