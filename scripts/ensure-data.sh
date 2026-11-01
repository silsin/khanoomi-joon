#!/bin/sh
# Ensures host DATA_DIR exists and, if empty, copies from the old Docker named volume.
# Safe to run on every deploy — only migrates when the host dir has no database yet.
set -e

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
elif [ -f .env.production ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env.production
  set +a
fi

DATA_DIR="${DATA_DIR:-./data}"

case "$DATA_DIR" in
  /*) ;;
  *) DATA_DIR="$(pwd)/$DATA_DIR" ;;
esac

mkdir -p "${DATA_DIR}/uploads"

DB_FILE="${DATA_DIR}/delly-gold.db"

# Already have data on the host — nothing to migrate
if [ -f "$DB_FILE" ]; then
  echo "→ Data dir ready: ${DATA_DIR}"
  exit 0
fi

# Find old named volumes (plain name or Compose-prefixed)
OLD_VOLUME=""
for candidate in \
  delly-gold-db \
  $(docker volume ls -q 2>/dev/null | grep -E 'delly-gold-db$' || true)
do
  if [ -n "$candidate" ] && docker volume inspect "$candidate" >/dev/null 2>&1; then
    # Prefer a volume that actually contains the DB
    if docker run --rm -v "${candidate}:/from:ro" alpine \
      test -f /from/delly-gold.db 2>/dev/null; then
      OLD_VOLUME="$candidate"
      break
    fi
    # Keep first existing volume as fallback if none have the DB yet
    if [ -z "$OLD_VOLUME" ]; then
      OLD_VOLUME="$candidate"
    fi
  fi
done

if [ -z "$OLD_VOLUME" ]; then
  echo "→ Data dir ready (new): ${DATA_DIR}"
  exit 0
fi

echo "→ Migrating data from Docker volume '${OLD_VOLUME}' → ${DATA_DIR}"
docker run --rm \
  -v "${OLD_VOLUME}:/from:ro" \
  -v "${DATA_DIR}:/to" \
  alpine \
  sh -c "cp -a /from/. /to/ && mkdir -p /to/uploads"

if [ -f "$DB_FILE" ]; then
  echo "✓ Migration complete — DB and uploads are on the host now"
else
  echo "→ Volume '${OLD_VOLUME}' had no delly-gold.db; starting fresh at ${DATA_DIR}"
fi
