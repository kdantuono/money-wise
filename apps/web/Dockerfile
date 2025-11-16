# MoneyWise Frontend Dockerfile
# Multi-stage build following Milestone 1 requirements (TASK-001-022)

# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/*/package.json ./packages/*/

# Install pnpm and dependencies
RUN npm install -g pnpm@8
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm --filter @money-wise/web build

# Production stage with Nginx
FROM nginx:alpine AS runtime

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Create non-root user for security
RUN addgroup -g 1001 -S nginx-users
RUN adduser -S nextjs -u 1001 -G nginx-users

# Set proper permissions
RUN chown -R nextjs:nginx-users /usr/share/nginx/html
RUN chown -R nextjs:nginx-users /var/cache/nginx
RUN chown -R nextjs:nginx-users /var/log/nginx
RUN chown -R nextjs:nginx-users /etc/nginx/conf.d
RUN touch /var/run/nginx.pid
RUN chown -R nextjs:nginx-users /var/run/nginx.pid

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]