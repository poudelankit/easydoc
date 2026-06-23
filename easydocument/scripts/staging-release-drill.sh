#!/usr/bin/env bash
set -euo pipefail

COMMIT_SHA="${COMMIT_SHA:-}"
SEMANTIC_VERSION="${SEMANTIC_VERSION:-}"
STAGING_API_BASE_URL="${STAGING_API_BASE_URL:-}"
EXPECT_SMS_PROVIDER="${EXPECT_SMS_PROVIDER:-}"
EXPECT_PUSH_PROVIDER="${EXPECT_PUSH_PROVIDER:-firebase}"
EXPECT_SMS_PROVIDER_MODE="${EXPECT_SMS_PROVIDER_MODE:-staging-real-provider}"
EXPECT_PUSH_PROVIDER_MODE="${EXPECT_PUSH_PROVIDER_MODE:-staging-real-provider}"

if [[ -z "$COMMIT_SHA" || -z "$SEMANTIC_VERSION" ]]; then
  echo "COMMIT_SHA and SEMANTIC_VERSION are required for the staging release drill." >&2
  exit 1
fi

./scripts/validate-image-tags.sh "$COMMIT_SHA" "$SEMANTIC_VERSION" staging

if [[ "${VERIFY_STAGING_CONFIG:-true}" == "true" ]]; then
  ./scripts/verify-production-config.sh
fi

if [[ -x ./scripts/validate-kubernetes-manifests.sh ]]; then
  ./scripts/validate-kubernetes-manifests.sh
fi

if [[ -n "$STAGING_API_BASE_URL" ]]; then
  API_BASE_URL="$STAGING_API_BASE_URL" \
    EXPECT_SMS_PROVIDER="$EXPECT_SMS_PROVIDER" \
    EXPECT_PUSH_PROVIDER="$EXPECT_PUSH_PROVIDER" \
    EXPECT_SMS_PROVIDER_MODE="$EXPECT_SMS_PROVIDER_MODE" \
    EXPECT_PUSH_PROVIDER_MODE="$EXPECT_PUSH_PROVIDER_MODE" \
    ./scripts/deployment-smoke-test.sh
else
  cat <<'DRILL'
Staging release drill completed without live smoke tests.
Set STAGING_API_BASE_URL to run deployment smoke tests against a staging API.
Expected provider modes:
 - OTP provider: staging-real-provider
 - Push provider: staging-real-provider
DRILL
fi
