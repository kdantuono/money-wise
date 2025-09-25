<!-- .claude/commands/security-audit.md -->
description: Comprehensive security audit with automated vulnerability detection and remediation

# Comprehensive Security Audit Workflow

Performs deep security analysis across entire monorepo with automated vulnerability detection, penetration testing, and compliance validation.

## Arguments
Audit scope: $ARGUMENTS
(e.g., "Full security audit", "OWASP Top 10 validation", "Pre-production security check")

## Phase 1: Security Baseline Assessment (Auto - <5 minutes)

```bash
# Establish security baseline
echo "Establishing security baseline..."

# 1. Dependency audit
pnpm audit --json > .claude/security/baseline-dependencies.json

# 2. Known vulnerability scan
pnpm outdated --json > .claude/security/outdated-packages.json

# 3. License compliance
pnpm run license-check --json > .claude/security/licenses.json

# 4. Secrets detection
git secrets --scan --recursive . > .claude/security/secrets-scan.txt 2>&1 || true

# 5. Code metrics
cloc . --json > .claude/security/code-metrics.json

# 6. Security headers check (if applicable)
curl -I https://staging.myapp.com | grep -i "security\|x-\|content-security" > .claude/security/headers-baseline.txt
```

**Security Audit Scope Determination:**
```yaml
audit_types:
  full_audit:
    - OWASP Top 10 validation
    - Dependency vulnerabilities
    - Code security scan
    - Infrastructure security
    - Penetration testing
    - Compliance validation
    
  quick_scan:
    - Dependency audit
    - High/Critical vulnerabilities only
    - Automated fixes applied
    
  pre_production:
    - OWASP validation
    - Security headers
    - Authentication/Authorization
    - Data encryption
    
  compliance_check:
    - GDPR compliance
    - SOC 2 requirements
    - PCI DSS (if applicable)
    - Industry-specific regulations
```

## Phase 2: OWASP Top 10 Validation (Auto)

**Invoke:** `security-specialist`

### A01:2021 - Broken Access Control
```bash
# Automated access control testing
test_access_control() {
  echo "Testing access control..."
  
  # 1. Test unauthenticated access to protected routes
  test_unauthenticated_access
  
  # 2. Test privilege escalation
  test_privilege_escalation
  
  # 3. Test IDOR vulnerabilities
  test_insecure_direct_object_reference
  
  # 4. Test CORS misconfiguration
  test_cors_policy
  
  # 5. Test JWT token validation
  test_jwt_security
}

test_unauthenticated_access() {
  # Test all API endpoints without auth
  local protected_routes=$(extract_protected_routes)
  
  for route in $protected_routes; do
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$route")
    
    if [ "$response" != "401" ] && [ "$response" != "403" ]; then
      echo "❌ VULNERABILITY: $route accessible without auth (HTTP $response)"
      log_vulnerability "A01" "high" "$route" "No authentication required"
    fi
  done
}

test_privilege_escalation() {
  # Test accessing admin routes with regular user token
  local user_token=$(get_test_user_token)
  local admin_routes=$(extract_admin_routes)
  
  for route in $admin_routes; do
    local response=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $user_token" "$route")
    
    if [ "$response" = "200" ]; then
      echo "❌ VULNERABILITY: Privilege escalation possible on $route"
      log_vulnerability "A01" "critical" "$route" "Insufficient authorization checks"
    fi
  done
}
```

### A02:2021 - Cryptographic Failures
```bash
test_cryptographic_failures() {
  echo "Testing cryptographic implementations..."
  
  # 1. Check for hardcoded secrets
  scan_for_hardcoded_secrets
  
  # 2. Validate encryption at rest
  test_data_encryption_at_rest
  
  # 3. Validate TLS configuration
  test_tls_configuration
  
  # 4. Check password hashing
  validate_password_hashing
  
  # 5. Test sensitive data in logs
  scan_logs_for_sensitive_data
}

scan_for_hardcoded_secrets() {
  # Use truffleHog or similar
  trufflehog git file://. --json > .claude/security/secrets-found.json
  
  local secrets_count=$(jq length .claude/security/secrets-found.json)
  
  if [ "$secrets_count" -gt 0 ]; then
    echo "❌ VULNERABILITY: $secrets_count hardcoded secrets found"
    log_vulnerability "A02" "critical" "Multiple files" "Hardcoded secrets detected"
  fi
}

validate_password_hashing() {
  # Check bcrypt usage and cost factor
  local bcrypt_usage=$(rg -i "bcrypt\.hash" --type ts --type js)
  local bcrypt_rounds=$(rg -i "bcrypt\.hash.*rounds?\s*:\s*(\d+)" --type ts --type js -o)
  
  if [ -z "$bcrypt_usage" ]; then
    echo "⚠️ WARNING: No bcrypt usage found. Verify password hashing."
  fi
  
  # Validate cost factor (should be 12+)
  if echo "$bcrypt_rounds" | grep -E "rounds?\s*:\s*([0-9]|1[01])\s*[,}]"; then
    echo "❌ VULNERABILITY: bcrypt rounds < 12"
    log_vulnerability "A02" "high" "Authentication" "Weak password hashing"
  fi
}
```

