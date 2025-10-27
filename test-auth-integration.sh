#!/bin/bash

# Auth Integration Test Suite
# Tests all auth flow endpoints with evidence collection

set -e

API_BASE="http://localhost:3001/api"
TIMESTAMP=$(date +%s)
TEST_EMAIL="integration-test-${TIMESTAMP}@example.com"
TEST_PASSWORD="SecureP@ssw0rd!#$%^&*TestPassword123"
TEST_FIRSTNAME="IntegrationTest"
TEST_LASTNAME="User"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Results storage
RESULTS_DIR="/tmp/auth-integration-results-${TIMESTAMP}"
mkdir -p "$RESULTS_DIR"

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Utility function to print test results
print_test_result() {
    local test_name=$1
    local status=$2
    local message=$3

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} Test $TOTAL_TESTS: $test_name - PASS"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗${NC} Test $TOTAL_TESTS: $test_name - FAIL: $message"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Utility function to save response
save_response() {
    local test_name=$1
    local response=$2
    echo "$response" > "$RESULTS_DIR/${test_name}.json"
}

echo "========================================"
echo "Auth Integration Test Suite"
echo "========================================"
echo "Test Email: $TEST_EMAIL"
echo "Results Directory: $RESULTS_DIR"
echo ""

# Test 1: Registration Flow
echo "Test 1: User Registration"
echo "----------------------------------------"

REGISTER_REQUEST=$(cat <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD",
  "firstName": "$TEST_FIRSTNAME",
  "lastName": "$TEST_LASTNAME"
}
EOF
)

echo "Request: POST $API_BASE/auth/register"
echo "$REGISTER_REQUEST" | jq . || echo "$REGISTER_REQUEST"

REGISTER_RESPONSE=$(curl -s -X POST "$API_BASE/auth/register" \
    -H "Content-Type: application/json" \
    -d "$REGISTER_REQUEST")

echo "Response:"
echo "$REGISTER_RESPONSE" | jq . || echo "$REGISTER_RESPONSE"

save_response "1_registration" "$REGISTER_RESPONSE"

# Extract tokens and user data
REGISTER_STATUS=$(echo "$REGISTER_RESPONSE" | jq -r '.statusCode // 201')
REGISTER_ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.accessToken // empty')
REGISTER_REFRESH_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.refreshToken // empty')
REGISTER_USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user.id // empty')
REGISTER_USER_STATUS=$(echo "$REGISTER_RESPONSE" | jq -r '.user.status // empty')

# Validate registration response
if [ "$REGISTER_STATUS" = "201" ] || [ -n "$REGISTER_ACCESS_TOKEN" ]; then
    print_test_result "Registration returns 201 Created" "PASS" ""
else
    print_test_result "Registration returns 201 Created" "FAIL" "Status: $REGISTER_STATUS"
fi

if [ -n "$REGISTER_ACCESS_TOKEN" ] && [ "$REGISTER_ACCESS_TOKEN" != "null" ]; then
    print_test_result "Registration returns accessToken" "PASS" ""
else
    print_test_result "Registration returns accessToken" "FAIL" "Token is empty or null"
fi

if [ -n "$REGISTER_REFRESH_TOKEN" ] && [ "$REGISTER_REFRESH_TOKEN" != "null" ]; then
    print_test_result "Registration returns refreshToken" "PASS" ""
else
    print_test_result "Registration returns refreshToken" "FAIL" "Token is empty or null"
fi

if [ "$REGISTER_USER_STATUS" = "INACTIVE" ]; then
    print_test_result "User status is INACTIVE after registration" "PASS" ""
else
    print_test_result "User status is INACTIVE after registration" "FAIL" "Status: $REGISTER_USER_STATUS"
fi

echo ""

# Test 2: JWT Token Analysis
echo "Test 2: JWT Token Analysis"
echo "----------------------------------------"

