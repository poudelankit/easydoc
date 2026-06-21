# Database

PostgreSQL is the EasyDocument system of record. PostGIS is required for agent and organization location matching.

## Structure

- `migrations/`: versioned PostgreSQL schema migrations.
- `seeds/`: local and development seed data.

Phase 1 includes `migrations/001_phase1_foundation.sql` and `seeds/001_local_admin.sql`.

The migration covers the auth/profile/KYC foundation only:

- `users`
- `otp_verifications`
- `refresh_sessions`
- `file_metadata`
- `agent_profiles`
- `agent_service_tags`
- `audit_logs`