### A03:2021 - Injection
```bash
test_injection_vulnerabilities() {
  echo "Testing for injection vulnerabilities..."
  
  # 1. SQL Injection
  test_sql_injection
  
  # 2. NoSQL Injection
  test_nosql_injection
  
  # 3. Command Injection
  test_command_injection
  
  # 4. LDAP Injection
  test_ldap_injection
  
  # 5. XPath/XML Injection
  test_xpath_injection
}

test_sql_injection() {
  # Automated SQL injection testing
  local api_endpoints=$(extract_data_endpoints)
  
  local payloads=(
    "' OR '1'='1"
    "1' UNION SELECT NULL--"
    "'; DROP TABLE users--"
    "1' AND 1=1--"
  )
  
  for endpoint in $api_endpoints; do
    for payload in "${payloads[@]}"; do
      local response=$(curl -s -X POST "$endpoint" \
        -H "Content-Type: application/json" \
        -d "{\"input\":\"$payload\"}")
      
      # Check for SQL error messages
      if echo "$response" | grep -iE "sql|syntax|mysql|postgres|oracle"; then
        echo "❌ VULNERABILITY: SQL Injection possible on $endpoint"
        log_vulnerability "A03" "critical" "$endpoint" "SQL Injection detected"
        break
      fi
    done
  done
}

test_command_injection() {
  # Test for OS command injection
  local payloads=(
    "; ls -la"
    "| whoami"
    "\$(id)"
    "\`cat /etc/passwd\`"
  )
  
  local user_input_endpoints=$(extract_file_processing_endpoints)
  
  for endpoint in $user_input_endpoints; do
    for payload in "${payloads[@]}"; do
      local response=$(curl -s -X POST "$endpoint" \
        -d "input=$payload")
      
      if echo "$response" | grep -E "root:|bin:|etc/passwd|uid="; then
        echo "❌ VULNERABILITY: Command Injection on $endpoint"
        log_vulnerability "A03" "critical" "$endpoint" "OS Command Injection"
        break
      fi
    done
  done
}
```

### A04:2021 - Insecure Design
```bash
test_insecure_design() {
  echo "Testing for insecure design patterns..."
  
  # 1. Rate limiting
  test_rate_limiting
  
  # 2. Account lockout
  test_account_lockout
  
  # 3. Multi-factor authentication
  test_mfa_implementation
  
  # 4. Session management
  test_session_management
}

test_rate_limiting() {
  # Test API rate limits
  local test_endpoint="/api/login"
  local requests=100
  local success_count=0
  
  for i in $(seq 1 $requests); do
    local status=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$test_endpoint" \
      -d '{"email":"test@example.com","password":"wrong"}')
    
    if [ "$status" = "200" ] || [ "$status" = "400" ]; then
      ((success_count++))
    fi
  done
  
  if [ "$success_count" -gt 50 ]; then
    echo "❌ VULNERABILITY: Insufficient rate limiting ($success_count/$requests succeeded)"
    log_vulnerability "A04" "high" "$test_endpoint" "No rate limiting"
  fi
}
```

### A05:2021 - Security Misconfiguration
```bash
test_security_misconfiguration() {
  echo "Testing for security misconfiguration..."
  
  # 1. Security headers
  test_security_headers
  
  # 2. Debug mode in production
  test_debug_mode
  
  # 3. Default credentials
  test_default_credentials
  
  # 4. Directory listing
  test_directory_listing
  
  # 5. Stack traces exposure
  test_stack_traces
}

test_security_headers() {
  local required_headers=(
    "Strict-Transport-Security"
    "Content-Security-Policy"
    "X-Content-Type-Options"
    "X-Frame-Options"
    "X-XSS-Protection"
  )
  
  local url="https://staging.myapp.com"
  local headers=$(curl -sI "$url")
  
  for header in "${required_headers[@]}"; do
    if ! echo "$headers" | grep -qi "$header"; then
      echo "❌ VULNERABILITY: Missing security header: $header"
      log_vulnerability "A05" "medium" "$url" "Missing $header header"
    fi
  done
}
```

