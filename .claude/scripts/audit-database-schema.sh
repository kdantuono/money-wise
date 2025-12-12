#!/bin/bash
# Quick Database Schema Audit Script
# Usage: ./audit-database-schema.sh [--verbose]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/apps/backend"

VERBOSE=false
if [[ "$1" == "--verbose" ]]; then
  VERBOSE=true
fi

echo "=========================================="
echo "MoneyWise Database Schema Audit"
echo "=========================================="
echo ""

# Check if Docker is running
if ! docker ps > /dev/null 2>&1; then
  echo "❌ ERROR: Docker is not running"
  exit 1
fi

# Check if postgres-dev container exists
if ! docker ps | grep -q postgres-dev; then
  echo "❌ ERROR: postgres-dev container is not running"
  echo "   Run: docker compose up -d"
  exit 1
fi

echo "✅ Docker and PostgreSQL container are running"
echo ""

# Function to extract enum from Prisma schema
extract_schema_enum() {
  local enum_name=$1
  awk "/^enum $enum_name \{/,/^\}/" "$BACKEND_DIR/prisma/schema.prisma" | \
    grep -E "^  [A-Z_]+" | awk '{print $1}' | sort
}

# Function to extract enum from database
extract_db_enum() {
  local enum_name=$1
  local db_enum_name=$(echo $enum_name | sed 's/\([A-Z]\)/_\L\1/g' | sed 's/^_//')

  docker exec postgres-dev psql -U postgres -d moneywise -t -c \
    "SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = '$db_enum_name' ORDER BY enumsortorder;" 2>/dev/null | \
    sed 's/^ *//' | sed '/^$/d' | sort
}

# Compare enums
ENUMS=(
  "UserRole" "UserStatus" "AccountType" "AccountStatus" "AccountSource"
  "BankingProvider" "BankingConnectionStatus" "BankingSyncStatus"
  "TransactionType" "FlowType" "TransferRole" "TransactionStatus" "TransactionSource"
  "CategoryType" "CategoryStatus" "BudgetPeriod" "BudgetStatus"
  "AchievementType" "AchievementStatus" "LiabilityType" "LiabilityStatus"
  "NotificationType" "NotificationPriority" "NotificationStatus"
  "RecurrenceFrequency" "ScheduledTransactionStatus" "AuditEventType"
)

MISMATCHES=0
MISMATCH_DETAILS=()

echo "Checking ${#ENUMS[@]} enums..."
echo ""

for enum in "${ENUMS[@]}"; do
  schema_values=$(extract_schema_enum "$enum")
  db_values=$(extract_db_enum "$enum")

  if [ -z "$db_values" ]; then
    echo "❌ $enum: NOT FOUND IN DATABASE"
    ((MISMATCHES++))
    MISMATCH_DETAILS+=("$enum: Enum not found in database")
  elif [ "$schema_values" != "$db_values" ]; then
    echo "❌ $enum: MISMATCH"
    ((MISMATCHES++))

    if [ "$VERBOSE" = true ]; then
      echo "   Schema: $(echo $schema_values | tr '\n' ', ')"
      echo "   DB:     $(echo $db_values | tr '\n' ', ')"
      echo ""
    fi

    MISMATCH_DETAILS+=("$enum: Values do not match")
  else
    if [ "$VERBOSE" = true ]; then
      echo "✅ $enum: MATCH"
    fi
  fi
done

if [ "$VERBOSE" = false ] && [ $MISMATCHES -eq 0 ]; then
  echo "✅ All ${#ENUMS[@]} enums are synchronized"
fi

echo ""
echo "=========================================="
echo "Running Prisma Migration Check..."
echo "=========================================="
echo ""

cd "$BACKEND_DIR"

# Check migration status
MIGRATION_STATUS=$(pnpm prisma migrate status 2>&1 | grep -E "(up to date|pending migrations)" || true)

if echo "$MIGRATION_STATUS" | grep -q "up to date"; then
  echo "✅ Database schema is up to date"
elif echo "$MIGRATION_STATUS" | grep -q "pending"; then
  echo "⚠️  WARNING: Pending migrations detected"
  ((MISMATCHES++))
else
  echo "⚠️  WARNING: Unable to determine migration status"
fi

echo ""
echo "=========================================="
echo "Schema Drift Detection..."
echo "=========================================="
echo ""

DRIFT=$(pnpm prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script 2>&1)

if echo "$DRIFT" | grep -q "empty migration"; then
  echo "✅ No schema drift detected"
else
  echo "⚠️  WARNING: Schema drift detected"
  ((MISMATCHES++))

  if [ "$VERBOSE" = true ]; then
    echo ""
    echo "$DRIFT"
  fi
fi

echo ""
echo "=========================================="
echo "AUDIT SUMMARY"
echo "=========================================="
echo "Total enums checked: ${#ENUMS[@]}"
echo "Issues found: $MISMATCHES"
echo ""

if [ $MISMATCHES -eq 0 ]; then
  echo "✅ DATABASE SCHEMA FULLY ALIGNED"
  echo ""
  echo "All checks passed:"
  echo "  ✅ All enums synchronized"
  echo "  ✅ No pending migrations"
  echo "  ✅ No schema drift"
  exit 0
else
  echo "❌ ALIGNMENT ISSUES DETECTED"
  echo ""
  echo "Issues:"
  for detail in "${MISMATCH_DETAILS[@]}"; do
    echo "  - $detail"
  done
  echo ""
  echo "Run with --verbose flag for detailed output"
  echo "See full audit report: docs/database/schema-audit-report-*.md"
  exit 1
fi
