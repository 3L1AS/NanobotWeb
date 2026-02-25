# Traefik Integration Guide

This guide explains how to integrate NanobotWeb dashboard with Traefik reverse proxy for HTTPS/SSL termination.

## Quick Setup

### 1. Update docker-compose.yml

```yaml
version: '3.8'

services:
  nanobot-dashboard:
    container_name: nanobot-dashboard
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      - ~/.nanobot:/home/nextjs/.nanobot
      - /var/run/docker.sock:/var/run/docker.sock:ro
    # Remove port mapping - Traefik will handle it
    # ports:
    #   - "3000:3000"
    networks:
      - proxy  # Connect to Traefik network
      - default
    environment:
      - PORT=3000
      - DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}
      - NANOBOT_CONTAINER_NAME=nanobot-gateway
      - NANOBOT_DIR=/home/nextjs/.nanobot
      - NODE_ENV=production
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
      - /app/.next/cache
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
    restart: unless-stopped
    labels:
      # Enable Traefik
      - "traefik.enable=true"

      # HTTP router (redirects to HTTPS)
      - "traefik.http.routers.nanobot-http.rule=Host(`dashboard.yourdomain.com`)"
      - "traefik.http.routers.nanobot-http.entrypoints=web"
      - "traefik.http.routers.nanobot-http.middlewares=redirect-to-https"

      # HTTPS router
      - "traefik.http.routers.nanobot.rule=Host(`dashboard.yourdomain.com`)"
      - "traefik.http.routers.nanobot.entrypoints=websecure"
      - "traefik.http.routers.nanobot.tls=true"
      - "traefik.http.routers.nanobot.tls.certresolver=letsencrypt"

      # Service configuration
      - "traefik.http.services.nanobot.loadbalancer.server.port=3000"

      # Important: Forward headers for proper cookie handling
      - "traefik.http.middlewares.nanobot-headers.headers.customrequestheaders.X-Forwarded-Proto=https"
      - "traefik.http.routers.nanobot.middlewares=nanobot-headers"

      # Redirect middleware
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https"
      - "traefik.http.middlewares.redirect-to-https.redirectscheme.permanent=true"

networks:
  proxy:
    external: true
  default:
    driver: bridge
```

### 2. If Using IP Address Instead of Domain

If you want to access via IP address (like `https://82.25.97.15`), modify the labels:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.nanobot.rule=Host(`82.25.97.15`)"
  - "traefik.http.routers.nanobot.entrypoints=websecure"
  - "traefik.http.routers.nanobot.tls=true"
  - "traefik.http.services.nanobot.loadbalancer.server.port=3000"

  # Forward HTTPS protocol header
  - "traefik.http.middlewares.nanobot-headers.headers.customrequestheaders.X-Forwarded-Proto=https"
  - "traefik.http.routers.nanobot.middlewares=nanobot-headers"
```

**Note**: For IP-based access, you'll need to use a self-signed certificate or skip SSL verification.

### 3. Verify Traefik Network Exists

```bash
# Check if proxy network exists
docker network ls | grep proxy

# If not, create it
docker network create proxy
```

### 4. Deploy

```bash
# Stop current container
docker-compose down

# Update and rebuild
docker-compose up -d --build

# Check logs
docker-compose logs -f nanobot-dashboard
```

### 5. Access Dashboard

- HTTP (redirects to HTTPS): `http://dashboard.yourdomain.com`
- HTTPS: `https://dashboard.yourdomain.com`
- Or via IP: `https://82.25.97.15:443`

## Temporary HTTP-Only Setup (Current State)

If you want to keep using HTTP without Traefik SSL for now:

```yaml
services:
  nanobot-dashboard:
    # ... other config ...
    ports:
      - "3000:3000"  # Direct HTTP access
    # Don't add Traefik labels
```

Access via: `http://82.25.97.15:3000`

**Current fix applied**: Changed `sameSite: 'strict'` to `sameSite: 'lax'` to work with HTTP.

## Traefik Configuration (for reference)

If you need to update your Traefik configuration, here's a basic `traefik.yml`:

```yaml
# traefik.yml
entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@example.com
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: proxy

api:
  dashboard: true
  insecure: true  # Only for development
```

