# Deployment Guide

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Existing `nanobot-gateway` container running
- `~/.nanobot` directory with proper configuration

### Basic Deployment

1. **Clone the repository**:
   ```bash
   git clone https://github.com/3L1AS/NanobotWeb.git
   cd NanobotWeb
   ```

2. **Set a strong password** (IMPORTANT):
   ```bash
   export DASHBOARD_PASSWORD="your-secure-password-here"
   ```

3. **Copy and customize docker-compose file**:
   ```bash
   cp docker-compose.example.yml docker-compose.yml
   # Edit docker-compose.yml and set DASHBOARD_PASSWORD
   ```

4. **Check Docker socket GID** (optional but recommended):
   ```bash
   # Find your docker socket GID
   stat -c '%g' /var/run/docker.sock
   # Common values: 999, 998, or 997

   # If it's not 999, set the environment variable
   export DOCKER_GID=998  # Use your actual GID
   ```

5. **Ensure correct permissions**:
   ```bash
   # The nextjs user (UID 1001) needs access to .nanobot directory
   sudo chown -R 1001:1001 ~/.nanobot

   # Docker socket access is handled automatically via docker group
   # No need to manually add users to docker group on host
   ```

6. **Build and run**:
   ```bash
   docker-compose up --build -d
   ```

6. **Access the dashboard**:
   - Navigate to `http://localhost:3000`
   - Login with your password

## Production Deployment

### 1. HTTPS with Reverse Proxy

**Nginx Configuration Example**:

```nginx
server {
    listen 80;
    server_name dashboard.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dashboard.example.com;

    ssl_certificate /etc/letsencrypt/live/dashboard.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.example.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (if needed in future)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Caddy Configuration Example**:

```caddy
dashboard.example.com {
    reverse_proxy localhost:3000 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

### 2. Docker Socket Proxy (Recommended)

For enhanced security, use a Docker socket proxy:

```yaml
version: '3.8'

services:
  docker-proxy:
    image: tecnativa/docker-socket-proxy
    container_name: docker-proxy
    environment:
      - CONTAINERS=1
      - IMAGES=0
      - AUTH=0
      - POST=0
      - BUILD=0
      - COMMIT=0
      - CONFIGS=0
      - DISTRIBUTION=0
      - EXEC=1
      - GRPC=0
      - NETWORKS=0
      - NODES=0
      - PLUGINS=0
      - SECRETS=0
      - SERVICES=0
      - SESSION=0
      - SWARM=0
      - SYSTEM=0
      - TASKS=0
      - VOLUMES=0
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - internal
    restart: unless-stopped

  nanobot-dashboard:
    container_name: nanobot-dashboard
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      - ~/.nanobot:/home/nextjs/.nanobot:ro
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      - DOCKER_HOST=tcp://docker-proxy:2375
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
    networks:
      - internal
    depends_on:
      - docker-proxy
    restart: unless-stopped

networks:
  internal:
    driver: bridge
```

### 3. Environment Variables

Create a `.env` file (never commit this!):

```bash
# SECURITY: Change this to a strong password!
DASHBOARD_PASSWORD=your-very-strong-password-with-symbols-123!@#

# Container configuration
NANOBOT_CONTAINER_NAME=nanobot-gateway
PORT=3000
NODE_ENV=production

# Docker socket location (if using proxy)
# DOCKER_HOST=tcp://docker-proxy:2375
```

### 4. Network Isolation

Restrict access to localhost only:

```yaml
ports:
  - "127.0.0.1:3000:3000"  # Only accessible from localhost
```

Then access via SSH tunnel:
```bash
ssh -L 3000:localhost:3000 user@server
```

Or use Tailscale/WireGuard for secure remote access.

### 5. Firewall Configuration

**UFW Example**:
```bash
# Allow only from specific IP
sudo ufw allow from 192.168.1.0/24 to any port 3000

# Or allow from anywhere (if behind auth)
sudo ufw allow 3000/tcp
```

**iptables Example**:
```bash
# Allow only from specific IP range
sudo iptables -A INPUT -p tcp --dport 3000 -s 192.168.1.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3000 -j DROP
```

## Monitoring & Maintenance

### Health Checks

The container includes a health check endpoint:

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' nanobot-dashboard

# View health check logs
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' nanobot-dashboard
```

### Log Monitoring

```bash
# Follow logs
docker-compose logs -f nanobot-dashboard

# Filter for security events
docker-compose logs nanobot-dashboard | grep -i "\[security\]\|\[auth\]"

# Watch for failed login attempts
docker-compose logs -f nanobot-dashboard | grep "Failed login"
```

### Backup

Backup your configuration and data:

```bash
# Backup .nanobot directory
tar -czf nanobot-backup-$(date +%Y%m%d).tar.gz ~/.nanobot/

# Store backups securely offsite
```

### Updates

Regular update procedure:

```bash
# Pull latest changes
git pull origin main

# Rebuild with latest base images
docker-compose build --pull --no-cache

# Restart with new image
docker-compose down
docker-compose up -d

# Verify health
docker-compose ps
docker-compose logs --tail=50 nanobot-dashboard
```

## Troubleshooting

### Permission Errors

If you see "Permission denied" errors:

```bash
# Check file ownership
ls -la ~/.nanobot

# Fix ownership (UID 1001 is the nextjs user)
sudo chown -R 1001:1001 ~/.nanobot

# Check docker socket permissions
ls -la /var/run/docker.sock

# Add nextjs user to docker group (in container)
# This is typically GID 999, adjust if needed
```

### Docker Socket Errors

If unable to communicate with Docker:

```bash
# Test docker access from container
docker exec nanobot-dashboard docker ps

# If using socket proxy, verify connectivity
docker exec nanobot-dashboard wget -qO- http://docker-proxy:2375/version
```

### Memory Issues

If the container uses too much memory:

```bash
# Adjust memory limits in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 256M  # Reduce if needed
```

### Authentication Issues

If unable to login:

```bash
# Check password environment variable
docker-compose exec nanobot-dashboard printenv DASHBOARD_PASSWORD

# Check for rate limiting
docker-compose logs nanobot-dashboard | grep "Rate limit"

# Clear rate limits by restarting
docker-compose restart nanobot-dashboard
```

## Performance Optimization

### 1. Enable Caching

The application uses Next.js built-in caching. Ensure tmpfs mounts are working:

```bash
docker exec nanobot-dashboard df -h /tmp /app/.next/cache
```

### 2. Resource Limits

Adjust based on your usage:

```yaml
deploy:
  resources:
    limits:
      cpus: '0.5'      # Reduce for lighter load
      memory: 256M     # Reduce if not using file editor heavily
```

### 3. Reduce Logging

For production, reduce log verbosity:

```yaml
environment:
  - LOG_LEVEL=warn  # Instead of info
```

## Security Hardening

See [SECURITY.md](./SECURITY.md) for detailed security information.

Quick checklist:
- [ ] Strong password set (not 'admin')
- [ ] HTTPS enabled via reverse proxy
- [ ] Firewall configured
- [ ] Docker socket proxy in use (recommended)
- [ ] Monitoring and alerting set up
- [ ] Regular backups scheduled
- [ ] Access restricted to trusted networks
- [ ] Logs reviewed regularly

---

**Questions or Issues?**

Open an issue on GitHub or refer to the main README.md for more information.
