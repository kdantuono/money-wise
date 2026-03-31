#!/bin/bash
# Quick development environment startup

echo "🚀 Starting MoneyWise Development Environment"
echo "============================================="

# Start infrastructure services (auto-detects Docker/Podman/distrobox)
echo "📦 Starting infrastructure services..."
bash "$(dirname "$0")/.claude/scripts/infra.sh" start

# Wait a moment for services to start
sleep 3

# Start development servers (when implemented)
echo "💻 Development servers will start here when implemented"
echo "   Backend: pnpm dev:backend"
echo "   Frontend: pnpm dev:web"

echo "✅ Development environment is ready!"
