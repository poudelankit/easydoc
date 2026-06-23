# Production Dependencies

Use managed or separately operated services for stateful dependencies:

- PostgreSQL/PostGIS: managed PostgreSQL 15+ with PostGIS enabled, automated backups, PITR, TLS, and restricted network access.
- Redis: managed Redis 7+ with authentication/TLS when available. It is used for rate limiting and ephemeral auth controls.
- MinIO or S3-compatible storage: provision buckets for KYC, chat attachments, and exports. Enable versioning, lifecycle policies, and access logging.

Do not deploy the local Docker Compose PostgreSQL, Redis, or MinIO services into production Kubernetes.
