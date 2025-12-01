# MoneyWise Frontend Dockerfile
# Multi-stage build for Next.js with standalone output
# Fixes E2E timeout issue by building during image creation, not container startup

# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@8

# Copy all package files and workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/utils/package.json ./packages/utils/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build arg for NEXT_PUBLIC_* variables (baked at build time)
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Copy source code
COPY . .

# Build the application with standalone output
# This creates .next/standalone with bundled server
RUN pnpm --filter @money-wise/web build

# Runtime stage - use standalone output
FROM node:20-alpine AS runtime

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Install wget for healthcheck
# hadolint ignore=DL3018
RUN apk add --no-cache wget

# Set working directory
WORKDIR /app

# Copy standalone output from builder
# The standalone directory contains the bundled server with all dependencies
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
# Copy static files (CSS, JS, images)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
# Copy public files (favicon, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Environment variables for runtime
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production

# Health check - fast interval for E2E tests
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=10 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Start the standalone server
# The server.js is at apps/web/server.js in the standalone output
CMD ["node", "apps/web/server.js"]
