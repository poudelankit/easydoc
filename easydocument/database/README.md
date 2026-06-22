# Database

PostgreSQL is the EasyDocument system of record. PostGIS is required for agent and organization location matching.

## Structure

- `migrations/`: versioned PostgreSQL schema migrations.
- `seeds/`: local and development seed data.

Phase 1 includes `migrations/001_phase1_foundation.sql` and `seeds/001_local_admin.sql`.
Phase 2 adds `migrations/002_phase2_tasks.sql` for document service task creation, nearby agent discovery, and acceptance.
Phase 3 adds `migrations/003_phase3_communication.sql` for accepted-task chat rooms, text messages, read receipts, and attachment metadata.

The migration covers the auth/profile/KYC foundation only:

- `users`
- `otp_verifications`
- `refresh_sessions`
- `file_metadata`
- `agent_profiles`
- `agent_service_tags`
- `audit_logs`

Phase 2 adds:

- `document_tasks`
- `task_supporting_files`

Phase 3 adds:

- `communication_rooms`
- `communication_messages`
- `communication_attachments`
- `communication_message_attachments`
- `communication_message_reads`
