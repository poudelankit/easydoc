# Security Checklist

- Use strong `JWT_SECRET`; never use the local placeholder outside development.
- Configure explicit `CORS_ORIGIN` for staging and production.
- Keep `devOtp` local-only.
- Use TLS for public API, admin, database, Redis, and object storage connections.
- Store Kubernetes secrets through a secret manager or encrypted manifest workflow.
- Rotate MinIO/S3 credentials and JWT secrets on an approved schedule.
- Keep rate limiting enabled for OTP, OTP verify, message send, call request, and dispute creation.
- Review audit logs for login/OTP verify, agent decisions, task acceptance/status updates, dispute updates, review submission, and admin access.
- Do not enable real SMS or push credentials until provider-specific threat modeling is complete.
- Restrict admin portal access with network policy or identity-aware access controls.
- Validate backups and restore runbooks before go-live.
- Run `npm audit` as part of dependency review before release.
