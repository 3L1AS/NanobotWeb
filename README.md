# NanobotWeb Dashboard

A premium, localized web dashboard designed as a perfect companion UI for your [HKUDS/nanobot](https://github.com/HKUDS/nanobot) gateway.

NanobotWeb runs in its own lightweight Docker container alongside your existing nanobot instance. It connects directly to your `~/.nanobot` workspace and local Docker daemon, transforming raw configuration JSONs and Markdown files into a stunning, interactive Graphical User Interface.

## ✨ Features

### Core Functionality
- **Persistent Chat Sessions**: Spin up multiple distinct conversations. The dashboard executes natively through the Docker Socket to chat seamlessly with your running bot.
- **Workspace File Explorer**: A complete built-in IDE for your `~/.nanobot/workspace/`. Browse into `skills/`, `memory/`, and `sessions/`, select any file (like your `HEARTBEAT.md` cron jobs), and edit them via a real-time text editor.
- **GUI Settings**: Manage your core `config.json` seamlessly. Easily change models, default provider APIs, and workspace paths without dealing with raw JSON brackets.
- **Beautiful Glassmorphism UI**: Native Dark Mode (`#09090b` base) paired with sleek gradients, Tailwind CSS animations, and `lucide-react` iconography.

### Security Features
- **Secure Authentication**: Server-side session management with rate limiting (5 attempts per 15 minutes)
- **Command Injection Protection**: Safe Docker command execution using argument arrays
- **Path Traversal Prevention**: Validated file system access restricted to workspace directory
- **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options, and more
- **Non-Root Container**: Runs as unprivileged user (UID 1001) with read-only root filesystem
- **Input Validation**: Size limits and format validation on all user inputs

See [SECURITY.md](SECURITY.md) for complete security documentation.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Your original [nanobot](https://github.com/HKUDS/nanobot) container running
- `~/.nanobot` workspace directory exists

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/3L1AS/NanobotWeb.git
   cd NanobotWeb
   ```

2. **Find your Docker socket GID** (important for permissions):
   ```bash
   stat -c '%g' /var/run/docker.sock
   ```
   Note the number returned (e.g., 999, 988, etc.)

3. **Create docker-compose.yml from example:**
   ```bash
   cp docker-compose.example.yml docker-compose.yml
   ```

4. **Edit docker-compose.yml** and configure:
   - Set `DASHBOARD_PASSWORD` to your desired password
   - Set `DOCKER_GID` to match your docker socket GID from step 2
   ```yaml
   environment:
     DASHBOARD_PASSWORD: "your-secure-password-here"
   build:
     args:
       DOCKER_GID: 988  # Use your actual GID from step 2
   ```

5. **Set correct file permissions:**
   ```bash
   sudo chown -R 1001:1001 ~/.nanobot
   ```

6. **Build and start the container:**
   ```bash
   docker-compose up --build -d
   ```

7. **Access the dashboard:**
   - Visit `http://localhost:3000`
   - Login with your configured password

### First Time Setup

For detailed step-by-step instructions including troubleshooting, see [SETUP_COMPLETE.md](SETUP_COMPLETE.md).

### Production Deployment

For secure production deployment with HTTPS and reverse proxy setup, see [DEPLOYMENT.md](DEPLOYMENT.md).

## 🛠️ Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS (v4)
- **Backend**: Next.js API Routes (Node.js) acting as a secure bridge to the Docker Socket
- **Authentication**: Server-side session management with secure token validation
- **Containerization**: Docker & Docker Compose (Standalone Optimized Build)
- **Security**: Multiple layers of protection including path validation, command injection prevention, and security headers

## 📚 Documentation

- **[SETUP_COMPLETE.md](SETUP_COMPLETE.md)** - Complete setup guide with step-by-step instructions
- **[SECURITY.md](SECURITY.md)** - Security features, policy, and best practices
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Production deployment guide with HTTPS and reverse proxy
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and diagnostic commands
- **[TRAEFIK_SETUP.md](TRAEFIK_SETUP.md)** - Traefik reverse proxy integration guide

## 🔧 Troubleshooting

### Docker Permission Denied
If you see "permission denied" errors accessing the Docker socket:
1. Find your docker socket GID: `stat -c '%g' /var/run/docker.sock`
2. Update `DOCKER_GID` in docker-compose.yml to match
3. Rebuild: `docker-compose up --build -d`

### File Explorer Empty
If the File Explorer shows no files:
1. Check permissions: `ls -la ~/.nanobot/workspace/`
2. Fix if needed: `sudo chown -R 1001:1001 ~/.nanobot`
3. Restart container: `docker-compose restart`

### Login Issues
If login redirects back to login page:
- Ensure you're using the correct password from docker-compose.yml
- Check logs: `docker logs nanobot-dashboard --tail 50`
- Verify container is running: `docker ps | grep nanobot-dashboard`

For more detailed troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## 🔐 Security

This project has undergone comprehensive security auditing and includes:
- Protection against command injection vulnerabilities
- Prevention of path traversal attacks
- Server-side session management with rate limiting
- Secure cookie handling (HttpOnly, SameSite)
- Security headers (CSP, X-Frame-Options, etc.)
- Non-root container execution
- Input validation and sanitization

For vulnerability reports or security concerns, see our [Security Policy](SECURITY.md).

## 📝 License

This project is designed specifically for the ultra-lightweight personal AI assistant architecture.

---

**⚠️ Important Security Note:** Change the default password before deploying to production. Use strong, unique passwords and consider implementing HTTPS with a reverse proxy for production deployments.
