# NanobotWeb Dashboard

A premium, localized web dashboard designed as a perfect companion UI for your [HKUDS/nanobot](https://github.com/HKUDS/nanobot) gateway. 

NanobotWeb runs in its own lightweight Docker container alongside your existing nanobot instance. It connects directly to your `~/.nanobot` workspace and local gateway (`localhost:18790`), transforming raw configuration JSONs and Markdown files into a stunning, interactive Graphical User Interface.

## ✨ Features

- **Secure Login**: Protected out-of-the-box by Next.js Edge Middleware. Your workspace configurations remain secure behind a customizable master password.
- **Persistent Chat Sessions**: Spin up multiple distinct conversations. The dashboard proxies chats directly to your running gateway, allowing real-time response testing.
- **Workspace File Explorer**: A complete built-in IDE for your `~/.nanobot/workspace/`. Browse into `skills/`, `memory/`, and `sessions/`, select any file (like your `HEARTBEAT.md` cron jobs), and edit them via a real-time text editor.
- **GUI Settings**: Manage your core `config.json` seamlessly. Easily change models, default provider APIs, and workspace paths without dealing with raw JSON brackets.
- **Beautiful Glassmorphism UI**: Native Dark Mode (`#09090b` base) paired with sleek gradients, Tailwind CSS animations, and `lucide-react` iconography.

## 🚀 Quick Start (Docker)

Because this dashboard is decoupled from the main gateway, running it is incredibly simple. It uses `network_mode: "host"` to easily securely find your pre-existing nanobot container.

1. Ensure your original nanobot is already running (accessible on port 18790).
2. Clone this repository:
   ```bash
   git clone https://github.com/3L1AS/NanobotWeb.git
   cd NanobotWeb
   ```
3. Copy the example configuration:
   ```bash
   cp docker-compose.example.yml docker-compose.yml
   ```
4. Run the dashboard container:
   ```bash
   docker compose up --build -d
   ```
5. Visit `http://localhost:3000` in your web browser. 
5. Enter the default master password: `admin`

*(You can change the default password by editing the `DASHBOARD_PASSWORD` variable in your `docker-compose.yml` file prior to building).*

## 🛠️ Tech Stack

- **Frontend**: Next.js (App Router), React, Tailwind CSS (v4)
- **Backend**: Next.js API Routes (Node.js) acting as a secure proxy to the nanobot gateway.
- **Containerization**: Docker & Docker Compose (Standalone Optimized Build)

---

*Designed specifically for the ultra-lightweight personal AI assistant architecture.*
