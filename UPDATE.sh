#!/bin/bash
# Quick update script for NanobotWeb dashboard

echo "🚀 Updating NanobotWeb Dashboard..."
echo ""

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Git pull failed. Please check your git configuration."
    exit 1
fi

# Check docker socket GID
SOCKET_GID=$(stat -c '%g' /var/run/docker.sock 2>/dev/null)
if [ -z "$SOCKET_GID" ]; then
    echo "⚠️  Warning: Could not detect docker socket GID"
    echo "   Using default GID 999"
    SOCKET_GID=999
else
    echo "✅ Detected docker socket GID: $SOCKET_GID"
fi

# Export for docker-compose
export DOCKER_GID=$SOCKET_GID

# Stop existing container
echo ""
echo "🛑 Stopping existing container..."
docker-compose down

# Rebuild with correct GID
echo ""
echo "🔨 Building with DOCKER_GID=$DOCKER_GID..."
docker-compose build --no-cache

# Start container
echo ""
echo "▶️  Starting container..."
docker-compose up -d

# Wait a moment for startup
echo ""
echo "⏳ Waiting for container to start..."
sleep 3

# Check status
echo ""
echo "📊 Container status:"
docker-compose ps

# Show recent logs
echo ""
echo "📝 Recent logs:"
docker-compose logs --tail 10

echo ""
echo "✅ Update complete!"
echo ""
echo "🌐 Dashboard should be available at:"
echo "   http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "To view logs: docker-compose logs -f nanobot-dashboard"
