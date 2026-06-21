#!/usr/bin/env bash
set -euo pipefail

echo "Running EasyDocument database migrations"
for migration in /migrations/*.sql; do
  [ -e "$migration" ] || continue
  echo "Applying $migration"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$migration"
done

echo "Running EasyDocument database seeds"
for seed in /seeds/*.sql; do
  [ -e "$seed" ] || continue
  echo "Applying $seed"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$seed"
done
