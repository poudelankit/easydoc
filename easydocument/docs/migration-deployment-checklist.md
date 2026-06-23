# Migration Deployment Checklist

Use this checklist before applying SQL migrations outside local development.

## Preflight

- Review every migration file in order.
- Confirm migrations are idempotent where possible.
- Run `./scripts/validate-migrations.sh` against a disposable database.
- Confirm PostgreSQL backup is recent and restorable.
- Confirm application image is compatible with both pre-migration and post-migration states when possible.

## Deployment

- Pause risky manual admin operations.
- Apply migrations before the API rollout when the new API requires new columns or tables.
- Monitor database locks and query latency.
- Keep migration logs in the release record.

## Rollback

- Prefer a forward migration for additive schema changes.
- Restore from backup only when data integrity is compromised.
- If restore is needed, stop application writes before restoring.

