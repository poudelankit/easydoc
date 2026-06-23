# Production Readiness Checklist

## Configuration

- Backend production environment variables pass startup validation.
- Admin build uses production `VITE_API_BASE_URL` and `VITE_SOCKET_URL`.
- Mobile builds pass `--dart-define` values for API, Socket.IO, Google Maps, and `PRODUCTION=true`.
- Docker Compose local app profile starts when needed.
- Kubernetes config maps and secrets are environment-specific.

## Reliability

- `/health/live` and `/health/ready` are configured as probes.
- Database, Redis, and MinIO health checks are monitored.
- PostgreSQL backups and restore drills are scheduled.
- MinIO/S3 bucket backup and lifecycle policy are configured.

## Security

- Local placeholders are removed from production secrets.
- CORS is explicit.
- Audit logs are retained.
- Rate limiting is enabled.
- Admin routes are protected by RBAC and operational access controls.

## Validation

```bash
./scripts/validate-production-readiness.sh
```

Release should not proceed until backend, shared types, admin, and mobile validation pass.
