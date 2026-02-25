# Security Fixes Summary

## Date: 2025-02-25

This document summarizes all security vulnerabilities that were identified and fixed in the NanobotWeb dashboard application.

---

## Critical Vulnerabilities Fixed

### 1. Command Injection (CVE-Level: CRITICAL)

**Location**: [app/lib/docker.ts](app/lib/docker.ts)

**Issue**: The application used template strings to construct Docker commands, allowing attackers to inject arbitrary shell commands through user-controlled inputs (session ID, chat messages).

**Attack Scenario**:
```javascript
// Old vulnerable code
const fullCommand = `docker exec ${CONTAINER_NAME} ${escapedArgs}`;
exec(fullCommand, ...); // Vulnerable to injection

// Attack example
sessionId: "; rm -rf / #"
// Would execute: docker exec container nanobot agent -s ; rm -rf / # -m message
```

**Fix Applied**:
- Replaced `exec()` with `execFile()` which doesn't invoke a shell
- Using argument arrays instead of string concatenation
- Added validation for container names and command arguments
- Container name now restricted to alphanumeric characters, hyphens, underscores, and dots only

**Files Changed**:
- `app/lib/docker.ts` - Complete rewrite of command execution

---

### 2. Path Traversal (CVE-Level: CRITICAL)

**Location**: [app/api/workspace/route.ts](app/api/workspace/route.ts), [app/api/fs/route.ts](app/api/fs/route.ts)

**Issue**: User-supplied file paths were not properly validated, allowing attackers to read/write files outside the intended workspace directory.

**Attack Scenario**:
```javascript
// Attack example
GET /api/workspace?file=../../../../etc/passwd
POST /api/workspace { file: "../../.ssh/id_rsa", content: "attacker_key" }
```

**Fix Applied**:
- Created `validatePath()` security function that:
  - Normalizes paths to remove traversal attempts
  - Resolves to absolute paths
  - Validates final path starts with base directory
  - Rejects any path escape attempts
- Added file size limits (10MB for files, 1MB for configs)
- Improved error messages without exposing system paths

**Files Changed**:
- `app/lib/security.ts` - New file with path validation utilities
- `app/api/workspace/route.ts` - Added path validation
- `app/api/fs/route.ts` - Added path validation

---

### 3. Authentication Bypass (CVE-Level: HIGH)

**Location**: [app/api/auth/login/route.ts](app/api/auth/login/route.ts), [middleware.ts](middleware.ts)

**Issue**: Authentication tokens were generated but never validated server-side. Any random token cookie would bypass authentication.

**Attack Scenario**:
```javascript
// Attacker could set any random cookie and gain access
document.cookie = "nanobot-auth-token=random-string";
// Full access granted!
```

**Fix Applied**:
- Implemented server-side session store with in-memory Map
- Sessions now validated on every request
- Sessions expire after 7 days of inactivity
- Tokens are tracked and must exist in session store
- Proper session cleanup on logout

**Files Changed**:
- `app/lib/auth.ts` - New file with session management
- `app/api/auth/login/route.ts` - Creates validated sessions
- `app/api/auth/logout/route.ts` - Destroys sessions properly
- `middleware.ts` - Validates sessions server-side

---

## High-Risk Vulnerabilities Fixed

### 4. Docker Socket Exposure (CVE-Level: HIGH)

**Location**: [Dockerfile](Dockerfile), [docker-compose.example.yml](docker-compose.example.yml)

**Issue**: Container ran as root user with full Docker socket access, creating container escape risk.

**Fix Applied**:
- Container now runs as non-root user (nextjs, UID 1001)
- Docker socket mounted as read-only where possible
- Added `no-new-privileges` security option
- Implemented read-only root filesystem with specific tmpfs mounts
- Added resource limits (CPU: 1 core, Memory: 512MB)
- Health checks added for monitoring

**Files Changed**:
- `Dockerfile` - Non-root user, proper file ownership
- `docker-compose.example.yml` - Security options, resource limits

---

### 5. Insecure Default Credentials (CVE-Level: HIGH)

**Location**: [docker-compose.example.yml](docker-compose.example.yml)

**Issue**: Default password "admin" with no complexity requirements.

**Fix Applied**:
- Added warnings in code when default password is detected
- Updated documentation with strong password requirements
- Environment variable support with clear security warnings
- Password strength recommendations in all docs

**Files Changed**:
- `app/api/auth/login/route.ts` - Added warning for default password
- `docker-compose.example.yml` - Better documentation
- `SECURITY.md` - Password security guidelines

---

## Medium-Risk Vulnerabilities Fixed

### 6. Missing CSRF Protection (CVE-Level: MEDIUM)

**Location**: [app/api/auth/login/route.ts](app/api/auth/login/route.ts)

**Issue**: State-changing operations lacked CSRF protection.

**Fix Applied**:
- Changed cookie SameSite attribute from 'lax' to 'strict'
- This prevents the browser from sending the cookie in cross-site requests
- Provides effective CSRF protection for modern browsers

**Files Changed**:
- `app/api/auth/login/route.ts` - SameSite=strict

---

### 7. Missing Security Headers (CVE-Level: MEDIUM)

