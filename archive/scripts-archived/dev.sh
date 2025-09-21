#!/bin/bash

# MoneyWise MVP - Simple Development Script
# Replaces 18 complex orchestration scripts with 1 simple script

echo "🚀 MoneyWise MVP Development Environment"
echo "======================================="

# Check if Docker is available
if command -v docker &> /dev/null; then
    echo "📦 Starting Docker infrastructure..."
    docker compose -f docker-compose.dev.yml up -d
    
    # Wait a moment for services to start
    sleep 3
    
    echo "✅ Docker services started:"
    docker compose -f docker-compose.dev.yml ps
else
    echo "⚠️  Docker not available, skipping infrastructure services"
fi

echo ""
echo "🎯 To start the applications:"
echo "  Backend:  cd apps/backend && npm run start"
echo "  Frontend: cd apps/web && npm run dev"
echo ""
echo "📚 Application URLs:"
echo "  Web App:  http://localhost:3000"
echo "  API:      http://localhost:3002"
echo "  Health:   http://localhost:3002/health"
echo "  Docs:     http://localhost:3002/api"
echo ""
echo "💡 Use Ctrl+C to stop services"