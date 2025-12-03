# MoneyWise Backend Dockerfile
# Multi-stage build for NestJS with Prisma support
# Fixes E2E timeout issue by building during image creation, not container startup

# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm (must match engines.pnpm in package.json)
RUN npm install -g pnpm@10

# Copy all package files and workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/utils/package.json ./packages/utils/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client and build the application
RUN pnpm --filter @money-wise/backend exec prisma generate && \
    pnpm --filter @money-wise/backend build

# Runtime stage
FROM node:20-alpine AS runtime

# Install wget for healthcheck
# hadolint ignore=DL3018
RUN apk add --no-cache wget

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/package.json ./apps/backend/

# Copy generated Prisma client (required at runtime)
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/generated ./apps/backend/generated

# Copy Prisma files for migrations
COPY --from=builder --chown=nestjs:nodejs /app/apps/backend/prisma ./apps/backend/prisma

# Copy node_modules with Prisma client
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3001

# Environment variables for runtime
ENV PORT=3001
ENV NODE_ENV=production

# Health check - fast interval for E2E tests
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=10 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

# Start the application
CMD ["node", "apps/backend/dist/main.js"]
