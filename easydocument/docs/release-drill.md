# Release Drill

Run this drill before the first real production launch and before major launch-day changes.

## Staging Deployment

1. Run branch/PR validation.
2. Build and promote images with `container-registry-promotion.yml`.
3. Confirm staging secrets with `./scripts/verify-production-config.sh`.
4. Apply migrations to staging.
5. Apply staging Kubernetes manifests manually.
6. Run deployment smoke tests.
7. Confirm provider activation using `docs/provider-activation-runbook.md`.

## Migration Application

```bash
DATABASE_URL=postgresql://... ./scripts/validate-migrations.sh
```

For staging and production, run migrations only after the backup preflight in `docs/migration-deployment-checklist.md`.

## Smoke Validation

```bash
API_BASE_URL=https://staging-api.easydocument.example \
EXPECT_SMS_PROVIDER=real-sms-provider \
EXPECT_PUSH_PROVIDER=firebase \
EXPECT_SMS_PROVIDER_MODE=staging-real-provider \
EXPECT_PUSH_PROVIDER_MODE=staging-real-provider \
./scripts/deployment-smoke-test.sh
```

The scripted staging drill can be run with:

```bash
COMMIT_SHA=<release-sha> \
SEMANTIC_VERSION=v1.0.0 \
STAGING_API_BASE_URL=https://staging-api.easydocument.example \
EXPECT_SMS_PROVIDER=real-sms-provider \
./scripts/staging-release-drill.sh
```

## Production Promotion

1. Confirm the same SHA tag passed staging.
2. Run the production deployment approval workflow.
3. Apply production manifests manually through the approved cluster process.
4. Run production smoke tests.
5. Watch post-launch monitoring for at least 60 minutes.

## Rollback

If smoke tests fail or readiness drops, follow `docs/production-rollback-rehearsal.md`.
