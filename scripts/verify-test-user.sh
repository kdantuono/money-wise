#!/bin/bash

# Helper script to manually verify test users for development testing
# This script activates a user account by updating their status to ACTIVE
# and setting email_verified_at timestamp

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if email is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Email address required${NC}"
    echo "Usage: $0 <email>"
    echo "Example: $0 integration-test-123@example.com"
    exit 1
fi

TEST_EMAIL="$1"

echo "=========================================="
echo "Manual User Verification Script"
echo "=========================================="
echo -e "${YELLOW}WARNING: This script is for DEVELOPMENT/TESTING only!${NC}"
echo "Email: $TEST_EMAIL"
echo ""

# Check if user exists
echo "Checking if user exists..."
USER_EXISTS=$(docker exec feda4c3a3f53_postgres-dev psql -U postgres -d moneywise -t -c \
    "SELECT COUNT(*) FROM users WHERE email = '$TEST_EMAIL';" | xargs)

if [ "$USER_EXISTS" = "0" ]; then
    echo -e "${RED}Error: User with email '$TEST_EMAIL' not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ User found${NC}"

# Get current user status
CURRENT_STATUS=$(docker exec feda4c3a3f53_postgres-dev psql -U postgres -d moneywise -t -c \
    "SELECT status FROM users WHERE email = '$TEST_EMAIL';" | xargs)

echo "Current status: $CURRENT_STATUS"

# Update user to ACTIVE with email_verified_at timestamp
echo "Activating user account..."
docker exec feda4c3a3f53_postgres-dev psql -U postgres -d moneywise -c \
    "UPDATE users SET status = 'ACTIVE', email_verified_at = NOW() WHERE email = '$TEST_EMAIL';" > /dev/null

# Verify update
NEW_STATUS=$(docker exec feda4c3a3f53_postgres-dev psql -U postgres -d moneywise -t -c \
    "SELECT status, email_verified_at FROM users WHERE email = '$TEST_EMAIL';")

echo ""
echo "=========================================="
echo -e "${GREEN}✓ User verified successfully!${NC}"
echo "=========================================="
echo "Updated Status:"
echo "$NEW_STATUS"
echo ""
echo "You can now:"
echo "  - Login with this user via POST /api/auth/login"
echo "  - Access protected routes with valid JWT token"
echo "  - Test authenticated user flows"
echo ""
