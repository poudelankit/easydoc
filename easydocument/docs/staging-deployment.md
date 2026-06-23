# Staging Deployment

Staging should mirror production closely while allowing safe mock integrations.

## Environment

- Use separate PostgreSQL, Redis, and MinIO/S3 resources.
- Use separate JWT and storage credentials.
- Use explicit staging `CORS_ORIGIN`.
- Use `SMS_PROVIDER=local-mock` only for local development. Real staging provider activation should return `staging-real-provider` from `/health/otp-provider`.
- Use `PUSH_PROVIDER=firebase` for staging. Keep actual push sends placeholder-safe until device-token registration is available.
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
EXPECT_SMS_PROVIDER=real-sms-provider \
EXPECT_PUSH_PROVIDER=firebase \
EXPECT_SMS_PROVIDER_MODE=staging-real-provider \
EXPECT_PUSH_PROVIDER_MODE=staging-real-provider \
./scripts/deployment-smoke-test.sh
```

For a local mock OTP check, run against `http://localhost:3000` with `RUN_MOCK_OTP_FLOW=true`. Do not run mock OTP checks against real staging providers.

## Provider Activation Drill

```bash
COMMIT_SHA=<release-sha> \
SEMANTIC_VERSION=v1.0.0 \
STAGING_API_BASE_URL=https://staging-api.easydocument.example \
EXPECT_SMS_PROVIDER=real-sms-provider \
./scripts/staging-release-drill.sh
```

See `docs/provider-activation-runbook.md` for the full staging provider activation procedure.
