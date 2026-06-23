#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
RUN_MOCK_OTP_FLOW="${RUN_MOCK_OTP_FLOW:-false}"
SMOKE_TEST_PHONE="${SMOKE_TEST_PHONE:-98$(date +%s | tail -c 9)}"

API_BASE_URL="${API_BASE_URL%/}"

expect_status() {
  local method="$1"
  local path="$2"
  local expected="$3"
  local body="${4:-}"
  local response_file
  response_file="$(mktemp)"

  local status
  if [[ -n "$body" ]]; then
    status="$(curl -sS -X "$method" "$API_BASE_URL$path" \
      -H "Content-Type: application/json" \
      -d "$body" \
      -o "$response_file" \
      -w "%{http_code}")"
  else
    status="$(curl -sS -X "$method" "$API_BASE_URL$path" \
      -o "$response_file" \
      -w "%{http_code}")"
  fi

  if [[ "$status" != "$expected" ]]; then
    echo "$method $path expected $expected, got $status" >&2
    cat "$response_file" >&2
    rm -f "$response_file"
    exit 1
  fi
  rm -f "$response_file"
}

expect_status GET /health/live 200
expect_status GET /health/ready 200
expect_status GET /health/database 200
expect_status GET /health/redis 200
expect_status GET /health/minio 200
expect_status GET /metrics 200
expect_status GET /v1/admin/dashboard 401

if [[ "$RUN_MOCK_OTP_FLOW" == "true" ]]; then
  expect_status POST /v1/auth/otp/send 201 "{\"phoneNumber\":\"$SMOKE_TEST_PHONE\",\"purpose\":\"LOGIN\"}"
  expect_status POST /v1/auth/otp/verify 201 "{\"phoneNumber\":\"$SMOKE_TEST_PHONE\",\"purpose\":\"LOGIN\",\"otp\":\"123456\"}"
fi

echo "Deployment smoke tests completed."
