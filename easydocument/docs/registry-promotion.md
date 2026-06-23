# Registry Promotion

Phase 12 uses manual registry promotion. No workflow deploys to a live cluster automatically.

## Image Names

- `ghcr.io/<owner>/api`
- `ghcr.io/<owner>/admin`

## Tag Strategy

Every release candidate should have:

- `sha-<12-char-commit>`: immutable commit tag.
- `v<major>.<minor>.<patch>`: semantic release tag.
- `staging`: mutable staging environment tag.
- `production`: mutable production environment tag.

Promote the same immutable SHA tag from staging to production. Do not rebuild between staging and production unless the rebuild becomes a new release candidate.

## Manual Workflow

Use `.github/workflows/container-registry-promotion.yml`.

Inputs:

- `semantic_version`
- `deploy_environment`
- `source_sha`
- `confirm_registry_promotion=PROMOTE`

The workflow validates tags, builds API/admin images, and pushes SHA, semantic, and environment tags to GHCR.

## Local Validation

```bash
COMMIT_SHA=$(git rev-parse HEAD) \
SEMANTIC_VERSION=v1.2.3 \
DEPLOY_ENVIRONMENT=staging \
./scripts/validate-image-tags.sh
```

```bash
SEMANTIC_VERSION=v1.2.3 \
DEPLOY_ENVIRONMENT=staging \
./scripts/create-release-tags.sh
```

`create-release-tags.sh` is dry-run by default. Set `APPLY_TAGS=true` only when the source image already exists locally.

