#!/bin/bash
# bootstrap-dev.sh — MoneyWise Development Environment Bootstrap
#
# Unified setup script that works across all supported development environments:
# distrobox on Steam Deck, WSL on Windows, or plain Linux.
#
# Detects the environment automatically and installs the full development
# toolchain, then optionally sets up the MoneyWise project.
#
# Usage:
#   bash .claude/scripts/bootstrap-dev.sh [options]
#
# Options:
#   --help, -h                Show this help message
#   --env-only                Install system tools only, skip project setup
#   --skip-claude             Skip Claude Code installation
#   --skip-node               Skip Node.js/pnpm installation (if managed externally)
#   --runtime-manager=MODE    Node/pnpm install strategy: mise | apt
#                             Default is env-conditional: mise for WSL/plain Linux,
#                             apt for distrobox/SteamOS (preserves existing setups).
#   --dry-run                 Show what would be installed without making changes
#
# Examples:
#   bash .claude/scripts/bootstrap-dev.sh                            # Full setup (default)
#   bash .claude/scripts/bootstrap-dev.sh --runtime-manager=mise     # Force mise (reads mise.toml)
#   bash .claude/scripts/bootstrap-dev.sh --runtime-manager=apt      # Force apt/nodesource
#   bash .claude/scripts/bootstrap-dev.sh --env-only                 # System tools only
#   bash .claude/scripts/bootstrap-dev.sh --dry-run                  # Preview changes
#   bash .claude/scripts/bootstrap-dev.sh --skip-claude              # Skip Claude Code
#
# Environment Detection:
#   1. /run/.containerenv exists        -> distrobox (Steam Deck / immutable OS)
#   2. /proc/version contains Microsoft -> WSL (Windows Subsystem for Linux)
#   3. Otherwise                        -> plain Linux
#
# What Gets Installed (all environments):
#   - tmux, git, build-essential, curl, unzip
#   - Node.js 22 LTS (via nodesource, unless --skip-node)
#   - pnpm (via corepack)
#   - Claude Code stable (native installer, unless --skip-claude)
#   - (psql/redis-cli NOT needed locally — containers provide them via container_exec)
#
# Environment-Specific:
#   - distrobox: verifies host podman, configures PATH
#   - WSL: configures Docker group, starts Docker service
#   - plain Linux: checks for docker or podman

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
NODE_MAJOR=22

# Parse flags
ENV_ONLY=false
SKIP_CLAUDE=false
SKIP_NODE=false
DRY_RUN=false
RUNTIME_MANAGER=""

for arg in "$@"; do
    case "$arg" in
        --help|-h)
            sed -n '/^# Usage:/,/^[^#]/{ /^#/s/^# \?//p }' "$0"
            exit 0
            ;;
        --env-only)   ENV_ONLY=true ;;
        --skip-claude) SKIP_CLAUDE=true ;;
        --skip-node)  SKIP_NODE=true ;;
        --dry-run)    DRY_RUN=true ;;
        --runtime-manager=mise) RUNTIME_MANAGER="mise" ;;
        --runtime-manager=apt)  RUNTIME_MANAGER="apt"  ;;
        --runtime-manager=*)
            echo "Invalid --runtime-manager value: ${arg#--runtime-manager=}" >&2
            echo "Accepted: mise | apt" >&2
            exit 1
            ;;
        *)
            echo "Unknown option: $arg" >&2
            echo "Run '$0 --help' for usage." >&2
            exit 1
            ;;
    esac
done

# ── Colors & Output ──────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC}   $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERR]${NC}  $1"; }
step()    { echo -e "\n${CYAN}── $1 ──${NC}"; }

dry() {
    if [[ "$DRY_RUN" == "true" ]]; then
        info "[DRY RUN] Would run: $*"
        return 0
    fi
    "$@"
}

# ── Environment Detection ────────────────────────────────────────────────────

detect_environment() {
    if [[ -f /run/.containerenv ]]; then
        ENV_TYPE="distrobox"
    elif grep -qi microsoft /proc/version 2>/dev/null; then
        ENV_TYPE="wsl"
    else
        ENV_TYPE="linux"
    fi
    export ENV_TYPE
}

# ── Package Installation Helpers ─────────────────────────────────────────────

