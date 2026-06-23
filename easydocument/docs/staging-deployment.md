# Staging Deployment

Staging should mirror production closely while allowing safe mock integrations.

## Environment

- Use separate PostgreSQL, Redis, and MinIO/S3 resources.
- Use separate JWT and storage credentials.
- Use explicit staging `CORS_ORIGIN`.
- Use local/mock OTP only when the environment is clearly non-production.
- Do not point staging at production object buckets.

## Flow

1. Merge to `develop` or a release branch after PR validation passes.
2. Build immutable API and admin image tags.
3. Apply staging secrets through the secret manager.
4. Apply Kubernetes manifests with staging hostnames and image tags.
5. Run deployment smoke tests.
6. Run critical manual workflow checks.
7. Promote the same image tag to production only after approval.

## Staging Smoke Test

```bash
API_BASE_URL=https://staging-api.easydocument.example \
RUN_MOCK_OTP_FLOW=true \
./scripts/deployment-smoke-test.sh
```

