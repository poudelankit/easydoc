#!/usr/bin/env bash
set -euo pipefail

required=(
  NODE_ENV
  DATABASE_URL
  REDIS_URL
  JWT_SECRET
  CORS_ORIGIN
  MINIO_ENDPOINT
  MINIO_ACCESS_KEY
  MINIO_SECRET_KEY
  MINIO_BUCKET_KYC
  MINIO_BUCKET_CHAT
  MINIO_BUCKET_EXPORTS
  SMS_PROVIDER
  SMS_PROVIDER_ENDPOINT
  SMS_PROVIDER_API_KEY
  SMS_PROVIDER_SENDER_ID
  PUSH_PROVIDER
  FIREBASE_PROJECT_ID
  GOOGLE_MAPS_API_KEY
)

placeholder_values=(
  ""
  "placeholder"
  "replace-me"
  "replace-with-strong-local-secret"
  "replace-with-sms-provider-key"
  "replace-with-firebase-service-account-json"
  "replace-with-google-maps-key"
  "https://sms-provider.example/send"
  "minioadmin"
  "minioadmin123"
  "easydoc_dev_password"
)

errors=()

for name in "${required[@]}"; do
  value="${!name-}"
  if [[ -z "$value" ]]; then
    errors+=("${name} is required.")
    continue
  fi

  for placeholder in "${placeholder_values[@]}"; do
    if [[ "$value" == "$placeholder" ]]; then
      errors+=("${name} uses a placeholder value.")
    fi
  done
done

case "${NODE_ENV:-}" in
  staging | production) ;;
  *) errors+=("NODE_ENV must be staging or production.") ;;
esac

if [[ "${SMS_PROVIDER:-}" == "local-mock" ]]; then
  errors+=("SMS_PROVIDER must not be local-mock for staging or production.")
fi

if [[ "${PUSH_PROVIDER:-}" != "firebase" ]]; then
  errors+=("PUSH_PROVIDER must be firebase for staging or production.")
fi

if [[ -z "${FIREBASE_SERVICE_ACCOUNT_JSON:-}" && -z "${FIREBASE_SERVICE_ACCOUNT_SECRET_NAME:-}" && -z "${FIREBASE_SERVICE_ACCOUNT_PATH:-}" ]]; then
  errors+=("FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_PATH, or FIREBASE_SERVICE_ACCOUNT_SECRET_NAME is required.")
fi

if [[ "${CORS_ORIGIN:-}" == "*" ]]; then
  errors+=("CORS_ORIGIN must not be '*'.")
fi

if (( ${#errors[@]} > 0 )); then
  printf "Production config verification failed:\n" >&2
  printf " - %s\n" "${errors[@]}" >&2
  exit 1
fi

echo "Production config verification passed."
