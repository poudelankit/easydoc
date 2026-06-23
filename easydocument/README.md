# EasyDocument

EasyDocument is a Nepal-only document services marketplace connecting customers with verified local agents for document retrieval, submission, verification, and office follow-up work.

This repository is the EasyDocument Enterprise Implementation Package monorepo. It currently contains the Phase 11 foundation for authentication, profiles, agent onboarding, task creation, task acceptance, accepted-task communication, post-acceptance lifecycle tracking, in-app call signaling, admin operations, dispute mediation, reviews, reputation, stored notifications, production readiness hardening, and CI/CD deployment wiring.

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

Phase 11 adds CI/CD wiring and deployment operations on top of the Phase 1-10 foundation: GitHub Actions validation, manual deployment gate, migration and Kubernetes validation scripts, smoke tests, secret-manager placeholders, metrics export, observability documentation, release/rollback runbooks, incident response, staging deployment, and environment promotion guidance.

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

Validate Kubernetes manifests:

```bash
npm run validate:kubernetes
```

Run deployment smoke tests against a running API:

```bash
API_BASE_URL=http://localhost:3000 npm run smoke:deployment
```

Run the mobile app from `apps/mobile` on a machine with Flutter installed:

```bash
flutter pub get
flutter run
```

Production deployment notes live in `docs/deployment.md`, with CI/CD details in `docs/ci-cd.md`.
