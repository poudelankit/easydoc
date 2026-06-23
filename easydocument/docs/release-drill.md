# Release Drill

Run this drill before the first real production launch and before major launch-day changes.

## Staging Deployment

1. Run branch/PR validation.
2. Build and promote images with `container-registry-promotion.yml`.
3. Confirm staging secrets with `./scripts/verify-production-config.sh`.
4. Apply migrations to staging.
5. Apply staging Kubernetes manifests manually.
6. Run deployment smoke tests.

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
./scripts/deployment-smoke-test.sh
```

## Production Promotion

1. Confirm the same SHA tag passed staging.
2. Run the production deployment approval workflow.
3. Apply production manifests manually through the approved cluster process.
4. Run production smoke tests.
5. Watch post-launch monitoring for at least 60 minutes.

## Rollback

If smoke tests fail or readiness drops, follow `docs/production-rollback-rehearsal.md`.

