# Database Migration Rollback Policy

Production migrations should be additive and forward-fix friendly.

## Policy

- Prefer additive migrations.
- Avoid destructive migrations during launch.
- Do not drop columns or enum values without a separate archival and compatibility plan.
- Keep application releases compatible with the previous schema whenever practical.
- Use restore only for data corruption or unrecoverable migration failure.

## Before Production Migration

- Confirm a recent PostgreSQL backup exists.
- Confirm restore has been tested.
- Run migrations on staging.
- Capture migration file names in the release record.
- Assign a database rollback owner.

## Rollback Decision

- App-only defect: roll back images.
- Additive migration defect: forward-fix with a new migration.
- Data corruption: stop writes and restore from backup.
- Long-running lock: cancel migration if safe, then evaluate forward-fix or restore.

## Restore Reference

Use `docs/backup-restore.md` for PostgreSQL restore commands and validation queries.

