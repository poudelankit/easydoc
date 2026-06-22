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
- WebRTC signaling planned for a later phase.

## Current State

This folder contains the Phase 5 NestJS API foundation for auth, profiles, task creation, nearby task discovery, task acceptance, accepted-task communication, task lifecycle tracking, and in-app call signaling metadata.

## Implemented Endpoints

- `GET /health/live`
- `GET /health/ready`
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
- `GET /v1/admin/me`

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
