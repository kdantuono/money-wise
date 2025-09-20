# MoneyWise Setup Verification

## Quick Test Commands

### 1. Types Package

```bash
cd packages/types
npm install && npm run build
```

### 2. Backend API (Development)

```bash
cd apps/backend
npm install
# Copy environment file
cp .env.example .env
# Note: Requires PostgreSQL and Redis running
npm run start:dev
```

### 3. Web Dashboard

```bash
cd apps/web
npm install
npm run dev
```

### 4. Mobile App

```bash
cd apps/mobile
npm install
npm start
```

## Database Setup (Docker)

```bash
# PostgreSQL
docker run -d --name postgres \
  -p 5432:5432 \
  -e POSTGRES_DB=moneywise \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  postgres:15

# Redis
docker run -d --name redis \
  -p 6379:6379 \
  redis:7-alpine
```

## Full Docker Stack

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## API Testing

Once backend is running, test the API:

```bash
# Health check
curl http://localhost:3002/

# Register user
curl -X POST http://localhost:3002/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3002/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Frontend Access

- Web: http://localhost:3000
- API Docs: http://localhost:3002/api
- Mobile: Expo Go app + QR code

## Troubleshooting

1. **Database Connection**: Ensure PostgreSQL is running on port 5432
2. **Type Errors**: Build types package first: `cd packages/types && npm run build`
3. **Port Conflicts**: Check ports 3000, 3002, 5432, 6379 are available
4. **Environment**: Copy .env.example to .env in backend directory
