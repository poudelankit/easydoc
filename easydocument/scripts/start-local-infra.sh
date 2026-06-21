#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

docker compose \
  --env-file "$ROOT_DIR/infra/docker/.env.example" \
  -f "$ROOT_DIR/infra/docker/docker-compose.yml" \
  up -d

echo "EasyDocument local infrastructure is starting."
echo "PostgreSQL: localhost:55432"
echo "Redis:      localhost:6379"
echo "MinIO API:  http://localhost:9000"
echo "MinIO UI:   http://localhost:9001"
