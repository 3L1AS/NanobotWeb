# Complete Setup Guide for NanobotWeb Dashboard

## What We Fixed

During deployment, we encountered and resolved several issues:

1. ✅ **Login Cookie Issue** - Changed `sameSite: 'strict'` to `'lax'` for HTTP compatibility
2. ✅ **Session Store Isolation** - Fixed Edge Runtime vs Node.js runtime memory isolation
3. ✅ **Docker Socket Permissions** - Added proper docker group configuration
4. ✅ **Authentication Working** - Full login and session management functional

---

## Fresh Installation Guide

### Prerequisites

1. **Docker and Docker Compose installed**
2. **Existing nanobot-gateway container** (optional, for container status)
3. **Linux server** with Docker socket access

### Step 1: Clone Repository

```bash
git clone https://github.com/3L1AS/NanobotWeb.git
cd NanobotWeb
```

### Step 2: Find Your Docker Socket GID

This is **CRITICAL** for docker socket access:

```bash
stat -c '%g' /var/run/docker.sock
```

**Common values:**
- `999` (Ubuntu/Debian)
- `988` (Some systems)
- `998` (CentOS/RHEL)
- `997` (Arch Linux)

**Write down your GID!** You'll need it in the next step.

### Step 3: Create docker-compose.yml

Copy the example and **edit the DOCKER_GID**:

```bash
cp docker-compose.example.yml docker-compose.yml
```

**Edit the file** and change line with `DOCKER_GID`:

```yaml
services:
  nanobot-dashboard:
    container_name: nanobot-dashboard
    build:
      context: .
      dockerfile: Dockerfile
      args:
        DOCKER_GID: 988  # ← CHANGE THIS to your actual GID from Step 2
    volumes:
      - ~/.nanobot:/home/nextjs/.nanobot
      - /var/run/docker.sock:/var/run/docker.sock:ro
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - DASHBOARD_PASSWORD=YOUR_SECURE_PASSWORD_HERE  # ← CHANGE THIS!
      - NANOBOT_CONTAINER_NAME=nanobot-gateway
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
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/status', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); });"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
```

**Important changes:**
1. Set `DOCKER_GID` to your actual GID (e.g., 988, 999, etc.)
2. Set `DASHBOARD_PASSWORD` to a strong password (NOT "admin"!)

### Step 4: Set File Permissions

The container runs as UID 1001, so it needs access to your `.nanobot` directory:

```bash
# Create workspace directory if it doesn't exist
mkdir -p ~/.nanobot/workspace

# Set ownership to UID 1001 for the container to access it
sudo chown -R 1001:1001 ~/.nanobot

# Ensure future subdirectories and files can be read/written
sudo chmod -R 775 ~/.nanobot
```

### Step 5: Build and Start

```bash
docker-compose build --no-cache
docker-compose up -d
```

### Step 6: Verify

Check the logs:

```bash
docker logs nanobot-dashboard --tail 30
```

**You should see:**
- `✓ Ready in XXXms` - Server started
- NO "permission denied" errors

**Verify docker group is correct:**

```bash
docker exec nanobot-dashboard getent group docker
```

Should show: `docker:x:988:nextjs` (or your GID)

### Step 7: Access Dashboard

Navigate to:
```
http://YOUR_SERVER_IP:3000
```

Login with the password you set in Step 3.

---

## Troubleshooting

### Issue 1: "permission denied" on Docker socket

**Symptom:**
```
[Docker] Failed to inspect container: permission denied while trying to connect to docker API
```

**Fix:**
The DOCKER_GID in your docker-compose.yml doesn't match your host.

```bash
# Find your actual GID
stat -c '%g' /var/run/docker.sock

# Update docker-compose.yml with correct DOCKER_GID
nano docker-compose.yml

# Rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Verify
docker exec nanobot-dashboard getent group docker
# Should match your host GID
```

### Issue 2: Login redirects back to login page

**Symptoms:**
- Login seems to work but immediately redirects back
- No error message shown

**Causes & Fixes:**

**A. Cookie not being set** (HTTP issue)
- Already fixed in latest version (sameSite: 'lax')
- Make sure you pulled latest code: `git pull origin main`

**B. Session store not working**
- Already fixed (Edge Runtime isolation resolved)
- Check logs for: `[Session] Created new session, total sessions: 1`

