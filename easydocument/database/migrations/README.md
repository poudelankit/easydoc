# Migrations

Versioned PostgreSQL migrations live here.

Current migration:

- `001_phase1_foundation.sql`: users, OTP verification, refresh sessions, KYC file metadata, agent profiles, service tags, and audit logs.
- `002_phase2_tasks.sql`: document service tasks, task supporting file placeholders, task status, and PostGIS organization location indexes.
- `003_phase3_communication.sql`: accepted-task communication rooms, text messages, read receipts, chat attachment metadata, and message attachment links.
- `004_phase4_task_lifecycle.sql`: expanded task lifecycle statuses, expected completion dates, and task status history.
- `005_phase5_call_foundation.sql`: call sessions, call status history, and in-app audio/video call metadata.
- `006_phase6_admin_operations.sql`: agent verification decision metadata and admin verification indexes.
