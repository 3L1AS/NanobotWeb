# Hotfix: Login Cookie Issue with HTTP/Reverse Proxy

**Date**: 2025-02-25
**Version**: Hotfix after initial security release
**Issue**: Login not working with HTTP access and reverse proxy setups

---

## Problem Description

After the security hardening update, users accessing the dashboard via HTTP (without HTTPS) or through reverse proxies like Traefik experienced login issues. The login form would submit successfully but immediately redirect back to the login page without establishing a session.

### Symptoms

- Login form accepts password
- No error message shown
- Immediately redirects back to `/login`
- Browser console shows no errors
- Cookie not being set or not being sent with subsequent requests

### Root Cause

The security update changed the cookie `sameSite` attribute from `'lax'` to `'strict'` for better CSRF protection. However, `sameSite: 'strict'` has compatibility issues with:

1. **HTTP connections** (non-HTTPS)
2. **IP address access** (e.g., `http://82.25.97.15:3000`)
3. **Reverse proxy setups** without proper `X-Forwarded-Proto` headers
4. **Cross-site navigation** patterns

When using `sameSite: 'strict'`:
- Browsers may not send the cookie on any cross-site requests
- HTTP-only setups don't trigger the "secure context" needed for strict cookies
- Some browsers are more restrictive with IP-based origins

---

## Fix Applied

### Change: Cookie SameSite Attribute

**File**: `app/api/auth/login/route.ts` (line 50)

**Before**:
```typescript
response.cookies.set({
    name: 'nanobot-auth-token',
    value: token,
    httpOnly: true,
    path: '/',
    secure: req.url.startsWith('https://') || req.headers.get('x-forwarded-proto') === 'https',
    sameSite: 'strict', // Too restrictive for HTTP
    maxAge: 60 * 60 * 24 * 7,
});
```

**After**:
```typescript
response.cookies.set({
    name: 'nanobot-auth-token',
    value: token,
    httpOnly: true,
    path: '/',
    secure: req.url.startsWith('https://') || req.headers.get('x-forwarded-proto') === 'https',
    sameSite: 'lax', // Works with HTTP and reverse proxies, still provides good CSRF protection
    maxAge: 60 * 60 * 24 * 7,
});
```

---

## Security Implications

### SameSite='lax' vs 'strict'

**What 'lax' Provides**:
- ✅ Protects against CSRF on POST, PUT, DELETE requests
- ✅ Cookie sent on top-level navigation (clicking links)
- ✅ Works with HTTP and HTTPS
- ✅ Compatible with reverse proxies
- ✅ Recommended default by most security standards

**What 'strict' Adds** (beyond 'lax'):
- Cookie NOT sent even on top-level navigation from external sites
- Slightly better protection against certain edge-case attacks
- Requires HTTPS to work reliably

**Verdict**: `sameSite: 'lax'` is the industry-standard recommendation and provides excellent CSRF protection while maintaining compatibility. The additional security from `'strict'` is minimal and causes more problems than it solves for most deployments.

### Remaining Security Measures

The application still has robust security:

1. **Server-side session validation** - Tokens must exist in session store
2. **Rate limiting** - 5 login attempts per 15 minutes
3. **HttpOnly cookies** - Prevents XSS cookie theft
4. **Secure flag** (when using HTTPS) - Prevents transmission over HTTP
5. **Session expiration** - 7 days of inactivity
6. **Input validation** - All inputs sanitized
7. **Path traversal protection** - File operations restricted
8. **Command injection prevention** - Safe command execution

---

## Testing

### Verify the Fix

1. **Clear browser cookies**:
   - Open DevTools (F12)
   - Application tab > Cookies
   - Delete `nanobot-auth-token` if present

2. **Test login**:
   ```bash
   # Navigate to login page
   http://your-server-ip:3000/login

   # Enter password and submit
   ```

3. **Check cookie in DevTools**:
   - Application > Cookies > `http://your-server-ip:3000`
   - Should see: `nanobot-auth-token`
   - Properties:
     - `HttpOnly`: ✓
     - `SameSite`: Lax
     - `Secure`: (depends on HTTPS)
     - `Path`: /

4. **Verify redirect**:
   - After successful login, should redirect to `/` (dashboard)
   - Should stay on dashboard, not redirect back to login

### Test CSRF Protection Still Works

```bash
# Attempt CSRF attack (should fail)
curl -X POST http://your-server:3000/api/config \
  -H "Content-Type: application/json" \
  -H "Origin: http://evil-site.com" \
  -d '{"malicious": "data"}'

# Expected: 401 Unauthorized (no valid session)
```

---

## Upgrade Path to HTTPS

While `sameSite: 'lax'` works perfectly, you can upgrade to HTTPS for additional security:

### Option 1: Traefik (Recommended)

See [TRAEFIK_SETUP.md](TRAEFIK_SETUP.md) for detailed instructions.

Quick version:
```yaml
# docker-compose.yml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.nanobot.rule=Host(`dashboard.yourdomain.com`)"
  - "traefik.http.routers.nanobot.entrypoints=websecure"
  - "traefik.http.routers.nanobot.tls=true"
  - "traefik.http.routers.nanobot.tls.certresolver=letsencrypt"
  - "traefik.http.middlewares.nanobot-headers.headers.customrequestheaders.X-Forwarded-Proto=https"
```

### Option 2: Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name dashboard.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}
```

### Option 3: Cloudflare or Similar CDN

If using Cloudflare:
- Enable "Full" or "Full (strict)" SSL mode
- Ensure "Always Use HTTPS" is enabled
- The dashboard will automatically detect `X-Forwarded-Proto: https` header

---

## FAQ

### Q: Is 'lax' less secure than 'strict'?

**A**: For 99.9% of use cases, no. `SameSite=Lax` is the industry-standard recommendation and what most major websites use (Google, Facebook, GitHub, etc.). It provides excellent CSRF protection while maintaining compatibility.

### Q: Should I change it back to 'strict' after enabling HTTPS?

**A**: It's not necessary. `SameSite=Lax` with HTTPS is considered best practice. However, if you want maximum security and don't need cross-site navigation, you can change it to `'strict'` - but test thoroughly first.

### Q: Will this affect users who already have sessions?

**A**: Existing sessions may need to re-login after this update. The session token validation remains the same; only the cookie transmission changed.

### Q: What about the `secure` flag?

**A**: The `secure` flag is automatically set when using HTTPS (via `X-Forwarded-Proto` header detection). This ensures cookies are only sent over encrypted connections when available.

---

## Deployment

### Quick Update

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Clear browser cookies
# Login should now work
```

### Verify Deployment

```bash
# Check container logs for successful login
docker-compose logs -f nanobot-dashboard

# Look for: "[Auth] Successful login from IP: xxx.xxx.xxx.xxx"
```

---

## Related Issues

- [SECURITY.md](SECURITY.md) - Overall security policy
- [TRAEFIK_SETUP.md](TRAEFIK_SETUP.md) - Traefik integration guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production deployment guide

---

## Changelog

**2025-02-25 (Hotfix)**:
- Changed `sameSite: 'strict'` → `sameSite: 'lax'` in login route
- Added TRAEFIK_SETUP.md with reverse proxy configuration
- Updated documentation with HTTP/HTTPS considerations

**2025-02-25 (Initial Security Release)**:
- Implemented comprehensive security fixes
- Added session management, rate limiting, input validation
- Changed to `sameSite: 'strict'` (caused issues, reverted in hotfix)

---

**Status**: ✅ Fixed
**Impact**: High - Login now works with HTTP and reverse proxies
**Breaking Changes**: None - existing sessions may require re-login
