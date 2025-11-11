# MoneyWise API Documentation

Complete guide to the MoneyWise Backend API with examples, authentication, and common patterns.

## 📍 Quick Links

- **Interactive API Docs:** http://localhost:3001/api/docs (Swagger UI)
- **Base URL:** `http://localhost:3001/api` (development)
- **API Version:** 0.1.0
- **Status Endpoint:** `GET /api/health`

---

## 🔐 Authentication

All endpoints (except auth endpoints) require authentication via **JWT Bearer Token**.

### 1. Register

Create a new user account.

**Endpoint:** `POST /api/auth/register`

**Rate Limit:** 5 requests per 15 minutes per IP

**Password Requirements:**
- Minimum 32 characters
- Must contain uppercase letters (A-Z)
- Must contain lowercase letters (a-z)
- Must contain numbers (0-9)
- Must contain special symbols (!@#$%^&*)

**Request Body:**
```json
{
  "email": "john.smith@example.com",
  "password": "SecurePassword123!@#$%^&*",
  "firstName": "John",
  "lastName": "Smith"
}
```

**Success Response (201 Created):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.smith@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "emailVerified": false,
    "createdAt": "2025-10-21T10:30:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid email or weak password
- `409 Conflict` - Email already registered
- `429 Too Many Requests` - Rate limit exceeded

**Example with cURL:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123!@#$%^&*",
    "firstName": "John",
    "lastName": "Smith"
  }'
```

---

### 2. Login

Authenticate user and receive tokens.

**Endpoint:** `POST /api/auth/login`

**Rate Limit:** 10 requests per 15 minutes per IP

**Account Lockout:** After 5 failed attempts, account is locked for 15 minutes

**Request Body:**
```json
{
  "email": "john.smith@example.com",
  "password": "SecurePassword123!@#$%^&*"
}
```

**Success Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john.smith@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "emailVerified": false
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid credentials
- `401 Unauthorized` - Account locked after failed attempts
- `429 Too Many Requests` - Rate limit exceeded

---

### 3. Refresh Token

Get a new access token using refresh token.

**Endpoint:** `POST /api/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** Same as login (new access and refresh tokens)

---

### 4. Get Current User Profile

Retrieve authenticated user's profile.

**Endpoint:** `GET /api/auth/profile`

**Authentication:** Required (Bearer token)

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john.smith@example.com",
  "firstName": "John",
  "lastName": "Smith",
  "emailVerified": false,
  "role": "ADMIN",
  "createdAt": "2025-10-21T10:30:00Z",
  "updatedAt": "2025-10-21T10:30:00Z"
}
```

**Example with cURL:**
```bash
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 📊 Using Tokens

### Access Token
- **Type:** JWT (JSON Web Token)
- **Lifetime:** 15 minutes
- **Usage:** Include in `Authorization: Bearer <token>` header
- **Expires:** Returns `401 Unauthorized` when expired

### Refresh Token
- **Type:** JWT
- **Lifetime:** 7 days
- **Usage:** Send to `/api/auth/refresh` to get new access token
- **When to use:** After access token expires

### Token Refresh Flow

```
1. User logs in → receive accessToken + refreshToken
2. Make API requests with accessToken
3. accessToken expires (401 Unauthorized)
4. POST /api/auth/refresh with refreshToken
5. Receive new accessToken + refreshToken
6. Continue with new accessToken
```

---

## 📝 Common Patterns

### Making Authenticated Requests

**JavaScript/TypeScript:**
```typescript
const response = await fetch('http://localhost:3001/api/auth/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();

if (response.status === 401) {
  // Token expired, refresh it
  const newTokens = await refreshToken(refreshToken);
  accessToken = newTokens.accessToken;
  refreshToken = newTokens.refreshToken;

  // Retry request
  return makeAuthenticatedRequest(endpoint, newTokens.accessToken);
}
```

**cURL:**
```bash
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json"
```

### Error Handling

All error responses follow this format:

```json
{
  "message": "Error description",
  "statusCode": 400,
  "timestamp": "2025-10-21T10:30:00Z",
  "path": "/api/endpoint"
}
```

**Common Status Codes:**
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

### Handling Rate Limits

