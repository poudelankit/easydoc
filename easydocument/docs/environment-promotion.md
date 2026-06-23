# Environment Promotion

EasyDocument promotes code and images through three environments.

## Local

- Developer-owned PostgreSQL, Redis, and MinIO through Docker Compose.
- Local/mock OTP is allowed.
- Flutter Linux validation is allowed for local checks.
- No production secrets.

## Staging

- Production-like infrastructure and Kubernetes shape.
- Environment-specific secrets from the secret manager.
- Mock OTP allowed only when clearly configured as staging.
- Deployment smoke tests are required before promotion.

## Production

- Manual approval required.
- Immutable image tags only.
- Real secrets from the production secret manager.
- Explicit `CORS_ORIGIN`.
- No dev OTP exposure.
- Smoke tests and monitoring checks required after rollout.

## Promotion Rule

Promote the same image tag that passed staging. Do not rebuild between staging and production unless the rebuild is treated as a new release candidate.

