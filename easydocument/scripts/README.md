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
- `validate-image-tags.sh`: validates commit SHA, semantic version, and staging/production image tag inputs.
- `create-release-tags.sh`: prints or applies Docker tags for SHA, semantic version, and environment tags.
- `verify-production-config.sh`: checks required staging/production secret references and rejects local placeholders.
- `validate-production-readiness.sh`: runs Compose config validation, builds, backend/admin tests, and Flutter validation when the Flutter SDK is installed.
- `seed-local-demo-data.sh`: safely seeds local-only demo customer, agent, task, communication, dispute, review, and notification data. Refuses staging/production and non-local database URLs.