## Troubleshooting

### 1. Cookies Not Working

**Symptom**: Login appears to work but immediately redirects back to login.

**Causes**:
- `sameSite: 'strict'` with HTTP (fixed in latest version)
- Missing `X-Forwarded-Proto` header from Traefik
- Domain mismatch between cookie and request

**Solutions**:
```bash
# Check if headers are being forwarded
docker-compose logs nanobot-dashboard | grep "x-forwarded"

# Verify cookie settings in browser DevTools > Application > Cookies
# Should see: SameSite=Lax, HttpOnly=true
```

### 2. Traefik Not Routing Traffic

**Check Traefik logs**:
```bash
docker logs root-traefik-1 | grep nanobot
```

**Verify labels are applied**:
```bash
docker inspect nanobot-dashboard | grep -A 20 Labels
```

**Check Traefik dashboard**:
- Usually at `http://your-server:8080` or `https://traefik.yourdomain.com`
- Look for nanobot-dashboard in routers and services

### 3. SSL Certificate Issues

**For Let's Encrypt**:
```bash
# Check certificate status
docker exec root-traefik-1 cat /letsencrypt/acme.json

# Verify DNS is pointing to server
dig dashboard.yourdomain.com
```

**For Self-Signed Certificates** (IP access):
You'll need to accept the browser warning or add the certificate to your trusted store.

### 4. CORS/CSP Issues

If you see console errors about Content-Security-Policy:

The dashboard already sets proper CSP headers. If using Traefik, don't override these headers.

## Security Considerations

### With HTTPS (Recommended)

Once you have HTTPS working via Traefik, you can optionally upgrade to stricter settings:

**In `app/api/auth/login/route.ts`**, you could change:
```typescript
sameSite: 'strict'  // Stricter CSRF protection with HTTPS
```

But `'lax'` is still recommended and secure.

### Rate Limiting

Consider adding Traefik rate limiting:

```yaml
labels:
  # Rate limiting middleware
  - "traefik.http.middlewares.nanobot-ratelimit.ratelimit.average=100"
  - "traefik.http.middlewares.nanobot-ratelimit.ratelimit.burst=50"
  - "traefik.http.routers.nanobot.middlewares=nanobot-headers,nanobot-ratelimit"
```

### IP Whitelisting

Restrict access to specific IPs:

```yaml
labels:
  - "traefik.http.middlewares.nanobot-ipwhitelist.ipwhitelist.sourcerange=192.168.1.0/24,10.0.0.0/8"
  - "traefik.http.routers.nanobot.middlewares=nanobot-headers,nanobot-ipwhitelist"
```

## Testing

### 1. Test HTTP to HTTPS Redirect

```bash
curl -v http://dashboard.yourdomain.com
# Should return 301/302 redirect to HTTPS
```

### 2. Test Cookie Setting

```bash
curl -v -X POST https://dashboard.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your-password"}'

# Should see Set-Cookie header with:
# - HttpOnly
# - SameSite=Lax
# - Secure (if HTTPS)
```

### 3. Test Authentication Flow

```bash
# Login and save cookies
curl -v -c cookies.txt -X POST https://dashboard.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your-password"}'

# Access protected endpoint with cookies
curl -v -b cookies.txt https://dashboard.yourdomain.com/api/status
```

## Migration Path

### Current State → HTTPS with Traefik

1. ✅ Fix applied: Changed to `sameSite: 'lax'` (works with HTTP)
2. Add Traefik labels to docker-compose.yml
3. Ensure Traefik network exists and is connected
4. Configure SSL certificate (Let's Encrypt or self-signed)
5. Deploy and test
6. (Optional) Change to `sameSite: 'strict'` for even better security

### Using Existing Traefik Setup

Since you already have `root-traefik-1` running:

1. Make sure your dashboard connects to the `proxy` network
2. Add the Traefik labels shown above
3. Update the domain/IP in the labels
4. Redeploy: `docker-compose up -d`

## Questions?

- Check Traefik documentation: https://doc.traefik.io/traefik/
- Review SECURITY.md for general security guidelines
- See DEPLOYMENT.md for production deployment best practices
