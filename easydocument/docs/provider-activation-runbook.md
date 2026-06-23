# Provider Activation Runbook

Phase 13 prepares real SMS and Firebase provider activation for staging and production. It does not send live messages during automated tests and does not store credentials in the repository.

## Provider Modes

- Local development OTP: `SMS_PROVIDER=local-mock`, health mode `local-mock`.
- Local development push: `PUSH_PROVIDER=placeholder`, health mode `placeholder`.
- Development Firebase placeholder: `PUSH_PROVIDER=firebase`, health mode `firebase-placeholder`.
- Staging real provider wiring: `NODE_ENV=staging`, health mode `staging-real-provider`.
- Production real provider wiring: `NODE_ENV=production`, health mode `production-real-provider`.

## Required Staging Credentials

- `STAGING_SMS_PROVIDER`
- `STAGING_SMS_PROVIDER_ENDPOINT`
- `STAGING_SMS_PROVIDER_API_KEY`
- `STAGING_SMS_PROVIDER_SENDER_ID`
- `STAGING_PUSH_PROVIDER=firebase`
- `STAGING_FIREBASE_PROJECT_ID`
- `STAGING_FIREBASE_SERVICE_ACCOUNT_SECRET_NAME`
- one of `STAGING_FIREBASE_SERVICE_ACCOUNT_JSON` or `STAGING_FIREBASE_SERVICE_ACCOUNT_PATH`

## Required Production Credentials

- `SMS_PROVIDER`
- `SMS_PROVIDER_ENDPOINT`
- `SMS_PROVIDER_API_KEY`
- `SMS_PROVIDER_SENDER_ID`
- `PUSH_PROVIDER=firebase`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_SECRET_NAME`
- one of `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_SERVICE_ACCOUNT_PATH`

Use the secret manager or External Secrets to inject JSON or mount a credential file. Do not commit service account JSON or provider tokens.

## Staging Release Drill

1. Confirm staging credentials exist in the secret manager.
2. Run `COMMIT_SHA=<sha> SEMANTIC_VERSION=<version> ./scripts/staging-release-drill.sh`.
3. Deploy staging images through the approved manual deployment path.
4. Run smoke tests with `EXPECT_SMS_PROVIDER_MODE=staging-real-provider` and `EXPECT_PUSH_PROVIDER_MODE=staging-real-provider`.
5. Send one controlled OTP to an internal test number through the provider console or a manual staging-only request.
6. Confirm SMS logs include provider mode, provider name, status, retryability, and phone suffix only.
7. Confirm push logs never include device tokens or Firebase credential contents.

## Production Launch Rehearsal

1. Rehearse the exact staging drill with production-shaped secrets in a non-production environment.
2. Verify `/health/otp-provider` and `/health/push-provider` return `ready`.
3. Verify provider modes match the target environment.
4. Confirm support contacts and escalation paths for SMS and Firebase.
5. Confirm rollback images and previous known-good config are available.

## Controlled Cutover Checklist

1. Freeze release branch and image tags.
2. Apply provider secrets before application rollout.
3. Deploy API and admin images manually through the approved workflow.
4. Run live, ready, dependency, metrics, admin auth, OTP provider, and push provider smoke checks.
5. Run one controlled OTP verification from an internal test phone.
6. Keep Firebase push in placeholder/no-device-token mode until a real device token registration flow exists.
7. Monitor provider error logs for 60 minutes.

## Rollback Rehearsal Checklist

1. Save current provider config and image tags.
2. Roll back image tags first.
3. If provider config is the source of failure, restore previous secret values.
4. Re-run provider health and deployment smoke tests.
5. Record timeline, root cause, and any manual step that should be automated later.

## Post-Launch Monitoring Checklist

- OTP send success and failure rate.
- SMS provider latency and retryable failure rate.
- `/health/otp-provider` readiness.
- `/health/push-provider` readiness.
- Push send skipped count while device-token support is not active.
- Push provider failure logs after real device tokens are enabled.
- Audit logs for OTP verify and notification events.
