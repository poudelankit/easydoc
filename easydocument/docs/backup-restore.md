# Backup And Restore

## PostgreSQL

Minimum production posture:

- Enable daily full backups and point-in-time recovery.
- Retain at least 30 days of backups for production.
- Test restore into an isolated environment before each major release.
- Include PostGIS extension state in restore validation.

Manual backup example:

```bash
pg_dump --format=custom --no-owner --file=easydocument.dump "$DATABASE_URL"
```

Manual restore example:

```bash
createdb easydocument_restore
pg_restore --dbname=easydocument_restore --clean --if-exists easydocument.dump
```

Validation after restore:

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM document_tasks;
SELECT COUNT(*) FROM notifications;
SELECT postgis_full_version();
```

## MinIO Or S3-Compatible Storage

Minimum production posture:

- Enable bucket versioning for KYC and chat attachment buckets.
- Enable server-side encryption where supported.
- Configure lifecycle retention and legal hold policy where required.
- Back up bucket metadata and object data together.

MinIO mirror backup example:

```bash
mc mirror --overwrite production/easydocument-kyc backup/easydocument-kyc
mc mirror --overwrite production/easydocument-chat backup/easydocument-chat
mc mirror --overwrite production/easydocument-exports backup/easydocument-exports
```

Restore example:

```bash
mc mirror --overwrite backup/easydocument-kyc production/easydocument-kyc
mc mirror --overwrite backup/easydocument-chat production/easydocument-chat
mc mirror --overwrite backup/easydocument-exports production/easydocument-exports
```
