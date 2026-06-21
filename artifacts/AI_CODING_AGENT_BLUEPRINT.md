# EasyDocument AI Coding Agent Blueprint

## Build Order
1. Create monorepo: backend, mobile, admin, infra, docs.
2. Implement PostgreSQL migrations from schema.sql.
3. Implement NestJS AuthModule with OTP send/verify, JWT access, refresh token rotation.
4. Implement UsersModule and AgentsModule with MinIO KYC upload.
5. Implement TasksModule with broadcast, accept, status history, and direct payment metadata.
6. Implement ChatModule with Socket.IO rooms and message persistence.
7. Implement CallModule with WebRTC signaling and external call log.
8. Implement ReviewsModule and reputation aggregation.
9. Implement React Admin Portal for agent verification and dispute mediation.
10. Add CI/CD, observability, seed data, tests, and release scripts.

## Hard Rules
- Do not implement escrow. EasyDocument uses direct payment between customer and agent.
- Do not assume organization registry. The customer manually enters organization name and address.
- Every task status transition must write task_status_history.
- Every admin action must write audit_logs.
- Store files in MinIO; never store file bytes in PostgreSQL.
- Use Google Maps only for map display and geocoding.
- English-only UI for v1.

## Repository Layout
```
easydocument/
  backend/
  mobile/
  admin/
  infra/
  docs/
  scripts/
```

## Testing Targets
- Backend unit coverage: minimum 80 percent for service layer.
- Backend e2e: auth, task create, accept, chat, status update, review, dispute.
- Mobile widget tests: onboarding, task creation, task detail, chat.
- Admin integration tests: login, agent approval, dispute update.
