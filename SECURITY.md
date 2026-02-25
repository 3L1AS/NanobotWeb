# Security Policy

## Overview

This document outlines the security features, practices, and considerations for the NanobotWeb dashboard application.

## Security Features Implemented

### 1. Authentication & Authorization

- **Server-side session management** with cryptographically secure tokens
- **Rate limiting** on login attempts (5 attempts per 15 minutes per IP)
- **HttpOnly, Secure, and SameSite cookies** to prevent XSS and CSRF attacks
- **Session expiration** after 7 days of inactivity
- **Strong password warnings** when using default credentials

### 2. Input Validation & Sanitization

- **Path traversal protection** for all file system operations
- **Command injection prevention** using `execFile` with argument arrays instead of shell strings
- **Input validation** for all API endpoints:
  - Message length limits (10KB for chat, 10MB for files)
  - Content type validation
  - Character whitelisting for sensitive inputs (session IDs, container names)
- **File size limits** to prevent DoS attacks

### 3. Security Headers

All responses include the following security headers:

- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-XSS-Protection: 1; mode=block` - Enables XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information
- `Permissions-Policy` - Restricts browser features
- `Content-Security-Policy` - Restricts resource loading

### 4. Docker Security

- **Non-root user** execution (runs as `nextjs` user, UID 1001)
- **Read-only root filesystem** with specific writable tmpfs mounts
- **No new privileges** security option
- **Resource limits** (CPU and memory) to prevent DoS
- **Read-only Docker socket mount** (when possible)
- **Health checks** for container monitoring
- **Minimal attack surface** using Alpine Linux base image

### 5. API Security

- **Proper error handling** without exposing sensitive information
- **Security logging** for authentication events and suspicious activity
- **JSON parsing protection** with size limits
- **Path validation** for all file operations

## Security Best Practices for Deployment

### 1. Change Default Credentials

**CRITICAL:** Change the default password before deploying:

```bash
# Set a strong password in your environment
export DASHBOARD_PASSWORD="your-strong-unique-password-here"

# Or modify docker-compose.yml
DASHBOARD_PASSWORD=your-strong-unique-password-here
```

### 2. Use HTTPS

Always run behind a reverse proxy with HTTPS:

```yaml
# Example nginx configuration
server {
    listen 443 ssl http2;
    server_name dashboard.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 3. Docker Socket Security

The dashboard requires access to the Docker socket. Consider using a Docker socket proxy to limit access:

```yaml
# Use tecnativa/docker-socket-proxy for production
services:
  docker-proxy:
    image: tecnativa/docker-socket-proxy
    environment:
      - CONTAINERS=1
      - POST=0
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro

  nanobot-dashboard:
    # Connect to proxy instead of direct socket
    environment:
      - DOCKER_HOST=tcp://docker-proxy:2375
```

### 4. Network Isolation

Restrict dashboard access to trusted networks:

```yaml
# Bind to localhost only
ports:
  - "127.0.0.1:3000:3000"

# Or use Docker networks
networks:
  internal:
    internal: true
```

### 5. File System Permissions

Ensure proper permissions on mounted volumes:

```bash
# The nextjs user (UID 1001) needs access to .nanobot
chown -R 1001:1001 ~/.nanobot

# Or add nextjs user to docker group (GID typically 999)
# This allows docker socket access
```

### 6. Regular Updates

Keep dependencies and base images updated:

```bash
# Update dependencies
npm audit fix

# Rebuild with latest base image
docker-compose build --pull --no-cache
```

### 7. Monitoring & Logging

Monitor logs for security events:

```bash
# Watch for security events
docker-compose logs -f | grep -i "security\|auth\|rate limit"

# Specific security indicators
docker-compose logs | grep "\[Security\]"
```

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** create a public GitHub issue
2. Email the maintainer with details
3. Allow time for a fix before public disclosure

## Known Limitations

### 1. Docker Socket Access

The dashboard requires access to the Docker socket, which is equivalent to root access on the host. This is an inherent security risk that cannot be fully eliminated without breaking functionality.

**Mitigations:**
- Run on trusted networks only
- Use Docker socket proxy in production
- Monitor Docker API calls
- Consider containerized alternatives

### 2. In-Memory Session Storage

Sessions are stored in memory and will be lost on container restart. For production with multiple instances, consider:
- Redis for session storage
- Sticky sessions at load balancer
- JWT tokens with proper validation

### 3. Rate Limiting

Rate limiting is IP-based and in-memory. For better protection:
- Use a reverse proxy with rate limiting (e.g., nginx limit_req)
- Implement distributed rate limiting with Redis
- Add CAPTCHA after multiple failed attempts

### 4. CSP Restrictions

Next.js requires `unsafe-inline` and `unsafe-eval` in the CSP, which reduces XSS protection. This is a framework limitation.

## Security Checklist

Before deploying to production:

- [ ] Changed default password to a strong, unique value
- [ ] Running behind HTTPS reverse proxy
- [ ] Enabled proper logging and monitoring
- [ ] Restricted network access to trusted sources
- [ ] Set up proper file system permissions
- [ ] Configured Docker socket proxy (recommended)
- [ ] Enabled container security options
- [ ] Set resource limits to prevent DoS
- [ ] Tested authentication and authorization
- [ ] Reviewed and understood security limitations

## Security Audit History

- **2025-02-25**: Comprehensive security review and fixes implemented
  - Fixed critical command injection vulnerability
  - Fixed critical path traversal vulnerability
  - Implemented proper authentication system
  - Added rate limiting and input validation
  - Added security headers and Docker hardening

## Contact

For security-related questions or concerns, please refer to the repository maintainer information.

---

**Last Updated**: 2025-02-25
