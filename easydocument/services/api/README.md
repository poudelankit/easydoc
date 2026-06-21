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

This folder contains the Phase 1 NestJS API foundation.

## Implemented Phase 1 Endpoints

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
- `GET /v1/admin/me`

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
