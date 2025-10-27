# SaltEdge Setup - Interactive Configuration Guide

**Status**: Ready for Interactive Session
**Target**: Get API keys configured and ready for first API call
**Duration**: ~30 minutes
**Prerequisites**: SaltEdge account created, OpenSSL available

---

## Part 1: Security Setup (RSA Key Generation)

### Step 1.1: Generate RSA Private Key

This creates your **secure private key** that never leaves your server.

```bash
# From your project root
mkdir -p apps/backend/.secrets
cd apps/backend/.secrets

# Generate 2048-bit RSA private key
openssl genrsa -out private.pem 2048
```

**What to expect:**
- File: `private.pem` (1700+ characters)
- Header: `-----BEGIN RSA PRIVATE KEY-----`
- Footer: `-----END RSA PRIVATE KEY-----`

**Verification:**
```bash
# Check file was created
ls -la private.pem

# Verify key format
head -1 private.pem  # Should show: -----BEGIN RSA PRIVATE KEY-----
```

---

### Step 1.2: Extract RSA Public Key

This extracts the **public key** that you'll upload to SaltEdge.

```bash
# From apps/backend/.secrets directory
openssl rsa -pubout -in private.pem -out public.pem
```

**What to expect:**
- File: `public.pem` (400+ characters)
- Header: `-----BEGIN PUBLIC KEY-----`
- Footer: `-----END PUBLIC KEY-----`

**Verification:**
```bash
# Check file was created
ls -la public.pem

# Display public key content (you'll need this)
cat public.pem
```

---

### Step 1.3: Secure Private Key Access

**CRITICAL SECURITY STEPS:**

```bash
# Restrict private key to your user only
chmod 600 private.pem

# Verify permissions (should show: -rw-------)
ls -la private.pem

# Add to .gitignore (NEVER commit to Git)
echo "apps/backend/.secrets/private.pem" >> .gitignore
echo "apps/backend/.secrets/public.pem" >> .gitignore

# Verify .gitignore updated
cat .gitignore | grep "secrets"
```

---

## Part 2: SaltEdge Console Configuration

### Step 2.1: Access API Key Creation

1. **Login to SaltEdge Dashboard**: https://www.saltedge.com/clients/api_keys
2. **Click**: "Create a new API key"
3. **Fill Form**:
   - **Name**: "MoneyWise MVP" (or your preferred name)
   - **Signature algorithm**: RSA-SHA256 (must match our backend)
   - **Public Key**: Copy entire content from `public.pem` file

**Important**:
- Do NOT include the `-----BEGIN PUBLIC KEY-----` headers? Actually, DO include them - SaltEdge expects full PEM format
- Paste the ENTIRE file including header/footer

---

### Step 2.2: Retrieve API Credentials

After creating the key, SaltEdge displays:

```
Client ID: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
App ID: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
(Public Key: already stored)
```

**ACTION REQUIRED**: Copy these values - they're only shown once!

---

## Part 3: Environment Configuration

### Step 3.1: Create Backend Environment Variables

