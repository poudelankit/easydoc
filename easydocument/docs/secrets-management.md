# Secrets Management

Do not commit real secrets. The repository contains only names, placeholders, and sample wiring.

## Required Secrets

- `DATABASE_URL`: PostgreSQL/PostGIS connection URL.
- `REDIS_URL`: Redis connection URL.
- `JWT_SECRET`: strong random signing secret, never a fallback.
- `CORS_ORIGIN`: explicit production admin/mobile origin allowlist.
- `MINIO_ENDPOINT`: MinIO or S3-compatible endpoint.
- `MINIO_ACCESS_KEY`: object storage access key.
- `MINIO_SECRET_KEY`: object storage secret key.
- `MINIO_BUCKET`: top-level storage namespace used by deployment tooling.
- `ADMIN_API_URL`: admin portal API base URL for deployment smoke tests.
- `MOBILE_API_URL`: mobile app API base URL.
- `SOCKET_URL`: Socket.IO base URL.
- `SMS_PROVIDER`: production SMS provider name.
- `SMS_PROVIDER_ENDPOINT`: SMS provider API endpoint.
- `SMS_PROVIDER_API_KEY`: SMS provider API key.
- `SMS_PROVIDER_SENDER_ID`: approved SMS sender ID.
- `PUSH_PROVIDER`: `firebase` outside local development.
- `FIREBASE_PROJECT_ID`: Firebase project ID.
- `FIREBASE_SERVICE_ACCOUNT_SECRET_NAME`: secret-manager reference for Firebase service account.
- `FIREBASE_SERVICE_ACCOUNT_JSON`: optional injected JSON from the secret manager.
- `FIREBASE_SERVICE_ACCOUNT_PATH`: optional mounted service-account JSON path.
- `GOOGLE_MAPS_API_KEY`: restricted Google Maps API key.

The backend currently also supports purpose-specific object buckets: `MINIO_BUCKET_KYC`, `MINIO_BUCKET_CHAT`, and `MINIO_BUCKET_EXPORTS`. In production, derive these from the same storage account or map them explicitly in the secret manager.

## GitHub Actions

Use GitHub Environments for `staging` and `production`. Store environment-specific secrets in each environment, and require reviewers for production.

The manual deployment workflow reads `ADMIN_API_URL` for optional smoke testing. Other deployment secrets should be added only when a real cluster deploy step is introduced.

## Kubernetes

`infra/kubernetes/secrets.example.yaml` documents the expected Secret keys and intentionally uses fake values.

`infra/kubernetes/external-secrets.example.yaml` is a placeholder for External Secrets Operator. Adapt the provider block to AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, Vault, or your chosen manager.

See `docs/launch-credentials.md` for the complete launch credential checklist.
See `docs/provider-activation-runbook.md` for staging real-provider activation and rollback rehearsal.

## Rotation Notes

- Rotate `JWT_SECRET` with a token invalidation window and user-session communication plan.
- Rotate object storage credentials with dual credentials where supported.
- Rotate database and Redis credentials during a maintenance window or with connection-pool draining.
- Record every production secret rotation in the release log.
