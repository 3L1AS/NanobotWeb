# Fix Docker Socket Permission Issue

## Problem
The dashboard container runs as `nextjs` user (UID 1001) but cannot access the Docker socket at `/var/run/docker.sock`.

Error:
```
permission denied while trying to connect to the docker API at unix:///var/run/docker.sock
```

## Solutions

### Solution 1: Find Docker Group GID and Update Dockerfile (Recommended)

1. **Find your Docker group GID on the host:**
```bash
ls -la /var/run/docker.sock
# Output example: srw-rw---- 1 root docker 0 Feb 25 10:00 /var/run/docker.sock

getent group docker
# Output example: docker:x:999:user1,user2
#                           ^^^ this is the GID
```

2. **Update Dockerfile to add nextjs user to docker group:**

The GID is typically `999`, but check your system. Edit `Dockerfile`:

```dockerfile
# After creating the nextjs user, add to docker group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    addgroup -g 999 docker 2>/dev/null || true && \
    adduser nextjs docker
```

Replace `999` with your actual docker group GID.

3. **Rebuild:**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Solution 2: Run as Root (Quick but Less Secure)

**Edit Dockerfile:**
```dockerfile
# Comment out the USER line
# USER nextjs

# Or change to root explicitly
USER root
```

**Rebuild:**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

**Security Note:** This gives the container full root access, which is less secure but works immediately.

### Solution 3: Change Docker Socket Permissions (Not Recommended)

On your host:
```bash
sudo chmod 666 /var/run/docker.sock
```

⚠️ **Warning:** This makes the Docker socket accessible to ALL users on the host, which is a security risk.

### Solution 4: Use Docker Socket Proxy (Most Secure for Production)

See [TRAEFIK_SETUP.md](TRAEFIK_SETUP.md) for setting up `tecnativa/docker-socket-proxy`.

This creates a proxy that limits what Docker commands can be executed.

## Recommended Approach for You

Since login is working and this is likely a local/development setup:

### Quick Fix (Run as Root):

```bash
cd ~/NanobotWeb
```

Edit `Dockerfile` and change line 29:
```dockerfile
# FROM:
USER nextjs

# TO:
USER root
```

Then:
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Or Match Docker Group:

```bash
# Find docker GID
stat -c '%g' /var/run/docker.sock
# Example output: 999

# Edit Dockerfile and add after line 16:
RUN addgroup -g 999 docker 2>/dev/null || true && \
    adduser nextjs docker
```

Then rebuild as above.

## Verify Fix

After rebuilding:
```bash
# Should see "online" status
docker logs nanobot-dashboard --tail 20

# In the dashboard, the "Gateway Connection" should show "Online"
```

## Current Status

✅ **Login working** - Authentication fixed!
❌ **Docker socket access** - Needs permission fix

Once you apply one of the solutions above, the dashboard will be fully functional!