apt_install_if_missing() {
    local packages=()
    for pkg in "$@"; do
        if ! dpkg -l "$pkg" 2>/dev/null | grep -q "^ii"; then
            packages+=("$pkg")
        fi
    done

    if [[ ${#packages[@]} -eq 0 ]]; then
        success "All packages already installed: $*"
        return 0
    fi

    info "Installing: ${packages[*]}"
    dry sudo apt-get update -qq
    dry sudo apt-get install -y -qq "${packages[@]}"
    success "Installed: ${packages[*]}"
}

# ── Step 1: System Packages ─────────────────────────────────────────────────

install_system_packages() {
    step "Installing system packages"
    # Note: psql and redis-cli are NOT needed locally — they run inside the
    # containers via container_exec. Prisma handles all DB operations.
    apt_install_if_missing tmux git build-essential curl unzip
}

# ── Step 2: Node.js (dispatcher mise|apt) ───────────────────────────────────

install_node() {
    if [[ "$SKIP_NODE" == "true" ]]; then
        info "Skipping Node.js installation (--skip-node)"
        return 0
    fi

    step "Checking Node.js"

    case "$RUNTIME_MANAGER" in
        mise) install_node_via_mise ;;
        apt)  install_node_via_apt  ;;
        *)
            error "RUNTIME_MANAGER unset (expected mise|apt). This is a bug — main() should set it after detect_environment."
            return 1
            ;;
    esac
}

install_node_via_apt() {
    if command -v node &>/dev/null; then
        local current_major
        current_major=$(node --version | sed 's/v\([0-9]*\).*/\1/')
        if [[ "$current_major" -ge "$NODE_MAJOR" ]]; then
            success "Node.js $(node --version) already installed (>= $NODE_MAJOR)"

            # Ensure pnpm is available via corepack
            if command -v corepack &>/dev/null; then
                dry corepack enable
                if command -v pnpm &>/dev/null; then
                    success "pnpm $(pnpm --version) available via corepack"
                else
                    info "Enabling pnpm via corepack..."
                    dry corepack prepare pnpm@latest --activate
                fi
            fi
            return 0
        else
            warn "Node.js $current_major found, but $NODE_MAJOR+ required"
        fi
    fi

    info "Installing Node.js $NODE_MAJOR via nodesource..."
    if [[ "$DRY_RUN" == "true" ]]; then
        info "[DRY RUN] Would install Node.js $NODE_MAJOR from nodesource"
        return 0
    fi

    local _ns_installer
    _ns_installer="$(mktemp -t nodesource-setup-XXXXXX.sh)"
    if ! curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" -o "$_ns_installer"; then
        error "Failed to download NodeSource installer"
        rm -f "$_ns_installer"
        return 1
    fi
    sudo -E bash "$_ns_installer"
    rm -f "$_ns_installer"
    sudo apt-get install -y -qq nodejs
    corepack enable
    success "Node.js $(node --version) installed with corepack"
}

install_node_via_mise() {
    # 1. Install mise binary if absent (single-user, ~/.local/bin)
    if ! command -v mise &>/dev/null; then
        info "Installing mise (version manager) via https://mise.run..."
        if [[ "$DRY_RUN" == "true" ]]; then
            info "[DRY RUN] Would run: curl -fsSL https://mise.run | sh"
        else
            local _mise_installer
            _mise_installer="$(mktemp -t mise-install-XXXXXX.sh)"
            if ! curl -fsSL "https://mise.run" -o "$_mise_installer"; then
                error "Failed to download mise installer"
                rm -f "$_mise_installer"
                return 1
            fi
            sh "$_mise_installer"
            rm -f "$_mise_installer"
            # mise installs to ~/.local/bin by default — extend PATH for current shell
            export PATH="$HOME/.local/bin:$PATH"
            success "mise binary installed"
        fi
    else
        success "mise $(mise --version 2>/dev/null || echo installed) already present"
    fi

    # 2. Persist shell activation in ~/.bashrc (idempotent check)
    local activation_line='eval "$(mise activate bash)"'
    if ! grep -qF 'mise activate bash' "$HOME/.bashrc" 2>/dev/null; then
        if [[ "$DRY_RUN" == "true" ]]; then
            info "[DRY RUN] Would append mise activation to ~/.bashrc"
        else
            echo "$activation_line" >> "$HOME/.bashrc"
            success "Added mise activation to ~/.bashrc (applies to new shells)"
        fi
    else
        success "mise activation already present in ~/.bashrc"
    fi

    # 3. Install toolchain declared in mise.toml
    if [[ ! -f "$PROJECT_ROOT/mise.toml" ]]; then
        warn "mise.toml missing at $PROJECT_ROOT — nothing to install declaratively"
        return 0
    fi

    info "Installing toolchain from $PROJECT_ROOT/mise.toml..."
    if [[ "$DRY_RUN" == "true" ]]; then
        info "[DRY RUN] Would run: mise trust $PROJECT_ROOT/mise.toml && (cd $PROJECT_ROOT && mise install)"
        return 0
    fi

    # mise security model requires explicit trust for each mise.toml (first-run protection)
    mise trust "$PROJECT_ROOT/mise.toml"
    (cd "$PROJECT_ROOT" && mise install)

    # 4. Activate mise in current shell so subsequent steps see mise-managed bins
    eval "$(mise activate bash)" 2>/dev/null || true

    # 5. PATH precedence: mise shims must win over apt/nvm-installed nodes.
    # Without explicit verification, a silent PATH mismatch can leave the user
    # believing mise is active while a non-mise node is actually serving commands.
    if command -v node &>/dev/null; then
        local node_path
        node_path="$(command -v node)"
        if [[ "$node_path" == *"/mise/"* ]] || [[ "$node_path" == *"/.local/share/mise/"* ]]; then
            success "PATH precedence OK — mise shim wins: $node_path"
            success "Node.js $(node --version) ready via mise"
        else
            warn "Node resolved via non-mise path: $node_path"
            warn "Expected mise shim (~/.local/share/mise/shims/). Open a fresh shell or run 'source ~/.bashrc' for activation to take effect."
            warn "Node.js $(node --version) currently served by non-mise path — mise toolchain NOT active in this shell"
        fi
    else
        warn "node command not found after mise install — check mise.toml [tools] entries"
    fi

    # 6. Verify pnpm
    if command -v pnpm &>/dev/null; then
        success "pnpm $(pnpm --version) ready via mise"
    else
        warn "pnpm not found after mise install — ensure mise.toml includes 'pnpm' under [tools]"
    fi
}

