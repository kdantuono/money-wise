# SaltEdge Setup - Quick Reference Card

**Use this card during your interactive session with me (I'll guide you through each step)**

---

## Phase 1: Generate Security Keys (5 min)

```bash
# Step 1: Create private key
mkdir -p apps/backend/.secrets && cd apps/backend/.secrets
openssl genrsa -out private.pem 2048

# Step 2: Extract public key
openssl rsa -pubout -in private.pem -out public.pem

# Step 3: Secure it
cd ../..
chmod 600 apps/backend/.secrets/private.pem
echo "apps/backend/.secrets/" >> .gitignore
echo "apps/backend/.env.local" >> .gitignore

# Step 4: Copy public key (you'll paste this in SaltEdge)
cat apps/backend/.secrets/public.pem
```

---

## Phase 2: SaltEdge Console (10 min)

**Location**: https://www.saltedge.com/clients/api_keys

**Steps**:
1. Click **"Create a new API key"**
2. Fill:
   - Name: `MoneyWise MVP`
   - Algorithm: `RSA-SHA256` (IMPORTANT!)
   - Public Key: Paste entire `public.pem` content
3. **Copy immediately**:
   - `Client ID: ______________________________`
   - `App ID: ______________________________`

---

## Phase 3: Configure Backend (5 min)

**File**: `apps/backend/.env.local` (create if doesn't exist)

```bash
SALTEDGE_CLIENT_ID=[paste from SaltEdge]
SALTEDGE_APP_ID=[paste from SaltEdge]
SALTEDGE_PRIVATE_KEY_PATH=./apps/backend/.secrets/private.pem
SALTEDGE_API_URL=https://api.saltedge.com/api/v5
SALTEDGE_REDIRECT_URI=http://localhost:3000/banking/callback
BANKING_INTEGRATION_ENABLED=true
BANKING_SYNC_ENABLED=true
BANKING_SYNC_INTERVAL=86400
APP_URL=http://localhost:3000
```

---

## Phase 4: Verify Setup (5 min)

```bash
# Check everything
pnpm --filter @money-wise/backend exec tsc --noEmit

# Should show: NO ERRORS
```

---

## Phase 5: Test API (10 min)

**Terminal 1**:
```bash
pnpm --filter @money-wise/backend dev
# Wait for: "Nest application successfully started"
```

**Terminal 2**:
```bash
# Test 1: Basic health check
curl http://localhost:3001/health

# Test 2: List Italian banks
curl -X GET http://localhost:3001/api/banking/banks?country=IT
```

---

## Emergency Reference

| Problem | Fix |
|---------|-----|
| "Private key not found" | Check: `ls apps/backend/.secrets/private.pem` |
| "Client ID missing" | Fill in .env.local with values from Step 2 |
| "Port 3001 in use" | Kill: `lsof -ti:3001 \| xargs kill -9` |
| "Can't find .env" | Create: `apps/backend/.env.local` |
| "Type errors" | Check all .env variables are set |

---

## Success Criteria ✅

- [ ] private.pem exists and is chmod 600
- [ ] public.pem uploaded to SaltEdge
- [ ] Client ID and App ID saved
- [ ] .env.local created with values
- [ ] .gitignore updated
- [ ] Backend compiles without errors
- [ ] http://localhost:3001/health returns ok
- [ ] Italian banks endpoint returns data

---

## Your Progress

**Status**: [ ] Phase 1 → [ ] Phase 2 → [ ] Phase 3 → [ ] Phase 4 → [ ] Phase 5

**When done with all 5 phases, tell me: "SETUP COMPLETE - READY TO TEST API"**

---

## Commands Cheat Sheet

```bash
# Quick checks
ls apps/backend/.secrets/private.pem        # Private key exists?
cat apps/backend/.env.local                 # Config values set?
grep SALTEDGE .gitignore                    # Secrets ignored?
pnpm --filter @money-wise/backend exec tsc --noEmit  # Compiles?
curl http://localhost:3001/health           # Backend running?

# If something breaks
rm apps/backend/.env.local                  # Clear cache
pnpm install                                # Reinstall deps
lsof -ti:3001 | xargs kill -9              # Free port
pnpm --filter @money-wise/backend dev       # Restart server
```

---

**Ready? Message: "I'M READY TO START PHASE 1"**