### A06:2021 - Vulnerable and Outdated Components
```bash
test_vulnerable_components() {
  echo "Testing for vulnerable components..."
  
  # 1. NPM audit
  pnpm audit --json > .claude/security/npm-audit.json
  
  local critical=$(jq '.metadata.vulnerabilities.critical' .claude/security/npm-audit.json)
  local high=$(jq '.metadata.vulnerabilities.high' .claude/security/npm-audit.json)
  
  if [ "$critical" -gt 0 ] || [ "$high" -gt 0 ]; then
    echo "❌ VULNERABILITY: $critical critical, $high high severity vulnerabilities"
    log_vulnerability "A06" "critical" "Dependencies" "$critical critical vulnerabilities"
  fi
  
  # 2. Outdated packages
  local outdated=$(pnpm outdated --json | jq 'length')
  
  echo "ℹ️ $outdated packages are outdated"
  
  # 3. Check for known CVEs
  check_cve_database
}
```

### A07:2021 - Identification and Authentication Failures
```bash
test_authentication_failures() {
  echo "Testing authentication mechanisms..."
  
  # 1. Weak password policy
  test_password_policy
  
  # 2. Credential stuffing protection
  test_credential_stuffing
  
  # 3. Session fixation
  test_session_fixation
  
  # 4. JWT vulnerabilities
  test_jwt_vulnerabilities
}

test_jwt_vulnerabilities() {
  # Test JWT implementation
  local jwt_token=$(get_test_jwt_token)
  
  # Test 1: Algorithm confusion attack
  local modified_token=$(modify_jwt_algorithm "$jwt_token" "none")
  local response=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $modified_token" \
    https://staging.myapp.com/api/protected)
  
  if [ "$response" = "200" ]; then
    echo "❌ VULNERABILITY: JWT algorithm confusion attack possible"
    log_vulnerability "A07" "critical" "JWT" "Algorithm confusion vulnerability"
  fi
  
  # Test 2: JWT expiration
  local expired_token=$(get_expired_jwt_token)
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $expired_token" \
    https://staging.myapp.com/api/protected)
  
  if [ "$response" = "200" ]; then
    echo "❌ VULNERABILITY: Expired JWT tokens accepted"
    log_vulnerability "A07" "high" "JWT" "Token expiration not validated"
  fi
}
```

### A08:2021 - Software and Data Integrity Failures
```bash
test_integrity_failures() {
  echo "Testing software and data integrity..."
  
  # 1. Subresource Integrity (SRI)
  test_sri_implementation
  
  # 2. CI/CD pipeline security
  test_cicd_security
  
  # 3. Unsigned updates
  test_update_integrity
}
```

### A09:2021 - Security Logging and Monitoring Failures
```bash
test_logging_and_monitoring() {
  echo "Testing logging and monitoring..."
  
  # 1. Security event logging
  test_security_event_logging
  
  # 2. Log injection
  test_log_injection
  
  # 3. Sensitive data in logs
  test_sensitive_data_logging
}
```

### A10:2021 - Server-Side Request Forgery (SSRF)
```bash
test_ssrf() {
  echo "Testing for SSRF vulnerabilities..."
  
  # Test endpoints that accept URLs
  local url_endpoints=$(extract_url_accepting_endpoints)
  
  local ssrf_payloads=(
    "http://localhost:8080"
    "http://127.0.0.1:8080"
    "http://169.254.169.254/latest/meta-data/"  # AWS metadata
    "http://[::1]:8080"
    "http://internal-service.local"
  )
  
  for endpoint in $url_endpoints; do
    for payload in "${ssrf_payloads[@]}"; do
      local response=$(curl -s -X POST "$endpoint" \
        -H "Content-Type: application/json" \
        -d "{\"url\":\"$payload\"}")
      
      if echo "$response" | grep -iE "internal|localhost|private"; then
        echo "❌ VULNERABILITY: SSRF possible on $endpoint"
        log_vulnerability "A10" "high" "$endpoint" "SSRF vulnerability"
        break
      fi
    done
  done
}
```

## Phase 3: Automated Penetration Testing (Auto)

**Invoke:** `security-specialist`

