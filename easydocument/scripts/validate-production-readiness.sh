#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== Docker Compose config =="
docker compose -f infra/docker/docker-compose.yml config >/dev/null

echo "== Shared, API, and admin builds =="
npm run build --workspaces --if-present

echo "== Backend tests =="
npm run test --workspace @easydocument/api -- --runInBand

echo "== Admin tests =="
npm run test --workspace @easydocument/admin

if command -v flutter >/dev/null 2>&1; then
  echo "== Flutter analyze/test =="
  (cd apps/mobile && flutter analyze && flutter test)
else
  echo "Flutter SDK not installed; skipping mobile analyze/test."
fi

echo "Production readiness validation completed."
