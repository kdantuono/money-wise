#!/bin/bash
# Automated rollback test for MoneyWise production deploy
set -e

echo "Starting rollback simulation..."
# Simulate a rollback by reverting to previous Docker image/tag
if docker images | grep -q 'moneywise-backend:previous'; then
  docker tag moneywise-backend:previous moneywise-backend:latest
  echo "Rollback: reverted to previous backend image."
else
  echo "No previous backend image found for rollback simulation."
  exit 1
fi
# Optionally, run health check after rollback
echo "Running post-rollback health check..."
curl -f http://localhost:3000/health || { echo "❌ Rollback health check failed"; exit 1; }
echo "✅ Rollback test passed."
