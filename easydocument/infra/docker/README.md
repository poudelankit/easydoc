# Local Docker

Local infrastructure for EasyDocument development.

## Services

- PostgreSQL with PostGIS on port `55432` by default, avoiding common local `5432` conflicts.
- Redis on port `6379`.
- MinIO API on port `9000`.
- MinIO console on port `9001`.
- Optional API/admin app profile for local container validation.

## Commands

```bash
../../scripts/start-local-infra.sh
../../scripts/check-local-infra.sh
../../scripts/stop-local-infra.sh
```

Run the optional app containers:

```bash
docker compose -f docker-compose.yml --profile app up -d --build
```