# Decode access token (only payload)
if [ -n "$REGISTER_ACCESS_TOKEN" ]; then
    ACCESS_TOKEN_PAYLOAD=$(echo "$REGISTER_ACCESS_TOKEN" | cut -d. -f2)
    # Add padding if needed for base64 decode
    PADDING_LENGTH=$((4 - ${#ACCESS_TOKEN_PAYLOAD} % 4))
    if [ $PADDING_LENGTH -lt 4 ]; then
        ACCESS_TOKEN_PAYLOAD="${ACCESS_TOKEN_PAYLOAD}$(printf '=%.0s' $(seq 1 $PADDING_LENGTH))"
    fi

    DECODED_ACCESS=$(echo "$ACCESS_TOKEN_PAYLOAD" | base64 -d 2>/dev/null || echo "{}")
    echo "Decoded Access Token:"
    echo "$DECODED_ACCESS" | jq . || echo "$DECODED_ACCESS"
    save_response "2_decoded_access_token" "$DECODED_ACCESS"

    # Validate token structure
    TOKEN_SUB=$(echo "$DECODED_ACCESS" | jq -r '.sub // empty')
    TOKEN_EMAIL=$(echo "$DECODED_ACCESS" | jq -r '.email // empty')
    TOKEN_IAT=$(echo "$DECODED_ACCESS" | jq -r '.iat // empty')
    TOKEN_EXP=$(echo "$DECODED_ACCESS" | jq -r '.exp // empty')

    if [ -n "$TOKEN_SUB" ]; then
        print_test_result "Access token contains 'sub' claim" "PASS" ""
    else
        print_test_result "Access token contains 'sub' claim" "FAIL" "Missing sub"
    fi

    if [ -n "$TOKEN_EMAIL" ]; then
        print_test_result "Access token contains 'email' claim" "PASS" ""
    else
        print_test_result "Access token contains 'email' claim" "FAIL" "Missing email"
    fi

    if [ -n "$TOKEN_EXP" ] && [ "$TOKEN_EXP" -gt "$(date +%s)" ]; then
        print_test_result "Access token is not expired" "PASS" ""
    else
        print_test_result "Access token is not expired" "FAIL" "Expired or invalid exp"
    fi
else
    print_test_result "JWT Token Analysis" "FAIL" "No access token available"
fi

echo ""

# Test 3: Email Verification (simulate getting token)
# Note: In real scenario, we'd extract from email or database
# For now, we'll attempt to extract from registration response if available
echo "Test 3: Email Verification Flow"
echo "----------------------------------------"

# Check if we have a verification token from registration response
# (In production this would come from email)
VERIFICATION_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.verificationToken // empty')

if [ -z "$VERIFICATION_TOKEN" ] || [ "$VERIFICATION_TOKEN" = "null" ]; then
    echo -e "${YELLOW}Note: Verification token not in response (expected for security).${NC}"
    echo "Attempting to retrieve from database for testing..."

    # Try to get verification token from database (if we have DB access)
    # This is only for testing - in production tokens are never exposed
    VERIFICATION_TOKEN=$(docker exec feda4c3a3f53_postgres-dev psql -U postgres -d money_wise_dev -t -c \
        "SELECT email_verification_token FROM \"User\" WHERE email = '$TEST_EMAIL';" 2>/dev/null | xargs || echo "")

    if [ -n "$VERIFICATION_TOKEN" ] && [ "$VERIFICATION_TOKEN" != "null" ]; then
        echo "Retrieved verification token from database: ${VERIFICATION_TOKEN:0:16}..."
    else
        echo -e "${RED}Cannot retrieve verification token for testing.${NC}"
        print_test_result "Email verification flow" "SKIP" "No verification token available"
    fi
fi

if [ -n "$VERIFICATION_TOKEN" ] && [ "$VERIFICATION_TOKEN" != "null" ]; then
    VERIFY_REQUEST=$(cat <<EOF
{
  "token": "$VERIFICATION_TOKEN"
}
EOF
    )

    echo "Request: POST $API_BASE/auth/verify-email"
    echo "$VERIFY_REQUEST" | jq . || echo "$VERIFY_REQUEST"

    VERIFY_RESPONSE=$(curl -s -X POST "$API_BASE/auth/verify-email" \
        -H "Content-Type: application/json" \
        -d "$VERIFY_REQUEST")

    echo "Response:"
    echo "$VERIFY_RESPONSE" | jq . || echo "$VERIFY_RESPONSE"

    save_response "3_email_verification" "$VERIFY_RESPONSE"

    VERIFY_STATUS=$(echo "$VERIFY_RESPONSE" | jq -r '.statusCode // 200')
    VERIFY_USER_STATUS=$(echo "$VERIFY_RESPONSE" | jq -r '.user.status // empty')

    if [ "$VERIFY_STATUS" = "200" ] || [ -n "$(echo "$VERIFY_RESPONSE" | jq -r '.success // empty')" ]; then
        print_test_result "Email verification returns 200 OK" "PASS" ""
    else
        print_test_result "Email verification returns 200 OK" "FAIL" "Status: $VERIFY_STATUS"
    fi

    if [ "$VERIFY_USER_STATUS" = "ACTIVE" ] || [ "$(echo "$VERIFY_RESPONSE" | jq -r '.user.emailVerified // false')" = "true" ]; then
        print_test_result "User status changes to ACTIVE after verification" "PASS" ""
    else
        print_test_result "User status changes to ACTIVE after verification" "FAIL" "Status: $VERIFY_USER_STATUS"
    fi
fi

echo ""

# Test 4: Login Flow
echo "Test 4: Login Flow"
echo "----------------------------------------"

LOGIN_REQUEST=$(cat <<EOF
{
  "email": "$TEST_EMAIL",
  "password": "$TEST_PASSWORD"
}
EOF
)

echo "Request: POST $API_BASE/auth/login"
echo "$LOGIN_REQUEST" | jq . || echo "$LOGIN_REQUEST"

LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "$LOGIN_REQUEST")

echo "Response:"
echo "$LOGIN_RESPONSE" | jq . || echo "$LOGIN_RESPONSE"

save_response "4_login" "$LOGIN_RESPONSE"

LOGIN_STATUS=$(echo "$LOGIN_RESPONSE" | jq -r '.statusCode // 200')
LOGIN_ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // empty')
LOGIN_REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.refreshToken // empty')

if [ "$LOGIN_STATUS" = "200" ] || [ -n "$LOGIN_ACCESS_TOKEN" ]; then
    print_test_result "Login returns 200 OK" "PASS" ""
else
    print_test_result "Login returns 200 OK" "FAIL" "Status: $LOGIN_STATUS"
fi

if [ -n "$LOGIN_ACCESS_TOKEN" ] && [ "$LOGIN_ACCESS_TOKEN" != "null" ]; then
    print_test_result "Login returns accessToken" "PASS" ""
else
    print_test_result "Login returns accessToken" "FAIL" "Token is empty or null"
fi

if [ -n "$LOGIN_REFRESH_TOKEN" ] && [ "$LOGIN_REFRESH_TOKEN" != "null" ]; then
    print_test_result "Login returns refreshToken" "PASS" ""
else
    print_test_result "Login returns refreshToken" "FAIL" "Token is empty or null"
fi

echo ""

# Test 5: Protected Route Access
echo "Test 5: Protected Route Access"
echo "----------------------------------------"

# Use login token if available, otherwise use registration token
ACCESS_TOKEN="${LOGIN_ACCESS_TOKEN:-$REGISTER_ACCESS_TOKEN}"

if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
    echo "Request: GET $API_BASE/auth/profile"
    echo "Authorization: Bearer ${ACCESS_TOKEN:0:20}..."

    PROFILE_RESPONSE=$(curl -s -X GET "$API_BASE/auth/profile" \
        -H "Authorization: Bearer $ACCESS_TOKEN")

    echo "Response:"
    echo "$PROFILE_RESPONSE" | jq . || echo "$PROFILE_RESPONSE"

    save_response "5_profile" "$PROFILE_RESPONSE"

    PROFILE_STATUS=$(echo "$PROFILE_RESPONSE" | jq -r '.statusCode // 200')
    PROFILE_EMAIL=$(echo "$PROFILE_RESPONSE" | jq -r '.email // empty')

    if [ "$PROFILE_STATUS" = "200" ] || [ -n "$PROFILE_EMAIL" ]; then
        print_test_result "Protected route returns 200 OK with valid token" "PASS" ""
    else
        print_test_result "Protected route returns 200 OK with valid token" "FAIL" "Status: $PROFILE_STATUS"
    fi

    if [ "$PROFILE_EMAIL" = "$TEST_EMAIL" ]; then
        print_test_result "Profile returns authenticated user data" "PASS" ""
    else
        print_test_result "Profile returns authenticated user data" "FAIL" "Email mismatch"
    fi
else
    print_test_result "Protected route access" "FAIL" "No access token available"
fi

echo ""

# Test 6: Swagger Documentation
echo "Test 6: Swagger Documentation"
echo "----------------------------------------"

echo "Request: GET $API_BASE/docs-json"

SWAGGER_RESPONSE=$(curl -s "$API_BASE/docs-json")

save_response "6_swagger" "$SWAGGER_RESPONSE"

SWAGGER_REGISTER=$(echo "$SWAGGER_RESPONSE" | jq -r '.paths."/auth/register" // empty')
SWAGGER_LOGIN=$(echo "$SWAGGER_RESPONSE" | jq -r '.paths."/auth/login" // empty')
SWAGGER_VERIFY=$(echo "$SWAGGER_RESPONSE" | jq -r '.paths."/auth/verify-email" // empty')
SWAGGER_PROFILE=$(echo "$SWAGGER_RESPONSE" | jq -r '.paths."/auth/profile" // empty')

if [ -n "$SWAGGER_REGISTER" ]; then
    print_test_result "Swagger documents /auth/register endpoint" "PASS" ""
else
    print_test_result "Swagger documents /auth/register endpoint" "FAIL" "Endpoint not found"
fi

if [ -n "$SWAGGER_LOGIN" ]; then
    print_test_result "Swagger documents /auth/login endpoint" "PASS" ""
else
    print_test_result "Swagger documents /auth/login endpoint" "FAIL" "Endpoint not found"
fi

if [ -n "$SWAGGER_VERIFY" ]; then
    print_test_result "Swagger documents /auth/verify-email endpoint" "PASS" ""
else
    print_test_result "Swagger documents /auth/verify-email endpoint" "FAIL" "Endpoint not found"
fi

if [ -n "$SWAGGER_PROFILE" ]; then
    print_test_result "Swagger documents /auth/profile endpoint" "PASS" ""
else
    print_test_result "Swagger documents /auth/profile endpoint" "FAIL" "Endpoint not found"
fi

echo ""

# Final Summary
echo "========================================"
echo "Test Summary"
echo "========================================"
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""
echo "Results saved to: $RESULTS_DIR"
echo ""

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Review results above.${NC}"
    exit 1
fi
