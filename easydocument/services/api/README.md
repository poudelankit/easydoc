# EasyDocument API

Node.js + NestJS backend API for EasyDocument.

## Planned Scope

- OTP authentication.
- JWT access tokens and rotating refresh tokens.
- Customer profiles.
- Agent KYC submission.
- PostgreSQL persistence.
- Redis-backed rate limiting/cache support.
- MinIO private file storage.
- Socket.IO realtime foundation.
- Admin operational management.
- Dispute and admin mediation workflow.
- Reviews, ratings, and query-calculated agent reputation.
- Stored in-app notifications with SMS and push placeholder channels.

## Current State

This folder contains the Phase 11 NestJS API foundation for auth, profiles, task creation, nearby task discovery, task acceptance, accepted-task communication, task lifecycle tracking, in-app call signaling metadata, admin operational management, dispute mediation, reviews, ratings, agent reputation, stored in-app notifications, production readiness hardening, and CI/CD observability hooks.

## Implemented Endpoints

- `GET /health/live`
- `GET /health/ready`
- `GET /health/database`
- `GET /health/redis`
- `GET /health/minio`
- `GET /metrics`
- `POST /v1/auth/otp/send`
- `POST /v1/auth/otp/verify`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`
- `GET /v1/users/me`
- `PATCH /v1/users/me`
- `POST /v1/customers/register`
- `GET /v1/customers/me`
- `PATCH /v1/customers/me`
- `POST /v1/agents/citizenship-upload-placeholder`
- `POST /v1/agents/register`
- `GET /v1/agents/me`
- `PATCH /v1/agents/me/location`
- `GET /v1/agents/nearby-requests`
- `POST /v1/agents/tasks/:id/accept`
- `POST /v1/tasks`
- `GET /v1/tasks/me`
- `GET /v1/tasks/:id`
- `POST /v1/tasks/:id/confirm-deal`
- `POST /v1/tasks/:id/expected-date`
- `POST /v1/tasks/:id/status`
- `GET /v1/tasks/:id/timeline`
- `POST /v1/tasks/:id/complete`
- `POST /v1/tasks/:id/cancel`
- `GET /v1/tasks/:taskId/room`
- `GET /v1/tasks/:taskId/messages`
- `POST /v1/tasks/:taskId/messages`
- `POST /v1/tasks/:taskId/attachments`
- `GET /v1/tasks/:taskId/calls`
- `POST /v1/tasks/:taskId/calls`
- `POST /v1/tasks/:taskId/calls/:callId/end`
- `POST /v1/tasks/:taskId/disputes`
- `GET /v1/tasks/:taskId/disputes`
- `POST /v1/tasks/:taskId/reviews`
- `GET /v1/disputes/:disputeId`
- `GET /v1/customers/me/reviews`
- `GET /v1/agents/me/reviews`
- `GET /v1/agents/:agentId/reviews`
- `GET /v1/agents/:agentId/reputation`
- `GET /v1/notifications`
- `GET /v1/notifications/unread-count`
- `POST /v1/notifications/:notificationId/read`
- `POST /v1/notifications/read-all`
- `GET /v1/admin/me`
- `GET /v1/admin/dashboard`
- `GET /v1/admin/agents/pending`
- `GET /v1/admin/agents/:agentId`
- `POST /v1/admin/agents/:agentId/approve`
- `POST /v1/admin/agents/:agentId/reject`
- `GET /v1/admin/tasks`
- `GET /v1/admin/tasks/:taskId`
- `GET /v1/admin/tasks/:taskId/timeline`
- `GET /v1/admin/tasks/:taskId/communication-audit`
- `GET /v1/admin/disputes`
- `GET /v1/admin/disputes/:disputeId`
- `POST /v1/admin/disputes/:disputeId/notes`
- `POST /v1/admin/disputes/:disputeId/status`
- `POST /v1/admin/disputes/:disputeId/resolve`
- `GET /v1/admin/reviews`
- `GET /v1/admin/notifications/summary`

## Phase 10 Notes

- Customers can submit one review per completed task.
- Review edit windows are not implemented in Phase 8 and remain a future enhancement.
- Reputation metrics are query-calculated from completed tasks and `task_reviews`.
- Notifications are stored in PostgreSQL and delivered through the `IN_APP` channel.
- `SMS_PLACEHOLDER` and `PUSH_PLACEHOLDER` are schema-supported channels only; real providers are not implemented.
- Production-like startup validates `JWT_SECRET`, `CORS_ORIGIN`, database, Redis, and MinIO configuration.
- Backend logs are structured JSON lines for request lifecycle, errors, audits, notifications, and rate-limit checks.
- Redis-backed rate limiting is applied to OTP send, OTP verify, message send, call request, and dispute creation.

## Phase 11 Notes

- `GET /metrics` returns a Prometheus text-format foundation endpoint outside the `/v1` API prefix.
- CI/CD validation scripts live under `scripts/` and GitHub Actions workflows live under `.github/workflows/`.
- Production deployment remains a documented/manual workflow gate; automatic cluster deployment is not enabled.

## Socket.IO Events

- `task:join`
- `task:message:send`
- `task:message:new`
- `task:typing`
- `task:read`
- `call:request`
- `call:ringing`
- `call:accept`
- `call:decline`
- `call:offer`
- `call:answer`
- `call:ice-candidate`
- `call:end`

## Local Setup

```bash
npm install
npm run dev:infra
npm run start:dev --workspace @easydocument/api
```

Run tests:

```bash
npm run test --workspace @easydocument/api
```

Build the production image from the repository root:

```bash
docker build -f services/api/Dockerfile -t easydocument/api:phase11 .
```
