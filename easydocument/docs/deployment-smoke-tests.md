# Deployment Smoke Tests

Smoke tests verify that a deployed API is alive, ready, connected to dependencies, and enforcing admin authorization.

## Script

```bash
API_BASE_URL=https://api.easydocument.example ./scripts/deployment-smoke-test.sh
```

The script checks:

- `GET /health/live`
- `GET /health/ready`
- `GET /health/database`
- `GET /health/redis`
- `GET /health/minio`
- `GET /metrics`
- `GET /health/otp-provider`
- `GET /health/push-provider`
- `GET /v1/admin/dashboard` returns `401` without a token

Provider mode checks can be enforced:

```bash
API_BASE_URL=https://staging-api.easydocument.example \
EXPECT_SMS_PROVIDER=real-sms-provider \
EXPECT_PUSH_PROVIDER=firebase \
EXPECT_SMS_PROVIDER_MODE=staging-real-provider \
EXPECT_PUSH_PROVIDER_MODE=staging-real-provider \
./scripts/deployment-smoke-test.sh
```

## Non-Production OTP Check

For local or staging environments that intentionally use the local/mock OTP provider:

```bash
API_BASE_URL=http://localhost:3000 \
RUN_MOCK_OTP_FLOW=true \
EXPECT_SMS_PROVIDER=local-mock \
EXPECT_SMS_PROVIDER_MODE=local-mock \
EXPECT_PUSH_PROVIDER=placeholder \
EXPECT_PUSH_PROVIDER_MODE=placeholder \
./scripts/deployment-smoke-test.sh
```

Do not run the mock OTP flow against production.

## Expected Outcome

The script exits non-zero on the first failed check and prints the failing response body.