**Location**: [middleware.ts](middleware.ts)

**Issue**: No security headers to prevent common attacks (XSS, clickjacking, etc.)

**Fix Applied**:
Added comprehensive security headers:
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Content-Security-Policy` - Restricts resource loading
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` - Disables dangerous browser features

**Files Changed**:
- `middleware.ts` - Added all security headers

---

### 8. No Rate Limiting (CVE-Level: MEDIUM)

**Location**: [app/api/auth/login/route.ts](app/api/auth/login/route.ts)

**Issue**: No protection against brute force attacks on login endpoint.

**Fix Applied**:
- Implemented in-memory rate limiter
- 5 login attempts per 15 minutes per IP address
- Returns HTTP 429 (Too Many Requests) when exceeded
- Rate limit cleared on successful login
- Automatic cleanup of expired rate limit entries

**Files Changed**:
- `app/lib/security.ts` - Rate limiting implementation
- `app/api/auth/login/route.ts` - Applied rate limiting

---

### 9. Insufficient Input Validation (CVE-Level: MEDIUM)

**Location**: Multiple API routes

**Issue**: API endpoints accepted arbitrary input without validation.

**Fix Applied**:
- Added type validation for all inputs
- Size limits on all user-provided content:
  - Chat messages: 10KB max
  - Files: 10MB max
  - Config: 1MB max
- Format validation for session IDs (alphanumeric, hyphens, underscores only)
- JSON structure validation for config updates
- Character whitelisting for sensitive parameters

**Files Changed**:
- `app/api/chat/route.ts` - Message and session ID validation
- `app/api/workspace/route.ts` - File size validation
- `app/api/config/route.ts` - Config structure validation

---

### 10. Information Disclosure (CVE-Level: LOW)

**Location**: Multiple error handlers

**Issue**: Error messages exposed internal implementation details and stack traces.

**Fix Applied**:
- Generic error messages for users
- Detailed logging to console for debugging
- Removed stack trace exposure
- Sanitized error responses

**Files Changed**:
- All API route files - Improved error handling
- Added security event logging with `[Security]` prefix

---

## Additional Security Improvements

### 11. Security Logging

Added comprehensive security logging:
- Authentication successes and failures
- Rate limit violations
- Path traversal attempts
- Failed validation attempts
- Session creation and destruction

### 12. Documentation

Created comprehensive security documentation:
- `SECURITY.md` - Security policy and features
- `DEPLOYMENT.md` - Secure deployment guide
- Updated README with security notes

---

## Testing Recommendations

### 1. Command Injection Testing

```bash
# Test session ID injection
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "; ls -la #", "message": "test"}'

# Expected: 400 Bad Request (invalid characters)
```

### 2. Path Traversal Testing

```bash
# Test directory traversal
curl http://localhost:3000/api/workspace?file=../../../../etc/passwd

# Expected: 400 Bad Request (path traversal detected)
```

### 3. Authentication Testing

```bash
# Test with invalid token
curl http://localhost:3000/api/status \
  -H "Cookie: nanobot-auth-token=invalid-token"

# Expected: 401 Unauthorized
```

### 4. Rate Limit Testing

```bash
# Test rate limiting (requires 6 failed attempts)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"password": "wrong"}'
done

# Expected: 6th request returns 429 Too Many Requests
```

---

## Migration Notes

### Breaking Changes

1. **Docker User Change**: Container now runs as UID 1001 instead of root
   - **Action Required**: Ensure `.nanobot` directory is accessible to UID 1001
   - **Command**: `sudo chown -R 1001:1001 ~/.nanobot`

2. **Volume Path Change**: `.nanobot` mount point changed from `/root/.nanobot` to `/home/nextjs/.nanobot`
   - **Action Required**: Update `NANOBOT_DIR` environment variable
   - **Old**: `NANOBOT_DIR=/root/.nanobot`
   - **New**: `NANOBOT_DIR=/home/nextjs/.nanobot`

3. **Cookie SameSite Change**: Changed from 'lax' to 'strict'
   - **Impact**: May require re-login after update
   - **Benefit**: Better CSRF protection

### Non-Breaking Changes

- All security improvements are backward compatible
- No API changes required in frontend
- Session tokens will be regenerated on login

---

## Verification Checklist

After applying these fixes, verify:

- [ ] Login works and creates valid session
- [ ] Session persists across page reloads
- [ ] Logout properly destroys session
- [ ] Rate limiting blocks brute force attempts
- [ ] File operations respect workspace boundaries
- [ ] Docker commands execute safely
- [ ] Security headers present in responses
- [ ] Error messages don't expose sensitive info
- [ ] Container runs as non-root user
- [ ] Resource limits are enforced

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE-78: Command Injection](https://cwe.mitre.org/data/definitions/78.html)
- [CWE-22: Path Traversal](https://cwe.mitre.org/data/definitions/22.html)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [Next.js Security Headers](https://nextjs.org/docs/app/api-reference/next-config-js/headers)

---

**Security Review Completed**: 2025-02-25
**Reviewed By**: Security Audit
**Status**: All Critical and High vulnerabilities addressed