Edit: `apps/backend/.env.local` (create if doesn't exist)

```bash
# ============================================================================
# SALTEDGE BANKING INTEGRATION
# ============================================================================

# SaltEdge API Configuration
SALTEDGE_CLIENT_ID=paste_your_client_id_here
SALTEDGE_APP_ID=paste_your_app_id_here
SALTEDGE_SECRET=N/A  # Note: We use RSA public key in public.pem instead
SALTEDGE_API_URL=https://api.saltedge.com/api/v5
SALTEDGE_PRIVATE_KEY_PATH=./apps/backend/.secrets/private.pem

# Feature Flags
BANKING_INTEGRATION_ENABLED=true
BANKING_SYNC_ENABLED=true
BANKING_SYNC_INTERVAL=86400

# OAuth Callback (change based on environment)
APP_URL=http://localhost:3000
SALTEDGE_REDIRECT_URI=http://localhost:3000/banking/callback
```

**Verification:**
```bash
# Check .env.local was created
ls -la apps/backend/.env.local

# Verify values are set (without showing secrets)
grep SALTEDGE apps/backend/.env.local
```

---

### Step 3.2: Add to .gitignore

```bash
# Ensure .env.local is never committed
echo "apps/backend/.env.local" >> .gitignore

# Verify
cat .gitignore | grep "\.env"
```

---

## Part 4: Backend Configuration Integration

### Step 4.1: Update NestJS Configuration Service

The ConfigService needs to load the private key for request signing.

**File**: `apps/backend/src/config/saltedge.config.ts` (CREATE THIS FILE)

```typescript
import { registerAs } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export const saltEdgeConfig = registerAs('saltedge', () => ({
  clientId: process.env.SALTEDGE_CLIENT_ID,
  appId: process.env.SALTEDGE_APP_ID,
  apiUrl: process.env.SALTEDGE_API_URL || 'https://api.saltedge.com/api/v5',
  privateKeyPath: process.env.SALTEDGE_PRIVATE_KEY_PATH,
  privateKey: loadPrivateKey(process.env.SALTEDGE_PRIVATE_KEY_PATH),
  redirectUri: process.env.SALTEDGE_REDIRECT_URI,
  enabled: process.env.BANKING_INTEGRATION_ENABLED === 'true',
}));

function loadPrivateKey(keyPath?: string): string | null {
  if (!keyPath) return null;
  try {
    return fs.readFileSync(keyPath, 'utf8');
  } catch (error) {
    console.warn(`Failed to load private key from ${keyPath}:`, error.message);
    return null;
  }
}
```

---

## Part 5: Testing Readiness

### Step 5.1: Verify Environment Loading

```bash
# From project root
cd apps/backend

# Check that .env.local is readable
cat .env.local | grep SALTEDGE_CLIENT_ID

# Run type check to ensure no import errors
pnpm exec tsc --noEmit
```

### Step 5.2: Validate Configuration

Create test script: `apps/backend/scripts/test-saltedge-config.ts`

```typescript
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment
dotenv.config({ path: '.env.local' });

console.log('=== SaltEdge Configuration Check ===\n');

// Check required variables
const required = [
  'SALTEDGE_CLIENT_ID',
  'SALTEDGE_APP_ID',
  'SALTEDGE_API_URL',
  'APP_URL',
];

let allValid = true;

for (const key of required) {
  const value = process.env[key];
  if (value) {
    console.log(`✅ ${key}: ${value.substring(0, 20)}...`);
  } else {
    console.error(`❌ ${key}: NOT SET`);
    allValid = false;
  }
}

// Check private key file
const keyPath = process.env.SALTEDGE_PRIVATE_KEY_PATH;
if (keyPath && fs.existsSync(keyPath)) {
  const keyContent = fs.readFileSync(keyPath, 'utf8');
  if (keyContent.includes('BEGIN RSA PRIVATE KEY')) {
    console.log(`✅ Private key file exists and valid`);
  } else {
    console.error(`❌ Private key file invalid format`);
    allValid = false;
  }
} else {
  console.error(`❌ Private key file not found: ${keyPath}`);
  allValid = false;
}

console.log(`\n${allValid ? '✅ All checks passed!' : '❌ Configuration incomplete'}`);
process.exit(allValid ? 0 : 1);
```

---

## Part 6: First API Call Test

### Step 6.1: Simple Connectivity Test

Once environment is configured, we'll run:

```bash
# From project root
pnpm --filter @money-wise/backend dev

# In another terminal
curl -X GET http://localhost:3001/api/banking/health \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Expected response if everything configured:
```json
{
  "status": "ok",
  "saltedgeConnected": true,
  "timestamp": "2025-10-24T..."
}
```

---

## Part 7: Troubleshooting Checklist

### Issue: "Private key not found"
- **Check**: `ls -la apps/backend/.secrets/private.pem` exists
- **Check**: Path in `.env.local` matches actual location
- **Check**: File permissions allow reading: `chmod 644 private.pem`

### Issue: "Invalid Client ID"
- **Check**: Client ID copied correctly from SaltEdge dashboard (no extra spaces)
- **Check**: .env.local loaded correctly: `grep SALTEDGE_CLIENT_ID apps/backend/.env.local`

### Issue: "Public key mismatch"
- **Check**: Public key uploaded to SaltEdge dashboard matches your current `public.pem`
- **Check**: If regenerated keys, must upload NEW public key to SaltEdge

### Issue: "RSA signature invalid"
- **Check**: Private key file not corrupted
- **Check**: Signature algorithm in SaltEdge: RSA-SHA256 (not RSA-SHA1)
- **Check**: Private key in `.secrets/` folder

---

## Security Checklist

- [ ] Private key file: `chmod 600` (read-only by owner)
- [ ] `.env.local` added to `.gitignore`
- [ ] `.secrets/` directory added to `.gitignore`
- [ ] No secrets printed in logs
- [ ] Public key verified in SaltEdge dashboard
- [ ] Multiple API keys for different environments (dev, staging, prod)
- [ ] Key rotation plan if compromised

---

## Files Checklist

After completing all steps:

```
apps/backend/
├── .env.local                    ← Created with SALTEDGE_* vars
├── .secrets/
│   ├── private.pem              ← NEVER commit
│   └── public.pem               ← Uploaded to SaltEdge
├── src/
│   ├── banking/
│   │   ├── banking.module.ts    ✅ Already implemented
│   │   ├── providers/
│   │   │   └── saltedge.provider.ts ✅ Already implemented
│   │   └── services/
│   │       └── banking.service.ts ✅ Already implemented
│   └── config/
│       └── saltedge.config.ts   ← Create this
└── .gitignore                   ← Updated with secrets

.gitignore
├── apps/backend/.env.local      ✅ Added
├── apps/backend/.secrets/       ✅ Added
└── public.pem                   ✅ Added
```

---

## Next: Interactive Session Flow

Once you complete **Part 1-3**, we'll:

1. **Verify your credentials** ✅
2. **Test key loading** ✅
3. **Run first API call** ✅
4. **List available banks** ✅
5. **Create test connection** ✅
6. **Complete OAuth flow** ✅
7. **Fetch sample accounts** ✅
8. **Verify Italian bank data** ✅

**Ready to begin? Start with Part 1: RSA Key Generation**

---

**Document Version**: 1.0
**Last Updated**: Oct 24, 2025
**Status**: Ready for Interactive Setup
