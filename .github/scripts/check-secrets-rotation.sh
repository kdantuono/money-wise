#!/bin/bash
# Check .env file secrets rotation for MoneyWise
set -e
if [ -f .env ]; then
  LAST_MOD=$(date -r .env +%s)
  NOW=$(date +%s)
  DIFF=$(( (NOW - LAST_MOD) / 86400 ))
  if [ "$DIFF" -gt 90 ]; then
    echo "❌ .env file is older than 90 days. Please rotate secrets."
    exit 1
  fi
  echo "✅ .env file secrets are recently rotated."
else
  echo "⚠️ .env file not found. Skipping secrets rotation check."
fi