```bash
# Run automated penetration tests
run_automated_pentest() {
  echo "Starting automated penetration testing..."
  
  # 1. OWASP ZAP automated scan
  docker run -t owasp/zap2docker-stable zap-baseline.py \
    -t https://staging.myapp.com \
    -J .claude/security/zap-report.json
  
  # 2. SQLMap for SQL injection
  sqlmap -u "https://staging.myapp.com/api/search?q=test" \
    --batch --risk=3 --level=5 \
    --output-dir=.claude/security/sqlmap
  
  # 3. Nikto web server scan
  nikto -h https://staging.myapp.com \
    -output .claude/security/nikto-report.txt
  
  # 4. Nmap port scan
  nmap -sV -p- staging.myapp.com \
    -oN .claude/security/nmap-scan.txt
}

run_automated_pentest
```

## Phase 4: Code Security Analysis (Auto)

**Invoke:** `security-specialist` + `backend-specialist`

```bash
# Static code analysis for security issues
run_security_code_analysis() {
  echo "Running security-focused code analysis..."
  
  # 1. Semgrep security rules
  semgrep --config=p/owasp-top-ten \
    --config=p/security-audit \
    --json --output=.claude/security/semgrep-results.json
  
  # 2. ESLint security plugins
  pnpm run lint -- \
    --plugin=security \
    --plugin=no-secrets \
    --format=json \
    --output-file=.claude/security/eslint-security.json
  
  # 3. SonarQube security analysis (if available)
  sonar-scanner \
    -Dsonar.projectKey=myapp \
    -Dsonar.sources=. \
    -Dsonar.host.url=http://localhost:9000
  
  # 4. Custom security patterns
  detect_custom_security_patterns
}

detect_custom_security_patterns() {
  # Search for common security anti-patterns
  
  # Dangerous functions
  rg "eval\(|exec\(|Function\(" --type ts --type js \
    > .claude/security/dangerous-functions.txt
  
  # Weak crypto
  rg "Math\.random|crypto\.createCipher|md5|sha1" --type ts --type js \
    > .claude/security/weak-crypto.txt
  
  # SQL concatenation
  rg "SELECT.*\+|INSERT.*\+|UPDATE.*\+|DELETE.*\+" --type ts --type js \
    > .claude/security/sql-concat.txt
}
```

## Phase 5: Infrastructure Security (Auto)

**Invoke:** `devops-specialist` + `security-specialist`

```bash
# Kubernetes/Infrastructure security scan
run_infrastructure_security() {
  echo "Scanning infrastructure security..."
  
  # 1. Kubernetes security scan (if applicable)
  if kubectl config current-context &>/dev/null; then
    # kubesec scan
    kubectl get deployments -o yaml | kubesec scan - \
      > .claude/security/kubesec-report.json
    
    # kube-bench CIS benchmark
    kube-bench run --json > .claude/security/kube-bench.json
    
    # Trivy container scan
    trivy image myapp:latest --format json \
      --output .claude/security/trivy-containers.json
  fi
  
  # 2. Terraform security scan (if applicable)
  if [ -d "terraform" ]; then
    tfsec terraform/ --format json \
      > .claude/security/tfsec-report.json
  fi
  
  # 3. Docker image security
  docker scan myapp:latest --json \
    > .claude/security/docker-scan.json
}
```

## Phase 6: Automated Remediation (Auto)

```bash
# Auto-fix security vulnerabilities where possible
auto_remediate_vulnerabilities() {
  echo "Attempting automatic remediation..."
  
  # 1. Update vulnerable dependencies
  pnpm audit fix --force
  
  # 2. Apply security patches
  apply_security_patches
  
  # 3. Fix code issues
  auto_fix_code_issues
  
  # 4. Update configurations
  update_security_configs
  
  # 5. Validate fixes
  validate_remediations
}

apply_security_patches() {
  # Update to secure versions
  while IFS= read -r vuln; do
    local package=$(echo "$vuln" | jq -r '.name')
    local version=$(echo "$vuln" | jq -r '.fixVersion')
    
    if [ "$version" != "null" ]; then
      echo "Updating $package to $version"
      pnpm update "$package@$version"
    fi
  done < <(jq -c '.vulnerabilities[]' .claude/security/npm-audit.json)
}

auto_fix_code_issues() {
  # Fix ESLint security issues
  pnpm run lint --fix --plugin=security
  
  # Fix Semgrep auto-fixable issues
  semgrep --config=p/security-audit --autofix
  
  # Remove hardcoded secrets
  remove_hardcoded_secrets
}

remove_hardcoded_secrets() {
  # Move secrets to environment variables
  while IFS= read -r secret; do
    local file=$(echo "$secret" | jq -r '.file')
    local value=$(echo "$secret" | jq -r '.match')
    
    # Replace with env var
    replace_with_env_var "$file" "$value"
  done < <(jq -c '.[]' .claude/security/secrets-found.json)
}
```

