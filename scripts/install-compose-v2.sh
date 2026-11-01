#!/bin/sh
# Install Docker Compose v2 plugin (Linux x86_64).
# Usage: sudo ./scripts/install-compose-v2.sh

set -e

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo ./scripts/install-compose-v2.sh"
  exit 1
fi

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64|amd64) COMPOSE_ARCH="x86_64" ;;
  aarch64|arm64) COMPOSE_ARCH="aarch64" ;;
  *)
    echo "Unsupported architecture: $ARCH"
    exit 1
    ;;
esac

PLUGIN_DIR="/usr/local/lib/docker/cli-plugins"
PLUGIN="${PLUGIN_DIR}/docker-compose"
URL="https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-${COMPOSE_ARCH}"

mkdir -p "${PLUGIN_DIR}"
echo "→ Downloading Compose v2 (${COMPOSE_ARCH})..."
curl -fsSL "${URL}" -o "${PLUGIN}"
chmod +x "${PLUGIN}"

echo "→ Verifying..."
docker compose version

echo ""
echo "✓ Docker Compose v2 installed."
echo "  Use: docker compose up -d --build"
