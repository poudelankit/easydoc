#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SEMANTIC_VERSION="${SEMANTIC_VERSION:-${1:-}}"
COMMIT_SHA="${COMMIT_SHA:-$(git rev-parse HEAD)}"
DEPLOY_ENVIRONMENT="${DEPLOY_ENVIRONMENT:-staging}"
REGISTRY_NAMESPACE="${REGISTRY_NAMESPACE:-ghcr.io/easydocument}"
APPLY_TAGS="${APPLY_TAGS:-false}"

if [[ -z "$SEMANTIC_VERSION" ]]; then
  echo "Usage: SEMANTIC_VERSION=v1.2.3 [COMMIT_SHA=...] [DEPLOY_ENVIRONMENT=staging|production] $0" >&2
  exit 1
fi

mapfile -t TAGS < <(COMMIT_SHA="$COMMIT_SHA" SEMANTIC_VERSION="$SEMANTIC_VERSION" DEPLOY_ENVIRONMENT="$DEPLOY_ENVIRONMENT" ./scripts/validate-image-tags.sh)
SHA_TAG="${TAGS[0]}"
VERSION_TAG="${TAGS[1]}"
ENVIRONMENT_TAG="${TAGS[2]}"

for app in api admin; do
  source_image="${REGISTRY_NAMESPACE}/${app}:${SHA_TAG}"
  version_image="${REGISTRY_NAMESPACE}/${app}:${VERSION_TAG}"
  environment_image="${REGISTRY_NAMESPACE}/${app}:${ENVIRONMENT_TAG}"

  echo "Release tags for ${app}:"
  echo "  ${source_image}"
  echo "  ${version_image}"
  echo "  ${environment_image}"

  if [[ "$APPLY_TAGS" == "true" ]]; then
    docker tag "$source_image" "$version_image"
    docker tag "$source_image" "$environment_image"
  else
    echo "  dry-run: set APPLY_TAGS=true to run docker tag commands."
  fi
done