**C. Wrong password**
```bash
# Check what password container expects
docker exec nanobot-dashboard printenv DASHBOARD_PASSWORD
```

### Issue 3: File Explorer shows empty

**Symptom:**
Dashboard loads but File Explorer tab shows no files.

**Causes:**

**A. Workspace directory doesn't exist:**
```bash
mkdir -p ~/.nanobot/workspace
```

**B. Permission issue:**
```bash
sudo chown -R 1001:1001 ~/.nanobot
sudo chmod -R 775 ~/.nanobot
```

**C. Volume not mounted:**
```bash
# Check if volume is mounted
docker exec nanobot-dashboard ls -la /home/nextjs/.nanobot/
```

### Issue 4: YAML syntax error

**Symptom:**
```
ERROR: yaml.scanner.ScannerError: mapping values are not allowed here
```

**Fix:**
YAML is very sensitive to indentation. Use spaces, NOT tabs.

```yaml
# Correct indentation example:
services:
  nanobot-dashboard:    # 2 spaces
    build:              # 4 spaces
      context: .        # 6 spaces
      args:             # 6 spaces
        DOCKER_GID: 988 # 8 spaces
```

If you're stuck, use the command from Step 3 to recreate the file.

### Issue 5: Container keeps restarting

```bash
# Check logs for errors
docker logs nanobot-dashboard

# Common issues:
# - Port 3000 already in use: Change port in docker-compose.yml
# - Build failed: Check Dockerfile syntax
# - Out of memory: Increase memory limit in docker-compose.yml
```

---

## Security Checklist

Before going to production:

- [ ] Changed `DASHBOARD_PASSWORD` from default
- [ ] Using HTTPS (see [TRAEFIK_SETUP.md](TRAEFIK_SETUP.md))
- [ ] File permissions set correctly (`chown 1001:1001`)
- [ ] Docker socket access working (no permission errors)
- [ ] Resource limits configured (CPU, memory)
- [ ] Firewall configured to restrict access
- [ ] Regular backups of `~/.nanobot` directory

---

## Update Procedure

When a new version is released:

```bash
cd ~/NanobotWeb
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

Or use the automated script:

```bash
chmod +x UPDATE.sh
bash UPDATE.sh
```

---

## Architecture Notes

### Why DOCKER_GID matters

The dashboard needs to:
1. Read/write files in `~/.nanobot` (uses UID 1001)
2. Execute Docker commands (uses docker group with GID from host)

The container creates a `docker` group with the same GID as your host's docker socket, then adds the `nextjs` user to it. This allows the non-root user to access the Docker socket securely.

### Why the paths changed

- **Old approach**: Container ran as root, used `/root/.nanobot`
- **New approach**: Container runs as `nextjs` (UID 1001), uses `/home/nextjs/.nanobot`
- **Why**: Security - running as non-root prevents privilege escalation

### Session Management

- **Middleware** (Edge Runtime): Only checks if token exists and has valid format
- **API Routes** (Node.js Runtime): Validates actual session in session store
- **Why**: Edge Runtime and Node.js Runtime cannot share memory

---

## Common Docker GIDs by Distribution

| Distribution | Common GID |
|--------------|------------|
| Ubuntu 20.04+ | 999 |
| Debian 11+ | 999 |
| CentOS 8+ | 988 or 998 |
| Arch Linux | 997 |
| Alpine Linux | 102 |

Always check with `stat -c '%g' /var/run/docker.sock` to be sure!

---

## Quick Reference Commands

```bash
# Check docker socket GID
stat -c '%g' /var/run/docker.sock

# Check container's docker group
docker exec nanobot-dashboard getent group docker

# Check container can access socket
docker exec nanobot-dashboard docker ps

# View logs
docker logs -f nanobot-dashboard

# Restart container
docker-compose restart

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check file permissions
ls -la ~/.nanobot
docker exec nanobot-dashboard ls -la /home/nextjs/.nanobot

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your-password"}'
```

---

## Support

- [GitHub Issues](https://github.com/3L1AS/NanobotWeb/issues)
- [Security Policy](SECURITY.md)
- [Traefik Setup Guide](TRAEFIK_SETUP.md)
- [Deployment Guide](DEPLOYMENT.md)

---

**Last Updated:** 2025-02-25
**Tested On:** Ubuntu 22.04, Debian 11, Docker 24.0+
