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

# Install docker CLI for container operations (minimal footprint)
RUN apk add --no-cache docker-cli

# Create a dedicated user and group for the application
# Also create docker group with a common GID (can be overridden via build arg)
ARG DOCKER_GID=999
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    (addgroup -g ${DOCKER_GID} docker || addgroup docker) && \
    addgroup nextjs docker

# Copy built application with proper ownership
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
# The nextjs user is now part of the docker group and can access the socket
USER nextjs

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Security: Expose only the necessary port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/status', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); });"

CMD ["node", "server.js"]
