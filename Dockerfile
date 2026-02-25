FROM node:20-alpine AS base

FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Create a dedicated user and group for the application
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install docker CLI for container operations (minimal footprint)
RUN apk add --no-cache docker-cli

# Copy built application with proper ownership
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
# NOTE: The docker socket and .nanobot directory must be accessible to this user
# Add nextjs user to docker group (GID typically 999 on host, may need adjustment)
USER nextjs

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Security: Expose only the necessary port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/status', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); });"

CMD ["node", "server.js"]
