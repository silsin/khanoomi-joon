#!/bin/sh
# Ensures the host DATA_DIR exists before `docker compose up`.
# Safe to run on every deploy. If the data dir still holds a database under the
# old file name (delly-gold.db), it is renamed to khanoomi-joon.db in place.
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

DB_FILE="${DATA_DIR}/khanoomi-joon.db"
LEGACY_DB="${DATA_DIR}/delly-gold.db"

if [ ! -f "$DB_FILE" ] && [ -f "$LEGACY_DB" ]; then
  for ext in "" "-wal" "-shm"; do
    [ -f "${LEGACY_DB}${ext}" ] && mv "${LEGACY_DB}${ext}" "${DB_FILE}${ext}"
  done
  echo "→ Renamed delly-gold.db → khanoomi-joon.db"
fi

if [ -f "$DB_FILE" ]; then
  echo "→ Data dir ready: ${DATA_DIR}"
else
  echo "→ Data dir ready (new database will be created): ${DATA_DIR}"
fi
