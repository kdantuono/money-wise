#!/bin/bash
# Plaid/fintech API security validation for MoneyWise
set -e

# Example: check for Plaid sandbox credentials and basic security config
if grep -q 'PLAID_CLIENT_ID=your_plaid_client_id' .env || grep -q 'PLAID_SECRET=your_plaid_secret' .env; then
  echo "❌ Plaid sandbox credentials detected in .env. Please use secure production credentials."
  exit 1
fi
# Optionally, check for missing security headers in API config
if ! grep -q 'X-Plaid-Client-Id' apps/backend/src/modules/banking/plaid.service.ts; then
  echo "❌ Missing Plaid API security header validation in backend service."
  exit 1
fi
echo "✅ Plaid/fintech API security validation passed."
