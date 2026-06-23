# Scripts

Local operational scripts for the EasyDocument monorepo.

Scripts in this folder should be safe for local development and avoid destructive operations.

## Available Scripts

- `start-local-infra.sh`: starts PostgreSQL, Redis, and MinIO.
- `check-local-infra.sh`: shows local Docker Compose service status.
- `stop-local-infra.sh`: stops local Docker Compose services without deleting volumes.
- `validate-migrations.sh`: applies all SQL migrations to the `DATABASE_URL` target with `ON_ERROR_STOP`.
- `validate-kubernetes-manifests.sh`: validates sample Kubernetes manifest syntax, using `kubectl` when available.
- `deployment-smoke-test.sh`: checks deployed health, readiness, dependency health, admin auth blocking, metrics, and optional local/mock OTP flow.
- `validate-production-readiness.sh`: runs Compose config validation, builds, backend/admin tests, and Flutter validation when the Flutter SDK is installed.
