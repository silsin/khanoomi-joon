#!/bin/sh
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Delly Gold — Starting up"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

UPLOAD_DIR="${UPLOAD_DIR:-/app/data/uploads}"

# Bind mounts are often owned by root on the host — fix so nextjs can write
if [ "$(id -u)" = "0" ]; then
  mkdir -p "$UPLOAD_DIR"
  chown -R nextjs:nodejs /app/data
  exec su-exec nextjs "$0"
fi

mkdir -p "$UPLOAD_DIR"

echo "📦 Setting up database..."
node scripts/setup-db.mjs

echo "🚀 Starting Next.js server..."
exec node server.js
