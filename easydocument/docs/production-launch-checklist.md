# Production Launch Checklist

## Credentials

- All credentials in `docs/launch-credentials.md` exist in the production secret manager.
- No local placeholders remain.
- Firebase service account JSON is stored only in the secret manager.
- Firebase credential is injected as secret JSON or mounted as `FIREBASE_SERVICE_ACCOUNT_PATH`.
- SMS provider sender ID is approved.
- SMS provider endpoint and API key are configured in the secret manager.
- Google Maps key is restricted by platform and hostname where possible.

## Infrastructure

- PostgreSQL/PostGIS is provisioned with backups.
- Redis is provisioned and monitored.
- MinIO/S3 buckets exist with lifecycle policy.
- Kubernetes manifests are reviewed for production domains.
- Ingress/TLS is configured.

## Release

- PR validation passed.
- Registry promotion completed.
- Staging release drill passed.
- Provider activation drill passed with production-mode expectations.
- Production deployment approval workflow passed.
- Migration checklist completed.
- Rollback owner and incident lead assigned.

## Final Gate

- Smoke tests pass in production.
- `/health/otp-provider` reports `production-real-provider`.
- `/health/push-provider` reports `production-real-provider`.
- `/metrics` is scraped.
- Structured logs are visible.
- Alert channels are monitored.
- Customer support knows launch status.
