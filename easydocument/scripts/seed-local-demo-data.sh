#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATABASE_URL="${DATABASE_URL:-postgresql://easydoc:easydoc_dev_password@localhost:55432/easydocument}"
NODE_ENV="${NODE_ENV:-development}"

case "$NODE_ENV" in
  production | staging)
    echo "Refusing to seed demo data when NODE_ENV=$NODE_ENV." >&2
    exit 1
    ;;
esac

case "$DATABASE_URL" in
  *localhost* | *127.0.0.1* | *host.docker.internal*)
    ;;
  *)
    echo "Refusing to seed demo data into a non-local DATABASE_URL." >&2
    echo "DATABASE_URL must contain localhost, 127.0.0.1, or host.docker.internal." >&2
    exit 1
    ;;
esac

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required to seed local demo data." >&2
  exit 1
fi

psql "$DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -c "SET app.easydocument_local_demo_seed = 'true';" \
  -f "$ROOT_DIR/database/seeds/002_local_demo_flow.sql"

cat <<'SUMMARY'

Local demo accounts:
  Admin:    +9779800000001
  Customer: +9779800000100
  Agent:    +9779800000200

Local mock OTP: 123456
Demo task ID:   82000000-0000-4000-8000-000000000001

SUMMARY
