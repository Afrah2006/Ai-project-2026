#!/usr/bin/env bash
# Run on your VPS (Ubuntu/Debian) from the project root: bash scripts/vps-deploy.sh
set -euo pipefail

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found. Install: https://docs.docker.com/engine/install/"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin not found. Install docker-compose-plugin."
  exit 1
fi

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "Created .env from .env.example (HOST_PORT=3000)"
fi

echo "Building and starting containers..."
docker compose up -d --build

echo ""
echo "Deployment started."
docker compose ps
echo ""
echo "Open: http://YOUR_SERVER_IP:${HOST_PORT:-3000}"
echo "Logs: docker compose logs -f web"
