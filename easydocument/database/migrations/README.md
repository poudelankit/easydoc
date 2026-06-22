# Migrations

Versioned PostgreSQL migrations live here.

Current migration:

- `001_phase1_foundation.sql`: users, OTP verification, refresh sessions, KYC file metadata, agent profiles, service tags, and audit logs.
- `002_phase2_tasks.sql`: document service tasks, task supporting file placeholders, task status, and PostGIS organization location indexes.
- `003_phase3_communication.sql`: accepted-task communication rooms, text messages, read receipts, chat attachment metadata, and message attachment links.
