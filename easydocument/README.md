# EasyDocument

EasyDocument is a Nepal-only document services marketplace connecting customers with verified local agents for document retrieval, submission, verification, and office follow-up work.

This repository is the EasyDocument Enterprise Implementation Package monorepo. It currently contains the Phase 6 foundation for authentication, profiles, agent onboarding, task creation, nearby task discovery, task acceptance, accepted-task communication, post-acceptance task lifecycle tracking, in-app call signaling, and admin operational management.

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
- Calls: Socket.IO WebRTC signaling foundation; production TURN/STUN is not implemented.

## Out Of Scope

The following are intentionally not implemented yet:

- Full notification system.
- Payments.
- Reviews.
- Analytics.
- Admin mediation.
- Payment-backed task settlement.
- Production TURN/STUN deployment.

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

## Current Phase

Phase 6 includes the Phase 1 authentication/profile foundation, Phase 2 task creation and acceptance flow, Phase 3 task communication, Phase 4 lifecycle tracking, Phase 5 call signaling metadata, plus the React admin operational portal and admin-only backend endpoints.

## Local Run Commands

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
