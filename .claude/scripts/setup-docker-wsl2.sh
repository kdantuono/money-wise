#!/bin/bash

# Docker WSL2 Setup Script
# Configures Docker to run without sudo for the current user
#
# WHY: Enables full CI/CD validation (act simulation) and local development
# WHAT: Adds user to docker group and starts Docker service

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

echo "================================"
echo "Docker WSL2 Setup"
echo "================================"
echo

# Step 1: Check if docker group exists
log_info "Checking Docker group..."
if getent group docker > /dev/null 2>&1; then
    log_success "Docker group exists (GID: $(getent group docker | cut -d: -f3))"
else
    log_error "Docker group does not exist. Docker may not be installed."
    exit 1
fi

# Step 2: Check current user groups
CURRENT_USER=$(whoami)
log_info "Current user: $CURRENT_USER"
log_info "Current groups: $(groups)"

if groups | grep -q '\bdocker\b'; then
    log_success "User is already in docker group"
else
    log_warning "User is NOT in docker group"

    # Add user to docker group
    log_info "Adding $CURRENT_USER to docker group..."
    if sudo usermod -aG docker "$CURRENT_USER"; then
        log_success "User added to docker group successfully"
        log_warning "⚠️  You MUST logout and login again (or restart terminal) for group changes to take effect"
        log_info "   Alternative: Run 'newgrp docker' in this session (temporary)"
    else
        log_error "Failed to add user to docker group"
        exit 1
    fi
fi

# Step 3: Start Docker service (WSL2 specific)
log_info "Starting Docker service..."
if sudo service docker start; then
    log_success "Docker service started"
else
    log_warning "Docker service may already be running or failed to start"
    log_info "Check status with: sudo service docker status"
fi

# Step 4: Wait for Docker to be ready
log_info "Waiting for Docker to be ready..."
sleep 3

# Step 5: Test Docker access
log_info "Testing Docker access..."
if docker ps > /dev/null 2>&1; then
    log_success "Docker is accessible without sudo! ✅"
    echo
    docker --version
    echo
    docker compose version 2>/dev/null || docker-compose --version
    echo
else
    log_error "Docker is still not accessible without sudo"
    log_info "Possible fixes:"
    echo "  1. Logout and login again (or restart terminal)"
    echo "  2. Run: newgrp docker"
    echo "  3. Check Docker service: sudo service docker status"
    echo "  4. Check socket permissions: ls -la /var/run/docker.sock"
    exit 1
fi

# Step 6: Verify docker-compose files exist
log_info "Checking docker-compose configuration..."
if [ -f "docker-compose.dev.yml" ]; then
    log_success "Found: docker-compose.dev.yml"
else
    log_warning "docker-compose.dev.yml not found in current directory"
fi

# Step 7: Optional - Start development services
echo
read -p "Start development services now? (PostgreSQL + Redis) [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Starting development services..."
    if docker compose -f docker-compose.dev.yml up -d; then
        log_success "Development services started!"
        echo
        docker compose -f docker-compose.dev.yml ps
        echo
        log_info "Services starting... Wait 10-15 seconds for health checks"
        log_info "Check logs: docker compose -f docker-compose.dev.yml logs -f"
    else
        log_error "Failed to start development services"
    fi
fi

echo
log_success "Docker WSL2 setup complete! 🐳"
echo
echo "Next steps:"
echo "  1. If prompted, logout/login or run: newgrp docker"
echo "  2. Test: docker ps"
echo "  3. Start services: docker compose -f docker-compose.dev.yml up -d"
echo "  4. Run validation: ./.claude/scripts/validate-ci.sh 10"
echo
