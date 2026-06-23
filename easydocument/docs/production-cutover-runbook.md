# Staging-To-Production Cutover Runbook

This runbook prepares a real production deployment without automatic cluster deployment from GitHub Actions.

## Preconditions

- Phase 12 validation passes.
- Launch credentials are created in the production secret manager.
- Staging release drill passed with the same image SHA.
- Rollback rehearsal completed.
- Migration rollback policy reviewed.

## Cutover Flow

1. Freeze release branch.
2. Run branch/PR validation.
3. Promote images with SHA, semantic, staging, and production tags.
4. Apply migrations to production after backup confirmation.
5. Apply production Kubernetes manifests manually through the approved deployment tool.
6. Run production smoke tests.
7. Watch post-launch monitoring.
8. Announce launch or rollback decision.

## Smoke Test

```bash
API_BASE_URL=https://api.easydocument.example \
EXPECT_SMS_PROVIDER=real-sms-provider \
EXPECT_PUSH_PROVIDER=firebase \
./scripts/deployment-smoke-test.sh
```

Do not enable `RUN_MOCK_OTP_FLOW` in production.

## Rollback Trigger

Rollback if readiness fails, critical login/task flows fail, data integrity is at risk, or incident lead decides launch risk is too high.

Follow `docs/production-rollback-rehearsal.md`.

