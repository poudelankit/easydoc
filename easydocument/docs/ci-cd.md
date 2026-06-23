# CI/CD

Phase 12 wires validation, registry promotion, and manual deployment gates without enabling automatic production deploys.

## Workflows

- `.github/workflows/branch-pr-validation.yml`: runs on pull requests and pushes to `main` or `develop`.
- `.github/workflows/container-registry-promotion.yml`: manual build and registry promotion for SHA, semantic, staging, and production image tags.
- `.github/workflows/staging-deployment.yml`: manual staging deployment gate and optional smoke tests.
- `.github/workflows/production-deployment.yml`: manual `workflow_dispatch` gate for staging or production.

## Branch And PR Validation

The validation workflow runs:

- Backend build and tests.
- React admin build and tests.
- Shared types build.
- Flutter `pub get`, analyze, and tests.
- Backend and admin Docker image build validation.
- SQL migration validation against a temporary PostGIS database.
- Kubernetes manifest syntax validation.

## Manual Deployment Gate

The production deployment workflow is intentionally manual. It requires:

- Target environment: `staging` or `production`.
- Immutable image tag.
- Confirmation text: `APPROVED`.

The workflow validates Kubernetes manifests and can run smoke tests when `ADMIN_API_URL` is configured as a GitHub secret.

It does not apply manifests to a cluster yet. Real deployment should be wired after the staging cluster, image registry, secret manager, and approval policy are finalized.

## Registry Promotion

Image tags follow:

- `sha-<commit>`
- `v<semver>`
- `staging`
- `production`

See `docs/registry-promotion.md`.

## Local Equivalents

```bash
npm run build --workspace @easydocument/api
npm run test --workspace @easydocument/api -- --runInBand
npm run build --workspace @easydocument/admin
npm run test --workspace @easydocument/admin
npm run build --workspace @easydocument/shared-types
cd apps/mobile && flutter analyze && flutter test
./scripts/validate-kubernetes-manifests.sh
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB ./scripts/validate-migrations.sh
```
