# MoneyWise Backend Dockerfile
# Multi-stage build following Milestone 1 requirements (TASK-001-021)

# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/*/package.json ./packages/*/

# Install pnpm and dependencies
RUN npm install -g pnpm@8
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm --filter @money-wise/backend build

# Production stage
FROM node:20-alpine AS runtime

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY apps/backend/package.json ./apps/backend/

# Install pnpm and production dependencies only
RUN npm install -g pnpm@8
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/package.json ./apps/backend/

# Copy necessary configuration files
COPY --chown=nestjs:nodejs apps/backend/.env.example ./apps/backend/.env

# Create directories for logs and uploads
RUN mkdir -p /app/logs /app/uploads && chown -R nestjs:nodejs /app/logs /app/uploads

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { host: 'localhost', port: 3000, path: '/health', timeout: 2000 }; \
    const req = http.request(options, (res) => { \
      if (res.statusCode === 200) process.exit(0); \
      else process.exit(1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.end();"

# Start the application
CMD ["node", "apps/backend/dist/main.js"]