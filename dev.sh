#!/bin/bash
# Quick development environment startup

echo "🚀 Starting MoneyWise Development Environment"
echo "============================================="

# Start Docker services
echo "📦 Starting Docker services..."
docker compose -f docker-compose.dev.yml up -d

# Wait a moment for services to start
sleep 3

# Start development servers (when implemented)
echo "💻 Development servers will start here when implemented"
echo "   Backend: pnpm dev:backend"
echo "   Frontend: pnpm dev:web"

echo "✅ Development environment is ready!"
