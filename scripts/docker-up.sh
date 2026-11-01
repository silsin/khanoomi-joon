#!/bin/sh

set -e

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

APP_PORT="${APP_PORT:-4000}"
JWT_SECRET="${JWT_SECRET:-delly-gold-change-this-secret-in-production}"
JWT_EXPIRES_IN="${JWT_EXPIRES_IN:-7d}"
NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
HUGGINGFACE_API_TOKEN="${HUGGINGFACE_API_TOKEN:-}"
IMAGE="${IMAGE:-delly-gold:latest}"
CONTAINER="${CONTAINER:-delly-gold}"
# Host directory for SQLite + uploads (survives container rebuilds)
DATA_DIR="${DATA_DIR:-./data}"

# Resolve relative path against the project root
case "$DATA_DIR" in
  /*) ;;
  *) DATA_DIR="$(pwd)/$DATA_DIR" ;;
esac

echo "→ Ensuring host data dir (auto-migrate if needed)..."
DATA_DIR="$DATA_DIR" sh scripts/ensure-data.sh

echo "→ Building image ${IMAGE}..."
docker build -t "${IMAGE}" .

echo "→ Replacing container ${CONTAINER}..."
docker rm -f "${CONTAINER}" >/dev/null 2>&1 || true

echo "→ Starting on port ${APP_PORT}..."
docker run -d \
  --name "${CONTAINER}" \
  --restart unless-stopped \
  -p "${APP_PORT}:3000" \
  -v "${DATA_DIR}:/app/data" \
  -e NODE_ENV=production \
  -e "DATABASE_URL=file:/app/data/delly-gold.db" \
  -e "UPLOAD_DIR=/app/data/uploads" \
  -e "JWT_SECRET=${JWT_SECRET}" \
  -e "JWT_EXPIRES_IN=${JWT_EXPIRES_IN}" \
  -e "NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}" \
  -e "HUGGINGFACE_API_TOKEN=${HUGGINGFACE_API_TOKEN}" \
  "${IMAGE}"

echo ""
echo "✓ Delly Gold is running at http://localhost:${APP_PORT}"
echo "  Host data: ${DATA_DIR}"
echo "  Uploads:   ${DATA_DIR}/uploads"
echo "  Logs: docker logs -f ${CONTAINER}"
echo "  Stop: docker rm -f ${CONTAINER}"
