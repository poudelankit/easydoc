# Rollback Procedure

Use this runbook when a release causes failed readiness checks, elevated errors, broken critical workflows, or data migration risk.

## Immediate Rollback

1. Stop the rollout.
2. Announce the incident in the release channel.
3. Capture the failing image tag, commit SHA, and deployment timestamp.
4. Roll back the API and admin images to the previous known-good tag.
5. Run deployment smoke tests.

Example Kubernetes command:

```bash
kubectl rollout undo deployment/easydocument-api
kubectl rollout undo deployment/easydocument-admin
kubectl rollout status deployment/easydocument-api
kubectl rollout status deployment/easydocument-admin
```

## Database Migrations

Prefer forward fixes for already-applied migrations. Only restore the database when the migration corrupts data or makes the application unusable.

Before any production migration:

- Confirm a recent PostgreSQL backup exists.
- Confirm restore has been tested in staging.
- Record the migration file list in the release notes.

If restore is required, follow `docs/backup-restore.md` and pause writes before restoring.

## MinIO/Object Storage

Object storage rollback is usually metadata-driven. Restore objects only when files were deleted or overwritten incorrectly. Use versioning or bucket snapshots where available.

## After Rollback

- Keep the incident open until smoke tests pass.
- Record the root cause and follow-up work.
- Do not redeploy the failed tag without a new validation run.