## Phase 7: Compliance Validation (Auto)

```bash
# Check regulatory compliance
validate_compliance() {
  echo "Validating regulatory compliance..."
  
  # GDPR Compliance
  check_gdpr_compliance
  
  # SOC 2 Requirements
  check_soc2_requirements
  
  # PCI DSS (if applicable)
  check_pci_dss
}

check_gdpr_compliance() {
  # 1. Data encryption
  verify_data_encryption
  
  # 2. Right to deletion
  verify_deletion_capability
  
  # 3. Data retention policies
  verify_retention_policies
  
  # 4. Consent management
  verify_consent_management
}
```

## Phase 8: Generate Security Report (Auto)

```bash
# Comprehensive security report generation
generate_security_report() {
  cat > .claude/security/SECURITY_AUDIT_REPORT.md <<EOF
# Security Audit Report: $ARGUMENTS

**Date**: $(date)
**Scope**: $AUDIT_SCOPE
**Auditor**: Automated Security Orchestrator

## Executive Summary

### Overall Security Posture: [Rating]

- **Critical Issues**: $CRITICAL_COUNT
- **High Issues**: $HIGH_COUNT
- **Medium Issues**: $MEDIUM_COUNT
- **Low Issues**: $LOW_COUNT
- **Auto-Remediated**: $FIXED_COUNT

## OWASP Top 10 Assessment

| Category | Status | Issues | Remediation |
|----------|--------|--------|-------------|
| A01 - Access Control | [Status] | [Count] | [Actions] |
| A02 - Cryptographic Failures | [Status] | [Count] | [Actions] |
| A03 - Injection | [Status] | [Count] | [Actions] |
| A04 - Insecure Design | [Status] | [Count] | [Actions] |
| A05 - Misconfiguration | [Status] | [Count] | [Actions] |
| A06 - Vulnerable Components | [Status] | [Count] | [Actions] |
| A07 - Auth Failures | [Status] | [Count] | [Actions] |
| A08 - Integrity Failures | [Status] | [Count] | [Actions] |
| A09 - Logging Failures | [Status] | [Count] | [Actions] |
| A10 - SSRF | [Status] | [Count] | [Actions] |

## Detailed Findings

### Critical Vulnerabilities
[List of critical issues with details]

### High Severity Issues
[List of high severity issues]

### Automated Remediations Applied
[List of auto-fixes applied]

### Manual Remediation Required
[List of issues requiring manual intervention]

## Compliance Status

- **GDPR**: [Compliant/Non-Compliant]
- **SOC 2**: [Compliant/Non-Compliant]
- **PCI DSS**: [Compliant/Non-Compliant]

## Recommendations

1. [Priority 1 recommendations]
2. [Priority 2 recommendations]
3. [Priority 3 recommendations]

## Next Steps

- [ ] Review and approve automated fixes
- [ ] Address critical vulnerabilities manually
- [ ] Schedule follow-up audit in 30 days
- [ ] Update security policies
EOF

  echo "✅ Security report generated: .claude/security/SECURITY_AUDIT_REPORT.md"
}
```

## Phase 9: Continuous Monitoring Setup (Auto)

```bash
# Set up ongoing security monitoring
setup_continuous_monitoring() {
  echo "Configuring continuous security monitoring..."
  
  # 1. Dependency monitoring (Dependabot/Renovate)
  configure_dependency_monitoring
  
  # 2. Security alerts (GitHub/GitLab Security)
  configure_security_alerts
  
  # 3. Automated scans (scheduled)
  configure_scheduled_scans
  
  # 4. Incident response automation
  configure_incident_response
}
```

## Success Report

```markdown
# Security Audit Complete

## Summary
- 🔍 Audit Type: $ARGUMENTS
- ⏱️ Duration: [time]
- 🔐 Issues Found: [total]
- ✅ Auto-Fixed: [count]

## Security Posture
- Overall Rating: [A/B/C/D/F]
- OWASP Compliance: [percentage]%
- Regulatory Compliance: [status]

## Next Audit: Scheduled in 30 days
```

---

**CRITICAL: This workflow performs comprehensive security assessment with automated remediation where possible. Critical vulnerabilities require immediate attention.**