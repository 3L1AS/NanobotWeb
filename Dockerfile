FROM node:18-alpine AS base

FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# The container will mount ~/.nanobot from host to /root/.nanobot so we must make sure the app can access it.
# Usually Node runs as nextjs user, but if we mount a folder owned by root on the host, we might have permission issues.
# For simplicity in this local deployment, we run as root.
USER root

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# We need the user to map their home dir to ~ inside the container so the app can read ~/.nanobot
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
