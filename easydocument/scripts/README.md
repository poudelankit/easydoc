# Scripts

Local operational scripts for the EasyDocument monorepo.

Scripts in this folder should be safe for local development and avoid destructive operations.

## Available Scripts

- `start-local-infra.sh`: starts PostgreSQL, Redis, and MinIO.
- `check-local-infra.sh`: shows local Docker Compose service status.
- `stop-local-infra.sh`: stops local Docker Compose services without deleting volumes.
- `validate-production-readiness.sh`: runs Compose config validation, builds, backend/admin tests, and Flutter validation when the Flutter SDK is installed.
