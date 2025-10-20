#!/bin/bash

# MoneyWise act Setup Script
# Downloads and installs act from GitHub releases
# Based on official script: https://github.com/nektos/act/blob/master/install.sh

set -e -o pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[✗]${NC} $1" >&2
}

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../.." && pwd )"
TARGET_DIR="$PROJECT_ROOT/.claude/tools"

# Detect OS using $OSTYPE (more portable than uname -s)
detect_os() {
    case "$OSTYPE" in
        linux-*)
            echo "linux"
            ;;
        darwin*)
            echo "darwin"
            ;;
        freebsd*)
            echo "freebsd"
            ;;
        msys|cygwin|win32)
            echo "windows"
            ;;
        *)
            log_error "Unsupported OS type: $OSTYPE"
            return 1
            ;;
    esac
}

# Detect architecture
detect_arch() {
    local machine
    machine="$(uname -m)"

    case "$machine" in
        x86_64)
            echo "x86_64"
            ;;
        i?86)
            echo "i386"
            ;;
        aarch64|arm64)
            echo "arm64"
            ;;
        arm*)
            echo "armv6"
            ;;
        *)
            log_error "Unsupported architecture: $machine"
            return 1
            ;;
    esac
}

# Determine file extension based on OS
detect_ext() {
    local os=$1
    if [ "$os" = "windows" ]; then
        echo "zip"
    else
        echo "tar.gz"
    fi
}

# Normalize OS name for act release naming
normalize_os() {
    local os=$1
    case "$os" in
        linux)
            echo "Linux"
            ;;
        darwin)
            echo "Darwin"
            ;;
        freebsd)
            echo "FreeBSD"
            ;;
        windows)
            echo "Windows"
            ;;
        *)
            echo "$os"
            ;;
    esac
}

# Normalize architecture for act release naming
normalize_arch() {
    local arch=$1
    case "$arch" in
        x86_64)
            echo "x86_64"
            ;;
        i386)
            echo "i386"
            ;;
        arm64)
            echo "arm64"
            ;;
        armv6)
            echo "armv6"
            ;;
        *)
            echo "$arch"
            ;;
    esac
}

# Get latest act version from GitHub API
get_latest_version() {
    local latest_tag

    log_info "Fetching latest act version from GitHub..."

    # Fetch latest release info from GitHub API
    latest_tag=$(curl -s "https://api.github.com/repos/nektos/act/releases/latest" | grep '"tag_name"' | head -1 | cut -d'"' -f4)

    if [ -z "$latest_tag" ]; then
        log_error "Failed to fetch latest version from GitHub API"
        return 1
    fi

    # Remove 'v' prefix if present
    echo "${latest_tag#v}"
}

# Download and install act
install_act() {
    local version=$1
    local os=$2
    local arch=$3
    local ext=$4

    # Normalize OS and arch for filename
    local norm_os
    local norm_arch
    norm_os=$(normalize_os "$os")
    norm_arch=$(normalize_arch "$arch")

    local file="act_${norm_os}_${norm_arch}.${ext}"
    local url="https://github.com/nektos/act/releases/download/v${version}/${file}"

    log_info "Downloading ${url}..."

    if [ "$os" = "windows" ]; then
        # Windows: Download zip, extract exe
        local tempdir
        tempdir="$(mktemp -d act.XXXXXXXXXXXXXXXX)"
        trap "rm -rf $tempdir" EXIT

        if ! curl -L -o "$tempdir/tmp.zip" "${url}"; then
            log_error "Failed to download act from $url"
            return 1
        fi

        if ! unzip -q "$tempdir/tmp.zip" -d "$tempdir"; then
            log_error "Failed to extract act.exe"
            return 1
        fi

        mkdir -p "$TARGET_DIR"
        if ! mv "$tempdir/act.exe" "$TARGET_DIR/act.exe"; then
            log_error "Failed to move act.exe to $TARGET_DIR"
            return 1
        fi

        log_success "Downloaded: $TARGET_DIR/act.exe"
    else
        # Linux/macOS/FreeBSD: Download tar.gz, extract with pipe
        mkdir -p "$TARGET_DIR"

        if ! curl -L "${url}" | tar xzf - -C "$TARGET_DIR" act; then
            log_error "Failed to download and extract act"
            log_error "URL was: $url"
            return 1
        fi

        chmod +x "$TARGET_DIR/act"
        log_success "Downloaded: $TARGET_DIR/act"
    fi
}

# Check if act is already installed and up to date
is_up_to_date() {
    local installed_version
    local target_exe="$TARGET_DIR/act"

    if [ ! -f "$target_exe" ]; then
        return 1  # Not installed
    fi

    if ! installed_version=$("$target_exe" --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1); then
        return 1
    fi

    local latest_version=$1

    if [ "$installed_version" = "$latest_version" ]; then
        log_success "act is already at latest version: v$installed_version"
        return 0
    else
        log_warning "act update available: v$installed_version → v$latest_version"
        return 1
    fi
}

# Verify installation
verify_installation() {
    local exe="$TARGET_DIR/act"

    if [ ! -f "$exe" ]; then
        log_error "act not found at $exe"
        return 1
    fi

    if ! "$exe" --version > /dev/null 2>&1; then
        log_error "act verification failed"
        return 1
    fi

    local version
    version=$("$exe" --version 2>&1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)

    log_success "act ready: v$version"
    log_success "Location: $exe"

    # Set executable path for later use
    echo "$exe"
}

main() {
    log_info "================================"
    log_info "act Setup"
    log_info "================================"
    echo "" >&2

    # Detect platform
    local os
    local arch
    local ext

    os=$(detect_os) || exit 1
    arch=$(detect_arch) || exit 1
    ext=$(detect_ext "$os") || exit 1

    log_info "Detected OS=${os} arch=${arch} ext=${ext}"
    echo "" >&2

    # Get latest version
    local version
    version=$(get_latest_version) || {
        log_warning "Could not fetch latest version, skipping setup"
        log_warning "You can install manually from: https://github.com/nektos/act/releases"
        exit 0
    }

    log_success "Latest version: v$version"
    echo "" >&2

    # Check if already up to date
    if is_up_to_date "$version"; then
        verify_installation 2>/dev/null > /dev/null
        exit 0
    fi

    # Download and install
    if install_act "$version" "$os" "$arch" "$ext"; then
        echo "" >&2
        verify_installation 2>/dev/null > /dev/null
        log_success "act setup complete!"
        exit 0
    else
        log_warning "act installation failed"
        log_warning "Please check your internet connection and try again"
        log_warning "Or install manually from: https://github.com/nektos/act/releases"
        exit 0  # Non-blocking
    fi
}

# Only run if executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
