# EasyDocument

EasyDocument is a Nepal-only document services marketplace connecting customers with verified local agents for document retrieval, submission, verification, and office follow-up work.

This repository is scaffolded as a monorepo for the Enterprise Implementation Package. It currently contains structure, package configuration, environment templates, startup scripts, documentation placeholders, and local infrastructure only.

## Monorepo Layout

```text
easydocument/
  apps/
    mobile/          Flutter customer and agent mobile app
    admin/           React + TypeScript admin portal
  services/
    api/             Node.js + NestJS backend API
  packages/
    shared-types/    Shared TypeScript contracts
    shared-config/   Shared configuration helpers/constants
  database/
    migrations/      PostgreSQL migrations
    seeds/           Local/dev seed data
  infra/
    docker/          Local Docker Compose setup
    kubernetes/      Kubernetes manifests
    nginx/           Reverse proxy configuration
  docs/              Product and engineering documentation
  scripts/           Local startup scripts
```

## Technology Decisions

- Mobile: Flutter.
- Backend: Node.js with NestJS.
- Admin: React + TypeScript.
- Database: PostgreSQL with PostGIS.
- Cache: Redis.
- Object storage: MinIO.
- Realtime: Socket.IO.
- Calls: WebRTC signaling is planned, but not implemented in this scaffold.

## Out Of Scope For This Scaffold

The following are intentionally not implemented yet:

- Chat.
- Calls.
- Payments.
- Reviews.
- Analytics.
- Admin mediation.
- Marketplace task lifecycle.

## Local Infrastructure

Start local PostgreSQL, Redis, and MinIO:

```bash
./scripts/start-local-infra.sh
```

Check local service status:

```bash
./scripts/check-local-infra.sh
```

Stop local infrastructure:

```bash
./scripts/stop-local-infra.sh
```

## Next Phase

Phase 1 implements authentication and profile foundations: OTP auth, refresh token rotation, customer profile, agent KYC submission placeholders, permanent agent location capture, minimal admin RBAC verification, and first PostgreSQL migrations.

## Phase 1 Run Commands

Install JavaScript dependencies:

```bash
npm install
```

Start local infrastructure:

```bash
npm run dev:infra
```

Local PostgreSQL is exposed on `localhost:55432` in this package to avoid conflicts with an existing database on `5432`.

Run the backend:

```bash
npm run start:dev --workspace @easydocument/api
```

Run the admin portal:

```bash
npm run dev --workspace @easydocument/admin
```

Run backend/admin tests:

```bash
npm run test --workspace @easydocument/api
npm run test --workspace @easydocument/admin
```

Run the mobile app from `apps/mobile` on a machine with Flutter installed:

```bash
flutter pub get
flutter run
```
