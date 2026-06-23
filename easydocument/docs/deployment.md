# Deployment

Phase 10 adds production readiness assets without changing product workflows.

## Required Runtime Inputs

Backend production-like environments require:

- `NODE_ENV=production` or `staging`
- `DATABASE_URL`
- `REDIS_URL`
- `MINIO_ENDPOINT`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET_KYC`
- `MINIO_BUCKET_CHAT`
- `MINIO_BUCKET_EXPORTS`
- `JWT_SECRET`
- `CORS_ORIGIN`

The backend exits during startup if required production values are missing or local placeholders are used.

## Build Images

```bash
docker build -f services/api/Dockerfile -t easydocument/api:phase10 .
docker build \
  -f apps/admin/Dockerfile \
  --build-arg VITE_API_BASE_URL=https://api.easydocument.example/v1 \
  --build-arg VITE_SOCKET_URL=https://api.easydocument.example \
  -t easydocument/admin:phase10 .
```

## Local App Profile

The existing local infrastructure flow is unchanged. To also build and run the API/admin containers locally:

```bash
docker compose -f infra/docker/docker-compose.yml --profile app up -d --build
```

## Kubernetes

Sample manifests live in `infra/kubernetes/`. Replace every example hostname, image tag, and secret before applying.

Stateful dependencies should be managed separately:

- PostgreSQL 15+ with PostGIS, backups, PITR, and TLS.
- Redis 7+ for rate limiting and ephemeral controls.
- MinIO/S3-compatible object storage with lifecycle policy and access logging.

## Health Probes

- `GET /health/live`: process liveness.
- `GET /health/ready`: database, Redis, and MinIO readiness.
- `GET /health/database`
- `GET /health/redis`
- `GET /health/minio`

## CI Validation

```bash
./scripts/validate-production-readiness.sh
```