# ── Step 3: Claude Code ─────────────────────────────────────────────────────

install_claude_code() {
    if [[ "$SKIP_CLAUDE" == "true" ]]; then
        info "Skipping Claude Code installation (--skip-claude)"
        return 0
    fi

    step "Checking Claude Code"

    if command -v claude &>/dev/null; then
        success "Claude Code $(claude --version 2>/dev/null || echo '(installed)') already present"
        info "To update: claude update"
        return 0
    fi

    info "Installing Claude Code (stable channel, native installer)..."
    if [[ "$DRY_RUN" == "true" ]]; then
        info "[DRY RUN] Would run: curl -fsSL https://claude.ai/install.sh | bash -s stable"
        return 0
    fi

    local _claude_installer
    _claude_installer="$(mktemp -t claude-install-XXXXXX.sh)"
    if ! curl -fsSL "https://claude.ai/install.sh" -o "$_claude_installer"; then
        error "Failed to download Claude Code installer"
        rm -f "$_claude_installer"
        return 1
    fi
    bash "$_claude_installer" stable
    rm -f "$_claude_installer"
    success "Claude Code installed"
}

# ── Step 4: Environment-Specific Setup ───────────────────────────────────────

setup_distrobox() {
    step "Distrobox environment setup"

    # Verify host podman is accessible
    if distrobox-host-exec podman --version &>/dev/null; then
        success "Host podman accessible: $(distrobox-host-exec podman --version)"
    else
        error "Cannot reach host podman via distrobox-host-exec"
        error "Ensure podman is installed on the host (SteamOS ships it since 3.5)"
        return 1
    fi

    # Ensure ~/.local/bin is in PATH (for Claude Code native installer)
    if ! echo "$PATH" | grep -q "$HOME/.local/bin"; then
        warn "~/.local/bin not in PATH"
        if [[ "$DRY_RUN" != "true" ]]; then
            if ! grep -q 'export PATH="$HOME/.local/bin:$PATH"' ~/.bashrc 2>/dev/null; then
                echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
                export PATH="$HOME/.local/bin:$PATH"
                success "Added ~/.local/bin to PATH in ~/.bashrc"
            fi
        else
            info "[DRY RUN] Would add ~/.local/bin to PATH in ~/.bashrc"
        fi
    else
        success "~/.local/bin already in PATH"
    fi

    info "Container runtime: distrobox + host podman (no Docker needed)"
    info "Infrastructure managed via: pnpm infra:start / infra:stop"
}

setup_wsl() {
    step "WSL environment setup"

    # Check if Docker is available
    if command -v docker &>/dev/null; then
        success "Docker found: $(docker --version)"

        # Check if user is in docker group
        if groups | grep -q docker; then
            success "User is in docker group"
        else
            warn "User not in docker group"
            info "Adding $(whoami) to docker group..."
            dry sudo usermod -aG docker "$(whoami)"
            warn "You need to log out and back in (or run: newgrp docker) for this to take effect"
        fi

        # Try to start Docker service if not running
        if ! docker info &>/dev/null 2>&1; then
            info "Starting Docker service..."
            dry sudo service docker start || warn "Could not start Docker. If using Docker Desktop, start it from Windows."
        fi
    else
        warn "Docker not found. Install Docker Desktop for Windows and enable WSL integration."
        warn "Or install Docker Engine: https://docs.docker.com/engine/install/ubuntu/"
    fi
}

setup_linux() {
    step "Linux environment setup"

    if command -v docker &>/dev/null; then
        success "Docker found: $(docker --version)"
    elif command -v podman &>/dev/null; then
        success "Podman found: $(podman --version)"
    else
        warn "No container runtime found. Install docker or podman for infrastructure services."
    fi
}

