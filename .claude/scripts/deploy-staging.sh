#!/bin/bash

set -euo pipefail

echo "🚀 MoneyWise Staging Deployment"

# Configuration
BACKEND_DIR="./apps/backend"
WEB_DIR="./apps/web"
STAGING_NAMESPACE="moneywise-staging"

echo "1️⃣  Building Docker images..."
docker build -t moneywise-backend:staging "$BACKEND_DIR/"
docker build -t moneywise-web:staging "$WEB_DIR/"

echo "2️⃣  Starting services..."
docker-compose -f docker-compose.dev.yml up -d

echo "3️⃣  Waiting for services to be ready..."
sleep 10

echo "4️⃣  Running database migrations..."
docker exec moneywise-backend pnpm db:migrate

echo "5️⃣  Health check - Backend..."
if curl -f http://localhost:3001/api/health; then
    echo "✓ Backend is healthy"
else
    echo "✗ Backend health check failed"
    exit 1
fi

echo "6️⃣  Health check - Frontend..."
if curl -f http://localhost:80; then
    echo "✓ Frontend is healthy"
else
    echo "✗ Frontend health check failed"
    exit 1
fi

echo ""
echo "✅ Staging deployment complete!"
echo ""
echo "Services running:"
echo "  Backend: http://localhost:3001"
echo "  Frontend: http://localhost:80"
echo "  Database: PostgreSQL (port 5432, private)"
echo "  Cache: Redis (port 6379, private)"
echo ""