**Response Header:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 2
X-RateLimit-Reset: 1634833800
```

**Handling in Code:**
```typescript
const response = await fetch(url, options);

if (response.status === 429) {
  const resetTime = parseInt(response.headers.get('X-RateLimit-Reset'));
  const waitTime = resetTime - Math.floor(Date.now() / 1000);
  console.log(`Rate limited. Wait ${waitTime} seconds before retrying.`);

  // Implement exponential backoff
  await new Promise(resolve =>
    setTimeout(resolve, (waitTime + 1) * 1000)
  );

  // Retry request
  return fetch(url, options);
}
```

---

## 🧪 Testing the API

### Using Demo Credentials

After seeding, use these demo accounts:

**Admin User:**
```
Email: john.smith@demo.moneywise.app
Password: demo123
```

**Member User:**
```
Email: emma.smith@demo.moneywise.app
Password: demo123
```

**Test Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.smith@demo.moneywise.app",
    "password": "demo123"
  }'
```

### Using Postman

1. Open Postman
2. Create new request: `POST http://localhost:3001/api/auth/login`
3. Select "Body" → "raw" → "JSON"
4. Paste:
```json
{
  "email": "john.smith@demo.moneywise.app",
  "password": "demo123"
}
```
5. Click Send
6. Copy `accessToken` from response
7. For authenticated requests:
   - Select "Authorization" tab
   - Type: "Bearer Token"
   - Token: paste the `accessToken`
   - Click Send

---

## 📚 API Endpoints Reference

### Authentication Endpoints
| Method | Endpoint | Public | Rate Limited |
|--------|----------|--------|--------------|
| POST | `/api/auth/register` | Yes | Yes (5/15min) |
| POST | `/api/auth/login` | Yes | Yes (10/15min) |
| POST | `/api/auth/refresh` | Yes | No |
| GET | `/api/auth/profile` | No | No |
| POST | `/api/auth/logout` | No | No |

### Health & Status
| Method | Endpoint | Public |
|--------|----------|--------|
| GET | `/api/health` | Yes |
| GET | `/api/health/db` | Yes |

---

## 🔗 Browser-Based API Explorer

Access the interactive API documentation:

**Swagger UI:** http://localhost:3001/api/docs

Features:
- View all endpoints and their documentation
- Test endpoints directly in browser
- See request/response examples
- Check status codes and error messages
- View security requirements

---

## 🚨 Security Best Practices

1. **Never commit tokens** to version control
2. **Always use HTTPS** in production (we use HTTP in development)
3. **Store tokens securely:**
   - Frontend: HttpOnly cookies or secure localStorage
   - Backend: Environment variables
4. **Rotate tokens** regularly
5. **Implement rate limiting** client-side to avoid hitting server limits
6. **Handle 401 responses** with automatic token refresh
7. **Validate email** before allowing sensitive operations
8. **Use strong passwords** (follow validation requirements)

---

## 🐛 Debugging API Calls

### Enable Detailed Logging

```bash
# Run backend with debug logs
DEBUG=moneywise:* npm run dev
```

### Check Request/Response in Browser

```javascript
// In browser console during API call
fetch('http://localhost:3001/api/health')
  .then(r => {
    console.log('Status:', r.status);
    console.log('Headers:', r.headers);
    return r.json();
  })
  .then(data => console.log('Response:', data))
  .catch(err => console.error('Error:', err));
```

### View Raw HTTP Traffic

Use browser DevTools Network tab:
1. Open DevTools (F12)
2. Go to "Network" tab
3. Make API call
4. Click on request to see details:
   - Headers (including Authorization)
   - Request body
   - Response
   - Timing information

---

## 📖 Additional Resources

- **Backend Code:** `apps/backend/src/`
- **API Controllers:** `apps/backend/src/auth/`
- **Security Services:** `apps/backend/src/core/`
- **Environment Setup:** `docs/development/ENVIRONMENT-SETUP.md`
- **Troubleshooting:** `docs/development/TROUBLESHOOTING.md`
- **Database Schema:** `apps/backend/prisma/schema.prisma`

---

**Last Updated:** October 21, 2025
**API Version:** 0.1.0
**Status:** Production Ready
