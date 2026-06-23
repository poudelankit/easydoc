# EasyDocument

EasyDocument is a Nepal-only document services marketplace connecting customers with verified local agents for document retrieval, submission, verification, and office follow-up work.

This repository is the EasyDocument Enterprise Implementation Package monorepo. It currently contains the Phase 10 foundation for authentication, profiles, agent onboarding, task creation, nearby task discovery, task acceptance, accepted-task communication, post-acceptance task lifecycle tracking, in-app call signaling, admin operational management, dispute mediation, reviews, ratings, agent reputation, stored in-app notifications, and production readiness hardening.

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

- Real SMS, push, and email notification delivery.
- Payments.
- Analytics.
- Refunds.
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

Phase 10 adds production readiness work on top of the Phase 1-9 product foundation: stricter environment validation, structured backend logs, audit/rate-limit hardening, richer health checks, production Dockerfiles, Kubernetes samples, deployment runbooks, backup/restore notes, monitoring guidance, and security/readiness checklists.

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

Run production readiness validation:

```bash
npm run validate:production
```

Run the mobile app from `apps/mobile` on a machine with Flutter installed:

```bash
flutter pub get
flutter run
```

Production deployment notes live in `docs/deployment.md`.
