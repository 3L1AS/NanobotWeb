# Troubleshooting Login Issues

Please run these commands on your server and share the output:

## 1. Check Container Status

```bash
docker ps | grep nanobot
```

## 2. Check Container Logs

```bash
# Last 50 lines of logs
docker logs nanobot-dashboard --tail 50

# Follow logs in real-time (Ctrl+C to stop)
docker logs -f nanobot-dashboard
```

## 3. Check Environment Variables

```bash
docker exec nanobot-dashboard printenv | grep -E "DASHBOARD_PASSWORD|NODE_ENV|PORT|NANOBOT"
```

## 4. Test Login API Directly

```bash
# Replace YOUR_PASSWORD with your actual password
curl -v -X POST http://82.25.97.15:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_PASSWORD"}'
```

## 5. Check if Frontend is Loading

```bash
curl -I http://82.25.97.15:3000/login
```

## 6. Check Browser Console

In your browser:
1. Open DevTools (F12)
2. Go to Console tab
3. Try to login
4. Share any error messages

## 7. Check Network Tab

In your browser:
1. Open DevTools (F12)
2. Go to Network tab
3. Try to login
4. Look for the POST request to `/api/auth/login`
5. Check:
   - Status code (should be 200 for success)
   - Response body
   - Response headers (look for Set-Cookie)

## 8. Check Current Cookies

In your browser:
1. Open DevTools (F12)
2. Go to Application tab > Cookies
3. Select `http://82.25.97.15:3000`
4. Check if `nanobot-auth-token` exists
5. If it exists, check its properties (SameSite, HttpOnly, etc.)

## Common Issues

### Issue 1: Container Not Running
```bash
docker ps -a | grep nanobot
# If status is not "Up", start it:
docker-compose up -d
```

### Issue 2: Wrong Password
```bash
# Check what password the container is expecting
docker exec nanobot-dashboard printenv DASHBOARD_PASSWORD
```

### Issue 3: Port Not Accessible
```bash
# Test if port is listening
netstat -tlnp | grep 3000
# Or
ss -tlnp | grep 3000
```

### Issue 4: Firewall Blocking
```bash
# Check firewall rules
sudo ufw status
# Or
sudo iptables -L -n | grep 3000
```

### Issue 5: Build Not Complete
```bash
# Force rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Issue 6: File Explorer Cannot Save/Delete files (Permission Denied)
**Symptom**
Your dashboard loads perfectly, but File Explorer is completely empty, or creating/saving files triggers a UI error.

**Fix**
Since the docker container runs secured under an unprivileged user (UID `1001`), it needs explicit recursive ownership and permissions to edit inside the top-level `.nanobot` vault:
```bash
sudo chown -R 1001:1001 ~/.nanobot
sudo chmod -R 775 ~/.nanobot
```
Once run, hard refresh your browser (`Ctrl+Shift+R`) and it will work perfectly.

## Detailed Diagnostics

If still not working, provide these outputs:

```bash
# 1. Container inspect
docker inspect nanobot-dashboard | grep -A 10 "Env"

# 2. Check if auth files exist
docker exec nanobot-dashboard ls -la /app/lib/

# 3. Check Next.js build
docker exec nanobot-dashboard ls -la /app/.next/

# 4. Check server.js
docker exec nanobot-dashboard ls -la /app/server.js

# 5. Test from inside container
docker exec nanobot-dashboard wget -qO- http://localhost:3000/api/auth/login
```