# ── Step 5: Project Setup ───────────────────────────────────────────────────

setup_project() {
    if [[ "$ENV_ONLY" == "true" ]]; then
        info "Skipping project setup (--env-only)"
        return 0
    fi

    step "Project setup"

    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        error "Not in MoneyWise project root (no package.json at $PROJECT_ROOT)"
        return 1
    fi

    cd "$PROJECT_ROOT"

    # Install dependencies
    if [[ -d "node_modules" ]]; then
        success "node_modules exists (run 'pnpm install' manually if stale)"
    else
        info "Installing project dependencies..."
        dry pnpm install
        success "Dependencies installed"
    fi

    # Check .env files
    local backend_env="$PROJECT_ROOT/apps/backend/.env"
    local backend_env_example="$PROJECT_ROOT/apps/backend/.env.example"
    if [[ -f "$backend_env" ]]; then
        success "Backend .env exists"
    elif [[ -f "$backend_env_example" ]]; then
        info "Copying .env.example to .env..."
        dry cp "$backend_env_example" "$backend_env"
        warn "Review apps/backend/.env and update secrets before production use"
    else
        warn "No .env or .env.example found in apps/backend/"
    fi

    # Set up git hooks
    if [[ -d "node_modules" ]] && command -v pnpm &>/dev/null; then
        info "Setting up git hooks..."
        dry pnpm exec husky install 2>/dev/null || true
        success "Git hooks configured"
    fi

    # Start infrastructure if infra.sh exists
    if [[ -f "$PROJECT_ROOT/.claude/scripts/infra.sh" ]]; then
        info "Starting infrastructure services..."
        dry bash "$PROJECT_ROOT/.claude/scripts/infra.sh" start
    fi

    # Run migrations
    if command -v pnpm &>/dev/null && [[ -d "node_modules" ]]; then
        info "Checking database migrations..."
        dry pnpm db:migrate || warn "Migration failed — database may not be ready yet"
    fi
}

# ── Summary ──────────────────────────────────────────────────────────────────

print_summary() {
    echo ""
    echo -e "${GREEN}================================================================${NC}"
    echo -e "${CYAN}  MoneyWise Development Environment — Setup Complete${NC}"
    echo -e "${GREEN}================================================================${NC}"
    echo ""
    echo -e "  Environment:    ${BLUE}$ENV_TYPE${NC}"
    echo -e "  Runtime mgr:    ${BLUE}$RUNTIME_MANAGER${NC}"
    echo -e "  Node.js:        $(node --version 2>/dev/null || echo 'not installed')"
    echo -e "  pnpm:           $(pnpm --version 2>/dev/null || echo 'not installed')"
    echo -e "  Claude Code:    $(claude --version 2>/dev/null || echo 'not installed')"
    echo -e "  tmux:           $(tmux -V 2>/dev/null || echo 'not installed')"
    echo ""
    echo "  Quick start:"
    echo "    pnpm infra:start     # Start TimescaleDB + Redis"
    echo "    pnpm dev:ready       # Full interactive dev setup"
    echo "    pnpm dev             # Start all dev servers"
    echo ""
    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "  ${YELLOW}This was a dry run — no changes were made.${NC}"
        echo ""
    fi
}

# ── Main ─────────────────────────────────────────────────────────────────────

main() {
    echo -e "${CYAN}MoneyWise Development Environment Bootstrap${NC}"
    echo -e "${BLUE}============================================${NC}"

    detect_environment
    info "Detected environment: $ENV_TYPE"

    # Resolve RUNTIME_MANAGER default from ENV_TYPE if user didn't pass --runtime-manager
    local runtime_source="explicit"
    if [[ -z "$RUNTIME_MANAGER" ]]; then
        runtime_source="env default"
        case "$ENV_TYPE" in
            distrobox) RUNTIME_MANAGER="apt"  ;;  # SteamOS compat — preserves existing apt-installed toolchains
            wsl|linux) RUNTIME_MANAGER="mise" ;;  # Modern default, reads mise.toml for version pinning
        esac
    fi
    info "Runtime manager: $RUNTIME_MANAGER ($runtime_source)"

    if [[ "$DRY_RUN" == "true" ]]; then
        warn "DRY RUN mode — no changes will be made"
    fi

    # System packages (all environments)
    install_system_packages

    # Node.js + pnpm
    install_node

    # Claude Code
    install_claude_code

    # Environment-specific setup
    case "$ENV_TYPE" in
        distrobox) setup_distrobox ;;
        wsl)       setup_wsl ;;
        linux)     setup_linux ;;
    esac

    # Project setup (unless --env-only)
    setup_project

    print_summary
}

main "$@"
