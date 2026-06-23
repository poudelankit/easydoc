#!/usr/bin/env bash
set -euo pipefail

COMMIT_SHA="${COMMIT_SHA:-${1:-}}"
SEMANTIC_VERSION="${SEMANTIC_VERSION:-${2:-}}"
DEPLOY_ENVIRONMENT="${DEPLOY_ENVIRONMENT:-${3:-staging}}"

if [[ ! "$COMMIT_SHA" =~ ^[0-9a-fA-F]{7,40}$ ]]; then
  echo "COMMIT_SHA must be a 7-40 character Git SHA." >&2
  exit 1
fi

if [[ ! "$SEMANTIC_VERSION" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
  echo "SEMANTIC_VERSION must look like v1.2.3 or 1.2.3." >&2
  exit 1
fi

case "$DEPLOY_ENVIRONMENT" in
  staging | production) ;;
  *)
    echo "DEPLOY_ENVIRONMENT must be staging or production." >&2
    exit 1
    ;;
esac

SHORT_SHA="${COMMIT_SHA:0:12}"
VERSION_TAG="${SEMANTIC_VERSION#v}"

echo "sha-${SHORT_SHA}"
echo "v${VERSION_TAG}"
echo "$DEPLOY_ENVIRONMENT"
