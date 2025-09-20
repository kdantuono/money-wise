#!/bin/bash
# Secure secret scanning for MoneyWise
set -e
secret_count=$(grep -r "password\|secret\|key" --include="*.ts" --include="*.js" . | grep -v node_modules | grep -v test | wc -l)
if [ "$secret_count" -gt 0 ]; then
  echo "❌ $secret_count potential secrets detected in code"
  exit 1
fi
echo "✅ No hardcoded secrets detected"
