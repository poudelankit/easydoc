# Database

PostgreSQL is the EasyDocument system of record. PostGIS is required for agent and organization location matching.

## Structure

- `migrations/`: versioned PostgreSQL schema migrations.
- `seeds/`: local and development seed data.

Phase 1 includes `migrations/001_phase1_foundation.sql` and `seeds/001_local_admin.sql`.
Phase 2 adds `migrations/002_phase2_tasks.sql` for document service task creation, nearby agent discovery, and acceptance.
Phase 3 adds `migrations/003_phase3_communication.sql` for accepted-task chat rooms, text messages, read receipts, and attachment metadata.
Phase 4 adds `migrations/004_phase4_task_lifecycle.sql` for expanded lifecycle statuses, expected completion dates, and task status history.
Phase 5 adds `migrations/005_phase5_call_foundation.sql` for call sessions and call status history.
Phase 6 adds `migrations/006_phase6_admin_operations.sql` for agent verification decision metadata.
Phase 7 adds `migrations/007_phase7_disputes.sql` for disputes and admin mediation notes.

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

Phase 4 adds:

- `task_status_history`
- `document_tasks.expected_completion_date`

Phase 5 adds:

- `call_sessions`
- `call_status_history`

Phase 6 adds these `agent_profiles` columns:

- `verification_decision`
- `verification_decided_by_user_id`
- `verification_decided_at`
- `verification_rejection_reason`

Phase 7 adds:

- `task_disputes`
- `dispute_status_history`
- `dispute_mediation_notes`
