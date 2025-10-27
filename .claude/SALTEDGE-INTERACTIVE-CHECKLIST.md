# SaltEdge Interactive Setup Checklist

**Date Started**: [YYYY-MM-DD]
**Status**: 🟡 IN PROGRESS
**Goal**: Get API credentials configured and test first API call

---

## Phase 1: Security Setup - RSA Key Generation

**Duration**: ~5 minutes | **Difficulty**: ⭐ Easy

### ✅ Step 1.1: Generate RSA Private Key

**What**: Create your secret key that stays on your server

**Your Task**:
```bash
# Run this command from your project root
mkdir -p apps/backend/.secrets
cd apps/backend/.secrets
openssl genrsa -out private.pem 2048
```

**Expected Output**:
```
Generating RSA private key, 2048 bit long modulus (2 primes)
...............................+
+++
e is 65537 (0x10001)
```

**Verification** ✓
- [ ] File exists: `ls -la private.pem` shows file size ~1700 bytes
- [ ] File readable: `head -1 private.pem` shows `-----BEGIN RSA PRIVATE KEY-----`

**Status**: ⬜ PENDING → [Run the command above] → ✅ COMPLETE

---

### ✅ Step 1.2: Extract Public Key

**What**: Generate the public key from your private key (you'll upload this to SaltEdge)

**Your Task**:
```bash
# Run from apps/backend/.secrets directory
openssl rsa -pubout -in private.pem -out public.pem
```

**Verification** ✓
- [ ] File exists: `ls -la public.pem` shows file size ~400 bytes
- [ ] Content valid: `head -1 public.pem` shows `-----BEGIN PUBLIC KEY-----`

**Copy This** (You'll need it soon):
```bash
cat public.pem
# Copy the ENTIRE output including -----BEGIN... and -----END... lines
```

**Status**: ⬜ PENDING → [Run the command above] → ✅ COMPLETE

---

### ✅ Step 1.3: Secure the Private Key

**What**: Make sure your private key can only be read by you

**Your Task**:
```bash
# From apps/backend/.secrets directory
chmod 600 private.pem

# Verify it worked
ls -la private.pem
# Should show: -rw------- (read/write for owner only)
```

**Add to .gitignore**:
```bash
# From project root
echo "apps/backend/.secrets/" >> .gitignore
echo "apps/backend/.env.local" >> .gitignore

# Verify
cat .gitignore | grep -E "secrets|env.local"
```

**Status**: ⬜ PENDING → [Run the commands above] → ✅ COMPLETE

---

## Phase 2: SaltEdge Console Configuration

**Duration**: ~10 minutes | **Difficulty**: ⭐⭐ Medium

### ✅ Step 2.1: Create API Key in SaltEdge Console

**What**: Register your application with SaltEdge and get your credentials

**Your Task**:
1. Go to: https://www.saltedge.com/clients/api_keys (you should be logged in)
2. Click: **"Create a new API key"** button
3. Fill the form:
   - **Name**: `MoneyWise MVP` (or similar)
   - **Signature Algorithm**: Select **RSA-SHA256** (IMPORTANT!)
   - **Public Key**: Paste the ENTIRE content from your `public.pem` file (including `-----BEGIN...` headers)

**Visual Guide**:
```
┌─────────────────────────────────────────┐
│ Create a new API key                    │
├─────────────────────────────────────────┤
│ Name:                  [ MoneyWise MVP ]│
│ Signature Algorithm:   [v RSA-SHA256   ]│
│ Public Key:                             │
│ ┌─────────────────────────────────────┐ │
│ │ -----BEGIN PUBLIC KEY-----          │ │
│ │ MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8... │ │
│ │ ...                                 │ │
│ │ -----END PUBLIC KEY-----            │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [CANCEL]                      [CREATE] │
└─────────────────────────────────────────┘
```

**Verification** ✓
- [ ] Form submitted without errors
- [ ] You see confirmation message

**Status**: ⬜ PENDING → [Complete in SaltEdge console] → ✅ COMPLETE

---

### ✅ Step 2.2: Copy Your Credentials

**What**: Save the credentials SaltEdge generates

**Important**: These are only shown ONCE! Copy immediately.

**What You'll See**:
```
✅ API Key Created Successfully!

Client ID: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
App ID:    xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Public Key Upload Status: ✅ Verified
```

**Your Task**: Copy these values to a **secure location** (password manager or temporary file)

```
Client ID:  [PASTE HERE: _______________________________]
App ID:     [PASTE HERE: _______________________________]
```

**Status**: ⬜ PENDING → [Copy credentials from SaltEdge] → ✅ COMPLETE

---

## Phase 3: Environment Configuration

**Duration**: ~10 minutes | **Difficulty**: ⭐ Easy

### ✅ Step 3.1: Create .env.local File

**What**: Store your SaltEdge credentials securely in your backend environment

**Your Task**:

1. Create file: `apps/backend/.env.local` (next to package.json)

2. **Paste this content** (replace bracketed values):

```bash
# ============================================================================
# SALTEDGE BANKING INTEGRATION
# ============================================================================

# SaltEdge API Credentials (from console)
SALTEDGE_CLIENT_ID=[Paste your Client ID here]
SALTEDGE_APP_ID=[Paste your App ID here]

# RSA Private Key Path (this file is in .secrets/)
SALTEDGE_PRIVATE_KEY_PATH=./apps/backend/.secrets/private.pem

# SaltEdge API Configuration
SALTEDGE_API_URL=https://api.saltedge.com/api/v5
SALTEDGE_REDIRECT_URI=http://localhost:3000/banking/callback

# Feature Flags
BANKING_INTEGRATION_ENABLED=true
BANKING_SYNC_ENABLED=true
BANKING_SYNC_INTERVAL=86400

# Your Application URL (change for different environments)
APP_URL=http://localhost:3000
```

3. **Fill in your actual values**:
   - `SALTEDGE_CLIENT_ID=` ← Paste from Step 2.2
   - `SALTEDGE_APP_ID=` ← Paste from Step 2.2

**Verification** ✓
```bash
# Check file was created
ls -la apps/backend/.env.local

# Check values are set (DO NOT show full content in prod)
grep SALTEDGE apps/backend/.env.local
# Should show your Client ID and App ID

# Check path exists
ls -la apps/backend/.secrets/private.pem
```

**Status**: ⬜ PENDING → [Create .env.local and fill values] → ✅ COMPLETE

---

### ✅ Step 3.2: Verify .gitignore

**What**: Make sure your secrets are never committed to Git

**Your Task**:
```bash
# Check if .env.local is in .gitignore
grep "\.env" .gitignore

# Check if .secrets/ is in .gitignore
grep "secrets" .gitignore
```

**Expected Output**:
```
apps/backend/.env.local
apps/backend/.secrets/
```

**If Missing**, add them:
```bash
echo "apps/backend/.env.local" >> .gitignore
echo "apps/backend/.secrets/" >> .gitignore
```

**Status**: ⬜ PENDING → [Verify or add to .gitignore] → ✅ COMPLETE

---

## Phase 4: Backend Configuration

**Duration**: ~5 minutes | **Difficulty**: ⭐ Easy

### ✅ Step 4.1: Verify Config File Exists

**What**: Check that the NestJS configuration module was created

**Your Task**:
```bash
# Check if config file exists
ls -la apps/backend/src/config/saltedge.config.ts

# Should show: file exists and is readable
```

**If File Missing**, it's already been created for you:
- Location: `apps/backend/src/config/saltedge.config.ts`
- Contains: NestJS ConfigService registration for SaltEdge
- Status: ✅ Pre-created

**Status**: ⬜ PENDING → [Verify file exists] → ✅ COMPLETE

---

## Phase 5: Testing Readiness

**Duration**: ~10 minutes | **Difficulty**: ⭐⭐ Medium

### ✅ Step 5.1: Check TypeScript Compilation

**What**: Make sure there are no type errors

**Your Task**:
```bash
cd apps/backend
pnpm exec tsc --noEmit 2>&1 | grep -E "error TS|banking"
```

**Expected Output**:
```
(no output = no errors!)
```

**If Errors Appear**, common fixes:
- Missing .env.local values → Fill them in (Step 3.1)
- Private key path wrong → Check path in .env.local
- Module imports → Ensure all files created

**Status**: ⬜ PENDING → [Run type check] → ✅ COMPLETE

---

### ✅ Step 5.2: Verify Environment Loading

**What**: Confirm .env.local is being read correctly

**Your Task**:
```bash
# From apps/backend directory
cd apps/backend

# Check environment variables are loaded
cat .env.local | head -20

# Look for your Client ID
grep SALTEDGE_CLIENT_ID .env.local
# Should output: SALTEDGE_CLIENT_ID=[your-id]
```

**Status**: ⬜ PENDING → [Verify environment file] → ✅ COMPLETE

---

## Phase 6: First API Test

**Duration**: ~10 minutes | **Difficulty**: ⭐⭐⭐ Medium

### ✅ Step 6.1: Start Backend Server

**What**: Launch the development server

**Your Task**:
```bash
# From project root
pnpm --filter @money-wise/backend dev
```

**Expected Output**:
```
[Nest] 12345   - 10/24/2025, 10:30:00 AM     LOG [NestFactory] Starting Nest application...
[Nest] 12345   - 10/24/2025, 10:30:01 AM     LOG [InstanceLoader] SaltedgeModule dependencies initialized
✅ Loaded SaltEdge private key from: [path]
[Nest] 12345   - 10/24/2025, 10:30:02 AM     LOG [NestApplication] Nest application successfully started
```

**Leave this running** in one terminal window

**Status**: ⬜ PENDING → [Server running] → ✅ COMPLETE

---

### ✅ Step 6.2: Test API Connectivity (in NEW terminal)

**What**: Make your first API call to verify everything works

**Your Task**:
```bash
# Open a new terminal window (keep backend running in other terminal)

# Test 1: Check if backend is running
curl http://localhost:3001/health

# Expected response:
# {"status":"ok"}

# Test 2: List available countries (no auth needed)
curl -X GET http://localhost:3001/api/banking/countries

# Expected response:
# [
#   {"code":"AT","name":"Austria"},
#   {"code":"IT","name":"Italy"},
#   ...
# ]
```

**Verification** ✓
- [ ] Backend server started without errors
- [ ] `/health` endpoint returns `{"status":"ok"}`
- [ ] `/api/banking/countries` returns list of countries

**Troubleshooting**:
- Port already in use? → Kill old processes: `lsof -ti:3001 | xargs kill -9`
- Private key error? → Check path in .env.local
- Not found error? → Ensure banking module imported in AppModule

**Status**: ⬜ PENDING → [Tests passing] → ✅ COMPLETE

---

## Phase 7: Sandbox Bank Testing

**Duration**: ~15 minutes | **Difficulty**: ⭐⭐⭐ Medium

### ✅ Step 7.1: List Available Italian Banks

**What**: Query SaltEdge to see available banks in sandbox

**Your Task**:
```bash
# Get list of Italian banks
curl -X GET "http://localhost:3001/api/banking/banks?country=IT"

# Expected response (sample):
# [
#   {
#     "code": "intesa_sanpaolo_it",
#     "name": "Intesa Sanpaolo",
#     "country": "IT",
#     "login_fields": ["username","password"]
#   },
#   {
#     "code": "unicredit_it",
#     "name": "UniCredit",
#     "country": "IT",
#     "login_fields": ["username","password"]
#   },
#   ...
# ]
```

**Note Italian Banks Found**:
- [ ] Intesa Sanpaolo
- [ ] UniCredit
- [ ] Fineco Bank
- [ ] Monte dei Paschi (MPS)

**Status**: ⬜ PENDING → [Banks listed] → ✅ COMPLETE

---

### ✅ Step 7.2: Create Test Connection

**What**: Initiate OAuth flow to test the full flow

**Your Task**:
```bash
# You'll need a JWT token (or we can mock it for testing)
# For now, let's get the OAuth redirect URL

curl -X POST http://localhost:3001/api/banking/initiate-link \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [YOUR_JWT_TOKEN]" \
  -d '{"provider":"SALTEDGE"}'

# Expected response:
# {
#   "redirectUrl": "https://saltedge.com/connect/...",
#   "connectionId": "uuid-here"
# }
```

**Next Steps**:
- Manually visit the `redirectUrl` in your browser
- You'll see bank selection screen in SaltEdge sandbox
- Select an Italian test bank
- Enter test credentials (provided in SaltEdge sandbox)
- Complete authorization

**Status**: ⬜ PENDING → [Connection created] → ✅ COMPLETE

---

## Troubleshooting Reference

### Issue: "Private key not found"

**Cause**: SALTEDGE_PRIVATE_KEY_PATH not correct
**Fix**:
```bash
# Check file exists
ls -la ./apps/backend/.secrets/private.pem

# Check path in .env.local
grep SALTEDGE_PRIVATE_KEY_PATH apps/backend/.env.local

# Should output: SALTEDGE_PRIVATE_KEY_PATH=./apps/backend/.secrets/private.pem
```

---

### Issue: "Client ID missing"

**Cause**: SALTEDGE_CLIENT_ID not set in .env.local
**Fix**:
```bash
# Verify it's set
grep SALTEDGE_CLIENT_ID apps/backend/.env.local

# If blank, edit file and add your Client ID from Step 2.2
```

---

### Issue: "Port 3001 already in use"

**Cause**: Another process using the port
**Fix**:
```bash
# Kill old process
lsof -ti:3001 | xargs kill -9

# Restart backend server
pnpm --filter @money-wise/backend dev
```

---

### Issue: "Cannot POST /api/banking/initiate-link"

**Cause**: Endpoint not implemented yet
**Fix**:
```bash
# This is expected! The endpoint needs to be built next.
# For now, we're testing the configuration only.
```

---

## Summary Checklist

**Phase 1: Security** (Steps 1.1-1.3)
- [ ] Private key generated: `apps/backend/.secrets/private.pem`
- [ ] Public key extracted: `apps/backend/.secrets/public.pem`
- [ ] Private key permissions: `chmod 600`
- [ ] .gitignore updated

**Phase 2: SaltEdge Console** (Steps 2.1-2.2)
- [ ] API key created in SaltEdge
- [ ] Signature algorithm: RSA-SHA256
- [ ] Public key uploaded
- [ ] Credentials copied (Client ID + App ID)

**Phase 3: Environment** (Steps 3.1-3.2)
- [ ] .env.local created
- [ ] SALTEDGE_CLIENT_ID filled
- [ ] SALTEDGE_APP_ID filled
- [ ] SALTEDGE_PRIVATE_KEY_PATH correct
- [ ] .gitignore verified

**Phase 4: Backend Config** (Step 4.1)
- [ ] saltedge.config.ts exists

**Phase 5: Testing** (Steps 5.1-5.2)
- [ ] TypeScript compilation passes
- [ ] Environment variables load correctly

**Phase 6: API Test** (Steps 6.1-6.2)
- [ ] Backend server starts
- [ ] /health endpoint responds
- [ ] /api/banking/countries returns data

**Phase 7: Sandbox** (Steps 7.1-7.2)
- [ ] Italian banks listed
- [ ] Can initiate OAuth flow

---

## Next Steps (After Configuration Complete)

Once all above checked ✅, we'll:

1. **Build API endpoints** (initiate-link, complete-link, sync)
2. **Test OAuth flow end-to-end** (frontend + backend)
3. **Verify Italian bank data** (Intesa, UniCredit, Fineco, MPS)
4. **Set up background sync** (scheduled account syncs)
5. **Frontend implementation** (bank selection UI)

---

**Status**: 🟡 IN PROGRESS
**Last Updated**: [Current Date]
**Next Step**: Start with Phase 1, Step 1.1

**Ready to begin? Reply with "START PHASE 1" when ready!**
